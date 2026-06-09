import os
import sys
import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor, Json

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db_pool import get_db_connection
from scripts.subscriber_cleaner import clean_subscriber_row, detect_source_type, revalidate_cleaned
from scripts.subscriber_matcher import match_subscribers
from scripts.subscriber_router import route, BUCKET_PRINT, BUCKET_DIGITAL, BUCKET_REVIEW, ACTION_ADD, ACTION_ALREADY_ON
from routes.list_analysis import read_file_to_dataframe

subscriber_intake_bp = Blueprint('subscriber_intake', __name__)


@subscriber_intake_bp.route('/process', methods=['POST'])
def process_upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded. Send a CSV in the "file" form field.'}), 400

    f = request.files['file']
    if not f or not f.filename:
        return jsonify({'error': 'No file selected'}), 400

    df, err = read_file_to_dataframe(f)
    if err:
        return jsonify({'error': err}), 400

    df.columns = [str(c).strip() for c in df.columns]
    headers = list(df.columns)

    forced = request.form.get('source_type') or request.args.get('source_type')
    source_type = forced if forced in ('jcad', 'oncology', 'icns', 'social_media') else detect_source_type(headers)

    if source_type == 'unknown':
        return jsonify({
            'error': 'Could not auto-detect source type from CSV headers.',
            'headers': headers,
            'hint': 'Pass source_type=jcad|oncology|icns|social_media as a form field to override.'
        }), 400

    raw_rows = df.fillna('').to_dict(orient='records')
    raw_rows = [r for r in raw_rows if any(str(v).strip() for v in r.values())]

    cleaned_results = []
    for r in raw_rows:
        try:
            cleaned_results.append(clean_subscriber_row(r, source_type))
        except Exception as e:
            cleaned_results.append({
                'cleaned': {},
                'diff': [],
                'flags': [{'field': '_row', 'code': 'CLEANER_ERROR', 'message': str(e)}]
            })

    cleaned_only = [c['cleaned'] for c in cleaned_results]

    try:
        match_results = match_subscribers(cleaned_only)
    except Exception as e:
        match_results = [{'status': 'no_match', 'via': None, 'confidence': 0.0,
                          'existing_user_profile': None, 'existing_print_subscriber': None,
                          'universal_record': None, 'enriched': None, 'candidates': [],
                          'is_industry': False, 'industry_match': None,
                          'error': f'matcher failed: {e}'} for _ in cleaned_only]

    email_counts = {}
    for c in cleaned_results:
        e = (c.get('cleaned') or {}).get('email', '').lower().strip()
        if e:
            email_counts[e] = email_counts.get(e, 0) + 1

    rows_out = []
    for idx, (raw, cleaned_res, match_res) in enumerate(zip(raw_rows, cleaned_results, match_results)):
        cleaned = cleaned_res['cleaned']
        flags = list(cleaned_res['flags'])
        diff = cleaned_res['diff']
        e = cleaned.get('email', '').lower().strip()
        if e and email_counts.get(e, 0) > 1:
            flags.append({
                'field': 'email',
                'code': 'DUPLICATE_IN_UPLOAD',
                'message': f'Email appears {email_counts[e]} times in this upload',
            })
        _autofill_from_match(cleaned, match_res)
        buckets, review_flags = route(cleaned, match_res, flags, source_type)
        rows_out.append({
            'row_number': idx + 1,
            'raw': raw,
            'cleaned': cleaned,
            'diff': diff,
            'flags': flags,
            'review_flags': review_flags,
            'match': _serialize_match(match_res),
            'buckets': buckets,
        })

    bucket_summary = _summarize_buckets(rows_out)

    return jsonify({
        'source_type': source_type,
        'detected_from_headers': forced is None,
        'total_rows': len(rows_out),
        'rows': rows_out,
        'bucket_summary': bucket_summary,
    })


@subscriber_intake_bp.route('/reroute', methods=['POST'])
def reroute():
    body = request.get_json(silent=True) or {}
    rows = body.get('rows') or []
    source_type = body.get('source_type')
    if source_type not in ('jcad', 'oncology', 'icns', 'social_media'):
        return jsonify({'error': 'invalid source_type'}), 400
    if not rows:
        return jsonify({'error': 'no rows provided'}), 400

    cleaned_only = [r.get('cleaned') or {} for r in rows]

    try:
        match_results = match_subscribers(cleaned_only)
    except Exception as e:
        return jsonify({'error': f'matcher failed: {e}'}), 500

    email_counts = {}
    for c in cleaned_only:
        e = (c or {}).get('email', '').lower().strip()
        if e:
            email_counts[e] = email_counts.get(e, 0) + 1

    rows_out = []
    for r, cleaned, match_res in zip(rows, cleaned_only, match_results):
        flags = revalidate_cleaned(cleaned)
        e = cleaned.get('email', '').lower().strip()
        if e and email_counts.get(e, 0) > 1:
            flags.append({
                'field': 'email',
                'code': 'DUPLICATE_IN_UPLOAD',
                'message': f'Email appears {email_counts[e]} times in this upload',
            })
        _autofill_from_match(cleaned, match_res)
        buckets, review_flags = route(cleaned, match_res, flags, source_type)
        rows_out.append({
            **r,
            'cleaned': cleaned,
            'flags': flags,
            'match': _serialize_match(match_res),
            'review_flags': review_flags,
            'buckets': buckets,
        })

    return jsonify({
        'source_type': source_type,
        'total_rows': len(rows_out),
        'rows': rows_out,
        'bucket_summary': _summarize_buckets(rows_out),
    })


def _autofill_from_match(cleaned, match_res):
    if not match_res or match_res.get('status') != 'found_universal':
        return
    enriched = match_res.get('enriched') or {}
    if not enriched:
        return
    if not cleaned.get('npi') and enriched.get('npi'):
        cleaned['npi'] = enriched['npi']
    if not cleaned.get('specialty') and enriched.get('specialty'):
        cleaned['specialty'] = enriched['specialty']
    if not cleaned.get('city') and enriched.get('city'):
        cleaned['city'] = enriched['city']
    if not cleaned.get('state') and enriched.get('state'):
        cleaned['state'] = enriched['state']
    if not cleaned.get('zipcode') and enriched.get('zipcode'):
        cleaned['zipcode'] = enriched['zipcode']
    if not cleaned.get('address1') and enriched.get('address1'):
        cleaned['address1'] = enriched['address1']
    if not cleaned.get('address2') and enriched.get('address2'):
        cleaned['address2'] = enriched['address2']


def _serialize_match(m):
    out = dict(m)
    for key in ('existing_user_profile', 'existing_print_subscriber', 'universal_record', 'enriched'):
        v = out.get(key)
        if v:
            out[key] = _jsonify_record(v)
    out['candidates'] = [_jsonify_record(c) for c in (out.get('candidates') or [])]
    return out


def _jsonify_record(d):
    if not isinstance(d, dict):
        return d
    out = {}
    for k, v in d.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        elif hasattr(v, 'isoformat'):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _summarize_buckets(rows):
    counts = {}
    for r in rows:
        for b in r['buckets']:
            key = b['name']
            if key not in counts:
                counts[key] = {'name': key, 'kind': b['kind'], 'list_name': b.get('list_name'),
                               'order': b.get('order', 99),
                               'add_count': 0, 'already_on_count': 0, 'review_count': 0}
            action = b.get('action')
            if action == ACTION_ADD:
                counts[key]['add_count'] += 1
            elif action == ACTION_ALREADY_ON:
                counts[key]['already_on_count'] += 1
            else:
                counts[key]['review_count'] += 1
    return sorted(counts.values(), key=lambda x: x['order'])


@subscriber_intake_bp.route('/run-print', methods=['POST'])
def run_print():
    body = request.get_json(silent=True) or {}
    rows = body.get('rows') or []
    bucket_name = body.get('bucket_name')
    if not rows:
        return jsonify({'error': 'No rows provided'}), 400

    inserted, updated, skipped = 0, 0, 0
    errors = []

    with get_db_connection() as conn:
        cur = conn.cursor()
        try:
            for row in rows:
                cleaned = row.get('cleaned') or {}
                match = row.get('match') or {}
                buckets = row.get('buckets') or []

                target_buckets = [b for b in buckets if b.get('kind') == BUCKET_PRINT and b.get('action') == ACTION_ADD]
                if bucket_name:
                    target_buckets = [b for b in target_buckets if b.get('name') == bucket_name]
                if not target_buckets:
                    skipped += 1
                    continue

                list_names = [b['list_name'] for b in target_buckets if b.get('list_name')]
                if not list_names:
                    skipped += 1
                    continue

                enriched = (match.get('enriched') or {})
                npi = cleaned.get('npi') or enriched.get('npi') or ''
                first = cleaned.get('first_name') or enriched.get('first_name', '')
                last = cleaned.get('last_name') or enriched.get('last_name', '')
                email = cleaned.get('email', '')
                specialty = cleaned.get('specialty') or enriched.get('specialty', '')
                degree = cleaned.get('degree', '')
                addr1 = cleaned.get('address1') or enriched.get('address1', '')
                addr2 = cleaned.get('address2') or enriched.get('address2', '')
                city = cleaned.get('city') or enriched.get('city', '')
                state = cleaned.get('state') or enriched.get('state', '')
                zipcode = cleaned.get('zipcode') or enriched.get('zipcode', '')
                country = cleaned.get('country') or enriched.get('country', 'United States')
                company = cleaned.get('company', '')

                existing = match.get('existing_print_subscriber')
                if existing:
                    existing_lists = (existing.get('subscribed_lists') or '').strip()
                    existing_set = {x.strip() for x in existing_lists.split(',') if x.strip()}
                    new_set = existing_set | set(list_names)
                    new_lists = ', '.join(sorted(new_set))
                    cur.execute("""
                        UPDATE print_list_subscribers
                        SET subscribed_lists = %s,
                            email = COALESCE(NULLIF(%s, ''), email),
                            first_name = COALESCE(NULLIF(%s, ''), first_name),
                            last_name = COALESCE(NULLIF(%s, ''), last_name),
                            specialty = COALESCE(NULLIF(%s, ''), specialty),
                            degree = COALESCE(NULLIF(%s, ''), degree),
                            address_1 = COALESCE(NULLIF(%s, ''), address_1),
                            address_2 = COALESCE(NULLIF(%s, ''), address_2),
                            city = COALESCE(NULLIF(%s, ''), city),
                            state = COALESCE(NULLIF(%s, ''), state),
                            zipcode = COALESCE(NULLIF(%s, ''), zipcode),
                            country = COALESCE(NULLIF(%s, ''), country),
                            company = COALESCE(NULLIF(%s, ''), company),
                            is_subscribed = TRUE,
                            updated_at = NOW()
                        WHERE id = %s
                    """, (new_lists, email, first, last, specialty, degree, addr1, addr2,
                          city, state, zipcode, country, company, existing['id']))
                    updated += 1
                else:
                    cur.execute("""
                        INSERT INTO print_list_subscribers
                            (npi, first_name, last_name, degree, email, specialty, company,
                             address_1, address_2, city, state, zipcode, country,
                             subscribed_lists, is_subscribed, source, subscribe_date, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s,
                                %s, %s, %s, %s, %s, %s,
                                %s, TRUE, %s, NOW(), NOW(), NOW())
                    """, (npi or None, first, last, degree, email, specialty, company,
                          addr1, addr2, city, state, zipcode, country,
                          ', '.join(list_names), 'subscriber_intake'))
                    inserted += 1
            conn.commit()
        except Exception as e:
            conn.rollback()
            errors.append(str(e))
        finally:
            cur.close()

    return jsonify({
        'inserted': inserted,
        'updated': updated,
        'skipped': skipped,
        'errors': errors,
    })


@subscriber_intake_bp.route('/run-digital', methods=['POST'])
def run_digital():
    body = request.get_json(silent=True) or {}
    rows = body.get('rows') or []
    bucket_name = body.get('bucket_name')
    if not rows:
        return jsonify({'error': 'No rows provided'}), 400

    inserted, updated, skipped = 0, 0, 0
    errors = []

    with get_db_connection() as conn:
        cur = conn.cursor()
        try:
            for row in rows:
                cleaned = row.get('cleaned') or {}
                match = row.get('match') or {}
                buckets = row.get('buckets') or []

                target_buckets = [b for b in buckets if b.get('kind') == BUCKET_DIGITAL and b.get('action') == ACTION_ADD]
                if bucket_name:
                    target_buckets = [b for b in target_buckets if b.get('name') == bucket_name]
                if not target_buckets:
                    skipped += 1
                    continue

                list_names = [b['list_name'] for b in target_buckets if b.get('list_name')]
                if not list_names:
                    skipped += 1
                    continue

                email = (cleaned.get('email') or '').lower()
                if not email:
                    skipped += 1
                    continue

                enriched = (match.get('enriched') or {})
                npi = cleaned.get('npi') or enriched.get('npi') or None
                first = cleaned.get('first_name') or enriched.get('first_name', '')
                last = cleaned.get('last_name') or enriched.get('last_name', '')
                specialty = cleaned.get('specialty') or enriched.get('specialty', '')
                degree = cleaned.get('degree', '')

                spec_override = next((b.get('specialty_override') for b in target_buckets if b.get('specialty_override')), None)
                if spec_override:
                    specialty = spec_override

                addr1 = cleaned.get('address1') or enriched.get('address1', '')
                addr2 = cleaned.get('address2') or enriched.get('address2', '')
                full_addr = (addr1 + (' ' + addr2 if addr2 else '')).strip()
                city = cleaned.get('city') or enriched.get('city', '')
                state = cleaned.get('state') or enriched.get('state', '')
                zipcode = cleaned.get('zipcode') or enriched.get('zipcode', '')
                country = cleaned.get('country') or enriched.get('country', 'United States')

                existing = match.get('existing_user_profile')
                if existing:
                    existing_lists = existing.get('digital_lists_subscribed') or []
                    if isinstance(existing_lists, str):
                        try:
                            existing_lists = json.loads(existing_lists)
                        except Exception:
                            existing_lists = []
                    new_lists = sorted(set(existing_lists) | set(list_names))

                    cur.execute("""
                        UPDATE user_profiles
                        SET digital_lists_subscribed = %s,
                            first_name = COALESCE(NULLIF(%s, ''), first_name),
                            last_name = COALESCE(NULLIF(%s, ''), last_name),
                            npi = COALESCE(NULLIF(%s, ''), npi),
                            specialty = COALESCE(NULLIF(%s, ''), specialty),
                            degree = COALESCE(NULLIF(%s, ''), degree),
                            address = COALESCE(NULLIF(%s, ''), address),
                            city = COALESCE(NULLIF(%s, ''), city),
                            state = COALESCE(NULLIF(%s, ''), state),
                            zipcode = COALESCE(NULLIF(%s, ''), zipcode),
                            country = COALESCE(NULLIF(%s, ''), country),
                            is_active = TRUE,
                            updated_at = NOW()
                        WHERE id = %s
                    """, (Json(new_lists), first, last, npi or '', specialty, degree,
                          full_addr, city, state, zipcode, country, existing['id']))
                    updated += 1
                else:
                    cur.execute("""
                        INSERT INTO user_profiles
                            (email, first_name, last_name, npi, specialty, degree,
                             address, city, state, zipcode, country,
                             digital_lists_subscribed, ac_segments, ac_tags,
                             is_active, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s,
                                %s, %s, %s, %s, %s,
                                %s, %s, %s,
                                TRUE, NOW(), NOW())
                        ON CONFLICT (email) DO NOTHING
                    """, (email, first, last, npi, specialty, degree,
                          full_addr, city, state, zipcode, country,
                          Json(list_names), Json([]), Json([])))
                    inserted += 1
            conn.commit()
        except Exception as e:
            conn.rollback()
            errors.append(str(e))
        finally:
            cur.close()

    return jsonify({
        'inserted': inserted,
        'updated': updated,
        'skipped': skipped,
        'errors': errors,
    })


DIGITAL_LIST_NAMES = {
    'JCAD US Subscribers', 'JCAD International Subscribers', 'JCAD NPPA (MMC)',
    'JCAD Comp', 'Oncology (MMC)', 'ICNS US Subscribers', 'ICNS International Subscribers',
    'Nutrition Health Review',
}
PRINT_LIST_NAMES = {
    'JCAD Print List', 'NP+PA Print List', 'JCAD Comp List',
}


@subscriber_intake_bp.route('/ingest-clean', methods=['POST'])
def ingest_clean():
    body = request.get_json(silent=True) or {}
    rows = body.get('rows') or []
    list_name = (body.get('list_name') or '').strip()
    kind = (body.get('kind') or '').strip().lower()
    if not list_name:
        return jsonify({'error': 'No list_name provided'}), 400
    if kind not in (BUCKET_PRINT, BUCKET_DIGITAL):
        return jsonify({'error': "kind must be 'print' or 'digital'"}), 400
    valid = PRINT_LIST_NAMES if kind == BUCKET_PRINT else DIGITAL_LIST_NAMES
    if list_name not in valid:
        return jsonify({'error': f"'{list_name}' is not a known {kind} list"}), 400
    if not rows:
        return jsonify({'error': 'No rows provided'}), 400

    results = []
    inserted = updated = skipped = failed = 0

    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        for idx, raw in enumerate(rows):
            r = {k: (str(v).strip() if v is not None else '') for k, v in (raw or {}).items()}
            name = (r.get('first_name', '') + ' ' + r.get('last_name', '')).strip()
            email = (r.get('email') or '').strip()
            cur.execute('SAVEPOINT sp_row')
            try:
                if kind == BUCKET_DIGITAL:
                    status, reason = _ingest_digital_row(cur, r, list_name, email)
                else:
                    status, reason = _ingest_print_row(cur, r, list_name, email)
                cur.execute('RELEASE SAVEPOINT sp_row')
            except Exception as e:
                cur.execute('ROLLBACK TO SAVEPOINT sp_row')
                status, reason = 'failed', str(e)
            if status == 'inserted':
                inserted += 1
            elif status == 'updated':
                updated += 1
            elif status == 'skipped':
                skipped += 1
            else:
                failed += 1
            results.append({'row': idx + 1, 'name': name, 'email': email,
                            'status': status, 'reason': reason})
        conn.commit()
        cur.close()

    return jsonify({
        'list_name': list_name,
        'kind': kind,
        'summary': {'inserted': inserted, 'updated': updated, 'skipped': skipped,
                    'failed': failed, 'total': len(rows)},
        'results': results,
    })


def _parse_json_list(raw):
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x).strip() for x in raw if str(x).strip()]
    if isinstance(raw, str):
        try:
            v = json.loads(raw)
            if isinstance(v, list):
                return [str(x).strip() for x in v if str(x).strip()]
        except Exception:
            return [x.strip() for x in raw.split(',') if x.strip()]
    return []


def _ingest_digital_row(cur, r, list_name, email):
    if not email:
        return 'skipped', 'missing email'
    cur.execute('SELECT id, digital_lists_subscribed FROM user_profiles WHERE LOWER(email) = LOWER(%s) LIMIT 1', (email,))
    existing = cur.fetchone()
    first = r.get('first_name', '')
    last = r.get('last_name', '')
    npi = r.get('npi', '')
    specialty = r.get('specialty', '')
    degree = r.get('degree', '')
    addr1 = r.get('address1', '')
    addr2 = r.get('address2', '')
    full_addr = (addr1 + (' ' + addr2 if addr2 else '')).strip()
    city = r.get('city', '')
    state = r.get('state', '')
    zipcode = r.get('zipcode', '')
    country = r.get('country', '') or 'United States'
    if existing:
        current = _parse_json_list(existing.get('digital_lists_subscribed'))
        if list_name in current:
            return 'skipped', f'already on {list_name}'
        new_lists = sorted(set(current) | {list_name})
        cur.execute("""
            UPDATE user_profiles
            SET digital_lists_subscribed = %s,
                first_name = COALESCE(NULLIF(%s, ''), first_name),
                last_name = COALESCE(NULLIF(%s, ''), last_name),
                npi = COALESCE(NULLIF(%s, ''), npi),
                specialty = COALESCE(NULLIF(%s, ''), specialty),
                degree = COALESCE(NULLIF(%s, ''), degree),
                address = COALESCE(NULLIF(%s, ''), address),
                city = COALESCE(NULLIF(%s, ''), city),
                state = COALESCE(NULLIF(%s, ''), state),
                zipcode = COALESCE(NULLIF(%s, ''), zipcode),
                country = COALESCE(NULLIF(%s, ''), country),
                is_active = TRUE,
                updated_at = NOW()
            WHERE id = %s
        """, (Json(new_lists), first, last, npi, specialty, degree,
              full_addr, city, state, zipcode, country, existing['id']))
        return 'updated', f'added to {list_name}'
    cur.execute("""
        INSERT INTO user_profiles
            (email, first_name, last_name, npi, specialty, degree,
             address, city, state, zipcode, country,
             digital_lists_subscribed, ac_segments, ac_tags,
             is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s,
                TRUE, NOW(), NOW())
    """, (email.lower(), first, last, npi or None, specialty, degree,
          full_addr, city, state, zipcode, country,
          Json([list_name]), Json([]), Json([])))
    return 'inserted', f'new contact added to {list_name}'


def _ingest_print_row(cur, r, list_name, email):
    npi = r.get('npi', '')
    first = r.get('first_name', '')
    last = r.get('last_name', '')
    zipcode = r.get('zipcode', '')
    existing = None
    if email:
        cur.execute("SELECT id, subscribed_lists FROM print_list_subscribers WHERE email <> '' AND LOWER(email) = LOWER(%s) LIMIT 1", (email,))
        existing = cur.fetchone()
    if not existing and npi:
        cur.execute("SELECT id, subscribed_lists FROM print_list_subscribers WHERE npi = %s LIMIT 1", (npi,))
        existing = cur.fetchone()
    if not existing and first and last and zipcode:
        cur.execute("SELECT id, subscribed_lists FROM print_list_subscribers WHERE LOWER(first_name) = LOWER(%s) AND LOWER(last_name) = LOWER(%s) AND zipcode = %s LIMIT 1", (first, last, zipcode))
        existing = cur.fetchone()
    specialty = r.get('specialty', '')
    degree = r.get('degree', '')
    company = r.get('company', '')
    addr1 = r.get('address1', '')
    addr2 = r.get('address2', '')
    city = r.get('city', '')
    state = r.get('state', '')
    country = r.get('country', '') or 'United States'
    if existing:
        current = {x.strip() for x in (existing.get('subscribed_lists') or '').split(',') if x.strip()}
        if list_name in current:
            return 'skipped', f'already on {list_name}'
        new_lists = ', '.join(sorted(current | {list_name}))
        cur.execute("""
            UPDATE print_list_subscribers
            SET subscribed_lists = %s,
                email = COALESCE(NULLIF(%s, ''), email),
                first_name = COALESCE(NULLIF(%s, ''), first_name),
                last_name = COALESCE(NULLIF(%s, ''), last_name),
                npi = COALESCE(NULLIF(%s, ''), npi),
                specialty = COALESCE(NULLIF(%s, ''), specialty),
                degree = COALESCE(NULLIF(%s, ''), degree),
                address_1 = COALESCE(NULLIF(%s, ''), address_1),
                address_2 = COALESCE(NULLIF(%s, ''), address_2),
                city = COALESCE(NULLIF(%s, ''), city),
                state = COALESCE(NULLIF(%s, ''), state),
                zipcode = COALESCE(NULLIF(%s, ''), zipcode),
                country = COALESCE(NULLIF(%s, ''), country),
                company = COALESCE(NULLIF(%s, ''), company),
                is_subscribed = TRUE,
                updated_at = NOW()
            WHERE id = %s
        """, (new_lists, email, first, last, npi, specialty, degree,
              addr1, addr2, city, state, zipcode, country, company, existing['id']))
        return 'updated', f'added to {list_name}'
    cur.execute("""
        INSERT INTO print_list_subscribers
            (npi, first_name, last_name, degree, email, specialty, company,
             address_1, address_2, city, state, zipcode, country,
             subscribed_lists, is_subscribed, source, subscribe_date, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, TRUE, %s, NOW(), NOW(), NOW())
    """, (npi or None, first, last, degree, email, specialty, company,
          addr1, addr2, city, state, zipcode, country,
          list_name, 'cleaned_list_import'))
    return 'inserted', f'new contact added to {list_name}'