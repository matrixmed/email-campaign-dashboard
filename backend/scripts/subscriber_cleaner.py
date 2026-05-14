import re
import unicodedata

US_STATES = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
    'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
    'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
    'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
    'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
    'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
    'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
    'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY',
    'DISTRICT OF COLUMBIA': 'DC', 'PUERTO RICO': 'PR', 'U.S. VIRGIN ISLANDS': 'VI', 'GUAM': 'GU',
    'AMERICAN SAMOA': 'AS', 'NORTHERN MARIANA ISLANDS': 'MP'
}
US_STATE_CODES = set(US_STATES.values())

CA_PROVINCES = {
    'ALBERTA': 'AB', 'BRITISH COLUMBIA': 'BC', 'MANITOBA': 'MB', 'NEW BRUNSWICK': 'NB',
    'NEWFOUNDLAND AND LABRADOR': 'NL', 'NEWFOUNDLAND': 'NL', 'NOVA SCOTIA': 'NS', 'ONTARIO': 'ON',
    'PRINCE EDWARD ISLAND': 'PE', 'QUEBEC': 'QC', 'SASKATCHEWAN': 'SK',
    'NORTHWEST TERRITORIES': 'NT', 'NUNAVUT': 'NU', 'YUKON': 'YT'
}
CA_PROVINCE_CODES = set(CA_PROVINCES.values())

US_VARIANTS = {
    'US', 'USA', 'U.S.', 'U.S.A.', 'UNITED STATES', 'UNITED STATES OF AMERICA', 'AMERICA',
    'PUERTO RICO', 'GUAM', 'AMERICAN SAMOA', 'NORTHERN MARIANA ISLANDS',
    'US VIRGIN ISLANDS', 'U.S. VIRGIN ISLANDS', 'US MINOR OUTLYING ISLANDS',
    'U.S. MINOR OUTLYING ISLANDS', 'USVI'
}
CA_VARIANTS = {'CA', 'CAN', 'CANADA'}
UK_VARIANTS = {'UK', 'U.K.', 'UNITED KINGDOM', 'GREAT BRITAIN', 'BRITAIN', 'ENGLAND', 'SCOTLAND', 'WALES', 'NORTHERN IRELAND'}

USPS_SUFFIX = {
    'AVENUE': 'Ave', 'AVE': 'Ave',
    'BOULEVARD': 'Blvd', 'BLVD': 'Blvd',
    'CIRCLE': 'Cir', 'CIR': 'Cir',
    'COURT': 'Ct', 'CT': 'Ct',
    'DRIVE': 'Dr', 'DR': 'Dr',
    'HIGHWAY': 'Hwy', 'HWY': 'Hwy',
    'LANE': 'Ln', 'LN': 'Ln',
    'PARKWAY': 'Pkwy', 'PKWY': 'Pkwy',
    'PLACE': 'Pl', 'PL': 'Pl',
    'ROAD': 'Rd', 'RD': 'Rd',
    'SQUARE': 'Sq', 'SQ': 'Sq',
    'STREET': 'St', 'ST': 'St',
    'TERRACE': 'Ter', 'TER': 'Ter',
    'TRAIL': 'Trl', 'TRL': 'Trl',
    'WAY': 'Way',
}

SECONDARY_DESIGNATORS = re.compile(
    r'(?:\b(?:Ste|Suite|Unit|Apt|Apartment|No\.?|Number|Bldg|Building|Floor|Fl|Rm|Room)\b\.?\s*[A-Za-z0-9\-]+|#\s*[A-Za-z0-9\-]+)',
    re.IGNORECASE
)

CA_PROVINCE_ALIASES = {
    'ONT': 'ON', 'QUE': 'QC', 'PQ': 'QC',
    'SASK': 'SK', 'MAN': 'MB', 'ALTA': 'AB', 'ALB': 'AB',
    'NFLD': 'NL', 'NFLD AND LABRADOR': 'NL',
    'YUK': 'YT',
}

DEGREE_LONG_MAP = [
    (re.compile(r'\bfamily\s+nurse\s+practitioner\b', re.IGNORECASE), 'FNP'),
    (re.compile(r'\bcertified\s+registered\s+nurse\s+practitioner\b', re.IGNORECASE), 'CRNP'),
    (re.compile(r'\bnurse\s+practitioner\b', re.IGNORECASE), 'NP'),
    (re.compile(r'\bphysician\s+assistant\b', re.IGNORECASE), 'PA'),
    (re.compile(r"\bmaster['’]?s?\s+of\s+science\s+in\s+nursing\b", re.IGNORECASE), 'MSN'),
    (re.compile(r"\bmasters?\s+of\s+science\s+in\s+nursing\b", re.IGNORECASE), 'MSN'),
    (re.compile(r'\bmaster\s+of\s+science\s+in\s+nursing\b', re.IGNORECASE), 'MSN'),
    (re.compile(r'\bbachelors?\s+of\s+nursing\b', re.IGNORECASE), 'BSN'),
    (re.compile(r'\bbachelor\s+of\s+nursing\b', re.IGNORECASE), 'BSN'),
    (re.compile(r'\bbachelor\s+of\s+science\s+in\s+nursing\b', re.IGNORECASE), 'BSN'),
    (re.compile(r'\bdoctor\s+of\s+nursing\s+practice\b', re.IGNORECASE), 'DNP'),
    (re.compile(r'\bdoctor\s+of\s+osteopathic\s+medicine\b', re.IGNORECASE), 'DO'),
    (re.compile(r'\bdoctor\s+of\s+pharmacy\b', re.IGNORECASE), 'PharmD'),
    (re.compile(r'\bdoctor\s+of\s+philosophy\b', re.IGNORECASE), 'PhD'),
    (re.compile(r'\bregistered\s+nurse\b', re.IGNORECASE), 'RN'),
    (re.compile(r'\bmedical\s+doctor\s*/\s*physician\b', re.IGNORECASE), 'MD'),
    (re.compile(r'\bmedical\s+doctor\b', re.IGNORECASE), 'MD'),
    (re.compile(r'^\s*physician\s*$', re.IGNORECASE), 'MD'),
]

DEGREE_KNOWN_TOKENS = {
    'MD', 'DO', 'PHD', 'PA', 'PA-C', 'NP', 'NP-C', 'FNP', 'FNP-C', 'FNP-BC', 'CRNP', 'APRN', 'ANP',
    'DNP', 'MSN', 'BSN', 'RN', 'LPN', 'LVN', 'PHARMD', 'MBA', 'MBBS', 'MPH', 'MS', 'MA', 'BS', 'BA',
    'MD/MBA', 'AOCNP', 'MSC', 'BSC', 'MD/PHD', 'PHARM.D', 'DDS', 'DMD', 'OD', 'DPM',
}

EMAIL_TYPO_DOMAINS = {
    'gnail.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com',
    'gmaill.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmial.co': 'gmail.com',
    'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
    'hotnail.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
    'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com',
    'iclod.com': 'icloud.com', 'icloud.co': 'icloud.com',
    'aol.co': 'aol.com',
}

PLACEHOLDER_VALUES = {'', '-', '--', '_', '_____', 'select', 'n/a', 'na', 'none', 'null', 'undefined', 'unknown', '.', '..', '...', '0', '00', '000'}

DEGREE_NON_STANDARD_TOKENS = {
    'DOCTOR', 'DOCTORA', 'DR', 'MEDICO', 'MEDICAL', 'NURSE', 'NURSING', 'INTERNE',
    'RESIDENT', 'STUDENT', 'PROFESSOR', 'PROF', 'SENIOR', 'BACHELOR', 'BACHELORS',
    'MASTER', 'MASTERS', 'PHARMACIST', 'DENTIST', 'MIDWIFE', 'MIDWIFERY',
    'BOARD', 'CERTIFIED',
}

NAME_PREFIX_RE = re.compile(r'^\s*(dr|mr|mrs|ms|prof|professor|sir|dame)\.?\s+', re.IGNORECASE)
NAME_TRAILING_INITIAL_RE = re.compile(r'\s+[A-Z]\.?\s*$')


def _flag(field, code, message):
    return {'field': field, 'code': code, 'message': message}


def _diff(field, before, after):
    return {'field': field, 'from': before, 'to': after}


def _safe_str(v):
    if v is None:
        return ''
    s = str(v).strip()
    if s.lower() in ('nan', 'none', 'null'):
        return ''
    return s


def _is_placeholder(v):
    return v.strip().lower() in PLACEHOLDER_VALUES if v else True


def ascii_fold(s):
    if not s:
        return s
    return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')


def _smart_title(s):
    if not s:
        return s
    parts = re.split(r'(\s+|-|\')', s)
    out = []
    for p in parts:
        if not p or re.match(r'\s+|-|\'', p):
            out.append(p)
        elif p.upper() == p and len(p) <= 3:
            out.append(p.upper())
        elif re.match(r'^Mc[a-z]', p, re.IGNORECASE) and len(p) > 2:
            out.append('Mc' + p[2:].capitalize())
        elif re.match(r'^Mac[a-z]', p, re.IGNORECASE) and len(p) > 3:
            out.append('Mac' + p[3:].capitalize())
        elif p.lower() in ('de', 'la', 'van', 'von', 'der', 'den', 'da', 'di', 'del', 'al'):
            out.append(p.lower())
        else:
            out.append(p.capitalize())
    return ''.join(out)


def clean_name(raw, field='name'):
    diffs, flags = [], []
    s = _safe_str(raw)
    if not s:
        flags.append(_flag(field, 'EMPTY', f'{field} is empty'))
        return '', diffs, flags

    original = s
    s = NAME_PREFIX_RE.sub('', s)
    s = NAME_TRAILING_INITIAL_RE.sub('', s)
    s = re.sub(r'\s+', ' ', s).strip()

    if re.search(r'\d', s):
        flags.append(_flag(field, 'CONTAINS_DIGITS', f'{field} contains digits: "{s}"'))

    if ',' in s and s.count(',') >= 1 and len(s) > 30:
        flags.append(_flag(field, 'LOOKS_LIKE_FULL_DESC', f'{field} may contain extra text: "{s}"'))

    if s.upper() == s or s.lower() == s:
        s = _smart_title(s.lower())
    else:
        s = _smart_title(s)

    if s != original:
        diffs.append(_diff(field, original, s))
    return s, diffs, flags


def clean_email(raw):
    diffs, flags = [], []
    s = _safe_str(raw).lower()
    if not s:
        flags.append(_flag('email', 'EMPTY', 'Email is empty'))
        return '', diffs, flags

    original = _safe_str(raw)
    if s != original:
        diffs.append(_diff('email', original, s))

    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', s):
        flags.append(_flag('email', 'INVALID_FORMAT', f'Email format invalid: "{s}"'))
        return s, diffs, flags

    domain = s.split('@', 1)[1]
    if domain in EMAIL_TYPO_DOMAINS:
        suggested = s.replace('@' + domain, '@' + EMAIL_TYPO_DOMAINS[domain])
        flags.append(_flag('email', 'TYPO_SUSPECT',
                           f'Domain "{domain}" looks like a typo. Did you mean "{suggested}"?'))
    return s, diffs, flags


def clean_degree(raw):
    diffs, flags = [], []
    s = _safe_str(raw)
    if not s:
        flags.append(_flag('degree', 'EMPTY', 'Degree is empty'))
        return '', diffs, flags

    original = s

    s = re.sub(r'\s*\([^)]*\)\s*', ' ', s).strip()

    for pattern, replacement in DEGREE_LONG_MAP:
        s = pattern.sub(replacement, s)

    s = s.replace('.', '')
    s = re.sub(r'\s*/\s*', ', ', s)
    s = re.sub(r',\s*,+', ', ', s)
    s = re.sub(r'\s+', ' ', s).strip(' ,')

    tokens = [t.strip() for t in re.split(r',\s*', s) if t.strip()]

    expanded = []
    for t in tokens:
        parts = t.split()
        if len(parts) >= 2:
            cleaned_parts = [re.sub(r'[.,]', '', p).upper() for p in parts]
            if all(p in DEGREE_KNOWN_TOKENS or p == 'PHD' for p in cleaned_parts):
                expanded.extend(parts)
                continue
        expanded.append(t)
    tokens = expanded

    norm_tokens = []
    for t in tokens:
        upper = re.sub(r'\s+', '', t).upper()
        bare_upper = t.upper().strip()
        if bare_upper in DEGREE_NON_STANDARD_TOKENS:
            norm_tokens.append(bare_upper.title())
            flags.append(_flag('degree', 'NON_STANDARD',
                               f'"{t}" is a generic word, not a degree abbreviation'))
        elif upper in DEGREE_KNOWN_TOKENS:
            norm_tokens.append(upper if upper != 'PHARMD' else 'PharmD')
        elif upper == 'PHD':
            norm_tokens.append('PhD')
        elif re.match(r'^[A-Z]{1,6}(-[A-Z0-9]+)?$', t.upper()):
            norm_tokens.append(t.upper())
        elif re.match(r'^[A-Za-z\-\.]{2,12}$', t) and len(t) <= 8:
            norm_tokens.append(t.upper())
        else:
            norm_tokens.append(t)
            if len(t.split()) >= 3:
                flags.append(_flag('degree', 'NON_STANDARD',
                                   f'Could not standardize degree token: "{t}"'))

    s = ', '.join(norm_tokens)

    if s != original:
        diffs.append(_diff('degree', original, s))
    return s, diffs, flags


def clean_country(raw):
    diffs, flags = [], []
    s = _safe_str(raw)
    if not s:
        flags.append(_flag('country', 'EMPTY', 'Country is empty'))
        return '', False, False, diffs, flags

    upper = s.upper().replace('.', '').strip()
    original = s

    if upper in US_VARIANTS:
        s = 'United States'
    elif upper in CA_VARIANTS:
        s = 'Canada'
    elif upper in UK_VARIANTS:
        s = 'United Kingdom'
    else:
        s = _smart_title(s)

    if s != original:
        diffs.append(_diff('country', original, s))

    is_us = s == 'United States'
    is_us_or_canada = is_us or s == 'Canada'
    return s, is_us, is_us_or_canada, diffs, flags


def clean_state(raw, country):
    diffs, flags = [], []
    s = _safe_str(raw)
    original = s
    if not s or _is_placeholder(s):
        if not country or country == 'United States':
            flags.append(_flag('state', 'EMPTY', 'State is empty'))
        if s != '':
            diffs.append(_diff('state', original, ''))
        return '', diffs, flags

    upper = s.upper()

    suffix_match = re.match(r'^([A-Z]{2})\s*[-,/]\s*(.+)$', upper)
    if suffix_match and suffix_match.group(1) in US_STATE_CODES:
        s = suffix_match.group(1)
        upper = s
    elif suffix_match and suffix_match.group(1) in CA_PROVINCE_CODES:
        s = suffix_match.group(1)
        upper = s

    if country == 'United States':
        if upper in US_STATE_CODES:
            s = upper
        elif upper in US_STATES:
            s = US_STATES[upper]
        else:
            flags.append(_flag('state', 'UNRECOGNIZED_US_STATE', f'Could not match US state: "{original}"'))
        if s != original:
            diffs.append(_diff('state', original, s))
        return s, diffs, flags

    if country == 'Canada':
        if upper in CA_PROVINCE_CODES:
            s = upper
        elif upper in CA_PROVINCES:
            s = CA_PROVINCES[upper]
        elif upper in CA_PROVINCE_ALIASES:
            s = CA_PROVINCE_ALIASES[upper]
        else:
            flags.append(_flag('state', 'UNRECOGNIZED_CA_PROVINCE', f'Could not match Canadian province: "{original}"'))
        if s != original:
            diffs.append(_diff('state', original, s))
        return s, diffs, flags

    if country == 'United States' or not country:
        if upper.replace('-', '').replace(' ', '').isdigit() and len(upper.replace('-', '').replace(' ', '')) >= 5:
            flags.append(_flag('state', 'COLUMN_SHIFT_SUSPECT',
                               f'State "{original}" is all digits — looks like a zip code'))
            diffs.append(_diff('state', original, ''))
            return '', diffs, flags

    if upper.replace('.', '').strip() in (US_VARIANTS | CA_VARIANTS | UK_VARIANTS) or \
       (country and upper == country.upper()):
        flags.append(_flag('state', 'COLUMN_SHIFT_SUSPECT',
                           f'State "{original}" matches a country — likely column-shift error'))
        diffs.append(_diff('state', original, ''))
        return '', diffs, flags

    diffs.append(_diff('state', original, ''))
    return '', diffs, flags


def clean_zip(raw, country):
    diffs, flags = [], []
    s = _safe_str(raw)
    original = s
    if not s:
        if country in ('United States', 'Canada'):
            flags.append(_flag('zipcode', 'EMPTY', f'Zip is empty for {country}'))
        return '', diffs, flags

    if country == 'United States':
        if re.match(r'^\d{5}(-\d{4})?$', s):
            return s, diffs, flags
        if re.match(r'^[A-Za-z\s]+$', s):
            flags.append(_flag('zipcode', 'COLUMN_SHIFT_SUSPECT',
                               f'Zip "{original}" is alphabetic — likely a city/state value in the zip column'))
            diffs.append(_diff('zipcode', original, ''))
            return '', diffs, flags
        digits = re.sub(r'\D', '', s)
        if len(digits) > 9:
            flags.append(_flag('zipcode', 'LOOKS_LIKE_PHONE',
                               f'"{original}" has {len(digits)} digits — likely a phone number, not a zip'))
            return s, diffs, flags
        if len(digits) == 9:
            cleaned = f'{digits[:5]}-{digits[5:]}'
            if cleaned != original:
                diffs.append(_diff('zipcode', original, cleaned))
            return cleaned, diffs, flags
        if len(digits) >= 5:
            cleaned = digits[:5]
            if cleaned != original:
                diffs.append(_diff('zipcode', original, cleaned))
            return cleaned, diffs, flags
        flags.append(_flag('zipcode', 'INVALID_US_ZIP', f'Invalid US zip: "{original}"'))
        return s, diffs, flags

    if country == 'Canada':
        normalized = s.upper().replace(' ', '')
        if re.match(r'^[A-Z]\d[A-Z]\d[A-Z]\d$', normalized):
            formatted = normalized[:3] + ' ' + normalized[3:]
            if formatted != original:
                diffs.append(_diff('zipcode', original, formatted))
            return formatted, diffs, flags
        flags.append(_flag('zipcode', 'INVALID_CA_POSTAL', f'Invalid Canadian postal code: "{original}"'))
        return s, diffs, flags

    if re.match(r'^[A-Za-z]+$', s):
        flags.append(_flag('zipcode', 'COLUMN_SHIFT_SUSPECT', f'Zip "{original}" is alphabetic — likely column-shift'))
        diffs.append(_diff('zipcode', original, ''))
        return '', diffs, flags

    return s, diffs, flags


def _normalize_po_box(addr):
    if not addr:
        return addr
    return re.sub(r'\bP\s*\.?\s*O\s*\.?\s*\.*\s*Box\b', 'PO Box', addr, flags=re.IGNORECASE)


def _abbreviate_address(addr):
    if not addr:
        return addr
    addr = _normalize_po_box(addr)
    parts = addr.split()
    out = []
    for p in parts:
        upper = p.upper().rstrip('.,')
        clean_p = re.sub(r'[.,]$', '', p)
        trailing = p[len(clean_p):]
        if upper in USPS_SUFFIX:
            out.append(USPS_SUFFIX[upper] + trailing)
        elif upper in ('NORTH', 'SOUTH', 'EAST', 'WEST'):
            out.append(upper[0] + trailing)
        elif upper in ('N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'):
            out.append(upper + trailing)
        elif p.isdigit() or re.match(r'^\d+\w?$', p):
            out.append(p)
        elif p.upper() == p:
            out.append(p.capitalize() + trailing if not trailing else p.capitalize() + trailing)
        else:
            out.append(p)
    return ' '.join(out)


def clean_address(addr1_raw, addr2_raw, city_raw, country):
    diffs, flags = [], []
    addr1 = _safe_str(addr1_raw)
    addr2 = _safe_str(addr2_raw)
    city = _safe_str(city_raw)
    orig_addr1, orig_addr2, orig_city = addr1, addr2, city

    if addr1 and addr2:
        if addr1 == addr2:
            addr2 = ''
        elif len(addr2) >= 4 and addr2.lower() in addr1.lower():
            addr2 = ''
        elif len(addr1) >= 4 and addr1.lower() in addr2.lower():
            addr1 = addr2
            addr2 = ''

    if addr1 and re.match(r'^\d{1,5}[A-Za-z]?$', addr1) and addr2 and re.match(r'^[A-Za-z]', addr2):
        merged = (addr1 + ' ' + addr2).strip()
        flags.append(_flag('address', 'UK_SPLIT_NUMBER',
                           f'Merged "{addr1}" + "{addr2}" → "{merged}" (number was split from street)'))
        addr1 = merged
        addr2 = ''

    if addr1:
        m = SECONDARY_DESIGNATORS.search(addr1)
        if m and not addr2:
            secondary = m.group(0).strip()
            primary = addr1[:m.start()].strip().rstrip(',').strip()
            if primary:
                addr1 = primary
                addr2 = secondary
                flags.append(_flag('address', 'SECONDARY_SPLIT',
                                   f'Moved "{secondary}" from line 1 to line 2'))

    def _has_weird_caps(s):
        for t in s.split():
            if len(t) > 1 and not t.isupper() and not t.islower() and not t[0].isupper():
                return True
        return False

    def _retitle(s):
        if not s:
            return s
        if any(t.isupper() and len(t) > 1 for t in s.split()) or _has_weird_caps(s):
            return _smart_title(s.lower())
        if s.upper() == s or s.lower() == s:
            return _smart_title(s.lower())
        return s

    def _collapse_commas(s):
        if not s:
            return s
        s = re.sub(r',\s*,+', ', ', s)
        s = re.sub(r'\s+,', ',', s)
        return s.strip(' ,')

    if addr1:
        addr1 = _abbreviate_address(_retitle(_collapse_commas(addr1)))
    if addr2:
        addr2 = _abbreviate_address(_retitle(_collapse_commas(addr2)))

    if city:
        if _is_placeholder(city):
            flags.append(_flag('city', 'PLACEHOLDER', f'City is placeholder value: "{city}"'))
            diffs.append(_diff('city', orig_city, ''))
            city = ''
        else:
            comma_count = city.count(',')
            word_count = len(city.split())
            if comma_count >= 1 or word_count > 4:
                flags.append(_flag('city', 'LOOKS_LIKE_ADDRESS',
                                   f'City contains extra address info: "{city}"'))
            else:
                city = _retitle(city)
    elif country in ('United States', 'Canada'):
        flags.append(_flag('city', 'EMPTY', 'City is empty'))

    if addr1 != orig_addr1:
        diffs.append(_diff('address1', orig_addr1, addr1))
    if addr2 != orig_addr2:
        diffs.append(_diff('address2', orig_addr2, addr2))
    if city != orig_city and not any(d['field'] == 'city' for d in diffs):
        diffs.append(_diff('city', orig_city, city))

    return addr1, addr2, city, diffs, flags


SPECIALTY_CANONICAL_MAP = {
    'doctor': 'Physician', 'dr': 'Physician', 'doctora': 'Physician',
    'medico': 'Physician', 'medical doctor': 'Physician',
    'medical': 'Physician', 'medico cirujano': 'Physician',
    'nurse': 'Registered Nurse', 'nursing': 'Registered Nurse',
    'registered practical nurse': 'Registered Nurse',
    'researcher': 'Researcher', 'research': 'Researcher',
    'chemist': 'Researcher', 'r&d': 'Researcher', 'r and d': 'Researcher',
    'industry': 'Industry',
    'student': 'Student in a Healthcare Organization',
    'med student': 'Student in a Healthcare Organization',
    'medical student': 'Student in a Healthcare Organization',
    'esthetician': 'Esthetician', 'aesthetician': 'Esthetician',
    'pharmacist': 'Pharmacist', 'physician': 'Physician',
    'physician assistant': 'Physician Assistant',
    'nurse practitioner': 'Nurse Practitioner',
    'dermatologist': 'Dermatologist',
    'resident': 'Resident', 'residente': 'Resident',
    'interne': 'Resident', 'junior resident': 'Resident',
    'senior': 'Senior', 'professor': 'Professor', 'prof': 'Professor',
    'midwife': 'Midwife', 'midwifery': 'Midwife',
    'dentist': 'Dentist',
}


def _canonicalize_specialty(s):
    if not s:
        return s
    sl = _safe_str(s).lower().strip()
    if sl in SPECIALTY_CANONICAL_MAP:
        return SPECIALTY_CANONICAL_MAP[sl]
    return _smart_title(s) if s.upper() == s or s.lower() == s else s


def infer_specialty(degree, job_title, type_of_professional, raw_specialty=None):
    flags = []
    candidates = []

    if raw_specialty:
        s = _safe_str(raw_specialty)
        if s and not _is_placeholder(s):
            candidates.append(_canonicalize_specialty(s))

    if type_of_professional:
        t = _safe_str(type_of_professional).lower()
        if t and t not in ('other', 'not applicable', 'none'):
            candidates.append(_canonicalize_specialty(_safe_str(type_of_professional)))

    job = _safe_str(job_title).lower()
    deg = _safe_str(degree).upper()

    if job:
        if 'dermatology resident' in job or 'derm resident' in job:
            candidates.append('Dermatology Resident')
        elif 'esthetician' in job or 'aesthetician' in job:
            candidates.append('Esthetician')
        elif 'student' in job:
            candidates.append('Student in a Healthcare Organization')
        elif 'medical director' in job or job == 'physician' or 'attending physician' in job:
            candidates.append('Physician')
        elif 'nurse practitioner' in job or 'np' in job.split():
            candidates.append('Nurse Practitioner')
        elif 'physician assistant' in job or 'pa-c' in job:
            candidates.append('Physician Assistant')
        elif 'injector' in job:
            candidates.append('Injector')
        elif 'industry' in job or 'medical science liaison' in job or 'msl' in job.split():
            candidates.append('Industry')
        elif any(k in job for k in ('research', 'chemist', 'scientist', 'r&d', 'r and d')):
            candidates.append('Researcher')
        elif 'pharmacist' in job:
            candidates.append('Pharmacist')
        elif 'dentist' in job or 'dental' in job:
            candidates.append('Dentist')
        elif 'specialist' in job:
            candidates.append('Specialist')

    if not candidates and deg:
        deg_token_set = set(re.split(r'[,\s/]+', deg))
        if {'PA', 'PA-C'} & deg_token_set:
            candidates.append('Physician Assistant')
        elif deg_token_set & {'NP', 'FNP', 'FNP-C', 'FNP-BC', 'NP-C', 'CRNP', 'DNP', 'APRN', 'ANP'}:
            candidates.append('Nurse Practitioner')
        elif deg_token_set & {'MD', 'DO', 'MBBS', 'MBCHB', 'MBBCH'}:
            candidates.append('Physician')
        elif deg_token_set & {'DDS', 'DMD'}:
            candidates.append('Dentist')
        elif deg_token_set & {'PHARMD'}:
            candidates.append('Pharmacist')
        elif deg_token_set & {'OD'}:
            candidates.append('Optometrist')
        elif deg_token_set & {'DPM'}:
            candidates.append('Podiatrist')
        elif 'RN' in deg_token_set:
            candidates.append('Registered Nurse')
        elif deg_token_set & {'DR', 'DOCTOR', 'DOCTORA', 'MEDICO', 'PHYSICIAN'}:
            candidates.append('Physician')

    if not candidates:
        flags.append(_flag('specialty', 'COULD_NOT_INFER', 'Specialty could not be inferred from degree/title'))
        return '', flags

    return candidates[0], flags


def is_nppa_eligible(specialty, degree, job_title, company=''):
    text = ' '.join(filter(None, [specialty, degree, job_title, company])).lower()
    if any(x in text for x in ('injector', 'esthetician', 'aesthetician', 'medspa owner', 'med spa owner', 'laser technician', 'skin technician')):
        return False

    has_derm = 'dermatolog' in text or ' derm' in text or text.startswith('derm')
    non_derm_general = (
        'family medicine' in text or 'family practice' in text or 'family clinic' in text
        or 'family physician' in text or 'primary care' in text
        or 'general practice' in text or 'internal medicine' in text
    )
    if non_derm_general and not has_derm:
        return False

    if 'nurse practitioner' in text or 'physician assistant' in text:
        return True
    deg_tokens = set(re.split(r'[,\s/]+', _safe_str(degree).upper()))
    if deg_tokens & {'NP', 'FNP', 'FNP-C', 'FNP-BC', 'NP-C', 'CRNP', 'DNP', 'APRN', 'PA', 'PA-C', 'AOCNP', 'ANP'}:
        return True
    return False


def is_derm_eligible(specialty, degree, job_title, company):
    text = ' '.join(filter(None, [specialty, degree, job_title, company])).lower()
    if any(k in text for k in ('dermatology', 'dermatologist', 'derm ', ' derm', 'skin')):
        return True
    if 'resident' in text or 'student' in text:
        return True
    if is_nppa_eligible(specialty, degree, job_title, company):
        return True
    if 'specialist' in text:
        return True
    if any(k in text for k in ('aesthetic', 'esthetic', 'medspa', 'med spa', 'cosmetic')):
        return True
    return False


def is_npi_eligible(specialty, degree, job_title):
    text = ' '.join(filter(None, [specialty, degree, job_title])).lower()

    if any(k in text for k in (
        'esthetician', 'aesthetician', 'cosmetolog',
        'student in a healthcare organization', 'medical student', 'med student',
        'medical assistant', 'massage therap',
        'laser technician', 'laser tech', 'skin technician',
        'cosmetic science', 'consumer health',
    )):
        return False

    deg_tokens = set(re.split(r'[,\s/]+', _safe_str(degree).upper()))
    has_advanced_clinical = (
        'nurse practitioner' in text or 'physician assistant' in text
        or bool(deg_tokens & {
            'NP', 'FNP', 'FNP-C', 'FNP-BC', 'NP-C', 'CRNP', 'DNP', 'APRN',
            'PA', 'PA-C', 'AOCNP', 'ANP', 'CRNA', 'CNS',
            'MD', 'DO', 'DDS', 'DMD', 'OD', 'DPM', 'PHD', 'PHARMD',
            'MBBS', 'MBCHB', 'MBBCH',
        })
    )

    if 'industry' in text and not has_advanced_clinical:
        return False

    if ('registered nurse' in text or deg_tokens == {'RN'}
        or deg_tokens == {'BSN'} or deg_tokens == {'BSN', 'RN'}
        or deg_tokens == {'RN', 'BSN'} or deg_tokens == {'ASN'}):
        if not has_advanced_clinical:
            return False

    if 'injector' in text and not has_advanced_clinical:
        return False

    return True


def truthy_yn(v):
    if v is None:
        return False
    s = str(v).strip().lower()
    return s in ('yes', 'y', 'true', '1', 'x')


def clean_subscriber_row(raw_row, source_type):
    diffs_all, flags_all = [], []

    raw_lookup = {str(k).strip().lower(): k for k in raw_row.keys()}

    def _pull(*keys):
        for k in keys:
            actual_key = raw_lookup.get(k.strip().lower())
            if actual_key is not None:
                v = raw_row[actual_key]
                if v is not None and str(v).strip() != '':
                    return v
        return ''

    raw_first = _pull('First Name', 'first_name', 'Name (First)')
    raw_last = _pull('Last Name', 'last_name', 'Name (Last)')
    raw_email = _pull('Email Address (Enter Email)', 'Email (Enter Email)', 'email', 'Email')
    raw_degree = _pull('Degree', 'degree')
    raw_job = _pull('Job Title', 'job_title')
    raw_company = _pull('Name of Company or Medical Facility', 'Name of company, healthcare facility, or clinic', 'company')
    raw_addr1 = _pull('Address (Street Address)', 'address1', 'address_1')
    raw_addr2 = _pull('Address (Address Line 2)', 'address2', 'address_2')
    raw_city = _pull('Address (City)', 'city')
    raw_state = _pull('Address (State / Province)', 'state')
    raw_zip = _pull('Address (ZIP / Postal Code)', 'zipcode', 'zip')
    raw_country = _pull('Address (Country)', 'country')
    raw_npi = _pull('NPI', 'npi')
    raw_specialty = _pull('Specialty', 'specialty')
    raw_type_pro = _pull('Type of professional:', 'Type of professional')

    first, d, f = clean_name(raw_first, 'first_name'); diffs_all += d; flags_all += f
    last, d, f = clean_name(raw_last, 'last_name'); diffs_all += d; flags_all += f
    email, d, f = clean_email(raw_email); diffs_all += d; flags_all += f
    degree, d, f = clean_degree(raw_degree); diffs_all += d; flags_all += f

    f_low = first.lower().strip() if first else ''
    l_low = last.lower().strip() if last else ''
    email_local = email.split('@', 1)[0].lower() if email and '@' in email else ''
    if f_low == 'test' or l_low == 'test':
        flags_all.append(_flag('first_name' if f_low == 'test' else 'last_name',
                               'TEST_DATA', 'Looks like test data'))
    if first and last and f_low == l_low and len(first) <= 3:
        flags_all.append(_flag('last_name', 'IDENTICAL_NAMES',
                               f'First and last name are identical ("{first}") — likely test data'))
    if email_local in ('test', 'testing', 'test1', 'test2', 'asdf', 'qwerty', 'abc'):
        flags_all.append(_flag('email', 'TEST_DATA', f'Email "{email}" looks like test data'))

    country, is_us, is_us_or_canada, d, f = clean_country(raw_country); diffs_all += d; flags_all += f
    state, d, f = clean_state(raw_state, country); diffs_all += d; flags_all += f
    zipcode, d, f = clean_zip(raw_zip, country); diffs_all += d; flags_all += f
    addr1, addr2, city, d, f = clean_address(raw_addr1, raw_addr2, raw_city, country); diffs_all += d; flags_all += f

    company = _safe_str(raw_company)
    if _is_placeholder(company):
        company = ''
    elif company.isupper() or company.islower():
        company = _smart_title(company)

    job_title = _safe_str(raw_job)
    if _is_placeholder(job_title):
        job_title = ''

    npi = ''
    if raw_npi:
        digits = re.sub(r'\D', '', _safe_str(raw_npi))
        if len(digits) == 10 and digits[0] == '1':
            npi = digits
        elif digits:
            flags_all.append(_flag('npi', 'INVALID_FORMAT', f'NPI "{raw_npi}" is not a valid 10-digit NPI'))

    specialty, f = infer_specialty(degree, job_title, raw_type_pro, raw_specialty)
    flags_all += f

    if is_us and len(city) == 2 and city.upper() in US_STATE_CODES:
        if state and state.upper() not in US_STATE_CODES and state.upper() not in US_STATES:
            old_city, old_state = city, state
            city = _smart_title(state.lower())
            state = old_city.upper()
            flags_all.append(_flag('city_state', 'COLUMN_SWAP_FIXED',
                                   f'Auto-swapped: city "{old_city}" ↔ state "{old_state}"'))
            diffs_all.append(_diff('city', old_city, city))
            diffs_all.append(_diff('state', old_state, state))

    cleaned = {
        'first_name': first,
        'last_name': last,
        'email': email,
        'degree': degree,
        'specialty': specialty,
        'company': company,
        'job_title': job_title,
        'address1': addr1,
        'address2': addr2,
        'city': city,
        'state': state,
        'zipcode': zipcode,
        'country': country,
        'is_us': is_us,
        'is_us_or_canada': is_us_or_canada,
        'npi': npi,
        'type_of_professional': _safe_str(raw_type_pro),
        'is_nppa_eligible': is_nppa_eligible(specialty, degree, job_title, company),
        'is_derm_eligible': is_derm_eligible(specialty, degree, job_title, company),
    }

    if source_type == 'jcad':
        cleaned['wants_jcad_print'] = truthy_yn(_pull('I would like to receive a print copy of The Journal of Clinical and Aesthetic Dermatology in the mail'))
        cleaned['wants_jcad_digital'] = truthy_yn(_pull('I would like a digital subscription to The Journal of Clinical and Aesthetic Dermatology'))
        cleaned['wants_nppa_print'] = truthy_yn(_pull('I would like to receive a print copy of NP+PA Perspectives in Dermatology in the mail'))
        cleaned['wants_nppa_digital'] = truthy_yn(_pull('I would like a digital subscription to NP+PA Perspectives in Dermatology'))
    elif source_type == 'oncology':
        cleaned['oncology_areas'] = [a for a in [
            _pull('Breast Cancer'), _pull('Multiple Myeloma'), _pull('Lung Cancer'),
            _pull('RCC'), _pull('Melanoma'), _pull('Prostate Cancer')
        ] if a]
        cleaned['oncology_format'] = _safe_str(_pull('Which content format do you prefer?')).lower()

    return {
        'cleaned': cleaned,
        'diff': diffs_all,
        'flags': flags_all
    }


def revalidate_cleaned(cleaned):
    flags = []
    field_funcs = [
        ('email', clean_email, (cleaned.get('email', ''),)),
        ('first_name', lambda v: clean_name(v, 'first_name'), (cleaned.get('first_name', ''),)),
        ('last_name', lambda v: clean_name(v, 'last_name'), (cleaned.get('last_name', ''),)),
        ('degree', clean_degree, (cleaned.get('degree', ''),)),
    ]
    for _name, fn, args in field_funcs:
        try:
            result = fn(*args)
            if isinstance(result, tuple) and len(result) >= 3:
                flags += result[2]
        except Exception:
            pass

    country = cleaned.get('country', '')
    state = cleaned.get('state', '')
    zipcode = cleaned.get('zipcode', '')
    try:
        _, _, f = clean_state(state, country); flags += f
    except Exception:
        pass
    try:
        _, _, f = clean_zip(zipcode, country); flags += f
    except Exception:
        pass

    npi = cleaned.get('npi', '')
    if npi:
        digits = re.sub(r'\D', '', str(npi))
        if not (len(digits) == 10 and digits[0] == '1'):
            flags.append(_flag('npi', 'INVALID_FORMAT', f'NPI "{npi}" is not a valid 10-digit NPI'))

    if not cleaned.get('specialty'):
        flags.append(_flag('specialty', 'COULD_NOT_INFER', 'Specialty could not be inferred from degree/title'))

    return flags


def detect_source_type(headers):
    headers_lower = {str(h).strip().lower() for h in headers if h}
    if any('journal of clinical and aesthetic dermatology' in h for h in headers_lower):
        return 'jcad'
    if any(h in ('breast cancer', 'multiple myeloma', 'lung cancer', 'rcc', 'melanoma', 'prostate cancer') for h in headers_lower):
        return 'oncology'
    if 'type of professional:' in headers_lower or 'name (first)' in headers_lower:
        return 'icns'
    if 'npi' in headers_lower or 'specialty' in headers_lower:
        return 'social_media'
    if ({'first name', 'last name', 'email'} <= headers_lower or
        {'first name', 'last name', 'email address (enter email)'} <= headers_lower):
        return 'social_media'
    return 'unknown'
