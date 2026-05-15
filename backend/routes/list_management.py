from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor
import json
import re
import csv
import io
from collections import defaultdict
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db_pool import get_db_connection
from routes.source_classification import classify_source_sql_expr

list_management_bp = Blueprint('list_management', __name__)

SUBSCRIBED_LIST_NAMES = ['JCAD Print List', 'NP+PA Print List', 'JCAD Comp List']

ALLOWED_TABLES = {'universal_profiles', 'user_profiles', 'print_only_contacts'}

ADDRESS_FIELDS = {
    'universal_profiles': ('practice_address_1', 'practice_city', 'practice_state', 'practice_zipcode'),
    'user_profiles': ('address', 'city', 'state', 'zipcode'),
    'print_only_contacts': ('address', 'city', 'state', 'zipcode'),
}

ADDRESS_BAD_REASON_PATTERNS = (
    'no longer at',
    'moved',
    'bad address',
    'undeliverable',
    'no forwarding',
    'forwarding address',
    'ncoa',
    'nixie',
    "address couldn",
    'address no longer',
    'address invalid',
    'address not deliverable',
    'business closed',
    'closing office',
    'no such number',
    'insufficient address',
    'unable to forward',
    'no new address',
    'closed, no forwarding',
    'left no forwarding',
)


def _reason_suggests_bad_address(reason):
    if not reason:
        return False
    r = reason.lower()
    return any(kw in r for kw in ADDRESS_BAD_REASON_PATTERNS)


PROVIDER_STATUS_PATTERNS = [
    ('Deceased', ('deceased', 'died', 'death', 'passed away')),
    ('Retired', ('retired', 'retiring', 'no longer practicing', 'retirement')),
    ('Global Opt-Out', ('opt-out', 'opt out', 'global opt', 'do not contact', 'dnc', "doesn't want to receive", 'do not send')),
    ('Temporarily Out of Practice', ('temporarily out', 'on leave', 'maternity leave', 'sabbatical')),
    ('Non Patient Care', ('non patient care', 'no longer seeing patients', 'administrative role', 'no patient care')),
    ('Inactive', ('no longer at facility', 'no longer with facility', 'left practice', 'left facility',
                  'no longer working', 'business closed', 'closing office', 'closed office',
                  'office closed', 'graduated resident', 'no longer at office', 'no longer at this office')),
]


def _reason_to_provider_status(reason):
    if not reason:
        return None
    r = reason.lower()
    for status, kws in PROVIDER_STATUS_PATTERNS:
        if any(kw in r for kw in kws):
            return status
    return None


FULL_CLEAR_STATUSES = {'Deceased', 'Retired', 'Global Opt-Out', 'Inactive'}


def _full_clear_warranted(flag_address, provider_status_flag):
    if flag_address:
        return True
    if provider_status_flag and provider_status_flag in FULL_CLEAR_STATUSES:
        return True
    return False


def _norm_addr(s):
    if not s:
        return ''
    s = s.strip().upper()
    repl = {'STREET': 'ST', 'AVENUE': 'AVE', 'BOULEVARD': 'BLVD', 'DRIVE': 'DR',
            'LANE': 'LN', 'ROAD': 'RD', 'COURT': 'CT', 'PLACE': 'PL',
            'SUITE': 'STE', 'APARTMENT': 'APT', 'BUILDING': 'BLDG'}
    for full, abbr in repl.items():
        s = re.sub(r'\b' + full + r'\b', abbr, s)
    s = re.sub(r'[.,#]', '', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

NORM_ADDR_SQL = "UPPER(REGEXP_REPLACE(COALESCE({col}, ''), '[.,#]', '', 'g'))"

def _as_list(val):
    if val is None:
        return []
    if isinstance(val, str):
        try:
            v = json.loads(val)
            return v if isinstance(v, list) else []
        except Exception:
            return []
    return list(val) if isinstance(val, (list, tuple)) else []

def _dedupe(seq):
    seen = set()
    out = []
    for s in seq:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out

def _activity_log(cur, npi, action, details):
    cur.execute(
        "INSERT INTO print_list_activity_log (npi, action, details, created_at) VALUES (%s, %s, %s, NOW())",
        (npi or 'N/A', action, details)
    )

NCOA_RETURN_CODES = {
    '19': 'Foreign move',
    '20': 'PO Box, no forwarding',
    '21': 'Moved, no forwarding address',
    '22': 'Forwarding order expired',
    '23': 'Not deliverable, no forwarding',
    '24': 'Box closed, no forwarding',
    '25': 'No such number',
    '26': 'Vacant',
    '27': 'Not deliverable',
    '28': 'Outside delivery area',
    '29': 'Undeliverable, other',
    '30': 'Unique ZIP move',
    '31': 'Individual move',
    '32': 'Family move',
    '33': 'Business move',
    '34': 'Individual move, new address',
    '35': 'Family move, new address',
    '36': 'Individual move, new address',
    '37': 'Family move, new address',
    '38': 'Business move, new address',
}

_SUITE_SUFFIX_RE = re.compile(
    r'\s+(?:STE|SUITE|APT|APARTMENT|UNIT|BLDG|BUILDING|RM|ROOM|FL|FLOOR|#)\s*\S.*$',
    re.IGNORECASE,
)

def _strip_suite(addr_norm):
    if not addr_norm:
        return ''
    return _SUITE_SUFFIX_RE.sub('', addr_norm).strip()

def _addresses_equal(a_norm, b_norm):
    if not a_norm or not b_norm:
        return False
    if a_norm == b_norm:
        return True
    return _strip_suite(a_norm) == _strip_suite(b_norm)

def _norm_name(name):
    if not name:
        return ''
    return re.sub(r'\s+', ' ', name.strip().upper())

def _split_individual_name(full):
    parts = [p for p in (full or '').strip().split() if p]
    if not parts:
        return '', ''
    if len(parts) == 1:
        return '', parts[0]
    return parts[0], parts[-1]

def _first_name_compatible(csv_first, db_first):
    cf = _norm_name(csv_first)
    df = _norm_name(db_first)
    if not cf:
        return True
    if not df:
        return False
    return cf.startswith(df) or df.startswith(cf)

def _zip5(z):
    return (z or '').strip()[:5]

def _title_addr(v):
    if not v:
        return v
    return ' '.join(w.capitalize() if w.isalpha() else w for w in v.split())

def _decode_return_code(code):
    c = (code or '').strip()
    if c in NCOA_RETURN_CODES:
        return f"{NCOA_RETURN_CODES[c]} ({c})"
    return f"NCOA code {c}" if c else 'NCOA: no code'

def _is_undeliverable(return_code, old_addr_norm, new_addr_norm):
    try:
        n = int((return_code or '').strip())
        if 19 <= n <= 29:
            return True
    except ValueError:
        pass
    if not new_addr_norm:
        return True
    if old_addr_norm and old_addr_norm == new_addr_norm:
        return True
    return False

def _ncoa_get(row, *canonical_keys):
    def n(k):
        return k.strip().lower().replace(' ', '_').replace('-', '_').replace('+', '_').replace('/', '_')
    targets = set(canonical_keys)
    for key in row.keys():
        if n(key) in targets:
            return (row[key] or '').strip()
    return ''

def _check_blacklist(cur, address_1, city, state, zipcode):
    if not address_1:
        return None
    cur.execute("""
        SELECT id, address_1, city, state, zipcode, reason FROM blacklisted_addresses
        WHERE UPPER(TRIM(address_1)) = %s
           OR (UPPER(TRIM(COALESCE(city, ''))) = %s
               AND UPPER(TRIM(COALESCE(state, ''))) = %s
               AND TRIM(COALESCE(zipcode, '')) = %s
               AND %s != ''
               AND %s != '')
        LIMIT 1
    """, (_norm_addr(address_1),
          (city or '').strip().upper(),
          (state or '').strip().upper(),
          (zipcode or '').strip(),
          (city or '').strip(),
          (zipcode or '').strip()))
    return cur.fetchone()

@list_management_bp.route('/print-lists/overview', methods=['GET'])
def print_lists_overview():
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SET LOCAL jit = 'off'")
        cur.execute("SET LOCAL work_mem = '64MB'")

        cur.execute("""
            SELECT list_name, SUM(cnt) AS count FROM (
                SELECT val::text AS list_name, COUNT(DISTINCT npi) AS cnt
                FROM universal_profiles, jsonb_array_elements(print_lists_subscribed) AS val
                WHERE print_lists_subscribed ?| %s AND is_active = TRUE
                  AND (entity_type IS NULL OR entity_type <> '2')
                GROUP BY val::text
                UNION ALL
                SELECT val::text AS list_name, COUNT(*) AS cnt
                FROM user_profiles, jsonb_array_elements(print_lists_subscribed) AS val
                WHERE print_lists_subscribed ?| %s AND (npi IS NULL OR npi = '') AND is_active = TRUE
                GROUP BY val::text
                UNION ALL
                SELECT val::text AS list_name, COUNT(*) AS cnt
                FROM print_only_contacts, jsonb_array_elements(print_lists_subscribed) AS val
                WHERE print_lists_subscribed ?| %s AND is_active = TRUE
                GROUP BY val::text
            ) combined
            GROUP BY list_name
            ORDER BY count DESC
        """, [SUBSCRIBED_LIST_NAMES, SUBSCRIBED_LIST_NAMES, SUBSCRIBED_LIST_NAMES])
        subscribed_counts = {row['list_name'].strip('"'): row['count'] for row in cur.fetchall()}

        cur.execute("""
            SELECT
                (SELECT COUNT(*) FROM universal_profiles
                  WHERE print_lists_subscribed ?| %s AND is_active = TRUE
                    AND (entity_type IS NULL OR entity_type <> '2'))
              + (SELECT COUNT(*) FROM print_only_contacts
                  WHERE print_lists_subscribed ?| %s AND is_active = TRUE)
                AS total_subscribed,
                (SELECT COUNT(*) FROM universal_profiles up
                  WHERE print_lists_subscribed ?| %s AND is_active = TRUE
                    AND (up.entity_type IS NULL OR up.entity_type <> '2')
                  AND EXISTS (SELECT 1 FROM user_profiles u WHERE u.npi = up.npi AND u.is_active = TRUE))
                AS total_in_audience
        """, [SUBSCRIBED_LIST_NAMES, SUBSCRIBED_LIST_NAMES, SUBSCRIBED_LIST_NAMES])
        totals = cur.fetchone()

        cur.close()
        return jsonify({
            'subscribed_counts': subscribed_counts,
            'unsubscribed_counts': {},
            'total_subscribed': totals['total_subscribed'],
            'total_in_audience': totals['total_in_audience'],
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@list_management_bp.route('/print-lists/unsubscribed-counts', methods=['GET'])
def print_lists_unsubscribed_counts():
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SET LOCAL jit = 'off'")
        cur.execute("SET LOCAL work_mem = '64MB'")

        cur.execute("""
            SELECT val::text AS list_name, COUNT(DISTINCT npi) AS count
            FROM universal_profiles, jsonb_array_elements(print_lists_unsubscribed) AS val
            WHERE print_lists_unsubscribed != '[]'::jsonb
              AND jsonb_typeof(print_lists_unsubscribed) = 'array'
              AND (entity_type IS NULL OR entity_type <> '2')
            GROUP BY val::text
            ORDER BY count DESC
        """)
        counts = {row['list_name'].strip('"'): row['count'] for row in cur.fetchall()}
        total = sum(counts.values())
        cur.close()
        return jsonify({'counts': counts, 'total': total})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

PRINT_SEARCH_FIELDS = {
    'up': ['first_name', 'last_name', 'npi',
           'practice_address_1', 'practice_address_2',
           'practice_city', 'practice_state', 'practice_zipcode',
           'primary_specialty', 'credential'],
    'u': ['first_name', 'last_name', 'npi', 'email',
          'address', 'city', 'state', 'zipcode', 'specialty'],
    'p': ['first_name', 'last_name', 'npi',
          'address', 'city', 'state', 'zipcode',
          'specialty', 'email', 'company', 'title'],
}

def _build_print_search(alias, tokens):
    fields = PRINT_SEARCH_FIELDS[alias]
    if not tokens:
        return "", []
    parts = []
    params = []
    for tok in tokens:
        ors = " OR ".join(f"LOWER(COALESCE({alias}.{f}::text, '')) LIKE %s" for f in fields)
        parts.append(f"({ors})")
        params.extend([f"%{tok}%"] * len(fields))
    return " AND " + " AND ".join(parts), params


@list_management_bp.route('/print-lists/members', methods=['GET'])
def print_list_members():
    list_name = request.args.get('list', '').strip()
    lists_param = request.args.get('lists', '').strip()
    list_type = request.args.get('type', 'subscribed')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))
    search = request.args.get('search', '').strip()
    all_mode = request.args.get('all', '').lower() == 'true'
    offset = (page - 1) * per_page

    if list_type not in ('subscribed', 'unsubscribed'):
        return jsonify({'error': 'type must be subscribed or unsubscribed'}), 400
    column = 'print_lists_subscribed' if list_type == 'subscribed' else 'print_lists_unsubscribed'

    if lists_param:
        list_names = [s.strip() for s in lists_param.split(',') if s.strip()]
    elif list_name:
        list_names = [list_name]
    else:
        return jsonify({'error': 'list or lists parameter required'}), 400

    if not list_names:
        return jsonify({'error': 'no list names provided'}), 400

    search_tokens = [t for t in re.split(r'[\s,]+', search.lower()) if t]
    up_search, up_params = _build_print_search('up', search_tokens)
    u_search, u_params = _build_print_search('u', search_tokens)
    poc_search, poc_params = _build_print_search('p', search_tokens)

    broaden = bool(search_tokens)

    def _list_filter(alias):
        if broaden:
            return f"jsonb_array_length(COALESCE({alias}.{column}, '[]'::jsonb)) > 0", []
        return f"{alias}.{column} ?| %s", [list_names]

    up_lf_sql, up_lf_params = _list_filter('up')
    u_lf_sql, u_lf_params = _list_filter('u')
    p_lf_sql, p_lf_params = _list_filter('p')

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SET LOCAL jit = 'off'")
        cur.execute("SET LOCAL work_mem = '64MB'")
        cur.execute("SET LOCAL effective_cache_size = '512MB'")

        up_join = "LEFT JOIN user_profiles u ON u.npi = up.npi AND u.npi IS NOT NULL"
        up_active_filter = ""
        u_active_filter = ""
        poc_active_filter = ""
        not_exists_active = ""

        source_expr_u = classify_source_sql_expr('u')
        limit_clause = "" if all_mode else f"LIMIT {per_page} OFFSET {offset}"

        def _flag_col(alias, key):
            return f"""(SELECT e->>'{key}'
                        FROM jsonb_array_elements(COALESCE({alias}.address_history, '[]'::jsonb)) e
                        WHERE e->>'event' IN ('address_flagged_invalid','undeliverable')
                        ORDER BY e->>'changed_at' DESC NULLS LAST LIMIT 1)"""

        members_sql = f"""
            SELECT * FROM (
                (SELECT DISTINCT ON (up.npi)
                    'universal_profiles' AS source_table, up.id AS source_id,
                    up.npi, up.first_name, up.last_name, up.credential,
                    up.primary_specialty, up.primary_taxonomy_code,
                    up.practice_address_1, up.practice_address_2,
                    up.practice_city, up.practice_state, up.practice_zipcode,
                    up.print_lists_subscribed, up.print_lists_unsubscribed, up.unsubscribe_reason,
                    (u.id IS NOT NULL) AS in_audience,
                    u.email AS audience_email,
                    CASE WHEN u.id IS NOT NULL THEN ({source_expr_u}) ELSE NULL END AS audience_source,
                    NULL AS company, NULL AS title,
                    up.is_active AS is_active,
                    up.provider_status, up.provider_status_source,
                    {_flag_col('up', 'event')} AS address_flag_event,
                    {_flag_col('up', 'reason')} AS address_flag_reason,
                    {_flag_col('up', 'changed_at')} AS address_flag_at,
                    {_flag_col('up', 'source')} AS address_flag_source,
                    u.inactive_reason, u.inactive_source, u.inactive_at
                 FROM universal_profiles up
                 {up_join}
                 WHERE {up_lf_sql}
                   AND (up.entity_type IS NULL OR up.entity_type <> '2')
                 {up_active_filter}
                 {up_search}
                 ORDER BY up.npi)

                UNION ALL

                (SELECT
                    'user_profiles' AS source_table, u.id AS source_id,
                    u.npi, u.first_name, u.last_name, NULL AS credential,
                    u.specialty AS primary_specialty, NULL AS primary_taxonomy_code,
                    u.address AS practice_address_1, NULL AS practice_address_2,
                    u.city AS practice_city, u.state AS practice_state, u.zipcode AS practice_zipcode,
                    u.print_lists_subscribed, u.print_lists_unsubscribed, u.unsubscribe_reason,
                    TRUE AS in_audience,
                    u.email AS audience_email,
                    ({source_expr_u}) AS audience_source,
                    NULL AS company, NULL AS title,
                    u.is_active AS is_active,
                    NULL AS provider_status, NULL AS provider_status_source,
                    {_flag_col('u', 'event')} AS address_flag_event,
                    {_flag_col('u', 'reason')} AS address_flag_reason,
                    {_flag_col('u', 'changed_at')} AS address_flag_at,
                    {_flag_col('u', 'source')} AS address_flag_source,
                    u.inactive_reason, u.inactive_source, u.inactive_at
                 FROM user_profiles u
                 WHERE {u_lf_sql}
                 {u_active_filter}
                 AND (u.npi IS NULL OR u.npi = '' OR NOT EXISTS (
                    SELECT 1 FROM universal_profiles up WHERE up.npi = u.npi {not_exists_active}))
                 {u_search})

                UNION ALL

                (SELECT
                    'print_only_contacts' AS source_table, p.id AS source_id,
                    p.npi, p.first_name, p.last_name, NULL AS credential,
                    p.specialty AS primary_specialty, NULL AS primary_taxonomy_code,
                    p.address AS practice_address_1, NULL AS practice_address_2,
                    p.city AS practice_city, p.state AS practice_state, p.zipcode AS practice_zipcode,
                    p.print_lists_subscribed, p.print_lists_unsubscribed, p.unsubscribe_reason,
                    FALSE AS in_audience,
                    p.email AS audience_email,
                    NULL AS audience_source,
                    p.company, p.title,
                    p.is_active AS is_active,
                    NULL AS provider_status, NULL AS provider_status_source,
                    {_flag_col('p', 'event')} AS address_flag_event,
                    {_flag_col('p', 'reason')} AS address_flag_reason,
                    {_flag_col('p', 'changed_at')} AS address_flag_at,
                    {_flag_col('p', 'source')} AS address_flag_source,
                    NULL AS inactive_reason, NULL AS inactive_source, NULL::timestamp AS inactive_at
                 FROM print_only_contacts p
                 WHERE {p_lf_sql}
                 {poc_active_filter}
                 {poc_search})
            ) combined
            ORDER BY last_name, first_name
            {limit_clause}
        """
        cur.execute(members_sql,
                    up_lf_params + up_params +
                    u_lf_params + u_params +
                    p_lf_params + poc_params)
        members = cur.fetchall()

        if all_mode:
            total = len(members)
            audience_count = sum(1 for m in members if m.get('in_audience'))
        else:
            cur.execute(f"""
                SELECT
                    (SELECT COUNT(*) FROM universal_profiles up
                     WHERE {up_lf_sql}
                       AND (up.entity_type IS NULL OR up.entity_type <> '2')
                       {up_active_filter} {up_search}) AS up_total,
                    (SELECT COUNT(*) FROM universal_profiles up
                     WHERE {up_lf_sql}
                       AND (up.entity_type IS NULL OR up.entity_type <> '2')
                       {up_active_filter} {up_search}
                     AND EXISTS (SELECT 1 FROM user_profiles u WHERE u.npi = up.npi AND u.is_active = TRUE)) AS up_in_audience,
                    (SELECT COUNT(*) FROM user_profiles u
                     WHERE {u_lf_sql} {u_active_filter} {u_search}
                     AND (u.npi IS NULL OR u.npi = '' OR NOT EXISTS (
                        SELECT 1 FROM universal_profiles up WHERE up.npi = u.npi {not_exists_active}))) AS u_only,
                    (SELECT COUNT(*) FROM print_only_contacts p
                     WHERE {p_lf_sql} {poc_active_filter} {poc_search}) AS poc_total
            """, up_lf_params + up_params +
                 up_lf_params + up_params +
                 u_lf_params + u_params +
                 p_lf_params + poc_params)
            cnt = cur.fetchone()
            total = (cnt['up_total'] or 0) + (cnt['u_only'] or 0) + (cnt['poc_total'] or 0)
            audience_count = (cnt['up_in_audience'] or 0) + (cnt['u_only'] or 0)

        cur.close()
        return jsonify({
            'members': members,
            'total': total,
            'audience_count': audience_count,
            'page': page,
            'per_page': per_page if not all_mode else total,
            'total_pages': 1 if all_mode else (total + per_page - 1) // per_page,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@list_management_bp.route('/digital-lists/overview', methods=['GET'])
def digital_lists_overview():
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT val::text AS list_name, COUNT(DISTINCT LOWER(TRIM(email))) AS count
            FROM user_profiles, jsonb_array_elements(COALESCE(digital_lists_subscribed, '[]'::jsonb)) AS val
            WHERE digital_lists_subscribed != '[]'::jsonb
              AND is_active = TRUE
              AND email IS NOT NULL AND email <> ''
            GROUP BY val::text
            ORDER BY count DESC
        """)
        subscribed_counts = {row['list_name'].strip('"'): row['count'] for row in cur.fetchall()}

        cur.execute("""
            SELECT val::text AS list_name, COUNT(DISTINCT LOWER(TRIM(email))) AS count
            FROM user_profiles, jsonb_array_elements(COALESCE(digital_lists_subscribed, '[]'::jsonb)) AS val
            WHERE digital_lists_subscribed != '[]'::jsonb
              AND is_active = TRUE
              AND email IS NOT NULL AND email <> ''
              AND NOT EXISTS (
                  SELECT 1 FROM jsonb_array_elements_text(COALESCE(ac_tags, '[]'::jsonb)) AS t
                  WHERE LOWER(t) = 'jcad quarantine'
              )
            GROUP BY val::text
        """)
        subscribed_counts_ex_jcad_quarantine = {row['list_name'].strip('"'): row['count'] for row in cur.fetchall()}

        cur.execute("""
            SELECT COUNT(DISTINCT LOWER(TRIM(email))) AS c
            FROM user_profiles
            WHERE is_active = TRUE AND email IS NOT NULL AND email <> ''
        """)
        total_active = cur.fetchone()['c']

        cur.execute("""
            SELECT COUNT(DISTINCT LOWER(TRIM(email))) AS c
            FROM user_profiles
            WHERE is_active = FALSE AND email IS NOT NULL AND email <> ''
        """)
        total_inactive = cur.fetchone()['c']

        cur.close()
        return jsonify({
            'subscribed_counts': subscribed_counts,
            'subscribed_counts_ex_jcad_quarantine': subscribed_counts_ex_jcad_quarantine,
            'total_subscribed': total_active,
            'total_inactive': total_inactive,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@list_management_bp.route('/digital-lists/members', methods=['GET'])
def digital_list_members():
    list_name = request.args.get('list', '').strip()
    lists_param = request.args.get('lists', '').strip()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))
    search = request.args.get('search', '').strip()
    offset = (page - 1) * per_page

    if lists_param:
        list_names = [s.strip() for s in lists_param.split(',') if s.strip()]
    elif list_name:
        list_names = [list_name]
    else:
        return jsonify({'error': 'list or lists parameter required'}), 400

    if not list_names:
        return jsonify({'error': 'no list names provided'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        search_clause = ""
        search_params = []
        if search:
            search_clause = """
                AND (
                    LOWER(u.first_name) LIKE %s
                    OR LOWER(u.last_name) LIKE %s
                    OR LOWER(u.email) LIKE %s
                    OR u.npi LIKE %s
                    OR LOWER(u.specialty) LIKE %s
                )
            """
            term = f"%{search.lower()}%"
            search_params = [term, term, term, term, term]

        source_expr = classify_source_sql_expr('u')
        cur.execute(f"""
            SELECT
                u.id AS source_id,
                'user_profiles' AS source_table,
                u.email,
                u.first_name,
                u.last_name,
                u.npi,
                u.specialty,
                u.degree,
                u.address,
                u.city,
                u.state,
                u.zipcode,
                u.digital_lists_subscribed,
                u.ac_tags,
                u.ac_segments,
                u.is_active,
                ({source_expr}) AS source
            FROM user_profiles u
            WHERE u.digital_lists_subscribed ?| %s
              AND u.is_active = TRUE
              AND NOT EXISTS (SELECT 1 FROM universal_profiles up WHERE up.npi = u.npi AND up.entity_type = '2')
              {search_clause}
            ORDER BY u.last_name, u.first_name
            LIMIT {per_page} OFFSET {offset}
        """, [list_names] + search_params)
        members = cur.fetchall()

        cur.execute(f"""
            SELECT COUNT(DISTINCT LOWER(TRIM(u.email))) AS c
            FROM user_profiles u
            WHERE u.digital_lists_subscribed ?| %s
              AND u.is_active = TRUE
              AND u.email IS NOT NULL AND u.email <> ''
              AND NOT EXISTS (SELECT 1 FROM universal_profiles up WHERE up.npi = u.npi AND up.entity_type = '2')
              {search_clause}
        """, [list_names] + search_params)
        total = cur.fetchone()['c']

        cur.close()
        return jsonify({
            'members': members,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/audience', methods=['GET'])
def audience():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))
    search = request.args.get('search', '').strip()
    status = request.args.get('status', 'all').strip()
    offset = (page - 1) * per_page

    def build_clauses(alias):
        sc = ""
        p = []
        if search:
            term = f"%{search.lower()}%"
            sc = f"""
                AND (
                    LOWER({alias}.first_name) LIKE %s
                    OR LOWER({alias}.last_name) LIKE %s
                    OR LOWER({alias}.email) LIKE %s
                    OR {alias}.npi LIKE %s
                    OR LOWER({alias}.specialty) LIKE %s
                )
            """
            p = [term, term, term, term, term]
        stc = ""
        if status == 'active':
            stc = f"AND {alias}.is_active = TRUE"
        elif status == 'inactive':
            stc = f"AND {alias}.is_active = FALSE"
        return sc, stc, p

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        source_expr = classify_source_sql_expr('up')
        search_clause, status_clause, params = build_clauses('up')
        cur.execute(f"""
            SELECT up.id AS source_id, 'user_profiles' AS source_table,
                   up.email, up.first_name, up.last_name, up.npi, up.specialty, up.degree,
                   up.address, up.city, up.state, up.zipcode,
                   up.digital_lists_subscribed, up.digital_lists_unsubscribed,
                   up.ac_tags, up.ac_segments,
                   up.is_active, up.inactive_reason, up.inactive_source, up.inactive_at,
                   up.updated_at,
                   ({source_expr}) AS source
            FROM user_profiles up
            WHERE 1=1 {status_clause} {search_clause}
            ORDER BY up.last_name NULLS LAST, up.first_name NULLS LAST, up.email
            LIMIT {per_page} OFFSET {offset}
        """, params)
        members = cur.fetchall()

        search_clause_raw, status_clause_raw, params_raw = build_clauses('user_profiles')
        cur.execute(f"""
            SELECT COUNT(DISTINCT LOWER(TRIM(email))) AS c FROM user_profiles
            WHERE email IS NOT NULL AND email <> ''
              {status_clause_raw} {search_clause_raw}
        """, params_raw)
        total = cur.fetchone()['c']

        cur.execute("""
            SELECT COUNT(DISTINCT LOWER(TRIM(email))) AS c FROM user_profiles
            WHERE is_active = TRUE AND email IS NOT NULL AND email <> ''
        """)
        total_active = cur.fetchone()['c']
        cur.execute("""
            SELECT COUNT(DISTINCT LOWER(TRIM(email))) AS c FROM user_profiles
            WHERE is_active = FALSE AND email IS NOT NULL AND email <> ''
        """)
        total_inactive = cur.fetchone()['c']

        cur.close()
        return jsonify({
            'members': members,
            'total': total,
            'total_active': total_active,
            'total_inactive': total_inactive,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/tags/overview', methods=['GET'])
def tags_overview():
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT val::text AS tag_name, COUNT(DISTINCT LOWER(TRIM(email))) AS count
            FROM user_profiles, jsonb_array_elements(COALESCE(ac_tags, '[]'::jsonb)) AS val
            WHERE ac_tags != '[]'::jsonb
              AND is_active = TRUE
              AND email IS NOT NULL AND email <> ''
            GROUP BY val::text
            ORDER BY count DESC
        """)
        counts = {row['tag_name'].strip('"'): row['count'] for row in cur.fetchall()}
        cur.close()
        return jsonify({'counts': counts})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/tags/members', methods=['GET'])
def tag_members():
    tag_name = request.args.get('tag', '').strip()
    tags_param = request.args.get('tags', '').strip()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))
    search = request.args.get('search', '').strip()
    offset = (page - 1) * per_page

    if tags_param:
        tag_names = [s.strip() for s in tags_param.split(',') if s.strip()]
    elif tag_name:
        tag_names = [tag_name]
    else:
        return jsonify({'error': 'tag or tags parameter required'}), 400
    if not tag_names:
        return jsonify({'error': 'no tag names provided'}), 400

    search_clause = ""
    params = [tag_names]
    if search:
        term = f"%{search.lower()}%"
        search_clause = """
            AND (
                LOWER(u.first_name) LIKE %s
                OR LOWER(u.last_name) LIKE %s
                OR LOWER(u.email) LIKE %s
                OR u.npi LIKE %s
                OR LOWER(u.specialty) LIKE %s
            )
        """
        params.extend([term, term, term, term, term])

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        source_expr = classify_source_sql_expr('u')
        cur.execute(f"""
            SELECT u.id AS source_id, 'user_profiles' AS source_table,
                   u.email, u.first_name, u.last_name, u.npi, u.specialty, u.degree,
                   u.address, u.city, u.state, u.zipcode,
                   u.digital_lists_subscribed, u.ac_tags, u.ac_segments,
                   u.is_active,
                   ({source_expr}) AS source
            FROM user_profiles u
            WHERE u.ac_tags ?| %s
              AND u.is_active = TRUE
              {search_clause}
            ORDER BY u.last_name, u.first_name
            LIMIT {per_page} OFFSET {offset}
        """, params)
        members = cur.fetchall()

        cur.execute(f"""
            SELECT COUNT(DISTINCT LOWER(TRIM(u.email))) AS c FROM user_profiles u
            WHERE u.ac_tags ?| %s
              AND u.is_active = TRUE
              AND u.email IS NOT NULL AND u.email <> ''
              {search_clause}
        """, params)
        total = cur.fetchone()['c']
        cur.close()
        return jsonify({
            'members': members,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/segments/overview', methods=['GET'])
def segments_overview():
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT val::text AS segment_name, COUNT(DISTINCT LOWER(TRIM(email))) AS count
            FROM user_profiles, jsonb_array_elements(COALESCE(ac_segments, '[]'::jsonb)) AS val
            WHERE ac_segments != '[]'::jsonb
              AND is_active = TRUE
              AND email IS NOT NULL AND email <> ''
            GROUP BY val::text
            ORDER BY count DESC
        """)
        counts = {row['segment_name'].strip('"'): row['count'] for row in cur.fetchall()}
        cur.close()
        return jsonify({'counts': counts})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/segments/members', methods=['GET'])
def segment_members():
    segment_name = request.args.get('segment', '').strip()
    segments_param = request.args.get('segments', '').strip()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))
    search = request.args.get('search', '').strip()
    offset = (page - 1) * per_page

    if segments_param:
        segment_names = [s.strip() for s in segments_param.split(',') if s.strip()]
    elif segment_name:
        segment_names = [segment_name]
    else:
        return jsonify({'error': 'segment or segments parameter required'}), 400
    if not segment_names:
        return jsonify({'error': 'no segment names provided'}), 400

    search_clause = ""
    params = [segment_names]
    if search:
        term = f"%{search.lower()}%"
        search_clause = """
            AND (
                LOWER(u.first_name) LIKE %s
                OR LOWER(u.last_name) LIKE %s
                OR LOWER(u.email) LIKE %s
                OR u.npi LIKE %s
                OR LOWER(u.specialty) LIKE %s
            )
        """
        params.extend([term, term, term, term, term])

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        source_expr = classify_source_sql_expr('u')
        cur.execute(f"""
            SELECT u.id AS source_id, 'user_profiles' AS source_table,
                   u.email, u.first_name, u.last_name, u.npi, u.specialty, u.degree,
                   u.address, u.city, u.state, u.zipcode,
                   u.digital_lists_subscribed, u.ac_tags, u.ac_segments,
                   u.is_active,
                   ({source_expr}) AS source
            FROM user_profiles u
            WHERE u.ac_segments ?| %s
              AND u.is_active = TRUE
              {search_clause}
            ORDER BY u.last_name, u.first_name
            LIMIT {per_page} OFFSET {offset}
        """, params)
        members = cur.fetchall()

        cur.execute(f"""
            SELECT COUNT(DISTINCT LOWER(TRIM(u.email))) AS c FROM user_profiles u
            WHERE u.ac_segments ?| %s
              AND u.is_active = TRUE
              AND u.email IS NOT NULL AND u.email <> ''
              {search_clause}
        """, params)
        total = cur.fetchone()['c']
        cur.close()
        return jsonify({
            'members': members,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/print-lists/reasons', methods=['GET'])
def print_lists_reasons():
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT DISTINCT TRIM(unsubscribe_reason) AS reason FROM (
                SELECT unsubscribe_reason FROM universal_profiles
                  WHERE unsubscribe_reason IS NOT NULL AND TRIM(unsubscribe_reason) <> ''
                UNION
                SELECT unsubscribe_reason FROM user_profiles
                  WHERE unsubscribe_reason IS NOT NULL AND TRIM(unsubscribe_reason) <> ''
                UNION
                SELECT unsubscribe_reason FROM print_only_contacts
                  WHERE unsubscribe_reason IS NOT NULL AND TRIM(unsubscribe_reason) <> ''
            ) x
            ORDER BY reason
        """)
        reasons = [r['reason'] for r in cur.fetchall()]
        cur.close()
        return jsonify({'reasons': reasons})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/print-lists/lookup', methods=['POST'])
def print_lists_lookup():
    data = request.json or {}
    npi = (data.get('npi') or '').strip()
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    address_1 = (data.get('address_1') or '').strip()

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if npi:
            cur.execute("""
                SELECT 'universal_profiles' AS table_name, id, npi, first_name, last_name, credential AS degree,
                       practice_address_1 AS address_1, practice_address_2 AS address_2,
                       practice_city AS city, practice_state AS state, practice_zipcode AS zipcode,
                       primary_specialty AS specialty,
                       print_lists_subscribed, print_lists_unsubscribed
                FROM universal_profiles WHERE npi = %s AND is_active = TRUE LIMIT 1
            """, (npi,))
            row = cur.fetchone()
            if row:
                return jsonify({'found': True, 'record': row})

            cur.execute("""
                SELECT 'user_profiles' AS table_name, id, npi, first_name, last_name, degree,
                       address AS address_1, NULL AS address_2, city, state, zipcode, specialty,
                       print_lists_subscribed, print_lists_unsubscribed
                FROM user_profiles WHERE npi = %s AND is_active = TRUE LIMIT 1
            """, (npi,))
            row = cur.fetchone()
            if row:
                return jsonify({'found': True, 'record': row})

        if first_name and last_name:
            fn = first_name.upper()
            ln = last_name.upper()
            norm_addr = _norm_addr(address_1)
            addr_pat = f"{norm_addr[:20]}%" if norm_addr else '%'

            practice_norm = NORM_ADDR_SQL.format(col='practice_address_1')
            mailing_norm = NORM_ADDR_SQL.format(col='mailing_address_1')
            cur.execute(f"""
                SELECT 'universal_profiles' AS table_name, id, npi, first_name, last_name, credential AS degree,
                       practice_address_1 AS address_1, practice_address_2 AS address_2,
                       practice_city AS city, practice_state AS state, practice_zipcode AS zipcode,
                       mailing_address_1, mailing_city, mailing_state, mailing_zipcode,
                       primary_specialty AS specialty,
                       print_lists_subscribed, print_lists_unsubscribed
                FROM universal_profiles
                WHERE UPPER(first_name) = %s AND UPPER(last_name) = %s AND is_active = TRUE
                  AND ({practice_norm} LIKE %s OR {mailing_norm} LIKE %s)
                LIMIT 1
            """, (fn, ln, addr_pat, addr_pat))
            row = cur.fetchone()
            if row:
                return jsonify({'found': True, 'record': row})

            user_norm = NORM_ADDR_SQL.format(col='address')
            cur.execute(f"""
                SELECT 'user_profiles' AS table_name, id, npi, first_name, last_name, degree,
                       address AS address_1, NULL AS address_2, city, state, zipcode, specialty,
                       print_lists_subscribed, print_lists_unsubscribed
                FROM user_profiles
                WHERE UPPER(first_name) = %s AND UPPER(last_name) = %s AND is_active = TRUE
                  AND {user_norm} LIKE %s
                LIMIT 1
            """, (fn, ln, addr_pat))
            row = cur.fetchone()
            if row:
                return jsonify({'found': True, 'record': row})

            poc_norm = NORM_ADDR_SQL.format(col='address')
            cur.execute(f"""
                SELECT 'print_only_contacts' AS table_name, id, npi, first_name, last_name, NULL AS degree,
                       address AS address_1, NULL AS address_2, city, state, zipcode, specialty,
                       print_lists_subscribed, print_lists_unsubscribed
                FROM print_only_contacts
                WHERE UPPER(first_name) = %s AND UPPER(last_name) = %s AND is_active = TRUE
                  AND {poc_norm} LIKE %s
                LIMIT 1
            """, (fn, ln, addr_pat))
            row = cur.fetchone()
            if row:
                return jsonify({'found': True, 'record': row})

            cur.execute("""
                SELECT 'universal_profiles' AS table_name, id, npi, first_name, last_name, credential AS degree,
                       practice_address_1 AS address_1, practice_address_2 AS address_2,
                       practice_city AS city, practice_state AS state, practice_zipcode AS zipcode,
                       mailing_address_1, mailing_city, mailing_state, mailing_zipcode,
                       primary_specialty AS specialty,
                       print_lists_subscribed, print_lists_unsubscribed
                FROM universal_profiles
                WHERE UPPER(first_name) = %s AND UPPER(last_name) = %s AND is_active = TRUE
                LIMIT 2
            """, (fn, ln))
            rows = cur.fetchall()
            if len(rows) == 1:
                return jsonify({'found': True, 'record': rows[0], 'matched_by': 'name_only'})

            cur.execute("""
                SELECT 'user_profiles' AS table_name, id, npi, first_name, last_name, degree,
                       address AS address_1, NULL AS address_2, city, state, zipcode, specialty,
                       print_lists_subscribed, print_lists_unsubscribed
                FROM user_profiles
                WHERE UPPER(first_name) = %s AND UPPER(last_name) = %s AND is_active = TRUE
                LIMIT 2
            """, (fn, ln))
            rows = cur.fetchall()
            if len(rows) == 1:
                return jsonify({'found': True, 'record': rows[0], 'matched_by': 'name_only'})

        cur.close()
        return jsonify({'found': False})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/print-lists/subscribe', methods=['POST'])
def print_lists_subscribe():
    data = request.json or {}
    lists_to_add = [s.strip() for s in (data.get('lists') or []) if s and s.strip()]
    if not lists_to_add:
        return jsonify({'error': 'lists is required'}), 400

    npi = (data.get('npi') or '').strip()
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    email = (data.get('email') or '').strip()
    address_1 = (data.get('address_1') or '').strip()
    city = (data.get('city') or '').strip()
    state = (data.get('state') or '').strip().upper()
    zipcode = (data.get('zipcode') or '').strip()
    specialty = (data.get('specialty') or '').strip()
    company = (data.get('company') or '').strip()

    if not first_name or not last_name:
        return jsonify({'error': 'first_name and last_name are required'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        bl = _check_blacklist(cur, address_1, city, state, zipcode)
        if bl:
            return jsonify({
                'status': 'blocked',
                'reason': f"Address is blacklisted: {bl.get('reason') or 'no reason recorded'}",
                'blacklist_id': bl['id'],
            }), 409

        target_table = None
        target_id = None
        target_npi = None
        action_msg = ''

        if npi:
            cur.execute("SELECT id, print_lists_subscribed, print_lists_unsubscribed FROM universal_profiles WHERE npi = %s AND is_active = TRUE", (npi,))
            row = cur.fetchone()
            if row:
                target_table = 'universal_profiles'
                target_id = row['id']
                target_npi = npi
                cur_sub = _as_list(row['print_lists_subscribed'])
                cur_unsub = _as_list(row['print_lists_unsubscribed'])
                new_sub = _dedupe(cur_sub + lists_to_add)
                new_unsub = [x for x in cur_unsub if x not in lists_to_add]
                cur.execute("""
                    UPDATE universal_profiles
                    SET print_lists_subscribed = %s::jsonb,
                        print_lists_unsubscribed = %s::jsonb,
                        updated_at = NOW()
                    WHERE id = %s
                """, (json.dumps(new_sub), json.dumps(new_unsub), row['id']))
                action_msg = f"Found in universal_profiles (NPI {npi}); appended: {', '.join(lists_to_add)}"

            if not target_table:
                cur.execute("SELECT id, print_lists_subscribed, print_lists_unsubscribed FROM user_profiles WHERE npi = %s AND is_active = TRUE LIMIT 1", (npi,))
                row = cur.fetchone()
                if row:
                    target_table = 'user_profiles'
                    target_id = row['id']
                    target_npi = npi
                    cur_sub = _as_list(row['print_lists_subscribed'])
                    cur_unsub = _as_list(row['print_lists_unsubscribed'])
                    new_sub = _dedupe(cur_sub + lists_to_add)
                    new_unsub = [x for x in cur_unsub if x not in lists_to_add]
                    cur.execute("""
                        UPDATE user_profiles
                        SET print_lists_subscribed = %s::jsonb,
                            print_lists_unsubscribed = %s::jsonb,
                            updated_at = NOW()
                        WHERE id = %s
                    """, (json.dumps(new_sub), json.dumps(new_unsub), row['id']))
                    action_msg = f"Found in user_profiles (NPI {npi}); appended: {', '.join(lists_to_add)}"

        if not target_table:
            cur.execute("""
                SELECT id, print_lists_subscribed, print_lists_unsubscribed FROM print_only_contacts
                WHERE UPPER(first_name) = %s AND UPPER(last_name) = %s
                  AND UPPER(COALESCE(address, '')) = %s
                  AND is_active = TRUE
                LIMIT 1
            """, (first_name.upper(), last_name.upper(), _norm_addr(address_1)))
            row = cur.fetchone()
            if row:
                target_table = 'print_only_contacts'
                target_id = row['id']
                cur_sub = _as_list(row['print_lists_subscribed'])
                cur_unsub = _as_list(row['print_lists_unsubscribed'])
                new_sub = _dedupe(cur_sub + lists_to_add)
                new_unsub = [x for x in cur_unsub if x not in lists_to_add]
                cur.execute("""
                    UPDATE print_only_contacts
                    SET print_lists_subscribed = %s::jsonb,
                        print_lists_unsubscribed = %s::jsonb,
                        updated_at = NOW()
                    WHERE id = %s
                """, (json.dumps(new_sub), json.dumps(new_unsub), row['id']))
                action_msg = f"Matched existing print-only contact; appended: {', '.join(lists_to_add)}"

        if not target_table:
            cur.execute("""
                INSERT INTO print_only_contacts
                  (first_name, last_name, npi, email, address, city, state, zipcode,
                   specialty, company, print_lists_subscribed, print_lists_unsubscribed,
                   is_active, source, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, '[]'::jsonb,
                        TRUE, 'manual', NOW(), NOW())
                RETURNING id
            """, (first_name, last_name, npi or None, email or None,
                  address_1 or None, city or None, state or None, zipcode or None,
                  specialty or None, company or None,
                  json.dumps(_dedupe(lists_to_add))))
            target_table = 'print_only_contacts'
            target_id = cur.fetchone()['id']
            action_msg = f"No match found; created new print-only contact with: {', '.join(lists_to_add)}"

        _activity_log(cur, target_npi, 'subscribe',
                      f"{first_name} {last_name} | {target_table}#{target_id} | Lists: {', '.join(lists_to_add)}")

        conn.commit()
        cur.close()
        return jsonify({
            'status': 'ok',
            'table': target_table,
            'id': target_id,
            'npi': target_npi,
            'message': action_msg,
            'lists_added': lists_to_add,
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/print-lists/unsubscribe', methods=['POST'])
def print_lists_unsubscribe():
    data = request.json or {}
    table = data.get('table')
    row_id = data.get('id')
    npi = (data.get('npi') or '').strip()
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    address_1 = (data.get('address_1') or '').strip()
    city = (data.get('city') or '').strip()
    state = (data.get('state') or '').strip().upper()
    zipcode = (data.get('zipcode') or '').strip()
    email = (data.get('email') or '').strip()
    specialty = (data.get('specialty') or '').strip()
    company = (data.get('company') or '').strip()
    lists_to_remove = [s.strip() for s in (data.get('lists') or []) if s and s.strip()]
    reasons = [r.strip() for r in (data.get('reasons') or []) if r and r.strip()]
    reason_text = '; '.join(reasons) if reasons else (data.get('reason') or '').strip()
    also_blacklist = bool(data.get('also_blacklist'))
    flag_address_arg = data.get('flag_address')
    flag_address = bool(flag_address_arg) if flag_address_arg is not None else _reason_suggests_bad_address(reason_text)
    provider_status_arg = data.get('provider_status')
    provider_status_flag = (provider_status_arg or '').strip() or _reason_to_provider_status(reason_text)

    if table is not None and table not in ALLOWED_TABLES:
        return jsonify({'error': 'invalid table'}), 400
    if not lists_to_remove:
        return jsonify({'error': 'lists is required'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        row = None
        if table and (row_id or (table == 'universal_profiles' and npi)):
            addr_col, city_col, state_col, zip_col = ADDRESS_FIELDS[table]
            if row_id:
                cur.execute(f"""
                    SELECT id, npi, first_name, last_name,
                           print_lists_subscribed, print_lists_unsubscribed,
                           {addr_col} AS address_1, {city_col} AS city,
                           {state_col} AS state, {zip_col} AS zipcode
                    FROM {table} WHERE id = %s
                """, (row_id,))
            else:
                cur.execute(f"""
                    SELECT id, npi, first_name, last_name,
                           print_lists_subscribed, print_lists_unsubscribed,
                           {addr_col} AS address_1, {city_col} AS city,
                           {state_col} AS state, {zip_col} AS zipcode
                    FROM {table} WHERE npi = %s LIMIT 1
                """, (npi,))
            row = cur.fetchone()

        if not row and npi:
            for tbl in ('universal_profiles', 'user_profiles', 'print_only_contacts'):
                addr_col, city_col, state_col, zip_col = ADDRESS_FIELDS[tbl]
                cur.execute(f"""
                    SELECT id, npi, first_name, last_name,
                           print_lists_subscribed, print_lists_unsubscribed,
                           {addr_col} AS address_1, {city_col} AS city,
                           {state_col} AS state, {zip_col} AS zipcode
                    FROM {tbl} WHERE npi = %s AND is_active = TRUE LIMIT 1
                """, (npi,))
                row = cur.fetchone()
                if row:
                    table = tbl
                    break

        if not row and first_name and last_name:
            fn = first_name.upper()
            ln = last_name.upper()
            norm_addr = _norm_addr(address_1)
            addr_pat = f"{norm_addr[:20]}%" if norm_addr else '%'

            practice_norm = NORM_ADDR_SQL.format(col='practice_address_1')
            mailing_norm = NORM_ADDR_SQL.format(col='mailing_address_1')
            cur.execute(f"""
                SELECT id, npi, first_name, last_name,
                       print_lists_subscribed, print_lists_unsubscribed,
                       practice_address_1 AS address_1, practice_city AS city,
                       practice_state AS state, practice_zipcode AS zipcode
                FROM universal_profiles
                WHERE UPPER(first_name) = %s AND UPPER(last_name) = %s AND is_active = TRUE
                  AND ({practice_norm} LIKE %s OR {mailing_norm} LIKE %s)
                LIMIT 1
            """, (fn, ln, addr_pat, addr_pat))
            row = cur.fetchone()
            if row:
                table = 'universal_profiles'

            if not row:
                user_norm = NORM_ADDR_SQL.format(col='address')
                cur.execute(f"""
                    SELECT id, npi, first_name, last_name,
                           print_lists_subscribed, print_lists_unsubscribed,
                           address AS address_1, city, state, zipcode
                    FROM user_profiles
                    WHERE UPPER(first_name) = %s AND UPPER(last_name) = %s AND is_active = TRUE
                      AND {user_norm} LIKE %s
                    LIMIT 1
                """, (fn, ln, addr_pat))
                row = cur.fetchone()
                if row:
                    table = 'user_profiles'

            if not row:
                poc_norm = NORM_ADDR_SQL.format(col='address')
                cur.execute(f"""
                    SELECT id, npi, first_name, last_name,
                           print_lists_subscribed, print_lists_unsubscribed,
                           address AS address_1, city, state, zipcode
                    FROM print_only_contacts
                    WHERE UPPER(first_name) = %s AND UPPER(last_name) = %s AND is_active = TRUE
                      AND {poc_norm} LIKE %s
                    LIMIT 1
                """, (fn, ln, addr_pat))
                row = cur.fetchone()
                if row:
                    table = 'print_only_contacts'

        if not row:
            if not first_name or not last_name:
                return jsonify({'error': 'no match found and first_name/last_name required to create new entry'}), 400
            history_init = '[]'
            if flag_address and (address_1 or city or state or zipcode):
                history_init = json.dumps([{
                    'event': 'address_flagged_invalid',
                    'source': 'manual_unsubscribe',
                    'reason': reason_text or None,
                    'flagged_address': {
                        'address_1': address_1 or None,
                        'city': city or None,
                        'state': state or None,
                        'zipcode': zipcode or None,
                    },
                    'changed_at': None,
                }])
            cur.execute("""
                INSERT INTO print_only_contacts
                  (first_name, last_name, npi, email, address, city, state, zipcode,
                   specialty, company, print_lists_subscribed, print_lists_unsubscribed,
                   unsubscribe_reason, address_history, is_active, source, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, '[]'::jsonb, %s::jsonb,
                        %s, %s::jsonb, TRUE, 'manual_unsub', NOW(), NOW())
                RETURNING id
            """, (first_name, last_name, npi or None, email or None,
                  address_1 or None, city or None, state or None, zipcode or None,
                  specialty or None, company or None,
                  json.dumps(_dedupe(lists_to_remove)),
                  reason_text or None,
                  history_init))
            new_id = cur.fetchone()['id']
            _activity_log(cur, npi or None, 'unsubscribe',
                          f"{first_name} {last_name} | print_only_contacts#{new_id} (new) | Lists: {', '.join(lists_to_remove)} | Reason: {reason_text}" + (' | address flagged' if flag_address else ''))
            conn.commit()
            cur.close()
            return jsonify({
                'status': 'ok',
                'table': 'print_only_contacts',
                'id': new_id,
                'created': True,
                'lists_removed': lists_to_remove,
                'address_flagged': flag_address,
            })

        cur_sub = _as_list(row['print_lists_subscribed'])
        cur_unsub = _as_list(row['print_lists_unsubscribed'])
        full_clear = _full_clear_warranted(flag_address, provider_status_flag)
        if full_clear and cur_sub:
            effective_lists_to_remove = list(cur_sub)
        else:
            effective_lists_to_remove = lists_to_remove
        new_sub = [x for x in cur_sub if x not in effective_lists_to_remove]
        new_unsub = _dedupe(cur_unsub + effective_lists_to_remove)

        cur.execute(f"""
            UPDATE {table}
            SET print_lists_subscribed = %s::jsonb,
                print_lists_unsubscribed = %s::jsonb,
                unsubscribe_reason = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (json.dumps(new_sub), json.dumps(new_unsub), reason_text or None, row['id']))

        list_cascade_count = 0
        if full_clear and row.get('npi'):
            npi_v = row['npi']
            for other_tbl in ('universal_profiles', 'user_profiles', 'print_only_contacts'):
                if other_tbl == table:
                    continue
                cur.execute(f"""
                    SELECT id, print_lists_subscribed, print_lists_unsubscribed
                    FROM {other_tbl}
                    WHERE npi = %s
                """, (npi_v,))
                for other in cur.fetchall():
                    o_sub = _as_list(other['print_lists_subscribed'])
                    if not o_sub:
                        continue
                    o_unsub = _dedupe(_as_list(other['print_lists_unsubscribed']) + o_sub)
                    cur.execute(f"""
                        UPDATE {other_tbl}
                        SET print_lists_subscribed = '[]'::jsonb,
                            print_lists_unsubscribed = %s::jsonb,
                            unsubscribe_reason = COALESCE(NULLIF(unsubscribe_reason, ''), %s),
                            updated_at = NOW()
                        WHERE id = %s
                    """, (json.dumps(o_unsub), reason_text or 'manual_unsubscribe cascade', other['id']))
                    _activity_log(cur, npi_v, 'unsubscribe_cascade',
                                  f"{row['first_name']} {row['last_name']} | {other_tbl}#{other['id']} | Cleared: {', '.join(o_sub)} | Reason: {reason_text}")
                    list_cascade_count += 1

        provider_status_applied = None
        if provider_status_flag:
            cur.execute("""
                SELECT up.id, up.npi, up.provider_status, up.provider_status_source
                FROM universal_profiles up
                WHERE up.npi = %s AND up.npi IS NOT NULL AND up.npi <> ''
                LIMIT 1
            """, (row.get('npi') or '',))
            up_row = cur.fetchone() if (row.get('npi')) else None
            if up_row:
                cur_status = (up_row.get('provider_status') or '').strip()
                cur_source = (up_row.get('provider_status_source') or '').strip().lower()
                can_overwrite = (
                    not cur_status
                    or cur_status.lower() == 'active'
                    or cur_source in ('', 'manual_unsubscribe')
                )
                if can_overwrite and cur_status != provider_status_flag:
                    cur.execute("""
                        UPDATE universal_profiles
                        SET provider_status = %s,
                            provider_status_source = 'manual_unsubscribe',
                            updated_at = NOW()
                        WHERE id = %s
                    """, (provider_status_flag, up_row['id']))
                    provider_status_applied = provider_status_flag
                    _activity_log(cur, up_row.get('npi'), 'provider_status_update',
                                  f"{row['first_name']} {row['last_name']} | universal_profiles#{up_row['id']} | {cur_status or 'NULL'} -> {provider_status_flag} | Reason: {reason_text}")

            if row.get('npi'):
                cur.execute("""
                    UPDATE user_profiles
                    SET inactive_reason = COALESCE(NULLIF(inactive_reason, ''), %s),
                        inactive_source = COALESCE(NULLIF(inactive_source, ''), 'manual_unsubscribe'),
                        inactive_at = COALESCE(inactive_at, NOW()),
                        inactive_detail = COALESCE(NULLIF(inactive_detail, ''), %s),
                        inactive_event_at = NOW(),
                        updated_at = NOW()
                    WHERE npi = %s
                """, (provider_status_flag, reason_text or provider_status_flag, row.get('npi')))

        if flag_address:
            if table == 'universal_profiles':
                cur.execute("""
                    UPDATE universal_profiles
                    SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                            'event', 'address_flagged_invalid',
                            'source', 'manual_unsubscribe',
                            'reason', %s,
                            'practice_address', jsonb_build_object('address_1', practice_address_1, 'city', practice_city, 'state', practice_state, 'zipcode', practice_zipcode),
                            'mailing_address', jsonb_build_object('address_1', mailing_address_1, 'city', mailing_city, 'state', mailing_state, 'zipcode', mailing_zipcode),
                            'changed_at', NOW()::text
                        )),
                        updated_at = NOW()
                    WHERE id = %s
                """, (reason_text or None, row['id']))
            else:
                addr_col, city_col, state_col, zip_col = ADDRESS_FIELDS[table]
                cur.execute(f"""
                    UPDATE {table}
                    SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                            'event', 'address_flagged_invalid',
                            'source', 'manual_unsubscribe',
                            'reason', %s,
                            'flagged_address', jsonb_build_object('address_1', {addr_col}, 'city', {city_col}, 'state', {state_col}, 'zipcode', {zip_col}),
                            'changed_at', NOW()::text
                        )),
                        updated_at = NOW()
                    WHERE id = %s
                """, (reason_text or None, row['id']))

        _activity_log(cur, row.get('npi'), 'unsubscribe',
                      f"{row['first_name']} {row['last_name']} | {table}#{row['id']} | Removed: {', '.join(lists_to_remove)} | Reason: {reason_text}" + (' | address flagged invalid' if flag_address else ''))

        bl_id = None
        cascade_count = 0
        if also_blacklist and row.get('address_1'):
            cur.execute("""
                INSERT INTO blacklisted_addresses (address_1, city, state, zipcode, reason, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                RETURNING id
            """, (_norm_addr(row['address_1']),
                  (row.get('city') or '').strip().upper() or None,
                  (row.get('state') or '').strip().upper() or None,
                  (row.get('zipcode') or '').strip() or None,
                  reason_text or 'Blacklisted via unsubscribe'))
            bl_id = cur.fetchone()['id']
            cascade_count = _cascade_blacklist(cur, row['address_1'], row.get('city'),
                                               row.get('state'), row.get('zipcode'),
                                               reason_text or 'Address blacklisted')

        conn.commit()
        cur.close()
        return jsonify({
            'status': 'ok',
            'table': table,
            'id': row['id'],
            'lists_removed': effective_lists_to_remove,
            'full_clear': full_clear,
            'list_cascade_count': list_cascade_count,
            'blacklist_id': bl_id,
            'cascade_count': cascade_count,
            'address_flagged': flag_address,
            'provider_status_applied': provider_status_applied,
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/print-lists/resubscribe', methods=['POST'])
def print_lists_resubscribe():
    data = request.json or {}
    table = data.get('table')
    row_id = data.get('id')
    lists_to_add = [s.strip() for s in (data.get('lists') or []) if s and s.strip()]

    if table not in ALLOWED_TABLES:
        return jsonify({'error': 'invalid table'}), 400
    if not row_id or not lists_to_add:
        return jsonify({'error': 'id and lists required'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        addr_col, city_col, state_col, zip_col = ADDRESS_FIELDS[table]
        cur.execute(f"""
            SELECT id, npi, first_name, last_name,
                   print_lists_subscribed, print_lists_unsubscribed,
                   {addr_col} AS address_1, {city_col} AS city,
                   {state_col} AS state, {zip_col} AS zipcode
            FROM {table} WHERE id = %s
        """, (row_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'record not found'}), 404

        bl = _check_blacklist(cur, row.get('address_1'), row.get('city'),
                              row.get('state'), row.get('zipcode'))
        if bl:
            return jsonify({
                'status': 'blocked',
                'reason': f"Address is blacklisted: {bl.get('reason') or 'no reason recorded'}",
                'blacklist_id': bl['id'],
            }), 409

        cur_sub = _as_list(row['print_lists_subscribed'])
        cur_unsub = _as_list(row['print_lists_unsubscribed'])
        new_sub = _dedupe(cur_sub + lists_to_add)
        new_unsub = [x for x in cur_unsub if x not in lists_to_add]

        cur.execute(f"""
            UPDATE {table}
            SET print_lists_subscribed = %s::jsonb,
                print_lists_unsubscribed = %s::jsonb,
                updated_at = NOW()
            WHERE id = %s
        """, (json.dumps(new_sub), json.dumps(new_unsub), row['id']))

        _activity_log(cur, row.get('npi'), 'resubscribe',
                      f"{row['first_name']} {row['last_name']} | {table}#{row['id']} | Added: {', '.join(lists_to_add)}")

        conn.commit()
        cur.close()
        return jsonify({'status': 'ok', 'table': table, 'id': row['id'], 'lists_added': lists_to_add})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/print-lists/update-address', methods=['POST'])
def print_lists_update_address():
    data = request.json or {}
    source_table = data.get('source_table') or data.get('table')
    source_id = data.get('source_id') or data.get('id')
    npi = (data.get('npi') or '').strip()
    addr1 = (data.get('address_1') or '').strip()
    addr2 = (data.get('address_2') or '').strip()
    city = (data.get('city') or '').strip()
    state = (data.get('state') or '').strip().upper()
    zipcode = (data.get('zipcode') or '').strip()

    if source_table not in ALLOWED_TABLES:
        return jsonify({'error': 'invalid source_table'}), 400
    if not source_id:
        return jsonify({'error': 'source_id required'}), 400
    if not addr1 or not city or not state:
        return jsonify({'error': 'address_1, city, and state are required'}), 400

    full_addr = (addr1 + (' ' + addr2 if addr2 else '')).strip()

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        touched = {'universal_profiles': 0, 'user_profiles': 0, 'print_only_contacts': 0}

        if source_table == 'universal_profiles':
            cur.execute("""
                UPDATE universal_profiles
                SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                        'event', 'address_update', 'kind', 'manual',
                        'practice_address_1', practice_address_1, 'practice_address_2', practice_address_2,
                        'practice_city', practice_city, 'practice_state', practice_state, 'practice_zipcode', practice_zipcode,
                        'mailing_address_1', mailing_address_1, 'mailing_address_2', mailing_address_2,
                        'mailing_city', mailing_city, 'mailing_state', mailing_state, 'mailing_zipcode', mailing_zipcode,
                        'source', 'manual_edit', 'changed_at', NOW()::text
                    )),
                    old_practice_address_1 = practice_address_1, old_practice_address_2 = practice_address_2,
                    old_practice_city = practice_city, old_practice_state = practice_state, old_practice_zipcode = practice_zipcode,
                    practice_address_1 = %s, practice_address_2 = %s, practice_city = %s, practice_state = %s, practice_zipcode = %s,
                    old_mailing_address_1 = mailing_address_1, old_mailing_address_2 = mailing_address_2,
                    old_mailing_city = mailing_city, old_mailing_state = mailing_state, old_mailing_zipcode = mailing_zipcode,
                    mailing_address_1 = %s, mailing_address_2 = %s, mailing_city = %s, mailing_state = %s, mailing_zipcode = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (addr1, addr2 or None, city, state, zipcode,
                  addr1, addr2 or None, city, state, zipcode,
                  source_id))
            touched['universal_profiles'] += cur.rowcount
            if not npi:
                cur.execute("SELECT npi FROM universal_profiles WHERE id = %s", (source_id,))
                r = cur.fetchone()
                if r and r.get('npi'):
                    npi = r['npi']
        elif source_table == 'user_profiles':
            cur.execute("""
                UPDATE user_profiles
                SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                        'event', 'address_update',
                        'address', address, 'city', city, 'state', state, 'zipcode', zipcode,
                        'source', 'manual_edit', 'changed_at', NOW()::text
                    )),
                    address = %s, city = %s, state = %s, zipcode = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (full_addr, city, state, zipcode, source_id))
            touched['user_profiles'] += cur.rowcount
            if not npi:
                cur.execute("SELECT npi FROM user_profiles WHERE id = %s", (source_id,))
                r = cur.fetchone()
                if r and r.get('npi'):
                    npi = r['npi']
        else:
            cur.execute("""
                UPDATE print_only_contacts
                SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                        'event', 'address_update',
                        'address', address, 'city', city, 'state', state, 'zipcode', zipcode,
                        'source', 'manual_edit', 'changed_at', NOW()::text
                    )),
                    address = %s, city = %s, state = %s, zipcode = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (full_addr, city, state, zipcode, source_id))
            touched['print_only_contacts'] += cur.rowcount
            if not npi:
                cur.execute("SELECT npi FROM print_only_contacts WHERE id = %s", (source_id,))
                r = cur.fetchone()
                if r and r.get('npi'):
                    npi = r['npi']

        if npi:
            if source_table != 'user_profiles':
                cur.execute("""
                    UPDATE user_profiles
                    SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                            'event', 'address_update',
                            'address', address, 'city', city, 'state', state, 'zipcode', zipcode,
                            'source', 'manual_edit_cascade', 'changed_at', NOW()::text
                        )),
                        address = %s, city = %s, state = %s, zipcode = %s, updated_at = NOW()
                    WHERE npi = %s
                """, (full_addr, city, state, zipcode, npi))
                touched['user_profiles'] += cur.rowcount

            if source_table != 'universal_profiles':
                cur.execute("""
                    UPDATE universal_profiles
                    SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                            'event', 'address_update', 'kind', 'mailing',
                            'mailing_address_1', mailing_address_1, 'mailing_address_2', mailing_address_2,
                            'mailing_city', mailing_city, 'mailing_state', mailing_state, 'mailing_zipcode', mailing_zipcode,
                            'source', 'manual_edit_cascade', 'changed_at', NOW()::text
                        )),
                        old_mailing_address_1 = mailing_address_1, old_mailing_address_2 = mailing_address_2,
                        old_mailing_city = mailing_city, old_mailing_state = mailing_state, old_mailing_zipcode = mailing_zipcode,
                        mailing_address_1 = %s, mailing_address_2 = %s, mailing_city = %s, mailing_state = %s, mailing_zipcode = %s,
                        old_practice_address_1 = practice_address_1, old_practice_address_2 = practice_address_2,
                        old_practice_city = practice_city, old_practice_state = practice_state, old_practice_zipcode = practice_zipcode,
                        practice_address_1 = %s, practice_address_2 = %s, practice_city = %s, practice_state = %s, practice_zipcode = %s,
                        updated_at = NOW()
                    WHERE npi = %s
                """, (addr1, addr2 or None, city, state, zipcode,
                      addr1, addr2 or None, city, state, zipcode,
                      npi))
                touched['universal_profiles'] += cur.rowcount

            if source_table != 'print_only_contacts':
                cur.execute("""
                    UPDATE print_only_contacts
                    SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                            'event', 'address_update',
                            'address', address, 'city', city, 'state', state, 'zipcode', zipcode,
                            'source', 'manual_edit_cascade', 'changed_at', NOW()::text
                        )),
                        address = %s, city = %s, state = %s, zipcode = %s, updated_at = NOW()
                    WHERE npi = %s
                """, (full_addr, city, state, zipcode, npi))
                touched['print_only_contacts'] += cur.rowcount

        _activity_log(cur, npi or None, 'manual_address_update',
                      f"{source_table}#{source_id} -> {full_addr}, {city}, {state} {zipcode}")

        conn.commit()
        cur.close()
        return jsonify({
            'status': 'ok',
            'source_table': source_table,
            'source_id': source_id,
            'npi': npi or None,
            'updated': touched,
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


def _cascade_blacklist(cur, address_1, city, state, zipcode, reason_text):
    norm = _norm_addr(address_1)
    affected = 0

    cur.execute("""
        SELECT id, npi, first_name, last_name, print_lists_subscribed, print_lists_unsubscribed
        FROM universal_profiles
        WHERE UPPER(TRIM(COALESCE(practice_address_1, ''))) = %s
          AND is_active = TRUE
          AND jsonb_array_length(COALESCE(print_lists_subscribed, '[]'::jsonb)) > 0
    """, (norm,))
    for r in cur.fetchall():
        sub = _as_list(r['print_lists_subscribed'])
        unsub = _dedupe(_as_list(r['print_lists_unsubscribed']) + sub)
        cur.execute("""
            UPDATE universal_profiles
            SET print_lists_subscribed = '[]'::jsonb,
                print_lists_unsubscribed = %s::jsonb,
                unsubscribe_reason = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (json.dumps(unsub), reason_text, r['id']))
        _activity_log(cur, r.get('npi'), 'blacklist_unsubscribe',
                      f"{r['first_name']} {r['last_name']} | universal_profiles#{r['id']} | {reason_text}")
        affected += 1

    cur.execute("""
        SELECT id, npi, first_name, last_name, print_lists_subscribed, print_lists_unsubscribed
        FROM user_profiles
        WHERE UPPER(TRIM(COALESCE(address, ''))) = %s
          AND is_active = TRUE
          AND jsonb_array_length(COALESCE(print_lists_subscribed, '[]'::jsonb)) > 0
    """, (norm,))
    for r in cur.fetchall():
        sub = _as_list(r['print_lists_subscribed'])
        unsub = _dedupe(_as_list(r['print_lists_unsubscribed']) + sub)
        cur.execute("""
            UPDATE user_profiles
            SET print_lists_subscribed = '[]'::jsonb,
                print_lists_unsubscribed = %s::jsonb,
                unsubscribe_reason = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (json.dumps(unsub), reason_text, r['id']))
        _activity_log(cur, r.get('npi'), 'blacklist_unsubscribe',
                      f"{r['first_name']} {r['last_name']} | user_profiles#{r['id']} | {reason_text}")
        affected += 1

    cur.execute("""
        SELECT id, npi, first_name, last_name, print_lists_subscribed, print_lists_unsubscribed
        FROM print_only_contacts
        WHERE UPPER(TRIM(COALESCE(address, ''))) = %s
          AND is_active = TRUE
          AND jsonb_array_length(COALESCE(print_lists_subscribed, '[]'::jsonb)) > 0
    """, (norm,))
    for r in cur.fetchall():
        sub = _as_list(r['print_lists_subscribed'])
        unsub = _dedupe(_as_list(r['print_lists_unsubscribed']) + sub)
        cur.execute("""
            UPDATE print_only_contacts
            SET print_lists_subscribed = '[]'::jsonb,
                print_lists_unsubscribed = %s::jsonb,
                unsubscribe_reason = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (json.dumps(unsub), reason_text, r['id']))
        _activity_log(cur, r.get('npi'), 'blacklist_unsubscribe',
                      f"{r['first_name']} {r['last_name']} | print_only_contacts#{r['id']} | {reason_text}")
        affected += 1

    return affected


@list_management_bp.route('/print-lists/blacklist', methods=['GET'])
def print_lists_blacklist_list():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))
    search = (request.args.get('search', '') or '').strip().lower()
    offset = (page - 1) * per_page

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SET LOCAL jit = 'off'")

        where_sql = ''
        params = []
        if search:
            where_sql = """
                WHERE LOWER(COALESCE(address_1, '')) LIKE %s
                   OR LOWER(COALESCE(city, '')) LIKE %s
                   OR LOWER(COALESCE(state, '')) LIKE %s
                   OR LOWER(COALESCE(zipcode, '')) LIKE %s
                   OR LOWER(COALESCE(reason, '')) LIKE %s
            """
            term = f'%{search}%'
            params = [term] * 5

        cur.execute(f"SELECT COUNT(*) AS c FROM blacklisted_addresses {where_sql}", params)
        total = cur.fetchone()['c']

        cur.execute(f"""
            SELECT id, address_1, city, state, zipcode, reason, created_at
            FROM blacklisted_addresses
            {where_sql}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, params + [per_page, offset])
        rows = cur.fetchall()

        for row in rows:
            norm = (row.get('address_1') or '').strip().upper()
            cur.execute("""
                SELECT
                  (SELECT COUNT(*) FROM universal_profiles
                    WHERE UPPER(TRIM(COALESCE(practice_address_1, ''))) = %s
                      AND jsonb_array_length(COALESCE(print_lists_unsubscribed, '[]'::jsonb)) > 0)
                + (SELECT COUNT(*) FROM user_profiles
                    WHERE UPPER(TRIM(COALESCE(address, ''))) = %s
                      AND jsonb_array_length(COALESCE(print_lists_unsubscribed, '[]'::jsonb)) > 0)
                + (SELECT COUNT(*) FROM print_only_contacts
                    WHERE UPPER(TRIM(COALESCE(address, ''))) = %s
                      AND jsonb_array_length(COALESCE(print_lists_unsubscribed, '[]'::jsonb)) > 0)
                AS affected_count
            """, (norm, norm, norm))
            row['affected_count'] = cur.fetchone()['affected_count']
            if row.get('created_at'):
                row['created_at'] = row['created_at'].isoformat()

        cur.close()
        return jsonify({
            'entries': rows,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/print-lists/blacklist', methods=['POST'])
def print_lists_blacklist_add():
    data = request.json or {}
    address_1 = (data.get('address_1') or '').strip()
    city = (data.get('city') or '').strip()
    state = (data.get('state') or '').strip().upper()
    zipcode = (data.get('zipcode') or '').strip()
    reason = (data.get('reason') or '').strip()
    cascade = bool(data.get('cascade', True))

    if not address_1:
        return jsonify({'error': 'address_1 is required'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO blacklisted_addresses (address_1, city, state, zipcode, reason, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (_norm_addr(address_1), city.upper() or None, state or None, zipcode or None, reason or None))
        bl_id = cur.fetchone()['id']

        affected = 0
        if cascade:
            affected = _cascade_blacklist(cur, address_1, city, state, zipcode, reason or 'Address blacklisted')

        conn.commit()
        cur.close()
        return jsonify({'status': 'ok', 'id': bl_id, 'affected': affected})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/print-lists/blacklist/<int:bl_id>', methods=['DELETE'])
def print_lists_blacklist_delete(bl_id):
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT address_1 FROM blacklisted_addresses WHERE id = %s", (bl_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'not found'}), 404
        cur.execute("DELETE FROM blacklisted_addresses WHERE id = %s", (bl_id,))
        _activity_log(cur, None, 'blacklist_remove', f"Removed blacklist entry #{bl_id} ({row['address_1']})")
        conn.commit()
        cur.close()
        return jsonify({'status': 'ok'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@list_management_bp.route('/print-lists/blacklist/<int:bl_id>/affected', methods=['GET'])
def print_lists_blacklist_affected(bl_id):
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT address_1 FROM blacklisted_addresses WHERE id = %s", (bl_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'not found'}), 404
        norm = (row['address_1'] or '').strip().upper()

        cur.execute("""
            SELECT 'universal_profiles' AS table_name, id, npi, first_name, last_name,
                   practice_address_1 AS address_1, practice_city AS city, practice_state AS state,
                   print_lists_unsubscribed
            FROM universal_profiles
            WHERE UPPER(TRIM(COALESCE(practice_address_1, ''))) = %s
              AND jsonb_array_length(COALESCE(print_lists_unsubscribed, '[]'::jsonb)) > 0
            UNION ALL
            SELECT 'user_profiles', id, npi, first_name, last_name,
                   address, city, state, print_lists_unsubscribed
            FROM user_profiles
            WHERE UPPER(TRIM(COALESCE(address, ''))) = %s
              AND jsonb_array_length(COALESCE(print_lists_unsubscribed, '[]'::jsonb)) > 0
            UNION ALL
            SELECT 'print_only_contacts', id, npi, first_name, last_name,
                   address, city, state, print_lists_unsubscribed
            FROM print_only_contacts
            WHERE UPPER(TRIM(COALESCE(address, ''))) = %s
              AND jsonb_array_length(COALESCE(print_lists_unsubscribed, '[]'::jsonb)) > 0
            ORDER BY 5, 4
            LIMIT 500
        """, (norm, norm, norm))
        people = cur.fetchall()
        cur.close()
        return jsonify({'people': people, 'count': len(people)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


def _ncoa_prefetch(cur, table, name_col_first, name_col_last, addr_select, last_names):
    if not last_names:
        return {}
    cur.execute(f"""
        SELECT * FROM {table}
        WHERE UPPER(TRIM({name_col_last})) = ANY(%s)
          AND ({addr_select})
    """, (list(last_names),))
    idx = defaultdict(list)
    for r in cur.fetchall():
        idx[_norm_name(r[name_col_last])].append(r)
    return idx


@list_management_bp.route('/ncoa/preview', methods=['POST'])
def ncoa_preview():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    try:
        content = file.read().decode('utf-8-sig', errors='replace')
        reader = csv.DictReader(io.StringIO(content))
        rows = list(reader)
    except Exception as e:
        return jsonify({'error': f'Failed to parse CSV: {str(e)}'}), 400

    if not rows:
        return jsonify({'error': 'CSV is empty'}), 400

    seen = set()
    deduped = []
    for r in rows:
        key = (
            _norm_name(_ncoa_get(r, 'individual_name')),
            _norm_addr(_ncoa_get(r, 'previous_delivery_address')),
            (_ncoa_get(r, 'previous_city') or '').upper(),
            (_ncoa_get(r, 'previous_state') or '').upper(),
            (_ncoa_get(r, 'return_code') or '').strip(),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(r)

    unique_last = set()
    for r in deduped:
        _, ln = _split_individual_name(_ncoa_get(r, 'individual_name'))
        if ln:
            unique_last.add(_norm_name(ln))

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SET LOCAL jit = 'off'")
        cur.execute("SET LOCAL work_mem = '64MB'")

        cur.execute("""
            SELECT id, npi, first_name, last_name,
                   mailing_address_1, practice_address_1,
                   practice_city, practice_state, practice_zipcode,
                   mailing_city, mailing_state, mailing_zipcode,
                   print_lists_subscribed, print_lists_unsubscribed, is_active
            FROM universal_profiles
            WHERE UPPER(TRIM(last_name)) = ANY(%s)
              AND (mailing_address_1 IS NOT NULL OR practice_address_1 IS NOT NULL)
        """, (list(unique_last),))
        uni_idx = defaultdict(list)
        for r in cur.fetchall():
            uni_idx[_norm_name(r['last_name'])].append(r)

        cur.execute("""
            SELECT id, email, npi, first_name, last_name, address, city, state, zipcode,
                   print_lists_subscribed, print_lists_unsubscribed, is_active
            FROM user_profiles
            WHERE UPPER(TRIM(last_name)) = ANY(%s)
              AND address IS NOT NULL
        """, (list(unique_last),))
        usr_idx = defaultdict(list)
        for r in cur.fetchall():
            usr_idx[_norm_name(r['last_name'])].append(r)

        cur.execute("""
            SELECT id, email, npi, first_name, last_name, address, city, state, zipcode,
                   print_lists_subscribed, print_lists_unsubscribed, is_active
            FROM print_only_contacts
            WHERE UPPER(TRIM(last_name)) = ANY(%s)
              AND address IS NOT NULL
        """, (list(unique_last),))
        poc_idx = defaultdict(list)
        for r in cur.fetchall():
            poc_idx[_norm_name(r['last_name'])].append(r)

        cur.close()

        address_updates = []
        undeliverable = []
        already_current = []
        not_found = []

        for csv_idx, row in enumerate(deduped):
            individual_name = _ncoa_get(row, 'individual_name')
            first_name, last_name = _split_individual_name(individual_name)
            norm_first = _norm_name(first_name)
            norm_last = _norm_name(last_name)

            old_addr = _ncoa_get(row, 'previous_delivery_address')
            new_addr = _ncoa_get(row, 'current_delivery_address')
            new_suite = _ncoa_get(row, 'current_suite_apartment')
            new_city = _ncoa_get(row, 'current_city')
            new_state = _ncoa_get(row, 'current_state')
            new_zip_full = _ncoa_get(row, 'current_zip_4', 'current_zip', 'current_zipcode')
            new_zip = _zip5(new_zip_full)
            return_code = _ncoa_get(row, 'return_code')
            decoded = _decode_return_code(return_code)

            norm_old = _norm_addr(old_addr)
            norm_new = _norm_addr(new_addr)
            undelv = _is_undeliverable(return_code, norm_old, norm_new)

            if not individual_name or not norm_old:
                continue

            row_matches = []

            for c in uni_idx.get(norm_last, []):
                if not _first_name_compatible(norm_first, c['first_name']):
                    continue
                mail_n = _norm_addr(c['mailing_address_1'])
                prac_n = _norm_addr(c['practice_address_1'])
                if norm_new and mail_n and mail_n == norm_new:
                    row_matches.append(('universal_profiles', c, 'mailing', 'already_current'))
                    continue
                if norm_new and prac_n and prac_n == norm_new:
                    row_matches.append(('universal_profiles', c, 'practice', 'already_current'))
                    continue
                if _addresses_equal(mail_n, norm_old):
                    row_matches.append(('universal_profiles', c, 'mailing', 'match'))
                    continue
                if _addresses_equal(prac_n, norm_old):
                    row_matches.append(('universal_profiles', c, 'practice', 'match'))
                    continue
                if norm_new and _addresses_equal(mail_n, norm_new):
                    row_matches.append(('universal_profiles', c, 'mailing', 'already_current'))
                    continue
                if norm_new and _addresses_equal(prac_n, norm_new):
                    row_matches.append(('universal_profiles', c, 'practice', 'already_current'))
                    continue

            for c in usr_idx.get(norm_last, []):
                if not _first_name_compatible(norm_first, c['first_name']):
                    continue
                addr_n = _norm_addr(c['address'])
                if norm_new and addr_n and addr_n == norm_new:
                    row_matches.append(('user_profiles', c, 'address', 'already_current'))
                elif _addresses_equal(addr_n, norm_old):
                    row_matches.append(('user_profiles', c, 'address', 'match'))
                elif norm_new and _addresses_equal(addr_n, norm_new):
                    row_matches.append(('user_profiles', c, 'address', 'already_current'))

            for c in poc_idx.get(norm_last, []):
                if not _first_name_compatible(norm_first, c['first_name']):
                    continue
                addr_n = _norm_addr(c['address'])
                if norm_new and addr_n and addr_n == norm_new:
                    row_matches.append(('print_only_contacts', c, 'address', 'already_current'))
                elif _addresses_equal(addr_n, norm_old):
                    row_matches.append(('print_only_contacts', c, 'address', 'match'))
                elif norm_new and _addresses_equal(addr_n, norm_new):
                    row_matches.append(('print_only_contacts', c, 'address', 'already_current'))

            if not row_matches:
                not_found.append({
                    'csv_idx': csv_idx,
                    'name': individual_name,
                    'old_address': ', '.join(filter(None, [old_addr, _ncoa_get(row, 'previous_city'), _ncoa_get(row, 'previous_state')])),
                    'return_code': return_code,
                    'decoded': decoded,
                })
                continue

            for tbl, rec, side, kind in row_matches:
                base = {
                    'csv_idx': csv_idx,
                    'table': tbl,
                    'id': rec['id'],
                    'npi': rec.get('npi'),
                    'name': f"{rec.get('first_name', '')} {rec.get('last_name', '')}".strip(),
                    'side': side,
                    'current_lists': _as_list(rec.get('print_lists_subscribed')),
                    'current_unsubscribed_lists': _as_list(rec.get('print_lists_unsubscribed')),
                    'old_address': old_addr,
                    'old_city': _ncoa_get(row, 'previous_city'),
                    'old_state': _ncoa_get(row, 'previous_state'),
                    'return_code': return_code,
                    'decoded': decoded,
                }
                if kind == 'already_current':
                    base['note'] = 'Address already matches current record'
                    already_current.append(base)
                    continue

                if undelv:
                    undeliverable.append(base)
                else:
                    base.update({
                        'new_address_1': new_addr,
                        'new_address_2': new_suite,
                        'new_city': new_city,
                        'new_state': new_state,
                        'new_zipcode': new_zip,
                        'new_address': ', '.join(filter(None, [
                            new_addr,
                            new_suite,
                            new_city,
                            f"{new_state} {new_zip}".strip(),
                        ])),
                    })
                    address_updates.append(base)

        return jsonify({
            'address_updates': address_updates,
            'undeliverable': undeliverable,
            'already_current': already_current,
            'not_found': not_found,
            'summary': {
                'total_rows': len(rows),
                'deduped': len(deduped),
                'updates': len(address_updates),
                'undeliverable': len(undeliverable),
                'already_current': len(already_current),
                'not_found': len(not_found),
            },
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


def _ncoa_cascade_address_to_user_profiles(cur, npi, full_addr, city, state, zipc, return_code, primary_id=None):
    if not npi:
        return 0
    cur.execute("""
        UPDATE user_profiles
        SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                'event', 'address_update',
                'address', address, 'city', city, 'state', state, 'zipcode', zipcode,
                'source', 'walsworth_ncoa_cascade',
                'return_code', %s,
                'changed_at', NOW()::text
            )),
            address = %s, city = %s, state = %s, zipcode = %s,
            updated_at = NOW()
        WHERE npi = %s
          AND (address IS NULL OR UPPER(TRIM(COALESCE(address, ''))) <> UPPER(TRIM(%s)))
    """, (return_code, full_addr, city, state, zipc, npi, full_addr))
    return cur.rowcount


def _ncoa_cascade_address_to_print_only(cur, npi, full_addr, city, state, zipc, return_code, primary_id=None):
    if not npi:
        return 0
    cur.execute("""
        UPDATE print_only_contacts
        SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                'event', 'address_update',
                'address', address, 'city', city, 'state', state, 'zipcode', zipcode,
                'source', 'walsworth_ncoa_cascade',
                'return_code', %s,
                'changed_at', NOW()::text
            )),
            address = %s, city = %s, state = %s, zipcode = %s,
            updated_at = NOW()
        WHERE npi = %s
          AND (address IS NULL OR UPPER(TRIM(COALESCE(address, ''))) <> UPPER(TRIM(%s)))
    """, (return_code, full_addr, city, state, zipc, npi, full_addr))
    return cur.rowcount


def _ncoa_cascade_address_to_universal(cur, npi, addr1, addr2, city, state, zipc, return_code, side='mailing'):
    if not npi:
        return 0
    if side == 'mailing':
        cur.execute("""
            UPDATE universal_profiles
            SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                    'event', 'address_update',
                    'kind', 'mailing',
                    'address_1', mailing_address_1, 'address_2', mailing_address_2,
                    'city', mailing_city, 'state', mailing_state, 'zipcode', mailing_zipcode,
                    'source', 'walsworth_ncoa_cascade',
                    'return_code', %s,
                    'changed_at', NOW()::text
                )),
                old_mailing_address_1 = mailing_address_1, old_mailing_address_2 = mailing_address_2,
                old_mailing_city = mailing_city, old_mailing_state = mailing_state, old_mailing_zipcode = mailing_zipcode,
                mailing_address_1 = %s, mailing_address_2 = %s,
                mailing_city = %s, mailing_state = %s, mailing_zipcode = %s,
                updated_at = NOW()
            WHERE npi = %s
              AND (mailing_address_1 IS NULL OR UPPER(TRIM(COALESCE(mailing_address_1, ''))) <> UPPER(TRIM(%s)))
        """, (return_code, addr1, addr2, city, state, zipc, npi, addr1))
    else:
        cur.execute("""
            UPDATE universal_profiles
            SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                    'event', 'address_update',
                    'kind', 'practice',
                    'address_1', practice_address_1, 'address_2', practice_address_2,
                    'city', practice_city, 'state', practice_state, 'zipcode', practice_zipcode,
                    'source', 'walsworth_ncoa_cascade',
                    'return_code', %s,
                    'changed_at', NOW()::text
                )),
                old_practice_address_1 = practice_address_1, old_practice_address_2 = practice_address_2,
                old_practice_city = practice_city, old_practice_state = practice_state, old_practice_zipcode = practice_zipcode,
                practice_address_1 = %s, practice_address_2 = %s,
                practice_city = %s, practice_state = %s, practice_zipcode = %s,
                updated_at = NOW()
            WHERE npi = %s
              AND (practice_address_1 IS NULL OR UPPER(TRIM(COALESCE(practice_address_1, ''))) <> UPPER(TRIM(%s)))
        """, (return_code, addr1, addr2, city, state, zipc, npi, addr1))
    return cur.rowcount


def _ncoa_apply_address_update(cur, entry):
    table = entry['table']
    rid = entry['id']
    side = entry.get('side', 'address')
    addr1 = _title_addr(entry.get('new_address_1') or '')
    addr2 = _title_addr(entry.get('new_address_2') or '')
    city = _title_addr(entry.get('new_city') or '')
    state = (entry.get('new_state') or '').upper()
    zipc = _zip5(entry.get('new_zipcode') or '')
    return_code = entry.get('return_code') or ''
    npi = entry.get('npi') or ''
    full_addr = (addr1 + (' ' + addr2 if addr2 else '')).strip()
    cascade = {'user_profiles': 0, 'print_only_contacts': 0, 'universal_profiles': 0}

    if table == 'universal_profiles':
        if side == 'mailing':
            cur.execute("""
                UPDATE universal_profiles
                SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                        'event', 'address_update',
                        'kind', 'mailing',
                        'address_1', mailing_address_1, 'address_2', mailing_address_2,
                        'city', mailing_city, 'state', mailing_state, 'zipcode', mailing_zipcode,
                        'source', 'walsworth_ncoa',
                        'return_code', %s,
                        'changed_at', NOW()::text
                    )),
                    old_mailing_address_1 = mailing_address_1,
                    old_mailing_address_2 = mailing_address_2,
                    old_mailing_city = mailing_city,
                    old_mailing_state = mailing_state,
                    old_mailing_zipcode = mailing_zipcode,
                    mailing_address_1 = %s, mailing_address_2 = %s,
                    mailing_city = %s, mailing_state = %s, mailing_zipcode = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (return_code, addr1, addr2, city, state, zipc, rid))
        else:
            cur.execute("""
                UPDATE universal_profiles
                SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                        'event', 'address_update',
                        'kind', 'practice',
                        'address_1', practice_address_1, 'address_2', practice_address_2,
                        'city', practice_city, 'state', practice_state, 'zipcode', practice_zipcode,
                        'source', 'walsworth_ncoa',
                        'return_code', %s,
                        'changed_at', NOW()::text
                    )),
                    old_practice_address_1 = practice_address_1,
                    old_practice_address_2 = practice_address_2,
                    old_practice_city = practice_city,
                    old_practice_state = practice_state,
                    old_practice_zipcode = practice_zipcode,
                    practice_address_1 = %s, practice_address_2 = %s,
                    practice_city = %s, practice_state = %s, practice_zipcode = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (return_code, addr1, addr2, city, state, zipc, rid))

    elif table == 'user_profiles':
        cur.execute("""
            UPDATE user_profiles
            SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                    'event', 'address_update',
                    'address', address, 'city', city, 'state', state, 'zipcode', zipcode,
                    'source', 'walsworth_ncoa',
                    'return_code', %s,
                    'changed_at', NOW()::text
                )),
                address = %s, city = %s, state = %s, zipcode = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (return_code, full_addr, city, state, zipc, rid))

    elif table == 'print_only_contacts':
        cur.execute("""
            UPDATE print_only_contacts
            SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                    'event', 'address_update',
                    'address', address, 'city', city, 'state', state, 'zipcode', zipcode,
                    'source', 'walsworth_ncoa',
                    'return_code', %s,
                    'changed_at', NOW()::text
                )),
                address = %s, city = %s, state = %s, zipcode = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (return_code, full_addr, city, state, zipc, rid))

    if npi:
        if table != 'universal_profiles':
            cascade['universal_profiles'] = _ncoa_cascade_address_to_universal(
                cur, npi, addr1, addr2, city, state, zipc, return_code, side='mailing'
            )
        if table != 'user_profiles':
            cascade['user_profiles'] = _ncoa_cascade_address_to_user_profiles(
                cur, npi, full_addr, city, state, zipc, return_code
            )
        if table != 'print_only_contacts':
            cascade['print_only_contacts'] = _ncoa_cascade_address_to_print_only(
                cur, npi, full_addr, city, state, zipc, return_code
            )
    entry['_cascade'] = cascade


def _ncoa_cascade_undeliverable(cur, table, npi, return_code, decoded, old_addr, primary_id=None):
    if not npi:
        return {}
    reason = f"NCOA: {decoded}"
    cascade = {}
    targets = [t for t in ('universal_profiles', 'user_profiles', 'print_only_contacts') if t != table]
    for tbl in targets:
        cur.execute(f"""
            SELECT id, print_lists_subscribed, print_lists_unsubscribed
            FROM {tbl} WHERE npi = %s LIMIT 1
        """, (npi,))
        r = cur.fetchone()
        if not r:
            cascade[tbl] = 0
            continue
        cur_sub = _as_list(r['print_lists_subscribed'])
        cur_unsub = _as_list(r['print_lists_unsubscribed'])
        new_unsub = _dedupe(cur_unsub + cur_sub)
        if tbl in ('universal_profiles', 'print_only_contacts'):
            cur.execute(f"""
                UPDATE {tbl}
                SET print_lists_subscribed = '[]'::jsonb,
                    print_lists_unsubscribed = %s::jsonb,
                    unsubscribe_reason = %s,
                    is_active = FALSE,
                    address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                        'event', 'undeliverable',
                        'source', 'walsworth_ncoa_cascade',
                        'return_code', %s, 'decoded', %s,
                        'attempted_address', %s, 'changed_at', NOW()::text
                    )),
                    updated_at = NOW()
                WHERE id = %s
            """, (json.dumps(new_unsub), reason, return_code, decoded, old_addr, r['id']))
        else:
            cur.execute("""
                UPDATE user_profiles
                SET print_lists_subscribed = '[]'::jsonb,
                    print_lists_unsubscribed = %s::jsonb,
                    unsubscribe_reason = %s,
                    address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                        'event', 'undeliverable',
                        'source', 'walsworth_ncoa_cascade',
                        'return_code', %s, 'decoded', %s,
                        'attempted_address', %s, 'changed_at', NOW()::text
                    )),
                    updated_at = NOW()
                WHERE id = %s
            """, (json.dumps(new_unsub), reason, return_code, decoded, old_addr, r['id']))
        cascade[tbl] = 1
    return cascade


def _ncoa_apply_undeliverable(cur, entry):
    table = entry['table']
    rid = entry['id']
    decoded = entry.get('decoded') or 'NCOA undeliverable'
    return_code = entry.get('return_code') or ''
    old_addr = entry.get('old_address') or ''
    npi = entry.get('npi') or ''
    reason = f"NCOA: {decoded}"
    status_value = f"NCOA: {decoded}" if decoded else 'NCOA: Undeliverable'

    cur.execute(f"""
        SELECT print_lists_subscribed, print_lists_unsubscribed
        FROM {table} WHERE id = %s
    """, (rid,))
    row = cur.fetchone()
    if not row:
        return False
    cur_sub = _as_list(row['print_lists_subscribed'])
    cur_unsub = _as_list(row['print_lists_unsubscribed'])
    new_unsub = _dedupe(cur_unsub + cur_sub)

    if table in ('universal_profiles', 'print_only_contacts'):
        cur.execute(f"""
            UPDATE {table}
            SET print_lists_subscribed = '[]'::jsonb,
                print_lists_unsubscribed = %s::jsonb,
                unsubscribe_reason = %s,
                is_active = FALSE,
                address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                    'event', 'undeliverable',
                    'source', 'walsworth_ncoa',
                    'return_code', %s,
                    'decoded', %s,
                    'attempted_address', %s,
                    'changed_at', NOW()::text
                )),
                updated_at = NOW()
            WHERE id = %s
        """, (json.dumps(new_unsub), reason, return_code, decoded, old_addr, rid))
    else:
        cur.execute("""
            UPDATE user_profiles
            SET print_lists_subscribed = '[]'::jsonb,
                print_lists_unsubscribed = %s::jsonb,
                unsubscribe_reason = %s,
                address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                    'event', 'undeliverable',
                    'source', 'walsworth_ncoa',
                    'return_code', %s,
                    'decoded', %s,
                    'attempted_address', %s,
                    'changed_at', NOW()::text
                )),
                updated_at = NOW()
            WHERE id = %s
        """, (json.dumps(new_unsub), reason, return_code, decoded, old_addr, rid))

    if npi:
        cur.execute("""
            UPDATE universal_profiles
            SET provider_status = %s,
                provider_status_source = 'walsworth_ncoa',
                updated_at = NOW()
            WHERE npi = %s
              AND (provider_status IS NULL OR provider_status = 'Active'
                   OR provider_status_source IN ('walsworth_ncoa', 'walsworth', 'manual_unsubscribe', ''))
        """, (status_value, npi))

        cur.execute("""
            UPDATE user_profiles
            SET inactive_reason = COALESCE(NULLIF(inactive_reason, ''), %s),
                inactive_source = COALESCE(NULLIF(inactive_source, ''), 'walsworth_ncoa'),
                inactive_at = COALESCE(inactive_at, NOW()),
                inactive_detail = COALESCE(NULLIF(inactive_detail, ''), %s),
                inactive_event_at = NOW(),
                updated_at = NOW()
            WHERE npi = %s
        """, (status_value, reason, npi))

        entry['_cascade'] = _ncoa_cascade_undeliverable(cur, table, npi, return_code, decoded, old_addr, rid)
    return True


@list_management_bp.route('/ncoa/apply', methods=['POST'])
def ncoa_apply():
    data = request.json or {}
    address_updates = data.get('address_updates') or []
    undeliverable = data.get('undeliverable') or []

    if not address_updates and not undeliverable:
        return jsonify({'error': 'Nothing to apply'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        applied_updates = 0
        applied_undelv = 0
        errors = []

        for entry in address_updates:
            try:
                _ncoa_apply_address_update(cur, entry)
                _activity_log(cur, entry.get('npi'), 'ncoa_address_update',
                              f"{entry.get('name', '')} | {entry['table']}#{entry['id']} | {entry.get('side')} | "
                              f"-> {entry.get('new_address', '')} | code {entry.get('return_code', '')}")
                applied_updates += 1
            except Exception as e:
                errors.append({'csv_idx': entry.get('csv_idx'), 'table': entry.get('table'), 'error': str(e)})

        for entry in undeliverable:
            try:
                if _ncoa_apply_undeliverable(cur, entry):
                    _activity_log(cur, entry.get('npi'), 'ncoa_undeliverable',
                                  f"{entry.get('name', '')} | {entry['table']}#{entry['id']} | "
                                  f"{entry.get('decoded', '')} | code {entry.get('return_code', '')}")
                    applied_undelv += 1
            except Exception as e:
                errors.append({'csv_idx': entry.get('csv_idx'), 'table': entry.get('table'), 'error': str(e)})

        conn.commit()
        cur.close()
        return jsonify({
            'applied': {
                'address_updates': applied_updates,
                'undeliverable': applied_undelv,
            },
            'errors': errors,
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()