from flask import Blueprint, request, jsonify, make_response
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime
import csv
import io
import json

users_bp = Blueprint('users', __name__)

def get_db_connection():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    return conn

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

        placeholders = ','.join(['%s'] * len(user_list))

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
                LEFT JOIN campaign_interactions ci ON up.email = ci.email
                LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE up.email IN ({placeholders})
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
                LEFT JOIN campaign_interactions ci ON up.email = ci.email
                LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE up.npi IN ({placeholders})
                GROUP BY up.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name, ci.event_type
                ORDER BY up.email, cd.campaign_base_name
            """

        cursor.execute(query, user_list)
        raw_data = cursor.fetchall()

        users_data = {}

        for row in raw_data:
            email = row['email']
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

@users_bp.route('/engagement-patterns', methods=['POST'])
def engagement_patterns():
    try:
        data = request.get_json()

        pattern_type = data.get('pattern_type', 'infrequent_responders')
        min_campaigns = data.get('min_campaigns', 5)
        export_csv = data.get('export_csv', False)

        infrequent_threshold = data.get('infrequent_threshold', 30)
        hyper_engaged_threshold = data.get('hyper_engaged_threshold', 70)
        fast_open_minutes = data.get('fast_open_minutes', 30)

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if pattern_type == 'infrequent_responders':
            query = """
                WITH user_stats AS (
                    SELECT
                        up.email, up.npi, up.first_name, up.last_name, up.specialty,
                        COUNT(DISTINCT CASE WHEN ci.event_type = 'sent' THEN cd.campaign_base_name END) as campaigns_received,
                        COUNT(DISTINCT CASE WHEN ci.event_type = 'open' THEN cd.campaign_base_name END) as campaigns_opened,
                        COUNT(DISTINCT CASE WHEN ci.event_type = 'click' THEN cd.campaign_base_name END) as campaigns_clicked,
                        COUNT(CASE WHEN ci.event_type = 'open' THEN 1 END) as total_opens,
                        COUNT(CASE WHEN ci.event_type = 'click' THEN 1 END) as total_clicks
                    FROM user_profiles up
                    JOIN campaign_interactions ci ON up.email = ci.email
                    JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                    GROUP BY up.email, up.npi, up.first_name, up.last_name, up.specialty
                )
                SELECT email, npi, first_name, last_name, specialty, campaigns_received, campaigns_opened, campaigns_clicked, total_opens, total_clicks,
                    ROUND((campaigns_opened::numeric / NULLIF(campaigns_received, 0) * 100), 2) as unique_open_rate,
                    ROUND((total_opens::numeric / NULLIF(campaigns_received, 0) * 100), 2) as total_open_rate,
                    ROUND((campaigns_clicked::numeric / NULLIF(campaigns_opened, 0) * 100), 2) as unique_click_rate,
                    ROUND((total_clicks::numeric / NULLIF(total_opens, 0) * 100), 2) as total_click_rate
                FROM user_stats
                WHERE campaigns_received >= %s AND campaigns_opened > 0
                    AND (campaigns_opened::numeric / NULLIF(campaigns_received, 0) * 100) <= %s
                ORDER BY unique_open_rate ASC, campaigns_received DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns, infrequent_threshold))

        elif pattern_type == 'hyper_engaged':
            query = """
                WITH user_stats AS (
                    SELECT up.email, up.npi, up.first_name, up.last_name, up.specialty,
                        COUNT(DISTINCT CASE WHEN ci.event_type = 'sent' THEN cd.campaign_base_name END) as campaigns_received,
                        COUNT(DISTINCT CASE WHEN ci.event_type = 'open' THEN cd.campaign_base_name END) as campaigns_opened,
                        COUNT(DISTINCT CASE WHEN ci.event_type = 'click' THEN cd.campaign_base_name END) as campaigns_clicked,
                        COUNT(CASE WHEN ci.event_type = 'open' THEN 1 END) as total_opens,
                        COUNT(CASE WHEN ci.event_type = 'click' THEN 1 END) as total_clicks
                    FROM user_profiles up
                    JOIN campaign_interactions ci ON up.email = ci.email
                    JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                    GROUP BY up.email, up.npi, up.first_name, up.last_name, up.specialty
                )
                SELECT email, npi, first_name, last_name, specialty, campaigns_received, campaigns_opened, campaigns_clicked, total_opens, total_clicks,
                    ROUND((campaigns_opened::numeric / NULLIF(campaigns_received, 0) * 100), 2) as unique_open_rate,
                    ROUND((total_opens::numeric / NULLIF(campaigns_received, 0) * 100), 2) as total_open_rate,
                    ROUND((campaigns_clicked::numeric / NULLIF(campaigns_opened, 0) * 100), 2) as unique_click_rate,
                    ROUND((total_clicks::numeric / NULLIF(total_opens, 0) * 100), 2) as total_click_rate
                FROM user_stats
                WHERE campaigns_received >= %s AND (campaigns_opened::numeric / NULLIF(campaigns_received, 0) * 100) >= %s
                ORDER BY unique_open_rate DESC, campaigns_received DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns, hyper_engaged_threshold))

        elif pattern_type == 'heavy_inactive':
            query = """
                WITH user_stats AS (
                    SELECT up.email, up.npi, up.first_name, up.last_name, up.specialty,
                        COUNT(DISTINCT CASE WHEN ci.event_type = 'sent' THEN cd.campaign_base_name END) as campaigns_received,
                        COUNT(DISTINCT CASE WHEN ci.event_type = 'open' THEN cd.campaign_base_name END) as campaigns_opened,
                        COUNT(DISTINCT CASE WHEN ci.event_type = 'click' THEN cd.campaign_base_name END) as campaigns_clicked,
                        COUNT(CASE WHEN ci.event_type = 'open' THEN 1 END) as total_opens,
                        COUNT(CASE WHEN ci.event_type = 'click' THEN 1 END) as total_clicks
                    FROM user_profiles up
                    JOIN campaign_interactions ci ON up.email = ci.email
                    JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                    GROUP BY up.email, up.npi, up.first_name, up.last_name, up.specialty
                )
                SELECT email, npi, first_name, last_name, specialty, campaigns_received, campaigns_opened, campaigns_clicked, total_opens, total_clicks,
                    0 as unique_open_rate, 0 as total_open_rate, 0 as unique_click_rate, 0 as total_click_rate
                FROM user_stats
                WHERE campaigns_received >= %s AND campaigns_opened = 0
                ORDER BY campaigns_received DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'click_champions':
            query = """
                WITH user_stats AS (
                    SELECT up.email, up.npi, up.first_name, up.last_name, up.specialty,
                        COUNT(DISTINCT CASE WHEN ci.event_type = 'sent' THEN cd.campaign_base_name END) as campaigns_received,
                        COUNT(DISTINCT CASE WHEN ci.event_type = 'open' THEN cd.campaign_base_name END) as campaigns_opened,
                        COUNT(DISTINCT CASE WHEN ci.event_type = 'click' THEN cd.campaign_base_name END) as campaigns_clicked,
                        COUNT(CASE WHEN ci.event_type = 'open' THEN 1 END) as total_opens,
                        COUNT(CASE WHEN ci.event_type = 'click' THEN 1 END) as total_clicks
                    FROM user_profiles up
                    JOIN campaign_interactions ci ON up.email = ci.email
                    JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                    GROUP BY up.email, up.npi, up.first_name, up.last_name, up.specialty
                )
                SELECT email, npi, first_name, last_name, specialty, campaigns_received, campaigns_opened, campaigns_clicked, total_opens, total_clicks,
                    ROUND((campaigns_opened::numeric / NULLIF(campaigns_received, 0) * 100), 2) as unique_open_rate,
                    ROUND((total_opens::numeric / NULLIF(campaigns_received, 0) * 100), 2) as total_open_rate,
                    ROUND((campaigns_clicked::numeric / NULLIF(campaigns_opened, 0) * 100), 2) as unique_click_rate,
                    ROUND((total_clicks::numeric / NULLIF(total_opens, 0) * 100), 2) as total_click_rate
                FROM user_stats
                WHERE campaigns_received >= %s AND campaigns_clicked > 0
                    AND (campaigns_clicked::numeric / NULLIF(campaigns_opened, 0) * 100) >= 30
                ORDER BY unique_click_rate DESC, total_clicks DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'declining_engagement':
            query = """
                WITH campaign_timeline AS (
                    SELECT up.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name,
                        MIN(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END) as sent_time,
                        MAX(CASE WHEN ci.event_type = 'open' THEN 1 ELSE 0 END) as was_opened,
                        ROW_NUMBER() OVER (PARTITION BY up.email ORDER BY MIN(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END)) as campaign_sequence
                    FROM user_profiles up
                    JOIN campaign_interactions ci ON up.email = ci.email
                    JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                    GROUP BY up.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name
                ),
                early_late_comparison AS (
                    SELECT email, npi, first_name, last_name, specialty, COUNT(*) as total_campaigns,
                        AVG(CASE WHEN campaign_sequence <= (COUNT(*) OVER (PARTITION BY email) * 0.4) THEN was_opened ELSE NULL END) as early_open_rate,
                        AVG(CASE WHEN campaign_sequence > (COUNT(*) OVER (PARTITION BY email) * 0.6) THEN was_opened ELSE NULL END) as late_open_rate
                    FROM campaign_timeline GROUP BY email, npi, first_name, last_name, specialty
                )
                SELECT email, npi, first_name, last_name, specialty, total_campaigns,
                    ROUND((early_open_rate * 100)::numeric, 2) as early_open_rate,
                    ROUND((late_open_rate * 100)::numeric, 2) as late_open_rate,
                    ROUND(((early_open_rate - late_open_rate) * 100)::numeric, 2) as engagement_decline
                FROM early_late_comparison
                WHERE total_campaigns >= %s AND early_open_rate > late_open_rate AND (early_open_rate - late_open_rate) >= 0.2
                ORDER BY engagement_decline DESC, total_campaigns DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'recently_reengaged':
            query = """
                WITH campaign_timeline AS (
                    SELECT up.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name,
                        MIN(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END) as sent_time,
                        MAX(CASE WHEN ci.event_type = 'open' THEN 1 ELSE 0 END) as was_opened,
                        ROW_NUMBER() OVER (PARTITION BY up.email ORDER BY MIN(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END) DESC) as reverse_sequence
                    FROM user_profiles up
                    JOIN campaign_interactions ci ON up.email = ci.email
                    JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                    GROUP BY up.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name
                ),
                recent_vs_historical AS (
                    SELECT email, npi, first_name, last_name, specialty, COUNT(*) as total_campaigns,
                        SUM(CASE WHEN reverse_sequence <= 5 THEN was_opened ELSE 0 END) as recent_opens,
                        SUM(CASE WHEN reverse_sequence > 5 THEN was_opened ELSE 0 END) as historical_opens,
                        COUNT(CASE WHEN reverse_sequence > 5 THEN 1 END) as historical_campaigns
                    FROM campaign_timeline GROUP BY email, npi, first_name, last_name, specialty
                )
                SELECT email, npi, first_name, last_name, specialty, total_campaigns, recent_opens, historical_opens, historical_campaigns,
                    ROUND((recent_opens::numeric / 5 * 100), 2) as recent_open_rate,
                    ROUND((historical_opens::numeric / NULLIF(historical_campaigns, 0) * 100), 2) as historical_open_rate
                FROM recent_vs_historical
                WHERE total_campaigns >= %s AND recent_opens >= 2
                    AND (historical_opens::numeric / NULLIF(historical_campaigns, 0)) < 0.2
                ORDER BY recent_opens DESC, historical_open_rate ASC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'weekend_warriors':
            query = """
                WITH open_timing AS (
                    SELECT up.email, up.npi, up.first_name, up.last_name, up.specialty,
                        ci.campaign_id, cd.campaign_base_name, ci.timestamp,
                        EXTRACT(DOW FROM ci.timestamp) as day_of_week,
                        MIN(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END) OVER (PARTITION BY up.email, ci.campaign_id) as sent_time
                    FROM user_profiles up
                    JOIN campaign_interactions ci ON up.email = ci.email
                    JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                    WHERE ci.event_type = 'open'
                ),
                opens_after_delay AS (
                    SELECT email, npi, first_name, last_name, specialty, campaign_base_name, day_of_week,
                        CASE WHEN day_of_week IN (0, 6) THEN 1 ELSE 0 END as is_weekend
                    FROM open_timing
                    WHERE timestamp > sent_time + INTERVAL '4 hours'
                ),
                user_patterns AS (
                    SELECT email, npi, first_name, last_name, specialty,
                        COUNT(DISTINCT campaign_base_name) as total_delayed_opens,
                        SUM(is_weekend) as weekend_opens,
                        COUNT(*) - SUM(is_weekend) as weekday_opens
                    FROM opens_after_delay
                    GROUP BY email, npi, first_name, last_name, specialty
                )
                SELECT email, npi, first_name, last_name, specialty, total_delayed_opens, weekend_opens, weekday_opens,
                    ROUND((weekend_opens::numeric / NULLIF(total_delayed_opens, 0) * 100), 2) as weekend_open_rate,
                    ROUND((weekday_opens::numeric / NULLIF(total_delayed_opens, 0) * 100), 2) as weekday_open_rate
                FROM user_patterns
                WHERE total_delayed_opens >= %s AND weekend_opens > weekday_opens
                ORDER BY weekend_open_rate DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'binge_readers':
            query = """
                WITH open_events AS (
                    SELECT up.email, up.npi, up.first_name, up.last_name, up.specialty,
                        ci.timestamp, cd.campaign_base_name,
                        LAG(ci.timestamp) OVER (PARTITION BY up.email ORDER BY ci.timestamp) as prev_open_time
                    FROM user_profiles up
                    JOIN campaign_interactions ci ON up.email = ci.email
                    JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                    WHERE ci.event_type = 'open'
                ),
                binge_sessions AS (
                    SELECT email, npi, first_name, last_name, specialty,
                        COUNT(DISTINCT campaign_base_name) as total_opens,
                        SUM(CASE WHEN EXTRACT(EPOCH FROM (timestamp - prev_open_time)) <= 1800 THEN 1 ELSE 0 END) as rapid_opens,
                        COUNT(DISTINCT CASE WHEN EXTRACT(EPOCH FROM (timestamp - prev_open_time)) <= 1800
                            THEN DATE_TRUNC('hour', timestamp) END) as binge_sessions
                    FROM open_events
                    WHERE prev_open_time IS NOT NULL
                    GROUP BY email, npi, first_name, last_name, specialty
                )
                SELECT email, npi, first_name, last_name, specialty, total_opens, rapid_opens, binge_sessions,
                    ROUND((rapid_opens::numeric / NULLIF(total_opens, 0) * 100), 2) as binge_rate
                FROM binge_sessions
                WHERE total_opens >= %s AND rapid_opens >= 3
                ORDER BY binge_rate DESC, rapid_opens DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'one_and_done':
            query = """
                WITH campaign_timeline AS (
                    SELECT up.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name,
                        MIN(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END) as sent_time,
                        MAX(CASE WHEN ci.event_type = 'open' THEN 1 ELSE 0 END) as was_opened,
                        ROW_NUMBER() OVER (PARTITION BY up.email ORDER BY MIN(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END)) as campaign_sequence
                    FROM user_profiles up
                    JOIN campaign_interactions ci ON up.email = ci.email
                    JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                    GROUP BY up.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name
                ),
                early_vs_later AS (
                    SELECT email, npi, first_name, last_name, specialty,
                        COUNT(*) as total_campaigns,
                        SUM(CASE WHEN campaign_sequence <= 3 THEN was_opened ELSE 0 END) as first_three_opens,
                        SUM(CASE WHEN campaign_sequence > 3 THEN was_opened ELSE 0 END) as later_opens
                    FROM campaign_timeline
                    GROUP BY email, npi, first_name, last_name, specialty
                )
                SELECT email, npi, first_name, last_name, specialty, total_campaigns, first_three_opens, later_opens,
                    ROUND((first_three_opens::numeric / 3 * 100), 2) as early_open_rate,
                    ROUND((later_opens::numeric / NULLIF(total_campaigns - 3, 0) * 100), 2) as later_open_rate
                FROM early_vs_later
                WHERE total_campaigns >= %s AND first_three_opens >= 1 AND later_opens = 0
                ORDER BY first_three_opens DESC, total_campaigns DESC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

        elif pattern_type == 'early_birds_night_owls':
            query = """
                WITH open_timing AS (
                    SELECT up.email, up.npi, up.first_name, up.last_name, up.specialty,
                        ci.timestamp, EXTRACT(HOUR FROM ci.timestamp) as hour_of_day,
                        MIN(CASE WHEN ci.event_type = 'sent' THEN ci.timestamp END) OVER (PARTITION BY up.email, ci.campaign_id) as sent_time
                    FROM user_profiles up
                    JOIN campaign_interactions ci ON up.email = ci.email
                    JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                    WHERE ci.event_type = 'open'
                ),
                delayed_opens AS (
                    SELECT email, npi, first_name, last_name, specialty, hour_of_day
                    FROM open_timing
                    WHERE timestamp > sent_time + INTERVAL '4 hours'
                ),
                user_patterns AS (
                    SELECT email, npi, first_name, last_name, specialty,
                        COUNT(*) as total_delayed_opens,
                        AVG(hour_of_day) as avg_hour,
                        SUM(CASE WHEN hour_of_day BETWEEN 5 AND 9 THEN 1 ELSE 0 END) as early_morning_opens,
                        SUM(CASE WHEN hour_of_day BETWEEN 20 AND 23 THEN 1 ELSE 0 END) as night_opens
                    FROM delayed_opens
                    GROUP BY email, npi, first_name, last_name, specialty
                )
                SELECT email, npi, first_name, last_name, specialty, total_delayed_opens,
                    ROUND(avg_hour::numeric, 1) as avg_hour,
                    early_morning_opens, night_opens,
                    CASE WHEN avg_hour < 10 THEN 'Early Bird' WHEN avg_hour > 18 THEN 'Night Owl' ELSE 'Midday' END as reader_type
                FROM user_patterns
                WHERE total_delayed_opens >= %s AND (early_morning_opens > 0 OR night_opens > 0)
                ORDER BY avg_hour ASC LIMIT 1000
            """
            cursor.execute(query, (min_campaigns,))

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

            if pattern_type == 'declining_engagement':
                headers = ['Email', 'NPI', 'First Name', 'Last Name', 'Specialty', 'Total Campaigns', 'Early Open Rate (%)', 'Late Open Rate (%)', 'Engagement Decline (%)']
                writer.writerow(headers)
                for user in results:
                    writer.writerow([user.get('email', ''), user.get('npi', ''), user.get('first_name', ''), user.get('last_name', ''), user.get('specialty', ''),
                                   user.get('total_campaigns', 0), user.get('early_open_rate', 0), user.get('late_open_rate', 0), user.get('engagement_decline', 0)])
            else:
                headers = ['Email', 'NPI', 'First Name', 'Last Name', 'Specialty', 'Campaigns Received', 'Campaigns Opened', 'Campaigns Clicked',
                          'Total Opens', 'Total Clicks', 'Unique Open Rate (%)', 'Total Open Rate (%)', 'Unique Click Rate (%)', 'Total Click Rate (%)']
                writer.writerow(headers)
                for user in results:
                    writer.writerow([user.get('email', ''), user.get('npi', ''), user.get('first_name', ''), user.get('last_name', ''), user.get('specialty', ''),
                                   user.get('campaigns_received', 0), user.get('campaigns_opened', 0), user.get('campaigns_clicked', 0), user.get('total_opens', 0),
                                   user.get('total_clicks', 0), user.get('unique_open_rate', 0), user.get('total_open_rate', 0), user.get('unique_click_rate', 0), user.get('total_click_rate', 0)])

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
                    up.email,
                    up.npi,
                    up.first_name,
                    up.last_name,
                    up.specialty,
                    cd.campaign_base_name,
                    ci.event_type,
                    COUNT(*) as event_count
                FROM user_profiles up
                JOIN campaign_interactions ci ON up.email = ci.email
                JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
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
                GROUP BY up.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name, ci.event_type
                ORDER BY up.email, cd.campaign_base_name
            """

        else:
            query = """
                SELECT
                    up.email,
                    up.npi,
                    up.first_name,
                    up.last_name,
                    up.specialty,
                    cd.campaign_base_name,
                    ci.event_type,
                    COUNT(*) as event_count
                FROM campaign_deployments cd
                JOIN campaign_interactions ci ON cd.campaign_id = ci.campaign_id
                JOIN user_profiles up ON ci.email = up.email
                WHERE 1=1
            """

            if campaign_list:
                campaign_conditions = []
                for campaign_name in campaign_list:
                    campaign_conditions.append("cd.campaign_base_name LIKE %s")
                    params.append(f"{campaign_name}%")
                query += f" AND ({' OR '.join(campaign_conditions)})"

            query += """
                GROUP BY up.email, up.npi, up.first_name, up.last_name, up.specialty, cd.campaign_base_name, ci.event_type
                ORDER BY up.email, cd.campaign_base_name
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
            email = row['email']
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