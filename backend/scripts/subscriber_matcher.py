import re
from psycopg2.extras import RealDictCursor
from db_pool import get_db_connection
from routes.source_classification import classify_source_sql_expr
from scripts.subscriber_cleaner import _smart_title, _abbreviate_address, US_STATES, US_STATE_CODES, CA_PROVINCES, CA_PROVINCE_CODES, is_npi_eligible, ascii_fold

GENERIC_EMAIL_DOMAINS = {
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
    'aol.com', 'me.com', 'msn.com', 'live.com', 'comcast.net', 'sbcglobal.net',
    'verizon.net', 'att.net', 'cox.net', 'charter.net', 'mac.com', 'rocketmail.com',
    'mail.com', 'protonmail.com', 'proton.me', 'gmx.com', 'gmx.net', 'ymail.com',
}

PLACEHOLDER_COMPANIES = {
    '', '--none--', 'none', 'n/a', 'na', 'self', 'self employed', 'self-employed',
    'private', 'private practice', 'independent', 'home', 'retired', '-', '--', 'no company',
    'unknown', 'null', 'undefined',
}

INDUSTRY_MATCH_STOPWORDS = {
    'health', 'healthcare', 'care', 'medical', 'medicine', 'pharma', 'pharmaceutical',
    'pharmaceuticals', 'derm', 'dermatology', 'dermatologic', 'dermatologica',
    'skin', 'skincare', 'aesthetic', 'aesthetics', 'esthetic', 'esthetics',
    'cosmetic', 'cosmetics', 'beauty', 'spa', 'medspa', 'wellness',
    'family', 'general', 'primary', 'specialty', 'specialist', 'specialists',
    'surgical', 'surgery', 'plastic', 'allergy', 'oncology', 'pediatric', 'pediatrics',
    'internal', 'advanced', 'premier', 'modern', 'comprehensive', 'integrated',
    'clinic', 'clinics', 'center', 'centre', 'centers', 'institute', 'institutes',
    'hospital', 'hospitals', 'practice', 'practices', 'associates', 'group', 'groups',
    'partners', 'services', 'sciences', 'science', 'physicians', 'physician',
    'company', 'inc', 'llc', 'corp', 'corporation', 'ltd', 'limited', 'limited',
    'gmbh', 'holdings', 'global', 'national', 'international', 'usa', 'america',
    'north', 'south', 'east', 'west', 'central', 'valley', 'park', 'plaza',
    'university', 'college', 'school', 'campus',
}


def _industry_distinctive_words(folded):
    if not folded:
        return set()
    words = set(re.findall(r'\b[a-z0-9]{4,}\b', folded))
    return words - INDUSTRY_MATCH_STOPWORDS

DERM_TAXONOMY_PREFIX = '207N'

TAXONOMY_NAMES = {
    '207N00000X': 'Dermatology',
    '207NS0135X': 'Dermatology - Dermatopathology',
    '207NI0002X': 'Dermatology - Clinical & Laboratory Dermatological Immunology',
    '207NP0225X': 'Pediatric Dermatology',
    '207ND0900X': 'Dermatology - MOHS-Micrographic Surgery',
    '207ND0101X': 'Dermatologic Surgery',
    '207NF0001X': 'Dermatology - Family Practice',
    '363L00000X': 'Nurse Practitioner',
    '363LA2100X': 'Nurse Practitioner - Acute Care',
    '363LA2200X': 'Nurse Practitioner - Adult Health',
    '363LC0200X': 'Nurse Practitioner - Critical Care Medicine',
    '363LF0000X': 'Nurse Practitioner - Family',
    '363LG0600X': 'Nurse Practitioner - Gerontology',
    '363LN0000X': 'Nurse Practitioner - Neonatal',
    '363LN0005X': 'Nurse Practitioner - Neonatal Critical Care',
    '363LP0200X': 'Nurse Practitioner - Pediatrics',
    '363LP0222X': 'Nurse Practitioner - Pediatrics Critical Care',
    '363LP1700X': 'Nurse Practitioner - Perinatal',
    '363LP2300X': 'Nurse Practitioner - Primary Care',
    '363LS0200X': 'Nurse Practitioner - School',
    '363LW0102X': "Nurse Practitioner - Women's Health",
    '363LX0001X': 'Nurse Practitioner - Obstetrics & Gynecology',
    '363LX0106X': 'Nurse Practitioner - Occupational Health',
    '363LP0808X': 'Nurse Practitioner - Psychiatric/Mental Health',
    '363A00000X': 'Physician Assistant',
    '363AM0700X': 'Physician Assistant - Medical',
    '363AS0400X': 'Physician Assistant - Surgical',
    '207R00000X': 'Internal Medicine',
    '207Q00000X': 'Family Medicine',
    '208000000X': 'Pediatrics',
    '208600000X': 'Surgery',
    '207V00000X': 'Obstetrics & Gynecology',
}


def _resolve_specialty(primary_specialty, taxonomy_code):
    if primary_specialty and primary_specialty.strip():
        return primary_specialty
    if taxonomy_code:
        if taxonomy_code in TAXONOMY_NAMES:
            return TAXONOMY_NAMES[taxonomy_code]
        if taxonomy_code.startswith('207N'):
            return 'Dermatology'
        if taxonomy_code.startswith('363L'):
            return 'Nurse Practitioner'
        if taxonomy_code.startswith('363A'):
            return 'Physician Assistant'
    return primary_specialty or ''


def _norm(s):
    return (s or '').strip().lower()


def _name_key(first, last):
    return (_norm(first), _norm(last))


def fetch_universal_by_npi(npis):
    if not npis:
        return {}
    npis = list({n for n in npis if n and len(n) == 10 and n.isdigit()})
    if not npis:
        return {}
    sql = """
        SELECT npi, first_name, last_name, middle_name, credential, primary_specialty,
               primary_taxonomy_code,
               mailing_address_1, mailing_address_2, mailing_city, mailing_state,
               mailing_zipcode, mailing_country,
               practice_address_1, practice_address_2, practice_city, practice_state,
               practice_zipcode, practice_country,
               is_active, provider_status
        FROM universal_profiles
        WHERE npi = ANY(%s)
    """
    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql, (npis,))
        rows = cur.fetchall()
        cur.close()
    return {r['npi']: dict(r) for r in rows}


def fetch_user_profiles_by_email(emails):
    if not emails:
        return {}
    emails = list({_norm(e) for e in emails if e})
    if not emails:
        return {}
    src_expr = classify_source_sql_expr('up')
    sql = f"""
        SELECT up.id, up.email, up.first_name, up.last_name, up.specialty, up.degree,
               up.npi, up.address, up.city, up.state, up.zipcode, up.country,
               up.ac_segments, up.ac_tags,
               up.digital_lists_subscribed, up.digital_lists_unsubscribed,
               up.is_active,
               ({src_expr}) AS source_classification
        FROM user_profiles up
        WHERE LOWER(up.email) = ANY(%s)
    """
    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql, (emails,))
        rows = cur.fetchall()
        cur.close()
    return {r['email'].lower(): dict(r) for r in rows}


def fetch_print_subscribers_by_email_or_npi(emails, npis):
    by_email, by_npi = {}, {}
    emails = list({_norm(e) for e in emails if e})
    npis = list({n for n in npis if n})
    if not emails and not npis:
        return by_email, by_npi
    sql = """
        SELECT id, npi, email, first_name, last_name, specialty, degree,
               address_1, address_2, city, state, zipcode, country,
               subscribed_lists, unsubscribed_lists, is_subscribed
        FROM print_list_subscribers
        WHERE LOWER(email) = ANY(%s) OR npi = ANY(%s)
    """
    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql, (emails or [''], npis or ['']))
        rows = cur.fetchall()
        cur.close()
    for r in rows:
        d = dict(r)
        if d.get('email'):
            by_email[d['email'].lower()] = d
        if d.get('npi'):
            by_npi[d['npi']] = d
    return by_email, by_npi


def search_universal_by_name(name_state_pairs, derm_only=True):
    if not name_state_pairs:
        return {}

    keys = list({(_norm(f), _norm(l), (s or '').upper()) for f, l, s in name_state_pairs if f and l})
    if not keys:
        return {}

    firsts = [k[0] for k in keys]
    lasts = [k[1] for k in keys]

    where_taxonomy = "AND primary_taxonomy_code LIKE %s" if derm_only else ""
    params = [firsts, lasts]
    if derm_only:
        params.append(DERM_TAXONOMY_PREFIX + '%')

    sql = f"""
        SELECT npi, first_name, last_name, middle_name, credential, primary_specialty,
               primary_taxonomy_code,
               mailing_address_1, mailing_address_2, mailing_city, mailing_state,
               mailing_zipcode, mailing_country,
               practice_address_1, practice_address_2, practice_city, practice_state,
               practice_zipcode, practice_country,
               is_active
        FROM universal_profiles
        WHERE LOWER(first_name) = ANY(%s)
          AND LOWER(last_name) = ANY(%s)
          AND is_active = TRUE
          {where_taxonomy}
    """
    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql, params)
        rows = cur.fetchall()
        cur.close()

    bucket = {}
    for r in rows:
        d = dict(r)
        for k in keys:
            f_in, l_in, s_in = k
            if _norm(d.get('first_name')) == f_in and _norm(d.get('last_name')) == l_in:
                if not s_in or (d.get('practice_state') or '').upper() == s_in or (d.get('mailing_state') or '').upper() == s_in:
                    bucket.setdefault(k, []).append(d)
                elif not s_in:
                    bucket.setdefault(k, []).append(d)
    return bucket


def fetch_industry_table():
    with get_db_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT DISTINCT LOWER(agency), LOWER(pharma_company), LOWER(brand)
                FROM brand_editor_agency
                WHERE is_active = TRUE
            """)
            rows = cur.fetchall()
        except Exception:
            cur.close()
            return set()
        cur.close()
    industry_names = set()
    for r in rows:
        for v in r:
            if v and v.strip():
                industry_names.add(v.strip())
    return industry_names


def detect_industry(company, email, industry_names):
    if not company and not email:
        return False, None

    folded_names = [(name, ascii_fold(name).lower() if name else '') for name in industry_names]

    company_l = ascii_fold(_norm(company))
    if company_l in PLACEHOLDER_COMPANIES:
        company_l = ''

    if company_l:
        company_clean = re.sub(r'[^a-z0-9]', '', company_l)
        company_words = set(re.findall(r'\b[a-z0-9]{4,}\b', company_l))
        company_distinctive = company_words - INDUSTRY_MATCH_STOPWORDS
        for original, folded in folded_names:
            if not folded or len(folded) < 3:
                continue
            if folded == company_l:
                return True, original
            folded_clean = re.sub(r'[^a-z0-9]', '', folded)
            if folded_clean and folded_clean == company_clean:
                return True, original
            distinctive = _industry_distinctive_words(folded)
            if distinctive and (distinctive & company_distinctive):
                return True, original

    if email and '@' in email:
        domain = email.split('@', 1)[1].lower().strip()
        if domain in GENERIC_EMAIL_DOMAINS:
            return False, None
        ignore_domain_parts = {
            'com', 'net', 'org', 'edu', 'gov', 'co', 'uk', 'ca', 'au', 'de', 'fr',
            'jp', 'in', 'mx', 'br', 'us', 'eu', 'io', 'inc', 'corp', 'ltd', 'gmbh',
            'mail', 'email', 'www', 'webmail', 'smtp', 'pharma', 'pharm', 'health',
        }
        segments = [p for p in domain.split('.') if p not in ignore_domain_parts]
        for seg in segments:
            seg_l = ascii_fold(_norm(seg))
            if len(seg_l) < 4:
                continue
            for original, folded in folded_names:
                if not folded or len(folded) < 4:
                    continue
                if folded == seg_l:
                    return True, original
                folded_clean = re.sub(r'[^a-z0-9]', '', folded)
                if folded_clean and folded_clean == seg_l:
                    return True, original
                distinctive = _industry_distinctive_words(folded)
                if seg_l in distinctive and len(seg_l) >= 5:
                    return True, original
    return False, None


def _score_candidate(cleaned_row, candidate):
    score = 0
    cleaned_city = (cleaned_row.get('city') or '').lower().strip()
    cand_city = (candidate.get('city') or '').lower().strip()
    if cleaned_city and cand_city and cleaned_city == cand_city:
        score += 15

    cleaned_state = (cleaned_row.get('state') or '').upper().strip()
    cand_state = (candidate.get('state') or '').upper().strip()
    if cleaned_state and cand_state and cleaned_state == cand_state:
        score += 5

    cleaned_addr = ((cleaned_row.get('address1') or '') + ' ' + (cleaned_row.get('address2') or '')).lower()
    cand_addr = ((candidate.get('address1') or '') + ' ' + (candidate.get('address2') or '')).lower()
    if cleaned_addr.strip() and cand_addr.strip():
        cleaned_tokens = set(re.findall(r'\b\w{3,}\b', cleaned_addr))
        cand_tokens = set(re.findall(r'\b\w{3,}\b', cand_addr))
        overlap = cleaned_tokens & cand_tokens
        if overlap:
            score += min(len(overlap) * 10, 30)

    cleaned_zip = (cleaned_row.get('zipcode') or '').replace('-', '').strip()
    cand_zip = (candidate.get('zipcode') or '').replace('-', '').strip()
    if cleaned_zip and cand_zip and cleaned_zip[:5] == cand_zip[:5]:
        score += 8

    return score


def _try_auto_pick(cleaned_row, candidates):
    if not candidates:
        return None, 0
    if len(candidates) == 1:
        return candidates[0], _score_candidate(cleaned_row, candidates[0])
    scored = sorted([(c, _score_candidate(cleaned_row, c)) for c in candidates], key=lambda x: -x[1])
    top, top_score = scored[0]
    second_score = scored[1][1] if len(scored) > 1 else 0
    if top_score >= 20 and (top_score - second_score) >= 10:
        return top, top_score
    return None, top_score


def _normalize_country(c):
    if not c:
        return ''
    upper = c.upper().replace('.', '').strip()
    if upper in {'US', 'USA', 'U S', 'U S A', 'UNITED STATES', 'UNITED STATES OF AMERICA', 'AMERICA'}:
        return 'United States'
    if upper in {'CA', 'CAN', 'CANADA'}:
        return 'Canada'
    if upper in {'UK', 'U K', 'UNITED KINGDOM', 'GREAT BRITAIN'}:
        return 'United Kingdom'
    return _smart_title(c)


def _normalize_state(s, country):
    if not s:
        return ''
    upper = s.strip().upper()
    if country == 'United States':
        if upper in US_STATE_CODES:
            return upper
        if upper in US_STATES:
            return US_STATES[upper]
    if country == 'Canada':
        if upper in CA_PROVINCE_CODES:
            return upper
        if upper in CA_PROVINCES:
            return CA_PROVINCES[upper]
    return s.strip()


def _normalize_zip(z, country):
    if not z:
        return ''
    raw = str(z).strip()
    digits = re.sub(r'\D', '', raw)
    if country == 'United States':
        if len(digits) == 9:
            return f'{digits[:5]}-{digits[5:]}'
        if len(digits) >= 5:
            return digits[:5]
    if country == 'Canada':
        normalized = raw.upper().replace(' ', '').replace('-', '')
        if re.match(r'^[A-Z]\d[A-Z]\d[A-Z]\d$', normalized):
            return normalized[:3] + ' ' + normalized[3:]
    return raw


def _normalize_name(s):
    if not s:
        return ''
    return _smart_title(str(s).strip())


def _normalize_address(s):
    if not s:
        return ''
    titled = _smart_title(str(s).strip())
    return _abbreviate_address(titled)


def _build_enriched(universal_row):
    if not universal_row:
        return None
    practice_addr1 = universal_row.get('practice_address_1') or universal_row.get('mailing_address_1') or ''
    practice_addr2 = universal_row.get('practice_address_2') or universal_row.get('mailing_address_2') or ''
    country = _normalize_country(universal_row.get('practice_country') or universal_row.get('mailing_country'))
    state = _normalize_state(universal_row.get('practice_state') or universal_row.get('mailing_state'), country)
    zipcode = _normalize_zip(universal_row.get('practice_zipcode') or universal_row.get('mailing_zipcode'), country)
    return {
        'npi': universal_row.get('npi'),
        'first_name': _normalize_name(universal_row.get('first_name')),
        'last_name': _normalize_name(universal_row.get('last_name')),
        'middle_name': _normalize_name(universal_row.get('middle_name')),
        'credential': universal_row.get('credential'),
        'specialty': _resolve_specialty(universal_row.get('primary_specialty'), universal_row.get('primary_taxonomy_code')),
        'taxonomy_code': universal_row.get('primary_taxonomy_code'),
        'address1': _normalize_address(practice_addr1),
        'address2': _normalize_address(practice_addr2),
        'city': _normalize_name(universal_row.get('practice_city') or universal_row.get('mailing_city')),
        'state': state,
        'zipcode': zipcode,
        'country': country,
    }


def match_subscribers(cleaned_rows):
    if not cleaned_rows:
        return []

    npis = [r.get('npi') for r in cleaned_rows if r.get('npi')]
    emails = [r.get('email') for r in cleaned_rows if r.get('email')]
    name_keys = [(r.get('first_name'), r.get('last_name'), r.get('state')) for r in cleaned_rows]

    universal_by_npi = fetch_universal_by_npi(npis)
    user_profiles_by_email = fetch_user_profiles_by_email(emails)
    print_by_email, print_by_npi = fetch_print_subscribers_by_email_or_npi(emails, npis)
    industry_names = fetch_industry_table()

    needs_name_search_keys = []
    for r in cleaned_rows:
        if not r.get('is_us_or_canada', True):
            continue
        if not is_npi_eligible(r.get('specialty'), r.get('degree'), r.get('job_title')):
            continue
        npi_hit = r.get('npi') and r['npi'] in universal_by_npi
        email_hit = r.get('email') and r['email'] in user_profiles_by_email
        has_user_profile_npi = email_hit and user_profiles_by_email[r['email']].get('npi')
        if not npi_hit and not has_user_profile_npi:
            if r.get('first_name') and r.get('last_name'):
                needs_name_search_keys.append((r['first_name'], r['last_name'], r.get('state')))

    name_results = search_universal_by_name(needs_name_search_keys, derm_only=True)
    name_results_loose = {}
    if needs_name_search_keys:
        name_results_loose = search_universal_by_name(needs_name_search_keys, derm_only=False)

    results = []
    for r in cleaned_rows:
        email = r.get('email', '')
        npi = r.get('npi', '')
        existing_up = user_profiles_by_email.get(email) if email else None
        existing_print_email = print_by_email.get(email) if email else None
        existing_print_npi = print_by_npi.get(npi) if npi else None

        is_industry, industry_match = detect_industry(r.get('company', ''), email, industry_names)

        result = {
            'status': 'no_match',
            'via': None,
            'confidence': 0.0,
            'existing_user_profile': existing_up,
            'existing_print_subscriber': existing_print_email or existing_print_npi,
            'universal_record': None,
            'enriched': None,
            'candidates': [],
            'is_industry': is_industry,
            'industry_match': industry_match,
        }

        if npi and npi in universal_by_npi:
            uni = universal_by_npi[npi]
            result['status'] = 'found_universal'
            result['via'] = 'npi'
            result['confidence'] = 1.0
            result['universal_record'] = uni
            result['enriched'] = _build_enriched(uni)
        elif existing_up and existing_up.get('npi') and existing_up['npi'] in universal_by_npi:
            uni = universal_by_npi[existing_up['npi']]
            result['status'] = 'found_universal'
            result['via'] = 'email_to_npi'
            result['confidence'] = 0.95
            result['universal_record'] = uni
            result['enriched'] = _build_enriched(uni)
        elif existing_up:
            result['status'] = 'found_user_profile'
            result['via'] = 'email'
            result['confidence'] = 0.9
        elif not r.get('is_us_or_canada', True):
            pass
        elif not is_npi_eligible(r.get('specialty'), r.get('degree'), r.get('job_title')):
            pass
        else:
            key = (_norm(r.get('first_name')), _norm(r.get('last_name')), (r.get('state') or '').upper())
            candidates = name_results.get(key) or []
            if not candidates:
                candidates = name_results_loose.get(key) or []
                derm_only = False
            else:
                derm_only = True

            if len(candidates) == 1:
                result['status'] = 'found_universal'
                result['via'] = 'name_state' + ('_derm' if derm_only else '_loose')
                result['confidence'] = 0.85 if derm_only else 0.6
                result['universal_record'] = candidates[0]
                result['enriched'] = _build_enriched(candidates[0])
            elif len(candidates) > 1:
                enriched_candidates = [_build_enriched(c) for c in candidates[:10]]
                auto_picked, auto_score = _try_auto_pick(r, enriched_candidates)
                if auto_picked:
                    result['status'] = 'found_universal'
                    result['via'] = 'name_state' + ('_derm_autopick' if derm_only else '_loose_autopick')
                    result['confidence'] = 0.85 if auto_score >= 30 else 0.75
                    result['universal_record'] = next(
                        (c for c in candidates if c.get('npi') == auto_picked.get('npi')), candidates[0]
                    )
                    result['enriched'] = auto_picked
                    result['auto_picked'] = True
                else:
                    result['status'] = 'ambiguous'
                    result['via'] = 'name_state'
                    result['confidence'] = 0.5
                    result['candidates'] = enriched_candidates

        results.append(result)

    return results
