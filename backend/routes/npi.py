from flask import Blueprint, request, jsonify
from models import UniversalProfile, UserProfile, get_session
import csv
import io

npi_bp = Blueprint('npi', __name__)

@npi_bp.route('/lookup', methods=['POST'])
def bulk_npi_lookup():
    try:
        data = request.get_json()

        if not data or 'npis' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Missing "npis" array in request body'
            }), 400

        npis = data['npis']

        if not isinstance(npis, list):
            return jsonify({
                'status': 'error',
                'message': '"npis" must be an array'
            }), 400

        cleaned_npis = [str(npi).strip().replace('-', '').replace(' ', '') for npi in npis]

        session = get_session()
        try:
            profiles = session.query(UniversalProfile).filter(
                UniversalProfile.npi.in_(cleaned_npis)
            ).all()

            results = []
            for profile in profiles:
                results.append({
                    'npi': profile.npi,
                    'entity_type': profile.entity_type,
                    'first_name': profile.first_name,
                    'last_name': profile.last_name,
                    'middle_name': profile.middle_name,
                    'organization_name': profile.organization_name,
                    'credential': profile.credential,
                    'mailing_address_1': profile.mailing_address_1,
                    'mailing_address_2': profile.mailing_address_2,
                    'mailing_city': profile.mailing_city,
                    'mailing_state': profile.mailing_state,
                    'mailing_zipcode': profile.mailing_zipcode,
                    'mailing_country': profile.mailing_country,
                    'practice_address_1': profile.practice_address_1,
                    'practice_address_2': profile.practice_address_2,
                    'practice_city': profile.practice_city,
                    'practice_state': profile.practice_state,
                    'practice_zipcode': profile.practice_zipcode,
                    'practice_country': profile.practice_country,
                    'primary_taxonomy_code': profile.primary_taxonomy_code,
                    'primary_specialty': profile.primary_specialty,
                    'is_active': profile.is_active,
                    'enumeration_date': profile.enumeration_date.isoformat() if profile.enumeration_date else None,
                    'last_update_date': profile.last_update_date.isoformat() if profile.last_update_date else None,
                    'deactivation_date': profile.deactivation_date.isoformat() if profile.deactivation_date else None
                })

            found_npis = {p['npi'] for p in results}
            missing_npis = [npi for npi in cleaned_npis if npi not in found_npis]

            return jsonify({
                'status': 'success',
                'count': len(results),
                'requested': len(cleaned_npis),
                'found': len(results),
                'missing': len(missing_npis),
                'missing_npis': missing_npis,
                'results': results
            }), 200

        finally:
            session.close()

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@npi_bp.route('/lookup/csv', methods=['POST'])
def csv_npi_lookup():
    try:
        if 'file' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'No file uploaded'
            }), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({
                'status': 'error',
                'message': 'No file selected'
            }), 400

        npi_column = request.form.get('npi_column', 'NPI')

        csv_data = file.read().decode('utf-8')
        input_reader = csv.DictReader(io.StringIO(csv_data))

        rows = list(input_reader)
        npis = [row.get(npi_column, '').strip() for row in rows if row.get(npi_column, '').strip()]

        if not npis:
            return jsonify({
                'status': 'error',
                'message': f'No NPIs found in column "{npi_column}"'
            }), 400

        session = get_session()
        try:
            profiles = session.query(UniversalProfile).filter(
                UniversalProfile.npi.in_(npis)
            ).all()

            profile_dict = {p.npi: p for p in profiles}

            output = io.StringIO()

            if rows:
                original_columns = list(rows[0].keys())
                new_columns = [
                    'First Name', 'Last Name', 'Middle Name', 'Organization Name', 'Credential',
                    'Mailing Address 1', 'Mailing Address 2', 'Mailing City', 'Mailing State', 'Mailing Zipcode',
                    'Practice Address 1', 'Practice Address 2', 'Practice City', 'Practice State', 'Practice Zipcode',
                    'Primary Specialty', 'Entity Type', 'Is Active'
                ]
                all_columns = original_columns + new_columns

                writer = csv.DictWriter(output, fieldnames=all_columns)
                writer.writeheader()

                for row in rows:
                    npi = row.get(npi_column, '').strip()
                    profile = profile_dict.get(npi)

                    if profile:
                        row.update({
                            'First Name': profile.first_name or '',
                            'Last Name': profile.last_name or '',
                            'Middle Name': profile.middle_name or '',
                            'Organization Name': profile.organization_name or '',
                            'Credential': profile.credential or '',
                            'Mailing Address 1': profile.mailing_address_1 or '',
                            'Mailing Address 2': profile.mailing_address_2 or '',
                            'Mailing City': profile.mailing_city or '',
                            'Mailing State': profile.mailing_state or '',
                            'Mailing Zipcode': profile.mailing_zipcode or '',
                            'Practice Address 1': profile.practice_address_1 or '',
                            'Practice Address 2': profile.practice_address_2 or '',
                            'Practice City': profile.practice_city or '',
                            'Practice State': profile.practice_state or '',
                            'Practice Zipcode': profile.practice_zipcode or '',
                            'Primary Specialty': profile.primary_specialty or '',
                            'Entity Type': profile.entity_type or '',
                            'Is Active': 'Yes' if profile.is_active else 'No'
                        })
                    else:
                        for col in new_columns:
                            row[col] = ''

                    writer.writerow(row)

            output.seek(0)
            return output.getvalue(), 200, {
                'Content-Type': 'text/csv',
                'Content-Disposition': f'attachment; filename=enriched_{file.filename}'
            }

        finally:
            session.close()

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@npi_bp.route('/stats', methods=['GET'])
def get_stats():
    try:
        session = get_session()
        try:
            total_count = session.query(UniversalProfile).count()
            active_count = session.query(UniversalProfile).filter(UniversalProfile.is_active == True).count()

            last_sync = session.query(UniversalProfile).order_by(
                UniversalProfile.last_synced_at.desc()
            ).first()

            return jsonify({
                'status': 'success',
                'total_npis': total_count,
                'active_npis': active_count,
                'inactive_npis': total_count - active_count,
                'last_sync': last_sync.last_synced_at.isoformat() if last_sync and last_sync.last_synced_at else None
            }), 200

        finally:
            session.close()

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@npi_bp.route('/quick-lookup', methods=['POST'])
def quick_npi_lookup():
    try:
        data = request.get_json()

        if not data or 'npis' not in data:
            return jsonify({'status': 'error', 'message': 'Missing "npis" field'}), 400

        npis = data['npis']

        if isinstance(npis, str):
            npis = [line.strip() for line in npis.split('\n') if line.strip()]
        elif not isinstance(npis, list):
            return jsonify({'status': 'error', 'message': '"npis" must be an array or string'}), 400

        cleaned_npis = []
        for npi in npis:
            cleaned = str(npi).strip().replace('-', '').replace(' ', '').replace(',', '')
            if cleaned and cleaned.isdigit():
                cleaned_npis.append(cleaned)

        if not cleaned_npis:
            return jsonify({'status': 'error', 'message': 'No valid NPIs found'}), 400

        session = get_session()
        try:
            results = []
            found_npis = set()

            from sqlalchemy import text

            placeholders = ','.join([f':npi_{i}' for i in range(len(cleaned_npis))])
            params = {f'npi_{i}': npi for i, npi in enumerate(cleaned_npis)}

            user_query = text(f"""
                SELECT npi, first_name, last_name, specialty, degree, address, city, state, zipcode
                FROM user_profiles
                WHERE npi IS NOT NULL AND npi != '' AND npi IN ({placeholders})
            """)

            user_results = session.execute(user_query, params).fetchall()

            for row in user_results:
                npi = str(row[0]).strip() if row[0] else None
                if npi and npi not in found_npis:
                    found_npis.add(npi)
                    zipcode = row[8]
                    if zipcode:
                        zipcode = str(zipcode).strip()
                        if len(zipcode) == 9 and zipcode.isdigit():
                            zipcode = f"{zipcode[:5]}-{zipcode[5:]}"
                    results.append({
                        'npi': npi,
                        'first_name': row[1],
                        'last_name': row[2],
                        'middle_name': None,
                        'organization_name': None,
                        'specialty': row[3] if row[3] else None,
                        'taxonomy_code': None,
                        'address': row[5],
                        'address_2': None,
                        'city': row[6],
                        'state': row[7],
                        'zipcode': zipcode,
                        'is_active': True,
                        'source': 'Audience'
                    })

            remaining_npis = [npi for npi in cleaned_npis if npi not in found_npis]

            if remaining_npis:
                universal_profiles = session.query(UniversalProfile).filter(
                    UniversalProfile.npi.in_(remaining_npis)
                ).all()

                for profile in universal_profiles:
                    if profile.npi not in found_npis:
                        found_npis.add(profile.npi)
                        specialty = profile.primary_specialty if profile.primary_specialty else profile.primary_taxonomy_code
                        zipcode = profile.practice_zipcode or profile.mailing_zipcode
                        if zipcode:
                            zipcode = str(zipcode).strip()
                            if len(zipcode) == 9 and zipcode.isdigit():
                                zipcode = f"{zipcode[:5]}-{zipcode[5:]}"
                        results.append({
                            'npi': profile.npi,
                            'first_name': profile.first_name,
                            'last_name': profile.last_name,
                            'middle_name': profile.middle_name,
                            'organization_name': profile.organization_name,
                            'specialty': specialty,
                            'taxonomy_code': profile.primary_taxonomy_code,
                            'address': profile.practice_address_1 or profile.mailing_address_1,
                            'address_2': profile.practice_address_2 or profile.mailing_address_2,
                            'city': profile.practice_city or profile.mailing_city,
                            'state': profile.practice_state or profile.mailing_state,
                            'zipcode': zipcode,
                            'is_active': profile.is_active if profile.is_active is not None else True,
                            'source': 'Market'
                        })

            missing_npis = [npi for npi in cleaned_npis if npi not in found_npis]

            audience_count = sum(1 for r in results if r.get('source') == 'Audience')
            market_count = sum(1 for r in results if r.get('source') == 'Market')

            return jsonify({
                'status': 'success',
                'count': len(results),
                'requested': len(cleaned_npis),
                'found': len(results),
                'audience_count': audience_count,
                'market_count': market_count,
                'missing': len(missing_npis),
                'missing_npis': missing_npis,
                'results': results
            }), 200

        finally:
            session.close()

    except Exception as e:
        import traceback
        return jsonify({'status': 'error', 'message': str(e), 'trace': traceback.format_exc()}), 500

@npi_bp.route('/debug/<npi>', methods=['GET'])
def debug_npi(npi):
    session = get_session()
    try:
        from sqlalchemy import text

        cleaned_npi = str(npi).strip().replace('-', '').replace(' ', '')

        user_query = text("""
            SELECT npi, first_name, last_name, specialty, degree, address, city, state, zipcode
            FROM user_profiles
            WHERE npi = :npi
        """)
        user_result = session.execute(user_query, {'npi': cleaned_npi}).fetchone()

        user_data = None
        if user_result:
            user_data = {
                'npi': user_result[0],
                'first_name': user_result[1],
                'last_name': user_result[2],
                'specialty': user_result[3],
                'degree': user_result[4],
                'address': user_result[5],
                'city': user_result[6],
                'state': user_result[7],
                'zipcode': user_result[8]
            }

        universal_profile = session.query(UniversalProfile).filter(
            UniversalProfile.npi == cleaned_npi
        ).first()

        universal_data = None
        if universal_profile:
            universal_data = {
                'npi': universal_profile.npi,
                'first_name': universal_profile.first_name,
                'last_name': universal_profile.last_name,
                'primary_specialty': universal_profile.primary_specialty,
                'primary_taxonomy_code': universal_profile.primary_taxonomy_code,
                'credential': universal_profile.credential,
                'practice_address_1': universal_profile.practice_address_1,
                'practice_city': universal_profile.practice_city,
                'practice_state': universal_profile.practice_state,
                'practice_zipcode': universal_profile.practice_zipcode,
                'mailing_address_1': universal_profile.mailing_address_1,
                'mailing_city': universal_profile.mailing_city,
                'mailing_state': universal_profile.mailing_state,
                'mailing_zipcode': universal_profile.mailing_zipcode,
                'is_active': universal_profile.is_active
            }

        return jsonify({
            'status': 'success',
            'npi_searched': cleaned_npi,
            'found_in_user_profiles': user_data is not None,
            'found_in_universal_profiles': universal_data is not None,
            'user_profiles_data': user_data,
            'universal_profiles_data': universal_data
        }), 200

    except Exception as e:
        import traceback
        return jsonify({'status': 'error', 'message': str(e), 'trace': traceback.format_exc()}), 500
    finally:
        session.close()