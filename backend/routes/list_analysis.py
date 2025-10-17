from flask import Blueprint, request, jsonify, send_file
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import pandas as pd
import json
from io import BytesIO
from collections import defaultdict

list_analysis_bp = Blueprint('list_analysis', __name__)

def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))

def find_npi_column(df):
    """
    Find NPI column by checking:
    1. Exact matches: 'NPI', 'NPI_ID', 'NPI NUMBER'
    2. Partial matches: any column containing 'NPI'
    3. Validation: Check if values are mostly 10-digit strings starting with '1'
    """
    # First pass: exact matches
    for col in df.columns:
        if col.upper() in ['NPI', 'NPI_ID', 'NPI NUMBER', 'NPI_NUM']:
            if validate_npi_column(df[col]):
                return col

    # Second pass: partial matches containing 'NPI'
    potential_cols = [col for col in df.columns if 'NPI' in col.upper()]
    for col in potential_cols:
        if validate_npi_column(df[col]):
            return col

    return None

def validate_npi_column(series):
    """
    Validate if a column contains NPI values:
    - Check if majority of non-null values are 10 characters
    - Check if majority start with '1'
    """
    non_null = series.dropna().astype(str)
    if len(non_null) == 0:
        return False

    # Check length (NPIs are 10 digits)
    ten_char_count = sum(1 for val in non_null if len(val.strip()) == 10)
    starts_with_one = sum(1 for val in non_null if val.strip().startswith('1'))
    is_numeric = sum(1 for val in non_null if val.strip().isdigit())

    total = len(non_null)

    # At least 80% should be 10 characters, start with 1, and be numeric
    return (ten_char_count / total >= 0.8 and
            starts_with_one / total >= 0.8 and
            is_numeric / total >= 0.8)

def find_email_column(df):
    """
    Find email column by checking:
    1. Exact matches: 'EMAIL', 'EMAIL_ADDRESS', 'EMAILADDRESS'
    2. Partial matches: any column containing 'EMAIL' or 'MAIL'
    3. Validation: Check if values contain '@'
    """
    # First pass: exact matches
    for col in df.columns:
        col_upper = col.upper().replace(' ', '').replace('_', '')
        if col_upper in ['EMAIL', 'EMAILADDRESS', 'MAIL']:
            if validate_email_column(df[col]):
                return col

    # Second pass: partial matches
    potential_cols = [col for col in df.columns if 'EMAIL' in col.upper() or 'MAIL' in col.upper()]
    for col in potential_cols:
        if validate_email_column(df[col]):
            return col

    return None

def validate_email_column(series):
    """
    Validate if a column contains email addresses:
    - Check if majority of non-null values contain '@'
    """
    non_null = series.dropna().astype(str)
    if len(non_null) == 0:
        return False

    has_at_sign = sum(1 for val in non_null if '@' in val)
    total = len(non_null)

    # At least 80% should contain '@'
    return has_at_sign / total >= 0.8

def read_file_to_dataframe(file):
    """
    Read a file (CSV or Excel) into a pandas DataFrame with robust error handling.
    Supports:
    - CSV files with multiple encodings (UTF-8, Latin-1, CP1252)
    - Excel files (.xlsx, .xls) with automatic first sheet selection

    Returns:
        tuple: (DataFrame, error_message)
        - If successful: (df, None)
        - If failed: (None, error_message)
    """
    filename = file.filename
    file_extension = filename.lower().split('.')[-1] if '.' in filename else ''

    # Validate file type
    allowed_extensions = ['csv', 'xlsx', 'xls']
    if file_extension not in allowed_extensions:
        return None, f"Unsupported file type '.{file_extension}'. Please upload CSV (.csv) or Excel (.xlsx, .xls) files only."

    try:
        # Handle Excel files
        if file_extension in ['xlsx', 'xls']:
            try:
                # Read first sheet only
                df = pd.read_excel(file, sheet_name=0, engine='openpyxl' if file_extension == 'xlsx' else None)

                # Check if DataFrame is empty
                if df.empty or len(df.columns) == 0:
                    return None, f"File '{filename}' appears to be empty or has no data in the first sheet."

                return df, None

            except Exception as excel_error:
                return None, f"Failed to read Excel file '{filename}': {str(excel_error)}. The file may be corrupted or password-protected."

        # Handle CSV files with multiple encoding attempts
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
                    file.seek(0)  # Reset file pointer
                    df = pd.read_csv(file, encoding=encoding, low_memory=False)

                    # Check if DataFrame is empty
                    if df.empty or len(df.columns) == 0:
                        return None, f"File '{filename}' appears to be empty or has no columns."

                    return df, None

                except UnicodeDecodeError as e:
                    last_error = e
                    continue  # Try next encoding
                except Exception as e:
                    return None, f"Failed to read CSV file '{filename}': {str(e)}"

            # If all encodings failed
            return None, f"Failed to read CSV file '{filename}'. Unable to detect proper encoding. Tried: UTF-8, Latin-1, Windows-1252. Please ensure the file is properly formatted."

    except Exception as e:
        return None, f"Unexpected error reading file '{filename}': {str(e)}"

@list_analysis_bp.route('/upload', methods=['POST'])
def upload_lists():
    try:
        # Validate IQVIA file is present
        if 'iqvia_list' not in request.files:
            return jsonify({'error': 'IQVIA list is required'}), 400

        iqvia_file = request.files['iqvia_list']
        target_files = request.files.getlist('target_lists')

        # Validate at least one target list
        if not target_files or len(target_files) == 0:
            return jsonify({'error': 'At least one target list is required'}), 400

        # Check for empty filename (no file selected)
        if not iqvia_file.filename:
            return jsonify({'error': 'No IQVIA file selected'}), 400

        # Read IQVIA file
        iqvia_df, error = read_file_to_dataframe(iqvia_file)
        if error:
            return jsonify({'error': error}), 400

        # Find NPI column in IQVIA list
        npi_column = find_npi_column(iqvia_df)
        if not npi_column:
            available_columns = ', '.join(iqvia_df.columns.tolist()[:10])
            more = '...' if len(iqvia_df.columns) > 10 else ''
            return jsonify({
                'error': f'NPI column not found in IQVIA list "{iqvia_file.filename}". '
                         f'Available columns: {available_columns}{more}. '
                         f'Please ensure the file contains a valid NPI column with 10-digit numbers starting with "1".'
            }), 400

        # Extract NPIs from IQVIA list
        iqvia_npis = set(iqvia_df[npi_column].dropna().astype(str).str.strip().tolist())

        if len(iqvia_npis) == 0:
            return jsonify({'error': f'IQVIA list "{iqvia_file.filename}" contains no valid NPIs'}), 400

        # Process target lists
        target_lists_data = []
        for idx, target_file in enumerate(target_files):
            # Check for empty filename
            if not target_file.filename:
                return jsonify({'error': f'Target list #{idx + 1} has no filename (no file selected)'}), 400

            # Read target file
            target_df, error = read_file_to_dataframe(target_file)
            if error:
                return jsonify({'error': error}), 400

            # Find NPI column in target list
            target_npi_column = find_npi_column(target_df)
            if not target_npi_column:
                available_columns = ', '.join(target_df.columns.tolist()[:10])
                more = '...' if len(target_df.columns) > 10 else ''
                return jsonify({
                    'error': f'NPI column not found in target list "{target_file.filename}". '
                             f'Available columns: {available_columns}{more}. '
                             f'Please ensure the file contains a valid NPI column with 10-digit numbers starting with "1".'
                }), 400

            # Extract NPIs from target list
            target_npis = set(target_df[target_npi_column].dropna().astype(str).str.strip().tolist())

            if len(target_npis) == 0:
                return jsonify({'error': f'Target list "{target_file.filename}" contains no valid NPIs'}), 400

            target_lists_data.append({
                'filename': target_file.filename,
                'npis': list(target_npis),
                'count': len(target_npis)
            })

        # Generate session ID
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
        print(f"Upload error: {error_trace}")  # Log to server console for debugging
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

        return jsonify({
            'distribution': distribution_list,
            'total_iqvia_users': len(iqvia_npis),
            'total_target_lists': total_lists
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

        # Build NPI to lists count mapping
        npi_to_lists = defaultdict(set)
        for idx, target_list in enumerate(target_lists):
            for npi in target_list.get('npis', []):
                if npi in iqvia_npis:
                    npi_to_lists[npi].add(idx)

        # Group NPIs by tier (12/12, 11/12, etc.)
        total_lists = len(target_lists)
        tier_to_npis = defaultdict(list)

        for npi in iqvia_npis:
            count = len(npi_to_lists.get(npi, set()))
            tier_to_npis[count].append(npi)

        # Query user_profiles for engagement data
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        tier_results = []

        for tier_count in range(total_lists, -1, -1):
            npis_in_tier = tier_to_npis.get(tier_count, [])

            if not npis_in_tier:
                tier_results.append({
                    'tier': f'{tier_count}/{total_lists}',
                    'user_count': 0,
                    'aggregate': {
                        'avg_open_rate': 0,
                        'avg_emails_sent': 0,
                        'avg_emails_opened': 0,
                        'engaged_count': 0,
                        'engaged_percentage': 0
                    },
                    'users': []
                })
                continue

            # Query user_profiles directly by NPI
            placeholders = ','.join(['%s'] * len(npis_in_tier))
            cursor.execute(f"""
                SELECT email, npi, unique_open_rate, emails_sent, emails_opened
                FROM user_profiles
                WHERE npi IN ({placeholders})
            """, npis_in_tier)

            user_data = cursor.fetchall()

            # Calculate aggregate metrics
            total_users = len(npis_in_tier)
            matched_users = len(user_data)

            if user_data:
                avg_open_rate = sum(float(u.get('unique_open_rate', 0) or 0) for u in user_data) / matched_users
                avg_emails_sent = sum(int(u.get('emails_sent', 0) or 0) for u in user_data) / matched_users
                avg_emails_opened = sum(int(u.get('emails_opened', 0) or 0) for u in user_data) / matched_users
                engaged_count = sum(1 for u in user_data if float(u.get('unique_open_rate', 0) or 0) >= 20)
                engaged_percentage = (engaged_count / matched_users * 100) if matched_users > 0 else 0
            else:
                avg_open_rate = avg_emails_sent = avg_emails_opened = engaged_count = engaged_percentage = 0

            # Build individual user details (top 10 by open rate)
            user_details = []
            for user in sorted(user_data, key=lambda x: float(x.get('unique_open_rate', 0) or 0), reverse=True)[:10]:
                user_details.append({
                    'email': user.get('email'),
                    'npi': user.get('npi'),
                    'open_rate': round(float(user.get('unique_open_rate', 0) or 0), 2),
                    'emails_sent': int(user.get('emails_sent', 0) or 0),
                    'emails_opened': int(user.get('emails_opened', 0) or 0)
                })

            tier_results.append({
                'tier': f'{tier_count}/{total_lists}',
                'user_count': total_users,
                'matched_count': matched_users,
                'aggregate': {
                    'avg_open_rate': round(avg_open_rate, 2),
                    'avg_emails_sent': round(avg_emails_sent, 2),
                    'avg_emails_opened': round(avg_emails_opened, 2),
                    'engaged_count': engaged_count,
                    'engaged_percentage': round(engaged_percentage, 2)
                },
                'users': user_details
            })

        cursor.close()
        conn.close()

        return jsonify({
            'tiers': tier_results
        }), 200

    except Exception as e:
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
