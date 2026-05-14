import json
from scripts.subscriber_cleaner import is_nppa_eligible, is_derm_eligible

BUCKET_PRINT = 'print'
BUCKET_DIGITAL = 'digital'
BUCKET_REVIEW = 'review'

ACTION_ADD = 'add'
ACTION_ALREADY_ON = 'already_on'

BUCKET_ORDER = {
    'JCAD Print List': 10,
    'JCAD NPPA Print List': 11,
    'JCAD Comp List (Print)': 12,
    'JCAD US Subscribers': 20,
    'JCAD NPPA Digital': 21,
    'JCAD International Subscribers': 22,
    'JCAD Comp List (Digital)': 23,
    'Oncology MMC': 30,
    'ICNS US': 40,
    'ICNS International': 41,
    'Cleaning Issues': 90,
    'Manual Review': 95,
}


def _bucket(list_name, kind, action=ACTION_ADD, notes=None, **extra):
    return {
        'name': list_name,
        'list_name': list_name,
        'kind': kind,
        'action': action,
        'notes': notes,
        'order': BUCKET_ORDER.get(list_name, 99),
        **extra,
    }


def _review_bucket(name, notes=None, **extra):
    return {
        'name': name,
        'list_name': None,
        'kind': BUCKET_REVIEW,
        'action': 'review',
        'notes': notes,
        'order': BUCKET_ORDER.get(name, 99),
        **extra,
    }


def _has_blocking_flags(flags):
    blocking_codes = {'INVALID_FORMAT', 'EMPTY', 'COLUMN_SHIFT_SUSPECT'}
    blocking_fields = {'email', 'first_name', 'last_name'}
    for f in flags:
        if f.get('code') in blocking_codes and f.get('field') in blocking_fields:
            return True
    return False


def _get_existing_digital_lists(match):
    up = match.get('existing_user_profile')
    if not up:
        return set()
    raw = up.get('digital_lists_subscribed') or []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except Exception:
            raw = []
    return {str(x).strip() for x in raw if x}


def _get_existing_print_lists(match):
    ps = match.get('existing_print_subscriber')
    if not ps:
        return set()
    raw = ps.get('subscribed_lists') or ''
    if isinstance(raw, list):
        return {str(x).strip() for x in raw if x}
    return {x.strip() for x in str(raw).split(',') if x.strip()}


def _add_target(buckets, list_name, kind, match, notes=None, **extra):
    if kind == BUCKET_DIGITAL:
        existing = _get_existing_digital_lists(match)
    elif kind == BUCKET_PRINT:
        existing = _get_existing_print_lists(match)
    else:
        existing = set()

    action = ACTION_ALREADY_ON if list_name in existing else ACTION_ADD
    buckets.append(_bucket(list_name, kind, action=action, notes=notes, **extra))


def _is_currently_licensed(match):
    up = match.get('existing_user_profile')
    return bool(up and up.get('source_classification') == 'Licensed')


def route_jcad(cleaned, match, flags):
    buckets = []
    review_flags = []

    if _has_blocking_flags(flags):
        buckets.append(_review_bucket('Cleaning Issues',
                                      notes='Required field has invalid/empty value — fix before routing'))
        return buckets, review_flags

    if match['status'] == 'ambiguous':
        review_flags.append({
            'code': 'AMBIGUOUS_MATCH',
            'message': f'{len(match["candidates"])} possible matches — pick one',
        })

    if _is_currently_licensed(match):
        review_flags.append({
            'code': 'CURRENTLY_LICENSED',
            'message': 'Currently on IQVIA/HLD — flagged for migration to Owned (future AC layer)',
        })

    is_industry = match.get('is_industry', False)
    is_intl = not cleaned.get('is_us_or_canada', False)
    nppa_ok = is_nppa_eligible(cleaned.get('specialty'), cleaned.get('degree'), cleaned.get('job_title'), cleaned.get('company'))
    derm_ok = is_derm_eligible(cleaned.get('specialty'), cleaned.get('degree'), cleaned.get('job_title'), cleaned.get('company'))

    if is_intl:
        if any([cleaned.get('wants_jcad_print'), cleaned.get('wants_jcad_digital'),
                cleaned.get('wants_nppa_print'), cleaned.get('wants_nppa_digital')]):
            note = 'International — digital JCAD only (no print, no NPPA per policy)'
            if cleaned.get('wants_jcad_print') or cleaned.get('wants_nppa_print'):
                note += '. Print/NPPA signups redirected to digital.'
            _add_target(buckets, 'JCAD International Subscribers', BUCKET_DIGITAL, match,
                       notes=note)
        else:
            buckets.append(_review_bucket('Manual Review',
                                          notes='International with no publication selected'))
        return buckets, review_flags

    if is_industry:
        if cleaned.get('wants_jcad_print') or cleaned.get('wants_nppa_print'):
            _add_target(buckets, 'JCAD Comp List (Print)', BUCKET_PRINT, match,
                       notes=f'Industry contact (matched: {match.get("industry_match")})')
        if cleaned.get('wants_jcad_digital') or cleaned.get('wants_nppa_digital'):
            _add_target(buckets, 'JCAD Comp List (Digital)', BUCKET_DIGITAL, match,
                       notes=f'Industry contact (matched: {match.get("industry_match")})')
        return buckets, review_flags

    if cleaned.get('wants_jcad_print') and derm_ok:
        _add_target(buckets, 'JCAD Print List', BUCKET_PRINT, match)
    if cleaned.get('wants_nppa_print') and nppa_ok:
        _add_target(buckets, 'JCAD NPPA Print List', BUCKET_PRINT, match)

    wants_nppa_d = cleaned.get('wants_nppa_digital') and nppa_ok
    wants_jcad_d = cleaned.get('wants_jcad_digital') and derm_ok

    if wants_nppa_d:
        notes = 'NPPA-over-JCAD: skipping JCAD US Subscribers since NPPA recipients also receive JCAD sends' if cleaned.get('wants_jcad_digital') else None
        _add_target(buckets, 'JCAD NPPA Digital', BUCKET_DIGITAL, match, notes=notes)
    elif wants_jcad_d:
        _add_target(buckets, 'JCAD US Subscribers', BUCKET_DIGITAL, match)

    if not buckets:
        buckets.append(_review_bucket('Manual Review',
                                      notes='Did not match any list rule — review eligibility'))

    return buckets, review_flags


def route_oncology(cleaned, match, flags):
    buckets = []
    review_flags = []

    if _has_blocking_flags(flags):
        buckets.append(_review_bucket('Cleaning Issues',
                                      notes='Required field has invalid/empty value'))
        return buckets, review_flags

    if match['status'] == 'ambiguous':
        review_flags.append({
            'code': 'AMBIGUOUS_MATCH',
            'message': f'{len(match["candidates"])} possible matches — pick one',
        })

    if _is_currently_licensed(match):
        review_flags.append({
            'code': 'CURRENTLY_LICENSED',
            'message': 'Currently on IQVIA/HLD — flagged for migration to Owned',
        })

    _add_target(buckets, 'Oncology MMC', BUCKET_DIGITAL, match,
               notes='All Oncology Matrix subscribers go here regardless of cancer area',
               extra_metadata={
                   'oncology_areas': cleaned.get('oncology_areas', []),
                   'oncology_format': cleaned.get('oncology_format', ''),
               })
    return buckets, review_flags


def route_icns(cleaned, match, flags):
    buckets = []
    review_flags = []

    if _has_blocking_flags(flags):
        buckets.append(_review_bucket('Cleaning Issues',
                                      notes='Required field has invalid/empty value'))
        return buckets, review_flags

    if match['status'] == 'ambiguous':
        review_flags.append({
            'code': 'AMBIGUOUS_MATCH',
            'message': f'{len(match["candidates"])} possible matches',
        })

    if _is_currently_licensed(match):
        review_flags.append({
            'code': 'CURRENTLY_LICENSED',
            'message': 'Currently on IQVIA/HLD — flagged for migration',
        })

    is_industry = match.get('is_industry', False)
    type_pro = (cleaned.get('type_of_professional') or '').lower()
    explicit_industry = type_pro == 'industry'

    if is_industry or explicit_industry:
        _add_target(buckets, 'ICNS US', BUCKET_DIGITAL, match,
                   notes='Industry → ICNS US (specialty=industry) regardless of country',
                   specialty_override='industry')
        return buckets, review_flags

    if cleaned.get('is_us'):
        _add_target(buckets, 'ICNS US', BUCKET_DIGITAL, match)
    else:
        _add_target(buckets, 'ICNS International', BUCKET_DIGITAL, match)

    return buckets, review_flags


def route_social_media(cleaned, match, flags):
    buckets = []
    review_flags = []

    if _has_blocking_flags(flags):
        buckets.append(_review_bucket('Cleaning Issues',
                                      notes='Required field has invalid/empty value'))
        return buckets, review_flags

    if match['status'] == 'ambiguous':
        review_flags.append({
            'code': 'AMBIGUOUS_MATCH',
            'message': f'{len(match["candidates"])} possible matches',
        })

    if _is_currently_licensed(match):
        review_flags.append({
            'code': 'CURRENTLY_LICENSED',
            'message': 'Currently on IQVIA/HLD — flagged for migration to Owned',
        })

    is_industry = match.get('is_industry', False)
    nppa_ok = is_nppa_eligible(cleaned.get('specialty'), cleaned.get('degree'), cleaned.get('job_title'), cleaned.get('company'))
    derm_ok = is_derm_eligible(cleaned.get('specialty'), cleaned.get('degree'), cleaned.get('job_title'), cleaned.get('company'))

    if is_industry:
        _add_target(buckets, 'JCAD Comp List (Digital)', BUCKET_DIGITAL, match,
                   notes=f'Industry contact (matched: {match.get("industry_match")})')
        return buckets, review_flags

    if nppa_ok:
        _add_target(buckets, 'JCAD NPPA Digital', BUCKET_DIGITAL, match)
    elif derm_ok:
        _add_target(buckets, 'JCAD US Subscribers', BUCKET_DIGITAL, match)
    else:
        buckets.append(_review_bucket('Manual Review',
                                      notes='No clear derm/HCP credential — decide whether to add'))

    return buckets, review_flags


ROUTERS = {
    'jcad': route_jcad,
    'oncology': route_oncology,
    'icns': route_icns,
    'social_media': route_social_media,
}


def route(cleaned, match, flags, source_type):
    fn = ROUTERS.get(source_type)
    if not fn:
        return [_review_bucket('Manual Review', notes=f'Unknown source type: {source_type}')], []
    return fn(cleaned, match, flags)
