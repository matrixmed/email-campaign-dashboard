from flask import Blueprint, request, jsonify, make_response
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime
import csv
import io

users_bp = Blueprint('users', __name__)

def get_db_connection():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    return conn

@users_bp.route('/analyze-list', methods=['POST'])
def analyze_list():
    try:
        data = request.get_json()

        user_list = data.get('user_list', [])
        input_type = data.get('input_type', 'email')
        export_csv = data.get('export_csv', False)

        if not user_list:
            return jsonify({
                'success': False,
                'error': 'user_list is required'
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if input_type == 'email':
            placeholders = ','.join(['%s'] * len(user_list))
            query = f"""
                SELECT
                    email,
                    first_name,
                    last_name,
                    specialty,
                    campaigns_data
                FROM user_profiles
                WHERE email IN ({placeholders})
            """
            cursor.execute(query, user_list)
        else:
            placeholders = ','.join(['%s'] * len(user_list))
            query = f"""
                SELECT
                    email,
                    first_name,
                    last_name,
                    specialty,
                    campaigns_data
                FROM user_profiles
                WHERE contact_id IN ({placeholders})
            """
            cursor.execute(query, user_list)

        users = cursor.fetchall()

        enriched_users = []
        for user in users:
            campaigns_data = user.get('campaigns_data', {})

            total_sends = 0
            total_opens = 0
            total_clicks = 0
            unique_opens = 0
            unique_clicks = 0

            if isinstance(campaigns_data, dict):
                for campaign_name, campaign_info in campaigns_data.items():
                    if isinstance(campaign_info, dict):
                        total_sends += 1

                        if campaign_info.get('opened'):
                            unique_opens += 1
                            total_opens += campaign_info.get('total_opens', 0)

                        if campaign_info.get('clicked'):
                            unique_clicks += 1
                            total_clicks += campaign_info.get('total_clicks', 0)

            unique_open_rate = round((unique_opens / total_sends * 100), 2) if total_sends > 0 else 0
            total_open_rate = round((total_opens / total_sends * 100), 2) if total_sends > 0 else 0
            unique_click_rate = round((unique_clicks / total_sends * 100), 2) if total_sends > 0 else 0
            total_click_rate = round((total_clicks / total_sends * 100), 2) if total_sends > 0 else 0

            enriched_users.append({
                'email': user.get('email'),
                'first_name': user.get('first_name'),
                'last_name': user.get('last_name'),
                'specialty': user.get('specialty'),
                'total_sends': total_sends,
                'unique_opens': unique_opens,
                'total_opens': total_opens,
                'unique_clicks': unique_clicks,
                'total_clicks': total_clicks,
                'unique_open_rate': unique_open_rate,
                'total_open_rate': total_open_rate,
                'unique_click_rate': unique_click_rate,
                'total_click_rate': total_click_rate
            })

        cursor.close()
        conn.close()

        if export_csv:
            output = io.StringIO()
            writer = csv.writer(output)

            writer.writerow([
                'Email', 'First Name', 'Last Name', 'Specialty',
                'Total Sends', 'Unique Opens', 'Total Opens',
                'Unique Clicks', 'Total Clicks',
                'Unique Open Rate (%)', 'Total Open Rate (%)',
                'Unique Click Rate (%)', 'Total Click Rate (%)'
            ])

            for user in enriched_users:
                writer.writerow([
                    user.get('email', ''),
                    user.get('first_name', ''),
                    user.get('last_name', ''),
                    user.get('specialty', ''),
                    user.get('total_sends', 0),
                    user.get('unique_opens', 0),
                    user.get('total_opens', 0),
                    user.get('unique_clicks', 0),
                    user.get('total_clicks', 0),
                    user.get('unique_open_rate', 0),
                    user.get('total_open_rate', 0),
                    user.get('unique_click_rate', 0),
                    user.get('total_click_rate', 0)
                ])

            output.seek(0)
            response = make_response(output.getvalue())
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = f'attachment; filename=user_analysis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            return response

        return jsonify({
            'success': True,
            'total_count': len(enriched_users),
            'users': enriched_users
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@users_bp.route('/engagement-query', methods=['POST'])
def engagement_query():
    try:
        data = request.get_json()

        specialty = data.get('specialty')
        engagement_level = data.get('engagement_level')
        campaign_list = data.get('campaign_list', [])
        limit = data.get('limit')
        export_csv = data.get('export_csv', False)

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        query_parts = []
        params = []

        query_base = """
            SELECT
                email,
                first_name,
                last_name,
                specialty,
                campaigns_data
            FROM user_profiles
            WHERE 1=1
        """
        query_parts.append(query_base)

        if specialty and specialty != 'all':
            query_parts.append("AND specialty = %s")
            params.append(specialty)

        if limit:
            query_parts.append(f"LIMIT {int(limit)}")

        final_query = " ".join(query_parts)

        cursor.execute(final_query, params)
        users = cursor.fetchall()

        enriched_users = []
        for user in users:
            campaigns_data = user.get('campaigns_data', {})

            total_sends = 0
            total_opens = 0
            total_clicks = 0
            unique_opens = 0
            unique_clicks = 0

            if isinstance(campaigns_data, dict):
                for campaign_name, campaign_info in campaigns_data.items():
                    if campaign_list and campaign_name not in campaign_list:
                        continue

                    if isinstance(campaign_info, dict):
                        total_sends += 1

                        if campaign_info.get('opened'):
                            unique_opens += 1
                            total_opens += campaign_info.get('total_opens', 0)

                        if campaign_info.get('clicked'):
                            unique_clicks += 1
                            total_clicks += campaign_info.get('total_clicks', 0)

            unique_open_rate = round((unique_opens / total_sends * 100), 2) if total_sends > 0 else 0
            total_open_rate = round((total_opens / total_sends * 100), 2) if total_sends > 0 else 0
            unique_click_rate = round((unique_clicks / total_sends * 100), 2) if total_sends > 0 else 0
            total_click_rate = round((total_clicks / total_sends * 100), 2) if total_sends > 0 else 0

            if engagement_level == 'high':
                if unique_open_rate < 50:
                    continue
            elif engagement_level == 'medium':
                if unique_open_rate < 20 or unique_open_rate >= 50:
                    continue
            elif engagement_level == 'low':
                if unique_open_rate >= 20:
                    continue
            elif engagement_level == 'none':
                if unique_opens > 0:
                    continue

            enriched_users.append({
                'email': user.get('email'),
                'first_name': user.get('first_name'),
                'last_name': user.get('last_name'),
                'specialty': user.get('specialty'),
                'total_sends': total_sends,
                'unique_opens': unique_opens,
                'total_opens': total_opens,
                'unique_clicks': unique_clicks,
                'total_clicks': total_clicks,
                'unique_open_rate': unique_open_rate,
                'total_open_rate': total_open_rate,
                'unique_click_rate': unique_click_rate,
                'total_click_rate': total_click_rate
            })

        cursor.close()
        conn.close()

        if export_csv:
            output = io.StringIO()
            writer = csv.writer(output)

            writer.writerow([
                'Email', 'First Name', 'Last Name', 'Specialty',
                'Total Sends', 'Unique Opens', 'Total Opens',
                'Unique Clicks', 'Total Clicks',
                'Unique Open Rate (%)', 'Total Open Rate (%)',
                'Unique Click Rate (%)', 'Total Click Rate (%)'
            ])

            for user in enriched_users:
                writer.writerow([
                    user.get('email', ''),
                    user.get('first_name', ''),
                    user.get('last_name', ''),
                    user.get('specialty', ''),
                    user.get('total_sends', 0),
                    user.get('unique_opens', 0),
                    user.get('total_opens', 0),
                    user.get('unique_clicks', 0),
                    user.get('total_clicks', 0),
                    user.get('unique_open_rate', 0),
                    user.get('total_open_rate', 0),
                    user.get('unique_click_rate', 0),
                    user.get('total_click_rate', 0)
                ])

            output.seek(0)
            response = make_response(output.getvalue())
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = f'attachment; filename=user_engagement_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            return response

        return jsonify({
            'success': True,
            'total_count': len(enriched_users),
            'users': enriched_users
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
