from flask import Blueprint, request, jsonify, send_file
from psycopg2.extras import RealDictCursor
import os
import sys
import pandas as pd
import json
from io import BytesIO
from collections import defaultdict
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db_pool import get_db_connection

list_analysis_bp = Blueprint('list_analysis', __name__)

def find_npi_column(df):
    for col in df.columns:
        if col.upper() in ['NPI', 'NPI_ID', 'NPI NUMBER', 'NPI_NUM']:
            if validate_npi_column(df[col]):
                return col

    potential_cols = [col for col in df.columns if 'NPI' in col.upper()]
    for col in potential_cols:
        if validate_npi_column(df[col]):
            return col

    return None

def validate_npi_column(series):
    non_null = series.dropna().astype(str)
    if len(non_null) == 0:
        return False

    ten_char_count = sum(1 for val in non_null if len(val.strip()) == 10)
    starts_with_one = sum(1 for val in non_null if val.strip().startswith('1'))
    is_numeric = sum(1 for val in non_null if val.strip().isdigit())

    total = len(non_null)

    return (ten_char_count / total >= 0.8 and
            starts_with_one / total >= 0.8 and
            is_numeric / total >= 0.8)

def find_email_column(df):
    for col in df.columns:
        col_upper = col.upper().replace(' ', '').replace('_', '')
        if col_upper in ['EMAIL', 'EMAILADDRESS', 'MAIL']:
            if validate_email_column(df[col]):
                return col

    potential_cols = [col for col in df.columns if 'EMAIL' in col.upper() or 'MAIL' in col.upper()]
    for col in potential_cols:
        if validate_email_column(df[col]):
            return col

    return None

def validate_email_column(series):
    non_null = series.dropna().astype(str)
    if len(non_null) == 0:
        return False

    has_at_sign = sum(1 for val in non_null if '@' in val)
    total = len(non_null)

    return has_at_sign / total >= 0.8

def read_file_to_dataframe(file):
    filename = file.filename
    file_extension = filename.lower().split('.')[-1] if '.' in filename else ''

    allowed_extensions = ['csv', 'xlsx', 'xls']
    if file_extension not in allowed_extensions:
        return None, f"Unsupported file type '.{file_extension}'. Please upload CSV (.csv) or Excel (.xlsx, .xls) files only."

    try:
        if file_extension in ['xlsx', 'xls']:
            try:
                df = pd.read_excel(file, sheet_name=0, engine='openpyxl' if file_extension == 'xlsx' else None)

                if df.empty or len(df.columns) == 0:
                    return None, f"File '{filename}' appears to be empty or has no data in the first sheet."

                return df, None

            except Exception as excel_error:
                return None, f"Failed to read Excel file '{filename}': {str(excel_error)}. The file may be corrupted or password-protected."

        elif file_extension == 'csv':
            encodings_to_try = [
                ('utf-8', 'UTF-8'),
                ('latin-1', 'Latin-1 (ISO-8859-1)'),
                ('cp1252', 'Windows-1252'),
                ('utf-8-sig', 'UTF-8 with BOM')
            ]

            last_error = None
            for encoding, encoding_name in encodings_to_try:
                try:
                    file.seek(0)
                    df = pd.read_csv(file, encoding=encoding, low_memory=False)

                    if df.empty or len(df.columns) == 0:
                        return None, f"File '{filename}' appears to be empty or has no columns."

                    return df, None

                except UnicodeDecodeError as e:
                    last_error = e
                    continue 
                except Exception as e:
                    return None, f"Failed to read CSV file '{filename}': {str(e)}"

            return None, f"Failed to read CSV file '{filename}'. Unable to detect proper encoding. Tried: UTF-8, Latin-1, Windows-1252. Please ensure the file is properly formatted."

    except Exception as e:
        return None, f"Unexpected error reading file '{filename}': {str(e)}"

@list_analysis_bp.route('/upload', methods=['POST'])
def upload_lists():
    try:
        if 'iqvia_list' not in request.files:
            return jsonify({'error': 'IQVIA list is required'}), 400

        iqvia_file = request.files['iqvia_list']
        target_files = request.files.getlist('target_lists')

        if not target_files or len(target_files) == 0:
            return jsonify({'error': 'At least one target list is required'}), 400

        if not iqvia_file.filename:
            return jsonify({'error': 'No IQVIA file selected'}), 400

        iqvia_df, error = read_file_to_dataframe(iqvia_file)
        if error:
            return jsonify({'error': error}), 400

        npi_column = find_npi_column(iqvia_df)
        if not npi_column:
            available_columns = ', '.join(iqvia_df.columns.tolist()[:10])
            more = '...' if len(iqvia_df.columns) > 10 else ''
            return jsonify({
                'error': f'NPI column not found in IQVIA list "{iqvia_file.filename}". '
                         f'Available columns: {available_columns}{more}. '
                         f'Please ensure the file contains a valid NPI column with 10-digit numbers starting with "1".'
            }), 400

        iqvia_npis = set(iqvia_df[npi_column].dropna().astype(str).str.strip().tolist())

        if len(iqvia_npis) == 0:
            return jsonify({'error': f'IQVIA list "{iqvia_file.filename}" contains no valid NPIs'}), 400

        target_lists_data = []
        for idx, target_file in enumerate(target_files):
            if not target_file.filename:
                return jsonify({'error': f'Target list #{idx + 1} has no filename (no file selected)'}), 400

            target_df, error = read_file_to_dataframe(target_file)
            if error:
                return jsonify({'error': error}), 400

            target_npi_column = find_npi_column(target_df)
            if not target_npi_column:
                available_columns = ', '.join(target_df.columns.tolist()[:10])
                more = '...' if len(target_df.columns) > 10 else ''
                return jsonify({
                    'error': f'NPI column not found in target list "{target_file.filename}". '
                             f'Available columns: {available_columns}{more}. '
                             f'Please ensure the file contains a valid NPI column with 10-digit numbers starting with "1".'
                }), 400

            target_npis = set(target_df[target_npi_column].dropna().astype(str).str.strip().tolist())

            if len(target_npis) == 0:
                return jsonify({'error': f'Target list "{target_file.filename}" contains no valid NPIs'}), 400

            target_lists_data.append({
                'filename': target_file.filename,
                'npis': list(target_npis),
                'count': len(target_npis)
            })

        session_id = str(hash(frozenset(iqvia_npis)))

        return jsonify({
            'session_id': session_id,
            'iqvia_count': len(iqvia_npis),
            'iqvia_npis': list(iqvia_npis),
            'target_lists': target_lists_data
        }), 200

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Upload error: {error_trace}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@list_analysis_bp.route('/calculate-crossover', methods=['POST'])
def calculate_crossover():
    try:
        data = request.json
        iqvia_npis = set(data.get('iqvia_npis', []))
        target_lists = data.get('target_lists', [])

        if not iqvia_npis or not target_lists:
            return jsonify({'error': 'Missing required data'}), 400

        npi_to_lists = defaultdict(set)

        for idx, target_list in enumerate(target_lists):
            for npi in target_list.get('npis', []):
                if npi in iqvia_npis:
                    npi_to_lists[npi].add(idx)

        total_lists = len(target_lists)
        distribution = defaultdict(int)

        for npi in iqvia_npis:
            count = len(npi_to_lists.get(npi, set()))
            distribution[count] += 1

        distribution_list = []
        for i in range(total_lists + 1):
            percentage = (distribution[i] / len(iqvia_npis) * 100) if len(iqvia_npis) > 0 else 0
            distribution_list.append({
                'lists_count': f'{i}/{total_lists}',
                'users_count': distribution[i],
                'percentage': round(percentage, 2)
            })

        distribution_list.reverse()

        users_on_at_least_one_list = sum(dist['users_count'] for dist in distribution_list if dist['lists_count'] != f'0/{total_lists}')
        percentage_on_at_least_one_list = round((users_on_at_least_one_list / len(iqvia_npis) * 100), 2) if len(iqvia_npis) > 0 else 0

        return jsonify({
            'distribution': distribution_list,
            'total_iqvia_users': len(iqvia_npis),
            'total_target_lists': total_lists,
            'users_on_at_least_one_list': users_on_at_least_one_list,
            'percentage_on_at_least_one_list': percentage_on_at_least_one_list
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@list_analysis_bp.route('/engagement-by-tier', methods=['POST'])
def engagement_by_tier():
    try:
        data = request.json
        iqvia_npis = set(data.get('iqvia_npis', []))
        target_lists = data.get('target_lists', [])

        if not iqvia_npis or not target_lists:
            return jsonify({'error': 'Missing required data'}), 400

        npi_to_lists = defaultdict(set)
        for idx, target_list in enumerate(target_lists):
            for npi in target_list.get('npis', []):
                if npi in iqvia_npis:
                    npi_to_lists[npi].add(idx)

        total_lists = len(target_lists)
        tier_to_npis = defaultdict(list)

        for npi in iqvia_npis:
            count = len(npi_to_lists.get(npi, set()))
            tier_to_npis[count].append(npi)

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        tier_results = []

        for tier_count in range(total_lists, -1, -1):
            npis_in_tier = tier_to_npis.get(tier_count, [])

            if not npis_in_tier:
                tier_results.append({
                    'tier': f'{tier_count}/{total_lists}',
                    'user_count': 0,
                    'matched_count': 0,
                    'aggregate': {
                        'total_delivered': 0,
                        'total_unique_opens': 0,
                        'total_opens': 0,
                        'total_unique_clicks': 0,
                        'total_clicks': 0,
                        'avg_unique_open_rate': 0,
                        'avg_total_open_rate': 0,
                        'avg_unique_click_rate': 0,
                        'avg_total_click_rate': 0,
                        'specialties': [],
                        'campaigns': []
                    },
                    'users': []
                })
                continue

            placeholders = ','.join(['%s'] * len(npis_in_tier))

            cursor.execute(f"""
                SELECT
                    up.email,
                    up.first_name,
                    up.last_name,
                    up.specialty,
                    up.npi,
                    cd.campaign_base_name,
                    ci.event_type,
                    COUNT(*) as event_count
                FROM user_profiles up
                LEFT JOIN campaign_interactions ci ON LOWER(up.email) = ci.email
                LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE up.npi IN ({placeholders})
                GROUP BY up.email, up.first_name, up.last_name, up.specialty, up.npi, cd.campaign_base_name, ci.event_type
                ORDER BY up.email, cd.campaign_base_name
            """, npis_in_tier)

            raw_data = cursor.fetchall()

            users_data = {}

            for row in raw_data:
                email = row['email'].lower() if row['email'] else '' 
                campaign_name = row['campaign_base_name']
                event_type = row['event_type']

                if email not in users_data:
                    users_data[email] = {
                        'email': email,
                        'first_name': row['first_name'],
                        'last_name': row['last_name'],
                        'specialty': row['specialty'] or '',
                        'npi': row['npi'],
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
                        'bounced': False,
                        'opened': False,
                        'clicked': False,
                        'open_count': 0,
                        'click_count': 0
                    }

                if event_type_lower == 'sent':
                    users_data[email]['campaigns'][campaign_name]['sent'] = True
                elif event_type_lower == 'bounce':
                    users_data[email]['campaigns'][campaign_name]['bounced'] = True
                elif event_type_lower == 'open':
                    users_data[email]['campaigns'][campaign_name]['opened'] = True
                    users_data[email]['campaigns'][campaign_name]['open_count'] = event_count
                elif event_type_lower == 'click':
                    users_data[email]['campaigns'][campaign_name]['clicked'] = True
                    users_data[email]['campaigns'][campaign_name]['click_count'] = event_count

            enriched_users = []
            aggregate_stats = {
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

                enriched_users.append({
                    'email': user_data['email'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'specialty': user_data['specialty'],
                    'npi': user_data['npi'],
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

                aggregate_stats['total_delivered'] += total_delivered
                aggregate_stats['total_unique_opens'] += user_data['unique_opens']
                aggregate_stats['total_opens'] += user_data['total_opens']
                aggregate_stats['total_unique_clicks'] += user_data['unique_clicks']
                aggregate_stats['total_clicks'] += user_data['total_clicks']
                aggregate_stats['specialties'].add(user_data['specialty'])
                aggregate_stats['campaigns'].update(user_campaigns)

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

            enriched_users.sort(key=lambda x: x['unique_open_rate'], reverse=True)

            aggregate_stats['specialties'] = sorted(list(aggregate_stats['specialties']))
            aggregate_stats['campaigns'] = sorted(list(aggregate_stats['campaigns']))

            tier_results.append({
                'tier': f'{tier_count}/{total_lists}',
                'user_count': len(npis_in_tier),
                'matched_count': len(enriched_users),
                'aggregate': aggregate_stats,
                'users': enriched_users
            })

        all_target_list_npis = []
        for tier_count in range(1, total_lists + 1):
            npis_in_tier = tier_to_npis.get(tier_count, [])
            all_target_list_npis.extend(npis_in_tier)

        total_npis_on_target_lists = len(all_target_list_npis)

        if all_target_list_npis:
            placeholders = ','.join(['%s'] * len(all_target_list_npis))
            cursor.execute(f"""
                SELECT DISTINCT up.npi
                FROM user_profiles up
                JOIN campaign_interactions ci ON LOWER(up.email) = ci.email
                WHERE up.npi IN ({placeholders})
                AND ci.event_type = 'open'
            """, all_target_list_npis)

            users_who_opened = cursor.fetchall()
            users_who_opened_at_least_one = len(users_who_opened)
        else:
            users_who_opened_at_least_one = 0

        total_matched_in_db = 0
        total_delivered_overall = 0
        total_unique_opens_overall = 0

        for tier in tier_results:
            if tier['tier'] != f'0/{total_lists}':
                total_matched_in_db += tier['matched_count']
                total_delivered_overall += tier['aggregate']['total_delivered']
                total_unique_opens_overall += tier['aggregate']['total_unique_opens']

        percentage_who_opened = round((users_who_opened_at_least_one / total_npis_on_target_lists * 100), 2) if total_npis_on_target_lists > 0 else 0
        avg_unique_open_rate_overall = round((total_unique_opens_overall / total_delivered_overall * 100), 2) if total_delivered_overall > 0 else 0

        engagement_summary = {
            'total_npis_on_target_lists': total_npis_on_target_lists,
            'total_matched_in_db': total_matched_in_db,
            'users_who_opened_at_least_one': users_who_opened_at_least_one,
            'percentage_who_opened': percentage_who_opened,
            'avg_unique_open_rate': avg_unique_open_rate_overall,
            'total_delivered': total_delivered_overall,
            'total_unique_opens': total_unique_opens_overall
        }

        cursor.close()
        conn.close()

        return jsonify({
            'tiers': tier_results,
            'engagement_summary': engagement_summary
        }), 200

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Engagement by tier error: {error_trace}")
        return jsonify({'error': str(e)}), 500

@list_analysis_bp.route('/engagement-comparison', methods=['POST'])
def engagement_comparison():
    try:
        data = request.json
        target_lists = data.get('target_lists', [])
        campaign_assignments = data.get('campaign_assignments', {})

        if not target_lists or not campaign_assignments:
            return jsonify({'error': 'Missing required data'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        results = []

        for list_idx, target_list in enumerate(target_lists):
            list_name = target_list.get('filename')
            list_npis = set(target_list.get('npis', []))
            assigned_campaigns = campaign_assignments.get(str(list_idx), [])

            if not assigned_campaigns:
                continue

            for campaign_name in assigned_campaigns:
                cursor.execute("""
                    SELECT npi, opened, clicked, sent
                    FROM user_profiles
                    WHERE campaign_name = %s
                """, (campaign_name,))

                campaign_data = cursor.fetchall()

                target_users = [row for row in campaign_data if row['npi'] in list_npis]
                non_target_users = [row for row in campaign_data if row['npi'] not in list_npis]

                def calculate_metrics(users):
                    if not users:
                        return {'open_rate': 0, 'click_rate': 0, 'total_sent': 0}

                    total = len(users)
                    opened = sum(1 for u in users if u.get('opened'))
                    clicked = sum(1 for u in users if u.get('clicked'))

                    return {
                        'open_rate': round((opened / total * 100) if total > 0 else 0, 2),
                        'click_rate': round((clicked / total * 100) if total > 0 else 0, 2),
                        'total_sent': total
                    }

                target_metrics = calculate_metrics(target_users)
                non_target_metrics = calculate_metrics(non_target_users)

                results.append({
                    'list_name': list_name,
                    'campaign_name': campaign_name,
                    'target_list_metrics': target_metrics,
                    'non_target_metrics': non_target_metrics,
                    'difference': {
                        'open_rate': round(target_metrics['open_rate'] - non_target_metrics['open_rate'], 2),
                        'click_rate': round(target_metrics['click_rate'] - non_target_metrics['click_rate'], 2)
                    }
                })

        cursor.close()
        conn.close()

        return jsonify({
            'results': results
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@list_analysis_bp.route('/export-results', methods=['POST'])
def export_results():
    try:
        data = request.json
        results = data.get('results', [])

        if not results:
            return jsonify({'error': 'No results to export'}), 400

        rows = []
        for result in results:
            rows.append({
                'List Name': result['list_name'],
                'Campaign Name': result['campaign_name'],
                'Target List - Total Sent': result['target_list_metrics']['total_sent'],
                'Target List - Open Rate (%)': result['target_list_metrics']['open_rate'],
                'Target List - Click Rate (%)': result['target_list_metrics']['click_rate'],
                'Non-Target - Total Sent': result['non_target_metrics']['total_sent'],
                'Non-Target - Open Rate (%)': result['non_target_metrics']['open_rate'],
                'Non-Target - Click Rate (%)': result['non_target_metrics']['click_rate'],
                'Difference - Open Rate (%)': result['difference']['open_rate'],
                'Difference - Click Rate (%)': result['difference']['click_rate']
            })

        df = pd.DataFrame(rows)

        output = BytesIO()
        df.to_csv(output, index=False)
        output.seek(0)

        return send_file(
            output,
            mimetype='text/csv',
            as_attachment=True,
            download_name='list_efficiency_analysis.csv'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500