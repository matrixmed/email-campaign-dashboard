from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db_pool import get_db_connection

list_management_bp = Blueprint('list_management', __name__)

@list_management_bp.route('/print-lists/overview', methods=['GET'])
def print_lists_overview():
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT list_name, SUM(cnt) AS count FROM (
                SELECT val::text AS list_name, COUNT(DISTINCT npi) AS cnt
                FROM universal_profiles, jsonb_array_elements(COALESCE(print_lists_subscribed, '[]'::jsonb)) AS val
                WHERE print_lists_subscribed != '[]'::jsonb
                GROUP BY val::text
                UNION ALL
                SELECT val::text AS list_name, COUNT(*) AS cnt
                FROM user_profiles, jsonb_array_elements(COALESCE(print_lists_subscribed, '[]'::jsonb)) AS val
                WHERE print_lists_subscribed != '[]'::jsonb
                AND (npi IS NULL OR npi = '')
                GROUP BY val::text
            ) combined
            GROUP BY list_name
            ORDER BY count DESC
        """)
        subscribed_counts = {row['list_name'].strip('"'): row['count'] for row in cur.fetchall()}

        cur.execute("""
            SELECT val::text AS list_name, COUNT(DISTINCT npi) AS count
            FROM universal_profiles, jsonb_array_elements(COALESCE(print_lists_unsubscribed, '[]'::jsonb)) AS val
            WHERE print_lists_unsubscribed != '[]'::jsonb
            GROUP BY val::text
            ORDER BY count DESC
        """)
        unsubscribed_counts = {row['list_name'].strip('"'): row['count'] for row in cur.fetchall()}

        cur.execute("SELECT COUNT(*) AS c FROM universal_profiles WHERE print_lists_subscribed != '[]'::jsonb")
        total_subscribed = cur.fetchone()['c']

        cur.execute("""
            SELECT COUNT(*) AS c FROM universal_profiles up
            WHERE print_lists_subscribed != '[]'::jsonb
            AND EXISTS (SELECT 1 FROM user_profiles u WHERE u.npi = up.npi)
        """)
        total_in_audience = cur.fetchone()['c']

        cur.close()
        return jsonify({
            'subscribed_counts': subscribed_counts,
            'unsubscribed_counts': unsubscribed_counts,
            'total_subscribed': total_subscribed,
            'total_in_audience': total_in_audience,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@list_management_bp.route('/print-lists/members', methods=['GET'])
def print_list_members():
    list_name = request.args.get('list', '')
    list_type = request.args.get('type', 'subscribed')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))
    search = request.args.get('search', '').strip()
    offset = (page - 1) * per_page

    if not list_name:
        return jsonify({'error': 'list parameter required'}), 400

    column = 'print_lists_subscribed' if list_type == 'subscribed' else 'print_lists_unsubscribed'

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        search_clause = ""
        params = [list_name]
        if search:
            search_clause = """
                AND (
                    LOWER(up.first_name) LIKE %s
                    OR LOWER(up.last_name) LIKE %s
                    OR up.npi LIKE %s
                    OR LOWER(up.practice_city) LIKE %s
                    OR LOWER(up.primary_specialty) LIKE %s
                )
            """
            term = f"%{search.lower()}%"
            params.extend([term, term, term, term, term])

        cur.execute(f"""
            SELECT DISTINCT ON (COALESCE(up.npi, u.npi, u.email))
                COALESCE(up.npi, u.npi) AS npi,
                COALESCE(up.first_name, u.first_name) AS first_name,
                COALESCE(up.last_name, u.last_name) AS last_name,
                up.credential,
                COALESCE(up.primary_specialty, u.specialty) AS primary_specialty,
                up.primary_taxonomy_code,
                COALESCE(up.practice_address_1, u.address) AS practice_address_1,
                up.practice_address_2,
                COALESCE(up.practice_city, u.city) AS practice_city,
                COALESCE(up.practice_state, u.state) AS practice_state,
                COALESCE(up.practice_zipcode, u.zipcode) AS practice_zipcode,
                COALESCE(up.print_lists_subscribed, u.print_lists_subscribed) AS print_lists_subscribed,
                COALESCE(up.print_lists_unsubscribed, u.print_lists_unsubscribed) AS print_lists_unsubscribed,
                COALESCE(up.unsubscribe_reason, u.unsubscribe_reason) AS unsubscribe_reason,
                CASE WHEN u.id IS NOT NULL THEN true ELSE false END AS in_audience,
                u.email AS audience_email
            FROM universal_profiles up
            FULL OUTER JOIN user_profiles u ON u.npi = up.npi AND u.npi IS NOT NULL
            WHERE (up.{column} @> to_jsonb(%s::text) OR u.{column} @> to_jsonb(%s::text))
            {search_clause.replace('up.', 'COALESCE(up.') if search else ''}
            ORDER BY COALESCE(up.npi, u.npi, u.email), COALESCE(up.last_name, u.last_name), COALESCE(up.first_name, u.first_name)
            LIMIT {per_page} OFFSET {offset}
        """, [list_name, list_name] + (params[1:] if search else []))
        members = cur.fetchall()

        cur.execute(f"""
            SELECT COUNT(*) AS c FROM (
                SELECT COALESCE(up.npi, u.npi, u.email) AS uid
                FROM universal_profiles up
                FULL OUTER JOIN user_profiles u ON u.npi = up.npi AND u.npi IS NOT NULL
                WHERE (up.{column} @> to_jsonb(%s::text) OR u.{column} @> to_jsonb(%s::text))
                GROUP BY COALESCE(up.npi, u.npi, u.email)
            ) sub
        """, [list_name, list_name])
        total = cur.fetchone()['c']

        cur.execute(f"""
            SELECT COUNT(*) AS c FROM (
                SELECT COALESCE(up.npi, u.npi, u.email) AS uid
                FROM universal_profiles up
                FULL OUTER JOIN user_profiles u ON u.npi = up.npi AND u.npi IS NOT NULL
                WHERE (up.{column} @> to_jsonb(%s::text) OR u.{column} @> to_jsonb(%s::text))
                AND u.id IS NOT NULL
                GROUP BY COALESCE(up.npi, u.npi, u.email)
            ) sub
        """, [list_name, list_name])
        audience_count = cur.fetchone()['c']

        cur.close()
        return jsonify({
            'members': members,
            'total': total,
            'audience_count': audience_count,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@list_management_bp.route('/digital-lists/overview', methods=['GET'])
def digital_lists_overview():
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT val::text AS list_name, COUNT(*) AS count
            FROM user_profiles, jsonb_array_elements(COALESCE(digital_lists_subscribed, '[]'::jsonb)) AS val
            WHERE digital_lists_subscribed != '[]'::jsonb
            GROUP BY val::text
            ORDER BY count DESC
        """)
        subscribed_counts = {row['list_name'].strip('"'): row['count'] for row in cur.fetchall()}

        cur.execute("SELECT COUNT(*) AS c FROM user_profiles WHERE digital_lists_subscribed != '[]'::jsonb")
        total_subscribed = cur.fetchone()['c']

        cur.close()
        return jsonify({
            'subscribed_counts': subscribed_counts,
            'total_subscribed': total_subscribed,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@list_management_bp.route('/digital-lists/members', methods=['GET'])
def digital_list_members():
    list_name = request.args.get('list', '')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))
    search = request.args.get('search', '').strip()
    offset = (page - 1) * per_page

    if not list_name:
        return jsonify({'error': 'list parameter required'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        search_clause = ""
        params = [list_name]
        if search:
            search_clause = """
                AND (
                    LOWER(u.first_name) LIKE %s
                    OR LOWER(u.last_name) LIKE %s
                    OR LOWER(u.email) LIKE %s
                    OR u.npi LIKE %s
                    OR LOWER(u.specialty) LIKE %s
                )
            """
            term = f"%{search.lower()}%"
            params.extend([term, term, term, term, term])

        cur.execute(f"""
            SELECT
                u.email,
                u.first_name,
                u.last_name,
                u.npi,
                u.specialty,
                u.degree,
                u.city,
                u.state,
                u.digital_lists_subscribed
            FROM user_profiles u
            WHERE u.digital_lists_subscribed @> to_jsonb(%s::text)
            {search_clause}
            ORDER BY u.last_name, u.first_name
            LIMIT {per_page} OFFSET {offset}
        """, params)
        members = cur.fetchall()

        cur.execute(f"""
            SELECT COUNT(*) AS c
            FROM user_profiles u
            WHERE u.digital_lists_subscribed @> to_jsonb(%s::text)
            {search_clause}
        """, params)
        total = cur.fetchone()['c']

        cur.close()
        return jsonify({
            'members': members,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()