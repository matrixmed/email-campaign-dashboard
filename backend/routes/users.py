from flask import Blueprint, request, jsonify, make_response
from psycopg2.extras import RealDictCursor
from datetime import datetime
import csv
import io
import json
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db_pool import get_db_connection

users_bp = Blueprint('users', __name__)

def merge_specialties(specialties, should_merge=False):
    if not should_merge:
        return specialties

    merged = {}
    for specialty in specialties:
        if specialty:
            base_specialty = specialty.split(' - ')[0].strip()
            if base_specialty not in merged:
                merged[base_specialty] = base_specialty

    return list(merged.keys())

@users_bp.route('/specialties', methods=['GET'])
def get_specialties():
    try:
        merge_mode = request.args.get('merge', 'false').lower() == 'true'
        print(f"[SPECIALTIES] Fetching specialties, merge_mode={merge_mode}")

        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            SELECT DISTINCT specialty
            FROM user_profiles
            WHERE specialty IS NOT NULL AND specialty != ''
            ORDER BY specialty
        """

        cursor.execute(query)
        results = cursor.fetchall()
        print(f"[SPECIALTIES] Found {len(results)} raw specialties from database")

        specialties = [row[0] for row in results if row[0]]
        print(f"[SPECIALTIES] After filtering: {len(specialties)} specialties")

        if merge_mode:
            specialties = merge_specialties(specialties, should_merge=True)
            print(f"[SPECIALTIES] After merging: {len(specialties)} specialties")

        cursor.close()
        conn.close()

        result = {
            'success': True,
            'specialties': sorted(specialties)
        }
        print(f"[SPECIALTIES] Returning: {result}")

        return jsonify(result), 200

    except Exception as e:
        print(f"[SPECIALTIES] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

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

        user_list_normalized = [u.lower() if input_type == 'email' else u for u in user_list]
        placeholders = ','.join(['%s'] * len(user_list_normalized))

        if input_type == 'email':
            query = f"""
                SELECT
                    up.email,
                    up.npi,
                    up.first_name,
                    up.last_name,
                    up.specialty,
                    cd.campaign_base_name as campaign_name,
                    ci.event_type,
                    COUNT(*) as event_count
                FROM user_profiles up
                LEFT JOIN campaign_interactions ci ON LOWER(up.email) = ci.email
                LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE LOWER(up.email) IN ({placeholders})
                GROUP BY up.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name, ci.event_type
                ORDER BY up.email, cd.campaign_base_name
            """
        else:
            query = f"""
                SELECT
                    up.email,
                    up.npi,
                    up.first_name,
                    up.last_name,
                    up.specialty,
                    cd.campaign_base_name as campaign_name,
                    ci.event_type,
                    COUNT(*) as event_count
                FROM user_profiles up
                LEFT JOIN campaign_interactions ci ON LOWER(up.email) = ci.email
                LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE up.npi IN ({placeholders})
                GROUP BY up.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name, ci.event_type
                ORDER BY up.email, cd.campaign_base_name
            """

        cursor.execute(query, user_list_normalized)
        raw_data = cursor.fetchall()

        users_data = {}

        for row in raw_data:
            email = row['email'].lower()
            campaign_name = row['campaign_name']
            event_type = row['event_type']

            if email not in users_data:
                users_data[email] = {
                    'email': email,
                    'npi': row['npi'],
                    'first_name': row['first_name'],
                    'last_name': row['last_name'],
                    'specialty': row['specialty'],
                    'campaigns': {},
                    'total_sends': 0,
                    'unique_opens': 0,
                    'total_opens': 0,
                    'unique_clicks': 0,
                    'total_clicks': 0
                }

            if not campaign_name or not event_type:
                continue

            event_type_lower = event_type.lower()
            event_count = row['event_count']

            if campaign_name not in users_data[email]['campaigns']:
                users_data[email]['campaigns'][campaign_name] = {
                    'sent': False,
                    'opened': False,
                    'clicked': False,
                    'open_count': 0,
                    'click_count': 0
                }

            if event_type_lower == 'sent':
                users_data[email]['campaigns'][campaign_name]['sent'] = True
            elif event_type_lower == 'open':
                users_data[email]['campaigns'][campaign_name]['opened'] = True
                users_data[email]['campaigns'][campaign_name]['open_count'] = event_count
            elif event_type_lower == 'click':
                users_data[email]['campaigns'][campaign_name]['clicked'] = True
                users_data[email]['campaigns'][campaign_name]['click_count'] = event_count

        enriched_users = []

        for email, user_data in users_data.items():
            user_campaigns = []
            for campaign_name, camp_stats in user_data['campaigns'].items():
                if camp_stats['sent']:
                    user_data['total_sends'] += 1
                    user_campaigns.append(campaign_name)

                    if camp_stats['opened']:
                        user_data['unique_opens'] += 1
                        user_data['total_opens'] += camp_stats['open_count']

                    if camp_stats['clicked']:
                        user_data['unique_clicks'] += 1
                        user_data['total_clicks'] += camp_stats['click_count']

            unique_open_rate = round((user_data['unique_opens'] / user_data['total_sends'] * 100), 2) if user_data['total_sends'] > 0 else 0
            total_open_rate = round((user_data['total_opens'] / user_data['total_sends'] * 100), 2) if user_data['total_sends'] > 0 else 0
            unique_click_rate = round((user_data['unique_clicks'] / user_data['unique_opens'] * 100), 2) if user_data['unique_opens'] > 0 else 0
            total_click_rate = round((user_data['total_clicks'] / user_data['total_opens'] * 100), 2) if user_data['total_opens'] > 0 else 0

            enriched_users.append({
                'email': user_data['email'],
                'npi': user_data['npi'],
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'specialty': user_data['specialty'],
                'campaigns_sent': user_campaigns,
                'campaign_count': user_data['total_sends'],
                'total_sends': user_data['total_sends'],
                'unique_opens': user_data['unique_opens'],
                'total_opens': user_data['total_opens'],
                'unique_clicks': user_data['unique_clicks'],
                'total_clicks': user_data['total_clicks'],
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

@users_bp.route('/engagement-patterns/status', methods=['GET'])
def engagement_patterns_status():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT COUNT(*) as total_users,
                   MAX(computed_at) as last_computed
            FROM user_engagement_summary
        """)
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        return jsonify({
            'success': True,
            'total_users': row['total_users'] or 0,
            'last_computed': row['last_computed'].isoformat() if row['last_computed'] else None
        }), 200
    except Exception as e:
        return jsonify({'success': True, 'total_users': 0, 'last_computed': None}), 200

@users_bp.route('/engagement-patterns/refresh', methods=['POST'])
def engagement_patterns_refresh():
    try:
        import psycopg2
        data = request.get_json() or {}
        batch_size = data.get('batch_size', 500)
        batch_offset = data.get('batch_offset', 0)
        fast_open_minutes = data.get('fast_open_minutes', 30)

        db_url = os.environ.get('DATABASE_URL')

        if batch_offset == 0:
            conn = psycopg2.connect(db_url, connect_timeout=15,
                keepalives=1, keepalives_idle=10, keepalives_interval=5, keepalives_count=5,
                options='-c statement_timeout=30000')
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(DISTINCT email) FROM campaign_interactions WHERE event_type = 'sent'")
            total_emails = cursor.fetchone()[0]
            cursor.execute("TRUNCATE TABLE user_engagement_summary")
            conn.commit()
            cursor.close()
            conn.close()
        else:
            total_emails = data.get('total_emails', 0)

        conn = psycopg2.connect(db_url, connect_timeout=15,
            keepalives=1, keepalives_idle=10, keepalives_interval=5, keepalives_count=5,
            options='-c statement_timeout=60000')
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT email FROM (
                SELECT DISTINCT email FROM campaign_interactions WHERE event_type = 'sent'
                ORDER BY email
            ) sub
            OFFSET %s LIMIT %s
        """, (batch_offset, batch_size))
        email_rows = cursor.fetchall()
        emails = [r['email'] for r in email_rows]

        if not emails:
            cursor.close()
            conn.close()
            return jsonify({
                'success': True,
                'done': True,
                'processed': batch_offset,
                'total_emails': total_emails
            }), 200

        cursor.execute("""
            WITH batch_stats AS (
                SELECT
                    ci.email,
                    COUNT(DISTINCT CASE WHEN ci.event_type = 'sent' THEN cd.campaign_base_name END) as campaigns_received,
                    COUNT(DISTINCT CASE WHEN ci.event_type = 'open' THEN cd.campaign_base_name END) as campaigns_opened,
                    COUNT(DISTINCT CASE WHEN ci.event_type = 'click' THEN cd.campaign_base_name END) as campaigns_clicked,
                    MIN(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END) as first_campaign_date,
                    MAX(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END) as last_campaign_date
                FROM campaign_interactions ci
                JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE ci.email = ANY(%s)
                GROUP BY ci.email
            )
            SELECT bs.*,
                   up.npi, up.first_name, up.last_name, up.specialty
            FROM batch_stats bs
            LEFT JOIN user_profiles up ON LOWER(up.email) = bs.email
        """, (emails,))
        base_rows = cursor.fetchall()

        if not base_rows:
            cursor.close()
            conn.close()
            return jsonify({
                'success': True,
                'done': False,
                'processed': batch_offset + len(emails),
                'total_emails': total_emails
            }), 200

        cursor.execute("""
            WITH interaction_agg AS (
                SELECT ci.email, cd.campaign_base_name,
                    MIN(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END) as sent_time,
                    MAX(CASE WHEN ci.event_type = 'open' THEN 1 ELSE 0 END) as was_opened
                FROM campaign_interactions ci
                JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE ci.email = ANY(%s)
                GROUP BY ci.email, cd.campaign_base_name
            ),
            campaign_timeline AS (
                SELECT email, was_opened,
                    ROW_NUMBER() OVER (PARTITION BY email ORDER BY sent_time) as seq,
                    ROW_NUMBER() OVER (PARTITION BY email ORDER BY sent_time DESC) as rev_seq,
                    COUNT(*) OVER (PARTITION BY email) as total
                FROM interaction_agg
                WHERE sent_time IS NOT NULL
            )
            SELECT email,
                AVG(CASE WHEN seq <= total * 0.4 THEN was_opened::float END) as early_rate,
                AVG(CASE WHEN seq > total * 0.6 THEN was_opened::float END) as late_rate,
                SUM(CASE WHEN rev_seq <= 5 THEN was_opened ELSE 0 END) as recent_opens,
                CASE WHEN MAX(total) > 5 THEN
                    SUM(CASE WHEN rev_seq > 5 THEN was_opened ELSE 0 END)::float /
                    NULLIF(COUNT(CASE WHEN rev_seq > 5 THEN 1 END), 0)
                ELSE NULL END as historical_open_rate,
                SUM(CASE WHEN seq <= 3 THEN was_opened ELSE 0 END) as first_three_opens,
                SUM(CASE WHEN seq > 3 THEN was_opened ELSE 0 END) as later_opens
            FROM campaign_timeline
            GROUP BY email
        """, (emails,))
        timeline_rows = {r['email']: dict(r) for r in cursor.fetchall()}

        cursor.execute("""
            WITH open_timing AS (
                SELECT ci.email,
                    MIN(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END) as sent_time,
                    MIN(CASE WHEN ci.event_type = 'open' THEN ci.timestamp END) as first_open
                FROM campaign_interactions ci
                WHERE ci.email = ANY(%s) AND ci.event_type IN ('sent', 'open')
                GROUP BY ci.email, ci.campaign_id
                HAVING MIN(CASE WHEN ci.event_type = 'open' THEN ci.timestamp END) IS NOT NULL
                    AND MIN(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END) IS NOT NULL
            )
            SELECT email,
                AVG(EXTRACT(EPOCH FROM (first_open - sent_time)) / 60) as avg_open_minutes,
                SUM(CASE WHEN EXTRACT(EPOCH FROM (first_open - sent_time)) / 60 <= %s THEN 1 ELSE 0 END) as fast_opens
            FROM open_timing
            WHERE first_open > sent_time
            GROUP BY email
        """, (emails, fast_open_minutes))
        timing_rows = {r['email']: dict(r) for r in cursor.fetchall()}

        cursor.execute("""
            WITH open_events AS (
                SELECT ci.email, ci.timestamp,
                    LAG(ci.timestamp) OVER (PARTITION BY ci.email ORDER BY ci.timestamp) as prev_open
                FROM campaign_interactions ci
                WHERE ci.event_type = 'open' AND ci.email = ANY(%s)
            )
            SELECT email,
                COUNT(*) as total_opens,
                SUM(CASE WHEN EXTRACT(EPOCH FROM (timestamp - prev_open)) <= 1800 THEN 1 ELSE 0 END) as rapid_opens,
                COUNT(DISTINCT CASE WHEN EXTRACT(EPOCH FROM (timestamp - prev_open)) <= 1800
                    THEN DATE_TRUNC('hour', timestamp) END) as binge_sessions
            FROM open_events
            WHERE prev_open IS NOT NULL
            GROUP BY email
        """, (emails,))
        binge_rows = {r['email']: dict(r) for r in cursor.fetchall()}

        cursor.execute("""
            WITH sent_times AS (
                SELECT email, campaign_id, MIN(timestamp) as sent_time
                FROM campaign_interactions
                WHERE event_type = 'sent' AND email = ANY(%s)
                GROUP BY email, campaign_id
            ),
            delayed AS (
                SELECT ci.email,
                    EXTRACT(DOW FROM ci.timestamp) as dow,
                    EXTRACT(HOUR FROM ci.timestamp) as hour_of_day
                FROM campaign_interactions ci
                JOIN sent_times st ON ci.email = st.email AND ci.campaign_id = st.campaign_id
                WHERE ci.event_type = 'open'
                    AND ci.timestamp > st.sent_time + INTERVAL '4 hours'
            )
            SELECT email,
                COUNT(*) as delayed_opens,
                SUM(CASE WHEN dow IN (0, 6) THEN 1 ELSE 0 END) as weekend_opens,
                SUM(CASE WHEN dow NOT IN (0, 6) THEN 1 ELSE 0 END) as weekday_opens,
                AVG(hour_of_day) as avg_hour,
                SUM(CASE WHEN hour_of_day BETWEEN 5 AND 9 THEN 1 ELSE 0 END) as early_morning_opens,
                SUM(CASE WHEN hour_of_day BETWEEN 20 AND 23 OR hour_of_day BETWEEN 0 AND 4 THEN 1 ELSE 0 END) as night_opens
            FROM delayed
            GROUP BY email
        """, (emails,))
        delayed_rows = {r['email']: dict(r) for r in cursor.fetchall()}

        insert_values = []
        for row in base_rows:
            email = row['email']
            t = timeline_rows.get(email, {})
            tm = timing_rows.get(email, {})
            b = binge_rows.get(email, {})
            d = delayed_rows.get(email, {})

            cr = row['campaigns_received'] or 0
            co = row['campaigns_opened'] or 0
            cc = row['campaigns_clicked'] or 0

            insert_values.append((
                email,
                row.get('npi'), row.get('first_name'), row.get('last_name'), row.get('specialty'),
                cr, co, cc,
                round(co / cr * 100, 2) if cr > 0 else 0,
                round(cc / co * 100, 2) if co > 0 else 0,
                row.get('first_campaign_date'), row.get('last_campaign_date'),
                round((t.get('early_rate') or 0) * 100, 2) if t.get('early_rate') is not None else None,
                round((t.get('late_rate') or 0) * 100, 2) if t.get('late_rate') is not None else None,
                t.get('recent_opens', 0),
                round((t.get('historical_open_rate') or 0) * 100, 2) if t.get('historical_open_rate') is not None else None,
                t.get('first_three_opens', 0),
                t.get('later_opens', 0),
                round(float(tm.get('avg_open_minutes') or 0), 1) if tm.get('avg_open_minutes') else None,
                tm.get('fast_opens', 0),
                b.get('total_opens', 0),
                b.get('rapid_opens', 0),
                b.get('binge_sessions', 0),
                d.get('delayed_opens', 0),
                d.get('weekend_opens', 0),
                d.get('weekday_opens', 0),
                round(float(d.get('avg_hour') or 0), 1) if d.get('avg_hour') is not None else None,
                d.get('early_morning_opens', 0),
                d.get('night_opens', 0)
            ))

        if insert_values:
            from psycopg2.extras import execute_values
            execute_values(cursor, """
                INSERT INTO user_engagement_summary (
                    email, npi, first_name, last_name, specialty,
                    campaigns_received, campaigns_opened, campaigns_clicked,
                    unique_open_rate, unique_click_rate,
                    first_campaign_date, last_campaign_date,
                    early_open_rate, late_open_rate,
                    recent_opens, historical_open_rate,
                    first_three_opens, later_opens,
                    avg_open_minutes, fast_opens,
                    total_opens, rapid_opens, binge_sessions,
                    delayed_opens, weekend_opens, weekday_opens,
                    avg_open_hour, early_morning_opens, night_opens
                ) VALUES %s
                ON CONFLICT (email) DO UPDATE SET
                    npi = EXCLUDED.npi, first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name, specialty = EXCLUDED.specialty,
                    campaigns_received = EXCLUDED.campaigns_received,
                    campaigns_opened = EXCLUDED.campaigns_opened,
                    campaigns_clicked = EXCLUDED.campaigns_clicked,
                    unique_open_rate = EXCLUDED.unique_open_rate,
                    unique_click_rate = EXCLUDED.unique_click_rate,
                    first_campaign_date = EXCLUDED.first_campaign_date,
                    last_campaign_date = EXCLUDED.last_campaign_date,
                    early_open_rate = EXCLUDED.early_open_rate,
                    late_open_rate = EXCLUDED.late_open_rate,
                    recent_opens = EXCLUDED.recent_opens,
                    historical_open_rate = EXCLUDED.historical_open_rate,
                    first_three_opens = EXCLUDED.first_three_opens,
                    later_opens = EXCLUDED.later_opens,
                    avg_open_minutes = EXCLUDED.avg_open_minutes,
                    fast_opens = EXCLUDED.fast_opens,
                    total_opens = EXCLUDED.total_opens,
                    rapid_opens = EXCLUDED.rapid_opens,
                    binge_sessions = EXCLUDED.binge_sessions,
                    delayed_opens = EXCLUDED.delayed_opens,
                    weekend_opens = EXCLUDED.weekend_opens,
                    weekday_opens = EXCLUDED.weekday_opens,
                    avg_open_hour = EXCLUDED.avg_open_hour,
                    early_morning_opens = EXCLUDED.early_morning_opens,
                    night_opens = EXCLUDED.night_opens,
                    computed_at = NOW()
            """, insert_values)
            conn.commit()

        cursor.close()
        conn.close()

        new_offset = batch_offset + len(emails)
        return jsonify({
            'success': True,
            'done': new_offset >= total_emails,
            'processed': new_offset,
            'total_emails': total_emails,
            'batch_size': batch_size
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@users_bp.route('/engagement-patterns', methods=['POST'])
def engagement_patterns():
    try:
        data = request.get_json()

        pattern_type = data.get('pattern_type', 'infrequent_responders')
        min_campaigns = data.get('min_campaigns', 10)
        export_csv = data.get('export_csv', False)

        infrequent_threshold = data.get('infrequent_threshold', 10)
        hyper_engaged_threshold = data.get('hyper_engaged_threshold', 70)
        fast_open_minutes = data.get('fast_open_minutes', 30)

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        base_filter = "WHERE campaigns_received >= %s"

        if pattern_type == 'infrequent_responders':
            query = f"""
                SELECT email, npi, first_name, last_name, specialty,
                    campaigns_received, campaigns_opened, unique_open_rate
                FROM user_engagement_summary
                {base_filter} AND campaigns_opened > 0 AND unique_open_rate <= %s
                ORDER BY unique_open_rate ASC, campaigns_received DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns, infrequent_threshold))

        elif pattern_type == 'hyper_engaged':
            query = f"""
                SELECT email, npi, first_name, last_name, specialty,
                    campaigns_received, campaigns_opened, unique_open_rate
                FROM user_engagement_summary
                {base_filter} AND unique_open_rate >= %s
                ORDER BY unique_open_rate DESC, campaigns_received DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns, hyper_engaged_threshold))

        elif pattern_type == 'heavy_inactive':
            query = f"""
                SELECT email, npi, first_name, last_name, specialty,
                    campaigns_received
                FROM user_engagement_summary
                {base_filter} AND campaigns_opened = 0
                ORDER BY campaigns_received DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'click_champions':
            query = f"""
                SELECT email, npi, first_name, last_name, specialty,
                    campaigns_received, campaigns_clicked, unique_click_rate
                FROM user_engagement_summary
                {base_filter} AND campaigns_clicked > 0 AND unique_click_rate >= 30
                ORDER BY unique_click_rate DESC, campaigns_clicked DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'declining_engagement':
            query = f"""
                SELECT email, npi, first_name, last_name, specialty,
                    campaigns_received as total_campaigns,
                    early_open_rate, late_open_rate,
                    ROUND((early_open_rate - late_open_rate)::numeric, 2) as engagement_decline
                FROM user_engagement_summary
                {base_filter}
                    AND early_open_rate IS NOT NULL AND late_open_rate IS NOT NULL
                    AND early_open_rate > late_open_rate
                    AND (early_open_rate - late_open_rate) >= 20
                ORDER BY engagement_decline DESC, campaigns_received DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'recently_reengaged':
            query = f"""
                SELECT email, npi, first_name, last_name, specialty,
                    campaigns_received as total_campaigns,
                    recent_opens,
                    ROUND((recent_opens::numeric / 5 * 100), 2) as recent_open_rate,
                    ROUND(historical_open_rate::numeric, 2) as historical_open_rate
                FROM user_engagement_summary
                {base_filter}
                    AND recent_opens >= 2
                    AND historical_open_rate IS NOT NULL
                    AND historical_open_rate < 20
                ORDER BY recent_opens DESC, historical_open_rate ASC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'one_and_done':
            query = f"""
                SELECT email, npi, first_name, last_name, specialty,
                    campaigns_received as total_campaigns,
                    first_three_opens, later_opens
                FROM user_engagement_summary
                {base_filter}
                    AND first_three_opens >= 1 AND later_opens = 0
                ORDER BY first_three_opens DESC, campaigns_received DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'fast_openers':
            query = f"""
                SELECT email, npi, first_name, last_name, specialty,
                    campaigns_opened,
                    avg_open_minutes,
                    fast_opens,
                    ROUND((fast_opens::numeric / NULLIF(campaigns_opened, 0) * 100), 2) as fast_open_rate
                FROM user_engagement_summary
                {base_filter} AND campaigns_opened > 0 AND fast_opens >= 2
                ORDER BY fast_open_rate DESC, avg_open_minutes ASC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'binge_readers':
            query = f"""
                SELECT email, npi, first_name, last_name, specialty,
                    total_opens, rapid_opens, binge_sessions,
                    ROUND((rapid_opens::numeric / NULLIF(total_opens, 0) * 100), 2) as binge_rate
                FROM user_engagement_summary
                {base_filter} AND total_opens > 0 AND rapid_opens >= 3
                ORDER BY binge_rate DESC, rapid_opens DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'weekend_warriors':
            query = f"""
                SELECT email, npi, first_name, last_name, specialty,
                    delayed_opens as total_delayed_opens,
                    weekend_opens, weekday_opens,
                    ROUND((weekend_opens::numeric / NULLIF(delayed_opens, 0) * 100), 2) as weekend_open_rate
                FROM user_engagement_summary
                {base_filter} AND delayed_opens > 0 AND weekend_opens > weekday_opens
                ORDER BY weekend_open_rate DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'early_birds_night_owls':
            query = f"""
                SELECT email, npi, first_name, last_name, specialty,
                    delayed_opens as total_delayed_opens,
                    avg_open_hour as avg_hour,
                    early_morning_opens, night_opens,
                    CASE WHEN avg_open_hour >= 5 AND avg_open_hour <= 9 THEN 'Early Bird'
                         WHEN avg_open_hour >= 20 OR avg_open_hour <= 4 THEN 'Night Owl'
                         ELSE 'Midday' END as reader_type
                FROM user_engagement_summary
                {base_filter} AND delayed_opens > 0 AND (early_morning_opens > 0 OR night_opens > 0)
                ORDER BY avg_open_hour ASC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        else:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'error': f'Unknown pattern type: {pattern_type}'}), 400

        raw_results = cursor.fetchall()
        results = [dict(row) for row in raw_results]
        cursor.close()
        conn.close()

        summary = {
            'pattern_type': pattern_type,
            'total_users': len(results),
            'parameters': {
                'min_campaigns': min_campaigns,
                'infrequent_threshold': infrequent_threshold if pattern_type == 'infrequent_responders' else None,
                'hyper_engaged_threshold': hyper_engaged_threshold if pattern_type == 'hyper_engaged' else None,
                'fast_open_minutes': fast_open_minutes if pattern_type == 'fast_openers' else None
            }
        }

        if export_csv:
            output = io.StringIO()
            writer = csv.writer(output)

            if results:
                headers = list(results[0].keys())
                writer.writerow(headers)
                for user in results:
                    writer.writerow([user.get(h, '') for h in headers])
            else:
                writer.writerow(['No results'])

            output.seek(0)
            response = make_response(output.getvalue())
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = f'attachment; filename=engagement_pattern_{pattern_type}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            return response

        return jsonify({'success': True, 'summary': summary, 'users': results}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@users_bp.route('/engagement-query', methods=['POST'])
def engagement_query():
    try:
        data = request.get_json()

        specialty_list = data.get('specialty_list', [])
        campaign_list = data.get('campaign_list', [])
        engagement_type = data.get('engagement_type', 'all')
        specialty_merge_mode = data.get('specialty_merge_mode', False)
        search_mode = data.get('search_mode', 'specialty')
        export_csv = data.get('export_csv', False)

        print(f"[ENGAGEMENT-QUERY] Mode: {search_mode}, Campaigns: {campaign_list}, Specialties: {specialty_list}")

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        params = []

        if search_mode == 'specialty':
            query = """
                SELECT
                    ci.email as email,
                    up.npi,
                    COALESCE(up.first_name, '') as first_name,
                    COALESCE(up.last_name, '') as last_name,
                    COALESCE(up.specialty, 'Unknown') as specialty,
                    cd.campaign_base_name,
                    ci.event_type,
                    COUNT(*) as event_count
                FROM campaign_interactions ci
                JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                LEFT JOIN user_profiles up ON ci.email = LOWER(up.email)
                WHERE 1=1
            """

            if specialty_list:
                if specialty_merge_mode:
                    specialty_conditions = []
                    for spec in specialty_list:
                        specialty_conditions.append("up.specialty LIKE %s")
                        params.append(f"{spec}%")
                    query += f" AND ({' OR '.join(specialty_conditions)})"
                else:
                    placeholders = ','.join(['%s'] * len(specialty_list))
                    query += f" AND up.specialty IN ({placeholders})"
                    params.extend(specialty_list)

            if campaign_list:
                campaign_conditions = []
                for campaign_name in campaign_list:
                    campaign_conditions.append("cd.campaign_base_name LIKE %s")
                    params.append(f"{campaign_name}%")
                query += f" AND ({' OR '.join(campaign_conditions)})"

            query += """
                GROUP BY ci.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name, ci.event_type
                ORDER BY ci.email, cd.campaign_base_name
            """

        else:
            query = """
                SELECT
                    ci.email as email,
                    up.npi,
                    COALESCE(up.first_name, '') as first_name,
                    COALESCE(up.last_name, '') as last_name,
                    COALESCE(up.specialty, 'Unknown') as specialty,
                    cd.campaign_base_name,
                    ci.event_type,
                    COUNT(*) as event_count
                FROM campaign_deployments cd
                JOIN campaign_interactions ci ON cd.campaign_id = ci.campaign_id
                LEFT JOIN user_profiles up ON ci.email = LOWER(up.email)
                WHERE 1=1
            """

            if campaign_list:
                campaign_conditions = []
                for campaign_name in campaign_list:
                    campaign_conditions.append("cd.campaign_base_name LIKE %s")
                    params.append(f"{campaign_name}%")
                query += f" AND ({' OR '.join(campaign_conditions)})"

            query += """
                GROUP BY ci.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name, ci.event_type
                ORDER BY ci.email, cd.campaign_base_name
            """

        cursor.execute(query, params)
        raw_data = cursor.fetchall()

        print(f"[ENGAGEMENT-QUERY] Query returned {len(raw_data)} rows")
        if len(raw_data) == 0 and search_mode == 'campaign':
            cursor.execute("""
                SELECT full_campaign_name
                FROM campaign_deployments
                WHERE full_campaign_name LIKE %s
                LIMIT 5
            """, (f"%{campaign_list[0].split()[0]}%" if campaign_list else "%",))
            similar = cursor.fetchall()
            print(f"[DEBUG] Similar campaigns in DB: {[r['full_campaign_name'] for r in similar]}")

        users_data = {}

        for row in raw_data:
            email = row['email'].lower()
            campaign_name = row['campaign_base_name']
            event_type = row['event_type'].lower()
            event_count = row['event_count']

            if email not in users_data:
                user_specialty = row['specialty'] or ''
                if specialty_merge_mode and user_specialty:
                    user_specialty = user_specialty.split(' - ')[0].strip()

                print(f"[DEBUG] Creating user {email}, NPI from DB: {row.get('npi')}")

                users_data[email] = {
                    'email': email,
                    'npi': row['npi'],
                    'first_name': row['first_name'],
                    'last_name': row['last_name'],
                    'specialty': user_specialty,
                    'has_profile': row['npi'] is not None or (row['first_name'] != '' and row['last_name'] != ''),
                    'campaigns': {},
                    'total_sends': 0,
                    'unique_opens': 0,
                    'total_opens': 0,
                    'unique_clicks': 0,
                    'total_clicks': 0
                }

            if campaign_name not in users_data[email]['campaigns']:
                users_data[email]['campaigns'][campaign_name] = {
                    'sent': False,
                    'bounced': False,
                    'delivered': False,
                    'opened': False,
                    'clicked': False,
                    'open_count': 0,
                    'click_count': 0
                }

            if event_type == 'sent':
                users_data[email]['campaigns'][campaign_name]['sent'] = True
            elif event_type == 'bounce':
                users_data[email]['campaigns'][campaign_name]['bounced'] = True
            elif event_type == 'open':
                users_data[email]['campaigns'][campaign_name]['opened'] = True
                users_data[email]['campaigns'][campaign_name]['open_count'] = event_count
            elif event_type == 'click':
                users_data[email]['campaigns'][campaign_name]['clicked'] = True
                users_data[email]['campaigns'][campaign_name]['click_count'] = event_count

        enriched_users = []
        aggregate_stats = {
            'total_users': 0,
            'total_delivered': 0,
            'total_unique_opens': 0,
            'total_opens': 0,
            'total_unique_clicks': 0,
            'total_clicks': 0,
            'users_without_profile': 0,
            'specialties': set(),
            'campaigns': set()
        }

        for email, user_data in users_data.items():
            user_campaigns = []
            total_delivered = 0

            for campaign_name, camp_stats in user_data['campaigns'].items():
                if camp_stats['sent']:
                    is_delivered = not camp_stats['bounced'] or camp_stats['opened']

                    if is_delivered:
                        total_delivered += 1
                        user_campaigns.append(campaign_name)

                        if camp_stats['opened']:
                            user_data['unique_opens'] += 1
                            user_data['total_opens'] += camp_stats['open_count']

                        if camp_stats['clicked']:
                            user_data['unique_clicks'] += 1
                            user_data['total_clicks'] += camp_stats['click_count']

            if total_delivered == 0:
                continue

            unique_open_rate = round((user_data['unique_opens'] / total_delivered * 100), 2) if total_delivered > 0 else 0
            total_open_rate = round((user_data['total_opens'] / total_delivered * 100), 2) if total_delivered > 0 else 0
            unique_click_rate = round((user_data['unique_clicks'] / user_data['unique_opens'] * 100), 2) if user_data['unique_opens'] > 0 else 0
            total_click_rate = round((user_data['total_clicks'] / user_data['total_opens'] * 100), 2) if user_data['total_opens'] > 0 else 0

            if engagement_type == 'opened':
                if user_data['unique_opens'] == 0:
                    continue
            elif engagement_type == 'unopened':
                if user_data['unique_opens'] > 0:
                    continue

            enriched_users.append({
                'email': user_data['email'],
                'npi': user_data['npi'],
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'specialty': user_data['specialty'],
                'has_profile': user_data['has_profile'],
                'campaigns_sent': user_campaigns,
                'campaign_count': total_delivered,
                'unique_opens': user_data['unique_opens'],
                'total_opens': user_data['total_opens'],
                'unique_clicks': user_data['unique_clicks'],
                'total_clicks': user_data['total_clicks'],
                'unique_open_rate': unique_open_rate,
                'total_open_rate': total_open_rate,
                'unique_click_rate': unique_click_rate,
                'total_click_rate': total_click_rate
            })

            aggregate_stats['total_users'] += 1
            aggregate_stats['total_delivered'] += total_delivered
            aggregate_stats['total_unique_opens'] += user_data['unique_opens']
            aggregate_stats['total_opens'] += user_data['total_opens']
            aggregate_stats['total_unique_clicks'] += user_data['unique_clicks']
            aggregate_stats['total_clicks'] += user_data['total_clicks']
            aggregate_stats['specialties'].add(user_data['specialty'])
            aggregate_stats['campaigns'].update(user_campaigns)
            if not user_data['has_profile']:
                aggregate_stats['users_without_profile'] += 1

        cursor.close()
        conn.close()

        aggregate_stats['avg_unique_open_rate'] = round(
            (aggregate_stats['total_unique_opens'] / aggregate_stats['total_delivered'] * 100), 2
        ) if aggregate_stats['total_delivered'] > 0 else 0

        aggregate_stats['avg_total_open_rate'] = round(
            (aggregate_stats['total_opens'] / aggregate_stats['total_delivered'] * 100), 2
        ) if aggregate_stats['total_delivered'] > 0 else 0

        aggregate_stats['avg_unique_click_rate'] = round(
            (aggregate_stats['total_unique_clicks'] / aggregate_stats['total_unique_opens'] * 100), 2
        ) if aggregate_stats['total_unique_opens'] > 0 else 0

        aggregate_stats['avg_total_click_rate'] = round(
            (aggregate_stats['total_clicks'] / aggregate_stats['total_opens'] * 100), 2
        ) if aggregate_stats['total_opens'] > 0 else 0

        aggregate_stats['specialties'] = sorted(list(aggregate_stats['specialties']))
        aggregate_stats['campaigns'] = sorted(list(aggregate_stats['campaigns']))

        if export_csv:
            print(f"[CSV EXPORT] Starting CSV export for {len(enriched_users)} users")
            output = io.StringIO()
            writer = csv.writer(output)

            writer.writerow([
                'Email', 'First Name', 'Last Name', 'Specialty',
                'Campaigns Sent', 'Campaign Count',
                'Unique Opens', 'Total Opens',
                'Unique Clicks', 'Total Clicks',
                'Unique Open Rate (%)', 'Total Open Rate (%)',
                'Unique Click Rate (%)', 'Total Click Rate (%)'
            ])

            rows_written = 0
            users_with_data = 0
            users_without_data = 0

            for user in enriched_users:
                campaign_count = user.get('campaign_count', 0)
                if campaign_count > 0:
                    users_with_data += 1
                else:
                    users_without_data += 1

                writer.writerow([
                    user.get('email', ''),
                    user.get('first_name', ''),
                    user.get('last_name', ''),
                    user.get('specialty', ''),
                    ', '.join(user.get('campaigns_sent', [])),
                    campaign_count,
                    user.get('unique_opens', 0),
                    user.get('total_opens', 0),
                    user.get('unique_clicks', 0),
                    user.get('total_clicks', 0),
                    user.get('unique_open_rate', 0),
                    user.get('total_open_rate', 0),
                    user.get('unique_click_rate', 0),
                    user.get('total_click_rate', 0)
                ])
                rows_written += 1

            print(f"[CSV EXPORT] Wrote {rows_written} rows")
            print(f"[CSV EXPORT] Users with data: {users_with_data}, without data: {users_without_data}")

            output.seek(0)
            response = make_response(output.getvalue())
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = f'attachment; filename=user_engagement_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            return response

        return jsonify({
            'success': True,
            'total_count': len(enriched_users),
            'users': enriched_users,
            'aggregate': aggregate_stats
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500