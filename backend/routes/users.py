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
    """Merge subspecialties by splitting on ' - ' and taking the first part"""
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
    """Get all unique specialties from the users table"""
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
    """
    Analyze specific users by email or NPI.
    Query path: user_profiles (by email/NPI) -> campaign_interactions
    """
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

        # Query path: user_profiles -> campaign_interactions
        placeholders = ','.join(['%s'] * len(user_list))

        if input_type == 'email':
            query = f"""
                SELECT
                    up.email,
                    up.first_name,
                    up.last_name,
                    up.specialty,
                    cd.full_campaign_name as campaign_name,
                    ci.event_type,
                    COUNT(*) as event_count
                FROM user_profiles up
                LEFT JOIN campaign_interactions ci ON up.email = ci.email
                LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE up.email IN ({placeholders})
                GROUP BY up.email, up.first_name, up.last_name, up.specialty, cd.full_campaign_name, ci.event_type
                ORDER BY up.email, cd.full_campaign_name
            """
        else:  # NPI
            query = f"""
                SELECT
                    up.email,
                    up.first_name,
                    up.last_name,
                    up.specialty,
                    cd.full_campaign_name as campaign_name,
                    ci.event_type,
                    COUNT(*) as event_count
                FROM user_profiles up
                LEFT JOIN campaign_interactions ci ON up.email = ci.email
                LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE up.contact_id IN ({placeholders})
                GROUP BY up.email, up.first_name, up.last_name, up.specialty, cd.full_campaign_name, ci.event_type
                ORDER BY up.email, cd.full_campaign_name
            """

        cursor.execute(query, user_list)
        raw_data = cursor.fetchall()

        # Process results into user-level metrics
        users_data = {}

        for row in raw_data:
            email = row['email']
            campaign_name = row['campaign_name']
            event_type = row['event_type']

            # Initialize user if not exists
            if email not in users_data:
                users_data[email] = {
                    'email': email,
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

            # Skip if no campaign data (user exists but no interactions)
            if not campaign_name or not event_type:
                continue

            event_type_lower = event_type.lower()
            event_count = row['event_count']

            # Initialize campaign for user if not exists
            if campaign_name not in users_data[email]['campaigns']:
                users_data[email]['campaigns'][campaign_name] = {
                    'sent': False,
                    'opened': False,
                    'clicked': False,
                    'open_count': 0,
                    'click_count': 0
                }

            # Record event
            if event_type_lower == 'sent':
                users_data[email]['campaigns'][campaign_name]['sent'] = True
            elif event_type_lower == 'open':
                users_data[email]['campaigns'][campaign_name]['opened'] = True
                users_data[email]['campaigns'][campaign_name]['open_count'] = event_count
            elif event_type_lower == 'click':
                users_data[email]['campaigns'][campaign_name]['clicked'] = True
                users_data[email]['campaigns'][campaign_name]['click_count'] = event_count

        # Calculate user-level totals
        enriched_users = []

        for email, user_data in users_data.items():
            # Calculate metrics from campaign data
            for campaign_name, camp_stats in user_data['campaigns'].items():
                if camp_stats['sent']:
                    user_data['total_sends'] += 1

                    if camp_stats['opened']:
                        user_data['unique_opens'] += 1
                        user_data['total_opens'] += camp_stats['open_count']

                    if camp_stats['clicked']:
                        user_data['unique_clicks'] += 1
                        user_data['total_clicks'] += camp_stats['click_count']

            # Calculate rates
            unique_open_rate = round((user_data['unique_opens'] / user_data['total_sends'] * 100), 2) if user_data['total_sends'] > 0 else 0
            total_open_rate = round((user_data['total_opens'] / user_data['total_sends'] * 100), 2) if user_data['total_sends'] > 0 else 0
            unique_click_rate = round((user_data['unique_clicks'] / user_data['unique_opens'] * 100), 2) if user_data['unique_opens'] > 0 else 0
            total_click_rate = round((user_data['total_clicks'] / user_data['total_opens'] * 100), 2) if user_data['total_opens'] > 0 else 0

            enriched_users.append({
                'email': user_data['email'],
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'specialty': user_data['specialty'],
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

@users_bp.route('/engagement-query', methods=['POST'])
def engagement_query():
    """
    Enhanced endpoint to find users by specialty or campaign with engagement filtering.

    Search modes:
    - specialty: user_profiles -> campaign_interactions -> campaign_deployments
    - campaign: campaign_deployments -> campaign_interactions -> user_profiles
    """
    try:
        data = request.get_json()

        specialty_list = data.get('specialty_list', [])
        campaign_list = data.get('campaign_list', [])
        engagement_type = data.get('engagement_type', 'all')  # 'opened', 'unopened', 'all'
        specialty_merge_mode = data.get('specialty_merge_mode', False)
        search_mode = data.get('search_mode', 'specialty')
        export_csv = data.get('export_csv', False)

        print(f"[ENGAGEMENT-QUERY] Mode: {search_mode}, Campaigns: {campaign_list}, Specialties: {specialty_list}")

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        params = []

        if search_mode == 'specialty':
            # Query path: user_profiles -> campaign_interactions -> campaign_deployments
            # Group by campaign_base_name to treat all deployments as one campaign
            query = """
                SELECT
                    up.email,
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

            # Filter by specialty
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

            # Optional campaign filter in specialty mode
            if campaign_list:
                campaign_conditions = []
                for campaign_name in campaign_list:
                    # Match campaign base name
                    campaign_conditions.append("cd.campaign_base_name LIKE %s")
                    params.append(f"{campaign_name}%")
                query += f" AND ({' OR '.join(campaign_conditions)})"

            query += """
                GROUP BY up.email, up.first_name, up.last_name, up.specialty, cd.campaign_base_name, ci.event_type
                ORDER BY up.email, cd.campaign_base_name
            """

        else:  # search_mode == 'campaign'
            # Query path: campaign_deployments -> campaign_interactions -> user_profiles
            # Group by campaign_base_name to treat all deployments as one campaign
            query = """
                SELECT
                    up.email,
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

            # Filter by campaigns - use LIKE to match base campaign name
            if campaign_list:
                campaign_conditions = []
                for campaign_name in campaign_list:
                    # Match campaign base name
                    campaign_conditions.append("cd.campaign_base_name LIKE %s")
                    params.append(f"{campaign_name}%")
                query += f" AND ({' OR '.join(campaign_conditions)})"

            query += """
                GROUP BY up.email, up.first_name, up.last_name, up.specialty, cd.campaign_base_name, ci.event_type
                ORDER BY up.email, cd.campaign_base_name
            """

        cursor.execute(query, params)
        raw_data = cursor.fetchall()

        print(f"[ENGAGEMENT-QUERY] Query returned {len(raw_data)} rows")
        if len(raw_data) == 0 and search_mode == 'campaign':
            # Debug: Check if campaign exists in database
            cursor.execute("""
                SELECT full_campaign_name
                FROM campaign_deployments
                WHERE full_campaign_name LIKE %s
                LIMIT 5
            """, (f"%{campaign_list[0].split()[0]}%" if campaign_list else "%",))
            similar = cursor.fetchall()
            print(f"[DEBUG] Similar campaigns in DB: {[r['full_campaign_name'] for r in similar]}")

        # Process results into user-level metrics
        users_data = {}

        for row in raw_data:
            email = row['email']
            campaign_name = row['campaign_base_name']
            event_type = row['event_type'].lower()
            event_count = row['event_count']

            # Initialize user if not exists
            if email not in users_data:
                user_specialty = row['specialty'] or ''
                if specialty_merge_mode and user_specialty:
                    user_specialty = user_specialty.split(' - ')[0].strip()

                users_data[email] = {
                    'email': email,
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

            # Initialize campaign for user if not exists
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

            # Record event
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

        # Calculate user-level totals and apply engagement filter
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

            # Calculate metrics from campaign data
            # A campaign is "delivered" if it was sent AND not bounced (or if opened/clicked despite bounce)
            for campaign_name, camp_stats in user_data['campaigns'].items():
                if camp_stats['sent']:
                    # Delivered = sent and (not bounced OR opened)
                    # If they opened it, it was delivered even if there was a bounce record
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

            # Skip if no delivered campaigns
            if total_delivered == 0:
                continue

            # Calculate rates with delivered as denominator
            unique_open_rate = round((user_data['unique_opens'] / total_delivered * 100), 2) if total_delivered > 0 else 0
            total_open_rate = round((user_data['total_opens'] / total_delivered * 100), 2) if total_delivered > 0 else 0
            unique_click_rate = round((user_data['unique_clicks'] / user_data['unique_opens'] * 100), 2) if user_data['unique_opens'] > 0 else 0
            total_click_rate = round((user_data['total_clicks'] / user_data['total_opens'] * 100), 2) if user_data['total_opens'] > 0 else 0

            # Apply engagement filter
            if engagement_type == 'opened':
                if user_data['unique_opens'] == 0:
                    continue
            elif engagement_type == 'unopened':
                if user_data['unique_opens'] > 0:
                    continue
            # 'all' includes everyone

            enriched_users.append({
                'email': user_data['email'],
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

            # Update aggregate stats
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

        # Calculate aggregate rates
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

        # Convert sets to sorted lists for JSON serialization
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
