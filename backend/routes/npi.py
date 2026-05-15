from flask import Blueprint, request, jsonify
from models import UniversalProfile, UserProfile, get_session

INDIVIDUAL_ONLY_SQL = "(entity_type IS NULL OR entity_type <> '2')"
def _individual_only_filter(query):
    return query.filter((UniversalProfile.entity_type.is_(None)) | (UniversalProfile.entity_type != '2'))
from routes.source_classification import classify_source, classify_source_sql_expr
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
            profiles = _individual_only_filter(session.query(UniversalProfile).filter(
                UniversalProfile.npi.in_(cleaned_npis)
            )).all()

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
                    'provider_status': profile.provider_status or 'Active',
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
            profiles = _individual_only_filter(session.query(UniversalProfile).filter(
                UniversalProfile.npi.in_(npis)
            )).all()

            profile_dict = {p.npi: p for p in profiles}

            output = io.StringIO()

            if rows:
                original_columns = list(rows[0].keys())
                new_columns = [
                    'First Name', 'Last Name', 'Middle Name', 'Organization Name', 'Credential',
                    'Mailing Address 1', 'Mailing Address 2', 'Mailing City', 'Mailing State', 'Mailing Zipcode',
                    'Practice Address 1', 'Practice Address 2', 'Practice City', 'Practice State', 'Practice Zipcode',
                    'Primary Specialty', 'Entity Type', 'Is Active', 'Flag'
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
                            'Is Active': 'Yes' if profile.is_active else 'No',
                            'Flag': profile.provider_status if profile.provider_status and profile.provider_status != 'Active' else ''
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
            total_count = _individual_only_filter(session.query(UniversalProfile)).count()
            active_count = _individual_only_filter(session.query(UniversalProfile).filter(UniversalProfile.is_active == True)).count()

            last_sync = _individual_only_filter(session.query(UniversalProfile)).order_by(
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

            source_expr = classify_source_sql_expr('up')
            flag_event_expr = """COALESCE(
                (SELECT e->>'event' FROM jsonb_array_elements(COALESCE(univ.address_history, '[]'::jsonb)) e
                 WHERE e->>'event' IN ('address_flagged_invalid','undeliverable')
                 ORDER BY e->>'changed_at' DESC NULLS LAST LIMIT 1),
                (SELECT e->>'event' FROM jsonb_array_elements(COALESCE(up.address_history, '[]'::jsonb)) e
                 WHERE e->>'event' IN ('address_flagged_invalid','undeliverable')
                 ORDER BY e->>'changed_at' DESC NULLS LAST LIMIT 1)
            )"""
            flag_reason_expr = """COALESCE(
                (SELECT e->>'reason' FROM jsonb_array_elements(COALESCE(univ.address_history, '[]'::jsonb)) e
                 WHERE e->>'event' IN ('address_flagged_invalid','undeliverable')
                 ORDER BY e->>'changed_at' DESC NULLS LAST LIMIT 1),
                (SELECT e->>'reason' FROM jsonb_array_elements(COALESCE(up.address_history, '[]'::jsonb)) e
                 WHERE e->>'event' IN ('address_flagged_invalid','undeliverable')
                 ORDER BY e->>'changed_at' DESC NULLS LAST LIMIT 1)
            )"""
            user_query = text(f"""
                SELECT up.npi, up.first_name, up.last_name, up.specialty, up.degree,
                       up.address, up.city, up.state, up.zipcode,
                       COALESCE(univ.provider_status, 'Active') AS provider_status,
                       up.is_active AS up_is_active,
                       ({source_expr}) AS source_class,
                       ({flag_event_expr}) AS address_flag_event,
                       ({flag_reason_expr}) AS address_flag_reason
                FROM user_profiles up
                LEFT JOIN universal_profiles univ ON up.npi = univ.npi
                WHERE up.npi IS NOT NULL AND up.npi != '' AND up.npi IN ({placeholders})
                  AND (univ.entity_type IS NULL OR univ.entity_type <> '2')
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
                    provider_status = row[9] if len(row) > 9 else 'Active'
                    up_is_active = bool(row[10]) if row[10] is not None else True
                    source_class = row[11] or 'Owned'
                    address_flag_event = row[12] if len(row) > 12 else None
                    address_flag_reason = row[13] if len(row) > 13 else None
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
                        'is_active': provider_status == 'Active',
                        'provider_status': provider_status,
                        'audience_active': up_is_active,
                        'source': source_class,
                        'address_flag_event': address_flag_event,
                        'address_flag_reason': address_flag_reason,
                    })

            remaining_npis = [npi for npi in cleaned_npis if npi not in found_npis]

            if remaining_npis:
                universal_profiles = _individual_only_filter(session.query(UniversalProfile).filter(
                    UniversalProfile.npi.in_(remaining_npis)
                )).all()

                for profile in universal_profiles:
                    if profile.npi not in found_npis:
                        found_npis.add(profile.npi)
                        specialty = profile.primary_specialty if profile.primary_specialty else profile.primary_taxonomy_code
                        zipcode = profile.practice_zipcode or profile.mailing_zipcode
                        if zipcode:
                            zipcode = str(zipcode).strip()
                            if len(zipcode) == 9 and zipcode.isdigit():
                                zipcode = f"{zipcode[:5]}-{zipcode[5:]}"
                        provider_status = profile.provider_status or 'Active'
                        history = profile.address_history or []
                        if isinstance(history, str):
                            try:
                                import json as _json
                                history = _json.loads(history)
                            except Exception:
                                history = []
                        flag_event = None
                        flag_reason = None
                        flag_events = [e for e in history if isinstance(e, dict) and e.get('event') in ('address_flagged_invalid', 'undeliverable')]
                        if flag_events:
                            latest = max(flag_events, key=lambda e: e.get('changed_at') or '')
                            flag_event = latest.get('event')
                            flag_reason = latest.get('reason')
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
                            'is_active': provider_status == 'Active',
                            'provider_status': provider_status,
                            'audience_active': None,
                            'source': 'Market',
                            'address_flag_event': flag_event,
                            'address_flag_reason': flag_reason,
                        })

            missing_npis = [npi for npi in cleaned_npis if npi not in found_npis]

            owned_count = sum(1 for r in results if r.get('source') == 'Owned')
            licensed_count = sum(1 for r in results if r.get('source') == 'Licensed')
            market_count = sum(1 for r in results if r.get('source') == 'Market')

            return jsonify({
                'status': 'success',
                'count': len(results),
                'requested': len(cleaned_npis),
                'found': len(results),
                'owned_count': owned_count,
                'licensed_count': licensed_count,
                'audience_count': owned_count + licensed_count,
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

        universal_profile = _individual_only_filter(session.query(UniversalProfile).filter(
            UniversalProfile.npi == cleaned_npi
        )).first()

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
                'is_active': universal_profile.is_active,
                'provider_status': universal_profile.provider_status or 'Active'
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


@npi_bp.route('/specialty-lookup', methods=['POST'])
def specialty_lookup():
    try:
        data = request.get_json()
        if not data or 'specialties' not in data:
            return jsonify({'status': 'error', 'message': 'Missing "specialties" field'}), 400

        specialties = data['specialties']
        if not isinstance(specialties, list) or not specialties:
            return jsonify({'status': 'error', 'message': '"specialties" must be a non-empty array'}), 400

        specialties = [s for s in (str(x).strip() for x in specialties) if s]

        taxonomy_codes = data.get('taxonomy_codes') or []
        if not isinstance(taxonomy_codes, list):
            taxonomy_codes = []
        taxonomy_codes = [c for c in (str(x).strip() for x in taxonomy_codes) if c]

        hide_inactive = bool(data.get('hide_inactive', False))

        session = get_session()
        try:
            from sqlalchemy import text

            placeholders = ','.join([f':spec_{i}' for i in range(len(specialties))])
            params = {f'spec_{i}': s for i, s in enumerate(specialties)}

            source_expr = classify_source_sql_expr('up')
            audience_q = text(f"""
                SELECT up.npi, up.first_name, up.last_name, up.specialty, up.degree,
                       up.address, up.city, up.state, up.zipcode,
                       COALESCE(univ.provider_status, 'Active') AS provider_status,
                       up.is_active AS up_is_active,
                       ({source_expr}) AS source_class
                FROM user_profiles up
                LEFT JOIN universal_profiles univ ON up.npi = univ.npi
                WHERE up.specialty IN ({placeholders})
                  AND up.npi IS NOT NULL AND up.npi != ''
                  AND (univ.entity_type IS NULL OR univ.entity_type <> '2')
            """)
            audience_rows = session.execute(audience_q, params).fetchall()

            results = []
            found_npis = set()

            for row in audience_rows:
                npi = str(row[0]).strip() if row[0] else None
                if not npi or npi in found_npis:
                    continue
                provider_status = row[9] if len(row) > 9 else 'Active'
                if hide_inactive and provider_status and provider_status != 'Active':
                    continue
                found_npis.add(npi)
                zipcode = row[8]
                if zipcode:
                    zipcode = str(zipcode).strip()
                    if len(zipcode) == 9 and zipcode.isdigit():
                        zipcode = f"{zipcode[:5]}-{zipcode[5:]}"
                up_is_active = bool(row[10]) if len(row) > 10 and row[10] is not None else True
                source_class = row[11] if len(row) > 11 and row[11] else 'Owned'
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
                    'is_active': provider_status == 'Active',
                    'provider_status': provider_status,
                    'audience_active': up_is_active,
                    'source': source_class
                })

            if taxonomy_codes:
                universal_query = session.query(UniversalProfile).filter(
                    UniversalProfile.primary_taxonomy_code.in_(taxonomy_codes)
                )
            else:
                universal_query = session.query(UniversalProfile).filter(
                    UniversalProfile.primary_specialty.in_(specialties)
                )
            universal_query = _individual_only_filter(universal_query)
            if hide_inactive:
                universal_query = universal_query.filter(
                    (UniversalProfile.provider_status == 'Active') | (UniversalProfile.provider_status.is_(None))
                )
            universal_profiles = universal_query.all()

            for profile in universal_profiles:
                if profile.npi in found_npis:
                    continue
                provider_status = profile.provider_status or 'Active'
                if hide_inactive and provider_status != 'Active':
                    continue
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
                    'is_active': provider_status == 'Active',
                    'provider_status': provider_status,
                    'audience_active': None,
                    'source': 'Market'
                })

            owned_count = sum(1 for r in results if r.get('source') == 'Owned')
            licensed_count = sum(1 for r in results if r.get('source') == 'Licensed')
            market_count = sum(1 for r in results if r.get('source') == 'Market')

            return jsonify({
                'status': 'success',
                'count': len(results),
                'found': len(results),
                'requested': len(results),
                'owned_count': owned_count,
                'licensed_count': licensed_count,
                'audience_count': owned_count + licensed_count,
                'market_count': market_count,
                'missing': 0,
                'missing_npis': [],
                'specialties': specialties,
                'hide_inactive': hide_inactive,
                'results': results
            }), 200
        finally:
            session.close()

    except Exception as e:
        import traceback
        return jsonify({'status': 'error', 'message': str(e), 'trace': traceback.format_exc()}), 500


@npi_bp.route('/specialty-counts', methods=['GET'])
def specialty_counts():
    try:
        session = get_session()
        try:
            from sqlalchemy import text

            source_expr = classify_source_sql_expr('up')

            universal_sql = text(f"""
                SELECT primary_taxonomy_code AS code,
                       (provider_status IS NULL OR provider_status = 'Active') AS active_flag,
                       COUNT(*) AS cnt
                FROM universal_profiles
                WHERE primary_taxonomy_code IS NOT NULL AND primary_taxonomy_code != ''
                  AND {INDIVIDUAL_ONLY_SQL}
                GROUP BY primary_taxonomy_code, active_flag
            """)

            audience_sql = text(f"""
                SELECT up.specialty AS specialty,
                       ({source_expr}) AS source_class,
                       up.is_active AS active_flag,
                       COUNT(*) AS cnt
                FROM user_profiles up
                WHERE up.specialty IS NOT NULL AND up.specialty != ''
                GROUP BY up.specialty, source_class, active_flag
            """)

            universal_map = {}
            for row in session.execute(universal_sql).fetchall():
                code = row[0]
                is_active = bool(row[1])
                cnt = int(row[2])
                if not code:
                    continue
                entry = universal_map.setdefault(code, {'all': 0, 'active': 0})
                entry['all'] += cnt
                if is_active:
                    entry['active'] += cnt

            universal_taxonomy_counts = [
                {'taxonomy_code': code, 'count': v['all'], 'count_active': v['active']}
                for code, v in universal_map.items()
            ]

            owned_map = {}
            licensed_map = {}
            for row in session.execute(audience_sql).fetchall():
                spec = row[0]
                src = row[1]
                is_active = bool(row[2])
                cnt = int(row[3])
                if not spec:
                    continue
                target = licensed_map if src == 'Licensed' else owned_map
                entry = target.setdefault(spec, {'all': 0, 'active': 0})
                entry['all'] += cnt
                if is_active:
                    entry['active'] += cnt

            owned_specialty_counts = [
                {'specialty': k, 'count': v['all'], 'count_active': v['active']}
                for k, v in owned_map.items()
            ]
            licensed_specialty_counts = [
                {'specialty': k, 'count': v['all'], 'count_active': v['active']}
                for k, v in licensed_map.items()
            ]
            all_specs = set(owned_map.keys()) | set(licensed_map.keys())
            audience_specialty_counts = [
                {
                    'specialty': spec,
                    'count': owned_map.get(spec, {'all': 0})['all'] + licensed_map.get(spec, {'all': 0})['all'],
                    'count_active': owned_map.get(spec, {'active': 0})['active'] + licensed_map.get(spec, {'active': 0})['active'],
                }
                for spec in all_specs
            ]

            return jsonify({
                'status': 'success',
                'universal_total': sum(v['all'] for v in universal_map.values()),
                'universal_total_active': sum(v['active'] for v in universal_map.values()),
                'audience_total': sum(v['all'] for v in owned_map.values()) + sum(v['all'] for v in licensed_map.values()),
                'audience_total_active': sum(v['active'] for v in owned_map.values()) + sum(v['active'] for v in licensed_map.values()),
                'owned_total': sum(v['all'] for v in owned_map.values()),
                'owned_total_active': sum(v['active'] for v in owned_map.values()),
                'licensed_total': sum(v['all'] for v in licensed_map.values()),
                'licensed_total_active': sum(v['active'] for v in licensed_map.values()),
                'universal_taxonomy_counts': universal_taxonomy_counts,
                'audience_specialty_counts': audience_specialty_counts,
                'owned_specialty_counts': owned_specialty_counts,
                'licensed_specialty_counts': licensed_specialty_counts
            }), 200
        finally:
            session.close()

    except Exception as e:
        import traceback
        return jsonify({'status': 'error', 'message': str(e), 'trace': traceback.format_exc()}), 500