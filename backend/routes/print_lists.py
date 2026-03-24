from flask import Blueprint, request, jsonify, Response
from psycopg2.extras import RealDictCursor
import re
import csv
import io
from datetime import datetime
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db_pool import get_db_connection

print_lists_bp = Blueprint('print_lists', __name__)

VALID_LISTS = ['JCAD', 'NPPA', 'BT']
NPPA_ELIGIBLE = ['NP', 'PA', 'FNP', 'DNP', 'APRN', 'PA-C', 'ANP', 'ARNP', 'CRNP', 'WHNP', 'PMHNP', 'AGPCNP', 'AGACNP']
NPPA_INELIGIBLE = ['MD', 'DO', 'DPM', 'DDS', 'DMD', 'PharmD']
BLACKLIST_KEYWORDS = ['business closed', 'administrative building', 'do not work here', 'moved', 'no longer at', 'vacant', 'demolished', 'not deliverable', 'return to sender']

def normalize_address(addr):
    if not addr:
        return ''
    addr = addr.strip().upper()
    replacements = {
        'STREET': 'ST', 'AVENUE': 'AVE', 'BOULEVARD': 'BLVD', 'DRIVE': 'DR',
        'LANE': 'LN', 'ROAD': 'RD', 'COURT': 'CT', 'PLACE': 'PL',
        'SUITE': 'STE', 'APARTMENT': 'APT', 'BUILDING': 'BLDG',
    }
    for full, abbr in replacements.items():
        addr = re.sub(r'\b' + full + r'\b', abbr, addr)
    addr = re.sub(r'\s+', ' ', addr)
    return addr

def normalize_name(name):
    if not name:
        return ''
    return re.sub(r'\s+', ' ', name.strip().upper())

def check_blacklist(conn, address_1, city, state, zipcode):
    cur = conn.cursor(cursor_factory=RealDictCursor)
    norm = normalize_address(address_1)
    cur.execute("""
        SELECT id, address_1, city, state, zipcode, reason
        FROM blacklisted_addresses
        WHERE UPPER(TRIM(address_1)) = %s
        OR (UPPER(TRIM(city)) = %s AND UPPER(TRIM(state)) = %s AND TRIM(zipcode) = %s)
    """, (norm, (city or '').strip().upper(), (state or '').strip().upper(), (zipcode or '').strip()))
    result = cur.fetchone()
    cur.close()
    return result

def add_activity_log(conn, npi, action, details):
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO print_list_activity_log (npi, action, details, created_at)
        VALUES (%s, %s, %s, NOW())
    """, (npi or 'N/A', action, details))
    cur.close()

def add_list(current_lists, new_list):
    if not current_lists:
        return new_list
    existing = [l.strip() for l in current_lists.split(',') if l.strip()]
    if new_list not in existing:
        existing.append(new_list)
    return ','.join(existing)

def remove_list(current_lists, list_name):
    if not current_lists:
        return ''
    existing = [l.strip() for l in current_lists.split(',') if l.strip()]
    existing = [l for l in existing if l != list_name]
    return ','.join(existing)

def cascade_address_update(conn, npi, new_addr, new_city, new_state, new_zip):
    cur = conn.cursor()
    cur.execute("""
        UPDATE user_profiles
        SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                'address', address, 'city', city, 'state', state, 'zipcode', zipcode, 'changed_at', NOW()::text
            )),
            address = %s, city = %s, state = %s, zipcode = %s, updated_at = NOW()
        WHERE npi = %s
    """, (new_addr, new_city, new_state, new_zip, npi))

    cur.execute("""
        UPDATE universal_profiles
        SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                'address', mailing_address_1, 'city', mailing_city, 'state', mailing_state,
                'zipcode', mailing_zipcode, 'changed_at', NOW()::text
            )),
            old_mailing_address_1 = mailing_address_1, old_mailing_city = mailing_city,
            old_mailing_state = mailing_state, old_mailing_zipcode = mailing_zipcode,
            mailing_address_1 = %s, mailing_city = %s, mailing_state = %s, mailing_zipcode = %s,
            updated_at = NOW()
        WHERE npi = %s
    """, (new_addr, new_city, new_state, new_zip, npi))
    cur.close()

@print_lists_bp.route('/subscribers', methods=['GET'])
def get_subscribers():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    search = request.args.get('search', '').strip()
    list_filter = request.args.get('list', '').strip()
    status = request.args.get('status', '').strip()
    comp_filter = request.args.get('comp', '').strip()
    offset = (page - 1) * per_page

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        where_clauses = []
        params = []

        if search:
            where_clauses.append("""(
                LOWER(first_name || ' ' || last_name) LIKE %s
                OR npi LIKE %s
                OR LOWER(address_1) LIKE %s
                OR LOWER(city) LIKE %s
                OR LOWER(email) LIKE %s
            )""")
            s = f'%{search.lower()}%'
            params.extend([s, f'%{search}%', s, s, s])

        if list_filter:
            where_clauses.append("subscribed_lists LIKE %s")
            params.append(f'%{list_filter}%')

        if status == 'active':
            where_clauses.append("is_subscribed = TRUE")
        elif status == 'inactive':
            where_clauses.append("is_subscribed = FALSE")

        if comp_filter == 'true':
            where_clauses.append("is_comp = TRUE")
        elif comp_filter == 'false':
            where_clauses.append("(is_comp = FALSE OR is_comp IS NULL)")

        where_sql = ' AND '.join(where_clauses) if where_clauses else '1=1'

        cur.execute(f"""
            SELECT COUNT(*) as total FROM print_list_subscribers WHERE {where_sql}
        """, params)
        total = cur.fetchone()['total']

        cur.execute(f"""
            SELECT * FROM print_list_subscribers
            WHERE {where_sql}
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT %s OFFSET %s
        """, params + [per_page, offset])
        rows = cur.fetchall()
        cur.close()

        for row in rows:
            for key in row:
                if isinstance(row[key], datetime):
                    row[key] = row[key].isoformat()

        return jsonify({
            'subscribers': rows,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@print_lists_bp.route('/stats', methods=['GET'])
def get_stats():
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("SELECT COUNT(*) as total FROM print_list_subscribers WHERE is_subscribed = TRUE")
        total_active = cur.fetchone()['total']

        cur.execute("SELECT COUNT(*) as total FROM print_list_subscribers WHERE is_subscribed = FALSE")
        total_inactive = cur.fetchone()['total']

        cur.execute("SELECT COUNT(*) as total FROM print_list_subscribers WHERE is_comp = TRUE AND is_subscribed = TRUE")
        total_comp = cur.fetchone()['total']

        list_counts = {}
        for list_name in VALID_LISTS:
            cur.execute("SELECT COUNT(*) as c FROM print_list_subscribers WHERE subscribed_lists LIKE %s AND is_subscribed = TRUE", (f'%{list_name}%',))
            list_counts[list_name] = cur.fetchone()['c']

        cur.execute("""
            SELECT COUNT(*) as c FROM print_list_subscribers
            WHERE updated_at >= NOW() - INTERVAL '30 days'
        """)
        recent_changes = cur.fetchone()['c']

        cur.execute("""
            SELECT action, COUNT(*) as c FROM print_list_activity_log
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY action ORDER BY c DESC
        """)
        recent_actions = {row['action']: row['c'] for row in cur.fetchall()}

        cur.execute("SELECT COUNT(*) as c FROM blacklisted_addresses")
        blacklisted_count = cur.fetchone()['c']

        cur.close()

        return jsonify({
            'total_active': total_active,
            'total_inactive': total_inactive,
            'total_comp': total_comp,
            'list_counts': list_counts,
            'recent_changes': recent_changes,
            'recent_actions': recent_actions,
            'blacklisted_count': blacklisted_count,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@print_lists_bp.route('/manual-update', methods=['POST'])
def manual_update():
    data = request.json
    text = data.get('text', '')
    action = data.get('action', 'subscribe')
    confirm = data.get('confirm', False)
    parsed = data.get('parsed', None)

    if not confirm:
        people = parse_text_input(text, action)
        return jsonify({'parsed': people, 'action': action})

    if not parsed:
        return jsonify({'error': 'No parsed data to confirm'}), 400

    conn = get_db_connection()
    try:
        results = []
        for person in parsed:
            result = apply_person_update(conn, person, action)
            results.append(result)
        conn.commit()
        return jsonify({'results': results, 'action': action})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

NOISE_WORDS = {
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
    'was', 'one', 'our', 'out', 'has', 'his', 'how', 'its', 'may', 'new', 'now',
    'old', 'see', 'way', 'who', 'did', 'get', 'let', 'say', 'she', 'too', 'use',
    'hello', 'please', 'thank', 'thanks', 'dear', 'sincerely', 'regards', 'best',
    'from', 'sent', 'date', 'subject', 'with', 'this', 'that', 'will', 'your',
    'have', 'been', 'would', 'could', 'should', 'they', 'them', 'their', 'there',
    'here', 'where', 'when', 'what', 'which', 'whom', 'then', 'than', 'each',
    'receiving', 'subscription', 'subscriptions', 'mailing', 'address', 'listed',
    'below', 'above', 'update', 'remove', 'removed', 'employees', 'employee',
    'hospital', 'clinic', 'center', 'medical', 'health', 'practice', 'office',
    'building', 'department', 'university', 'institute', 'associates', 'group',
    'following', 'forwarding', 'appreciate', 'kindly', 'registered', 'longer',
    'closed', 'business', 'topics', 'alopecia', 'areata', 'dermatology',
    'hot', 'cold', 'print', 'list', 'name', 'email', 'phone', 'fax',
    'add', 'adding', 'added', 'drop', 'dropped', 'take', 'cancel',
    'note', 'notes', 'info', 'information', 'request', 'requesting',
    'unsubscribe', 'subscribe', 'cancel', 'retire', 'retired', 'deceased',
    'move', 'moved', 'left', 'work', 'working',
}

US_STATES = {
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID',
    'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS',
    'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
    'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
    'WI', 'WY', 'DC', 'PR', 'VI',
}

DEGREE_PATTERN = re.compile(
    r'\b(MD|NP|PA-C|FNP|DNP|APRN|DPM|PharmD|RPh|RN|BSN|MSN|PhD)\b',
    re.IGNORECASE
)
DEGREE_EXACT_PATTERN = re.compile(
    r'(?:,\s*|\b)(DO|PA)(?:\s*$|\s*,)', re.IGNORECASE
)

SENDER_KEYWORDS = re.compile(
    r'(?:thank\s*you|sincerely|regards|best|cheers|sent\s+from|^\s*-{2,})',
    re.IGNORECASE
)

def _is_name_word(word):
    if not word or len(word) < 2:
        return False
    if word.lower() in NOISE_WORDS:
        return False
    if word.upper() in US_STATES and len(word) == 2:
        return False
    if re.match(r'^\d', word):
        return False
    if DEGREE_PATTERN.match(word):
        return False
    if not re.match(r'^[A-Za-z\'-]+$', word):
        return False
    return True

def _find_address_blocks(text):
    lines = [l.strip() for l in text.split('\n')]
    blocks = []

    for i, line in enumerate(lines):
        csz = re.match(r'^([A-Za-z\s.]+?)[,\s]+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$', line)
        if csz:
            city = csz.group(1).strip()
            state = csz.group(2)
            zipcode = csz.group(3)

            if state not in US_STATES:
                continue

            street = None
            for j in range(i - 1, max(i - 4, -1), -1):
                candidate = lines[j].strip()
                if candidate and re.match(r'^\d+\s+\w', candidate):
                    street = candidate
                    break

            blocks.append({
                'street': street,
                'city': city,
                'state': state,
                'zipcode': zipcode,
                'line_idx': i,
            })
            continue

        inline = re.search(
            r'(\d+\s+.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)',
            line
        )
        if inline:
            state = inline.group(2)
            if state in US_STATES:
                full_addr = inline.group(1).strip()
                zipcode = inline.group(3)
                words = full_addr.split()
                city_words = []
                street_words = []
                found_street_num = False
                for wi in range(len(words) - 1, -1, -1):
                    w = words[wi]
                    if re.match(r'^\d', w):
                        street_words = words[:wi + 1]
                        city_words = words[wi + 1:]
                        found_street_num = True
                        break
                if not found_street_num:
                    street_words = words
                    city_words = []

                street_types = {'st', 'ave', 'avenue', 'blvd', 'dr', 'drive', 'ln', 'lane',
                                'rd', 'road', 'ct', 'court', 'pl', 'place', 'cir', 'circle',
                                'way', 'pkwy', 'hwy', 'ter', 'terrace', 'trl', 'trail'}
                split_at = None
                for wi, w in enumerate(words):
                    if w.lower().rstrip('.,') in street_types:
                        split_at = wi
                if split_at is not None and split_at + 1 < len(words):
                    street = ' '.join(words[:split_at + 1])
                    city = ' '.join(words[split_at + 1:])
                elif city_words:
                    street = ' '.join(street_words)
                    city = ' '.join(city_words)
                else:
                    street = full_addr
                    city = ''

                if street and city:
                    blocks.append({
                        'street': street,
                        'city': city,
                        'state': state,
                        'zipcode': zipcode,
                        'line_idx': i,
                        'is_inline': True,
                    })

    return blocks

def _find_names_near_address(lines, addr_line_idx):
    candidates = []

    search_start = max(0, addr_line_idx - 8)
    search_end = addr_line_idx

    for i in range(search_end - 1, search_start - 1, -1):
        line = lines[i].strip()
        if not line:
            continue

        if re.match(r'^\d+\s', line): 
            continue
        if ':' in line and len(line.split(':')[0]) < 20:
            continue
        if len(line) > 60:
            continue

        if re.match(r'^[A-Z][A-Z\s\'-]+$', line) and len(line.split()) <= 4:
            words = line.split()
            name_words = [w for w in words if _is_name_word(w)]
            if len(name_words) >= 2:
                candidates.append({
                    'first_name': name_words[0].title(),
                    'last_name': ' '.join(name_words[1:]).title(),
                    'confidence': 3,
                    'line_idx': i,
                })
                continue

        m = re.match(r'^(?:Dr\.?\s+)?([A-Z][a-z]+)\s+([A-Z][a-z][A-Za-z\'-]+)(?:\s*,?\s*(?:MD|DO|NP|PA|PA-C|FNP|DNP|APRN))?$', line)
        if m and _is_name_word(m.group(1)) and _is_name_word(m.group(2)):
            candidates.append({
                'first_name': m.group(1),
                'last_name': m.group(2),
                'confidence': 2,
                'line_idx': i,
            })
            continue

        m = re.match(r'^([A-Z][a-z][A-Za-z\'-]+),\s*([A-Z][a-z]+)', line)
        if m and _is_name_word(m.group(1)) and _is_name_word(m.group(2)):
            candidates.append({
                'first_name': m.group(2),
                'last_name': m.group(1),
                'confidence': 2,
                'line_idx': i,
            })

    if candidates:
        candidates.sort(key=lambda c: (-c['confidence'], abs(c['line_idx'] - addr_line_idx)))
        return candidates[0]
    return None

def _detect_sender_zone(lines):
    for i, line in enumerate(lines):
        if SENDER_KEYWORDS.search(line):
            return i
    return len(lines)

def _extract_pub_names(text, lines):
    lists_found = []
    for list_name in VALID_LISTS:
        if re.search(r'\b' + re.escape(list_name) + r'\b', text, re.IGNORECASE):
            lists_found.append(list_name)

    in_receiving_section = False
    for line in lines:
        line_s = line.strip()
        if not line_s:
            continue
        if re.search(r'RECEIVING|SUBSCRIPTION', line_s, re.IGNORECASE):
            in_receiving_section = True
            continue
        if in_receiving_section:
            if (re.match(r'^[A-Z][A-Z\s\-]+$', line_s) and
                len(line_s.split()) >= 3 and
                not re.match(r'^\d+\s', line_s) and
                not any(kw in line_s.lower() for kw in ['physician', 'please', 'update', 'thank', 'employee'])):
                lists_found.append(line_s.title())
                in_receiving_section = False
            if re.search(r'PHYSICIAN|EMPLOYEE|ADDRESS', line_s):
                in_receiving_section = False

    hot_topics = re.findall(
        r'["\u201c]([^"\u201d]+)["\u201d]',
        text
    )
    for ht in hot_topics:
        ht = ht.strip()
        if len(ht.split()) >= 3:
            normalized = ht.title()
            if not any(normalized.lower() == existing.lower() for existing in lists_found):
                lists_found.append(normalized)

    ht_match = re.search(
        r'Hot\s+Topics\s+in\s+([A-Z][A-Z\s\-]+?)(?:\s*["\u201d]|\s+(?:February|March|April|May|June|July|August|September|October|November|December|January)\b|\s*$)',
        text, re.IGNORECASE | re.MULTILINE
    )
    if ht_match:
        pub = 'Hot Topics In ' + ht_match.group(1).strip().title()
        if not any(pub.lower() == existing.lower() for existing in lists_found):
            lists_found.append(pub)

    return lists_found

def _extract_degree_from_name_lines(lines):
    for line in lines:
        line_s = line.strip()
        if re.match(r'^\d+\s', line_s):
            continue
        if re.match(r'^[A-Za-z\s.]+,?\s+[A-Z]{2}\s+\d{5}', line_s):
            continue
        if len(line_s) > 60:
            continue
        dm = DEGREE_PATTERN.search(line_s)
        if dm:
            return dm.group(1).upper()
        dm2 = DEGREE_EXACT_PATTERN.search(line_s)
        if dm2:
            return dm2.group(1).upper()
    return None

def _filter_npis(text):
    candidates = re.findall(r'\b(\d{10})\b', text)
    phone_numbers = set()
    for m in re.finditer(r'(?:phone|fax|tel|cell|mobile)[:\s]*(\d{10})\b', text, re.IGNORECASE):
        phone_numbers.add(m.group(1))
    for m in re.finditer(r'\b(\d{3})[-.](\d{3})[-.](\d{4})\b', text):
        phone_numbers.add(m.group(1) + m.group(2) + m.group(3))
    return [n for n in candidates if n not in phone_numbers]

def parse_text_input(text, action):
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    lines = [l.strip() for l in text.split('\n')]
    full_lower = text.lower()

    sender_zone_start = _detect_sender_zone(lines)

    all_npis = _filter_npis(text)
    all_emails = re.findall(r'[\w.+-]+@[\w.-]+\.\w+', text)
    lists_found = _extract_pub_names(text, lines)
    degree = _extract_degree_from_name_lines(lines)

    reason = None
    reason_patterns = [
        r'(?:reason|because|due to)[:\s]+(.+?)(?:\n|$)',
        r'(business closed[^.\n]*)',
        r'(administrative building[^.\n]*)',
        r'(retired|deceased|left practice|moved away)',
        r'((?:do not|don\'t) work (?:from |at )?[^.\n]*)',
        r'(no longer (?:at|with|working)[^.\n]*)',
    ]
    for pat in reason_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            reason = m.group(1).strip() if m.lastindex and m.lastindex >= 1 else m.group(0).strip()
            break

    suggest_blacklist = False

    addr_blocks = _find_address_blocks(text)
    people = []
    used_name_lines = set()

    addressed_to_names = []
    at_match = re.search(r'addressed to[:\s]*\n', text, re.IGNORECASE)
    if at_match:
        at_start = text[:at_match.end()].count('\n')
        for i in range(at_start, min(at_start + 15, len(lines))):
            line_s = lines[i].strip()
            if not line_s:
                continue
            if re.match(r'^[A-Z][A-Z\s\'-]+$', line_s) and len(line_s.split()) <= 4:
                words = line_s.split()
                name_words = [w for w in words if _is_name_word(w)]
                if len(name_words) >= 2:
                    addressed_to_names.append({
                        'first_name': name_words[0].title(),
                        'last_name': ' '.join(name_words[1:]).title(),
                        'line_idx': i,
                    })
            elif addressed_to_names and not re.match(r'^[A-Z]{2,}', line_s):
                break

    for addr in addr_blocks:
        is_inline = addr.get('is_inline', False)

        if is_inline and addressed_to_names:
            for atn in addressed_to_names:
                person = {
                    'npi': None,
                    'first_name': atn['first_name'],
                    'last_name': atn['last_name'],
                    'degree': degree,
                    'email': None,
                    'address_1': addr['street'],
                    'city': addr['city'],
                    'state': addr['state'],
                    'zipcode': addr['zipcode'],
                    'lists': lists_found[:],
                    'reason': reason,
                    'is_comp': False,
                    'suggest_blacklist': suggest_blacklist,
                }
                used_name_lines.add(atn['line_idx'])
                people.append(person)
        else:
            name_info = _find_names_near_address(lines, addr['line_idx'])
            if name_info and name_info['line_idx'] >= sender_zone_start:
                continue

            person = {
                'npi': None,
                'first_name': name_info['first_name'] if name_info else None,
                'last_name': name_info['last_name'] if name_info else None,
                'degree': degree,
                'email': None,
                'address_1': addr['street'],
                'city': addr['city'],
                'state': addr['state'],
                'zipcode': addr['zipcode'],
                'lists': lists_found[:],
                'reason': reason,
                'is_comp': False,
                'suggest_blacklist': suggest_blacklist,
            }
            if name_info:
                used_name_lines.add(name_info['line_idx'])

            if person['first_name'] and person['last_name']:
                people.append(person)

    if not people:
        for i, line in enumerate(lines):
            if i >= sender_zone_start:
                break
            if i in used_name_lines:
                continue
            line_stripped = line.strip()
            if not line_stripped:
                continue
            if re.match(r'^[A-Z][A-Z\s\'-]+$', line_stripped) and len(line_stripped.split()) <= 4:
                words = line_stripped.split()
                name_words = [w for w in words if _is_name_word(w)]
                if len(name_words) >= 2:
                    shared_addr = addr_blocks[0] if addr_blocks else {}
                    people.append({
                        'npi': None,
                        'first_name': name_words[0].title(),
                        'last_name': ' '.join(name_words[1:]).title(),
                        'degree': degree,
                        'email': None,
                        'address_1': shared_addr.get('street'),
                        'city': shared_addr.get('city'),
                        'state': shared_addr.get('state'),
                        'zipcode': shared_addr.get('zipcode'),
                        'lists': lists_found[:],
                        'reason': reason,
                        'is_comp': False,
                        'suggest_blacklist': suggest_blacklist,
                    })

    if not people:
        name_re_line = re.compile(r'^(?:Dr\.?\s+)?([A-Z][a-z]+)\s+([A-Z][a-z][A-Za-z\'-]+)(?:\s*,?\s*(?:MD|NP|PA-C|FNP|DNP|APRN))?$')
        name_re_inline = re.compile(r'(?:Dr\.?\s+)?([A-Z][a-z]+)\s+([A-Z][a-z][A-Za-z\'-]+)(?:\s*,?\s*(?:MD|NP|PA-C|FNP|DNP|APRN))?')
        for i, line in enumerate(lines):
            if i >= sender_zone_start:
                break
            line_stripped = line.strip()
            m = name_re_line.match(line_stripped)
            if m and _is_name_word(m.group(1)) and _is_name_word(m.group(2)):
                shared_addr = addr_blocks[0] if addr_blocks else {}
                people.append({
                    'npi': None,
                    'first_name': m.group(1),
                    'last_name': m.group(2),
                    'degree': degree,
                    'email': None,
                    'address_1': shared_addr.get('street'),
                    'city': shared_addr.get('city'),
                    'state': shared_addr.get('state'),
                    'zipcode': shared_addr.get('zipcode'),
                    'lists': lists_found[:],
                    'reason': reason,
                    'is_comp': False,
                    'suggest_blacklist': suggest_blacklist,
                })
                break
        if not people:
            for i, line in enumerate(lines):
                if i >= sender_zone_start:
                    break
                for m in name_re_inline.finditer(line.strip()):
                    if _is_name_word(m.group(1)) and _is_name_word(m.group(2)):
                        shared_addr = addr_blocks[0] if addr_blocks else {}
                        people.append({
                            'npi': None,
                            'first_name': m.group(1),
                            'last_name': m.group(2),
                            'degree': degree,
                            'email': None,
                            'address_1': shared_addr.get('street'),
                            'city': shared_addr.get('city'),
                            'state': shared_addr.get('state'),
                            'zipcode': shared_addr.get('zipcode'),
                            'lists': lists_found[:],
                            'reason': reason,
                            'is_comp': False,
                            'suggest_blacklist': suggest_blacklist,
                        })
                        break
                if people:
                    break

    if not people and all_npis:
        for npi in all_npis:
            people.append({
                'npi': npi,
                'first_name': None,
                'last_name': None,
                'degree': degree,
                'email': None,
                'address_1': None,
                'city': None,
                'state': None,
                'zipcode': None,
                'lists': lists_found[:],
                'reason': reason,
                'is_comp': False,
                'suggest_blacklist': suggest_blacklist,
            })

    if all_npis and people:
        if len(all_npis) == 1 and len(people) == 1:
            people[0]['npi'] = all_npis[0]
        elif len(all_npis) >= len(people):
            for idx, person in enumerate(people):
                if idx < len(all_npis):
                    person['npi'] = all_npis[idx]

    if all_emails and len(people) == 1 and len(all_emails) == 1:
        people[0]['email'] = all_emails[0]

    return people

def apply_person_update(conn, person, action):
    cur = conn.cursor(cursor_factory=RealDictCursor)
    npi = person.get('npi')
    result = {'npi': npi, 'name': f"{person.get('first_name', '')} {person.get('last_name', '')}".strip(), 'status': 'ok', 'messages': []}

    existing = None
    if npi:
        cur.execute("SELECT * FROM print_list_subscribers WHERE npi = %s", (npi,))
        existing = cur.fetchone()

    if not existing and person.get('first_name') and person.get('last_name'):
        fname = person['first_name'].strip().upper()
        lname = person['last_name'].strip().upper()
        if person.get('address_1'):
            norm_addr = normalize_address(person['address_1'])
            cur.execute("""
                SELECT * FROM print_list_subscribers
                WHERE UPPER(first_name) = %s AND UPPER(last_name) = %s
                AND UPPER(REPLACE(REPLACE(address_1, '.', ''), ',', '')) LIKE %s
                LIMIT 1
            """, (fname, lname, f'%{norm_addr[:20]}%'))
        else:
            cur.execute("""
                SELECT * FROM print_list_subscribers
                WHERE UPPER(first_name) = %s AND UPPER(last_name) = %s
                LIMIT 1
            """, (fname, lname))
        existing = cur.fetchone()
        if existing:
            npi = existing.get('npi')
            result['npi'] = npi

    if action == 'subscribe':
        bl = check_blacklist(conn, person.get('address_1'), person.get('city'), person.get('state'), person.get('zipcode'))
        if bl:
            result['status'] = 'blacklisted'
            result['messages'].append(f"Address is blacklisted: {bl.get('reason', 'N/A')}")
            cur.close()
            return result

        lists_to_add = person.get('lists', [])
        if 'NPPA' in lists_to_add:
            degree = person.get('degree', '') or ''
            if degree.upper() in NPPA_INELIGIBLE:
                result['status'] = 'ineligible'
                result['messages'].append(f"{degree} is not eligible for NPPA")
                lists_to_add = [l for l in lists_to_add if l != 'NPPA']
            elif degree.upper() not in NPPA_ELIGIBLE and degree:
                result['messages'].append(f"Degree '{degree}' - verify NPPA eligibility")

        if 'NPPA' in lists_to_add and 'JCAD' not in lists_to_add:
            lists_to_add.append('JCAD')
            result['messages'].append('Auto-added JCAD (NPPA requires JCAD)')

        if existing:
            if person.get('address_1') and existing.get('address_1'):
                if normalize_address(person['address_1']) != normalize_address(existing['address_1']):
                    result['messages'].append(f"Address differs from existing: {existing['address_1']}, {existing['city']}, {existing['state']}")

            new_subscribed = existing.get('subscribed_lists', '') or ''
            for l in lists_to_add:
                new_subscribed = add_list(new_subscribed, l)

            updates = ["subscribed_lists = %s", "is_subscribed = TRUE", "updated_at = NOW()"]
            params = [new_subscribed]

            if person.get('address_1'):
                updates.extend([
                    "address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('address', address_1, 'city', city, 'state', state, 'zipcode', zipcode, 'changed_at', NOW()::text))",
                    "old_address_1 = address_1", "old_city = city", "old_state = state", "old_zipcode = zipcode",
                    "address_1 = %s", "city = %s", "state = %s", "zipcode = %s"
                ])
                params.extend([person['address_1'], person.get('city'), person.get('state'), person.get('zipcode')])

            for field in ['first_name', 'last_name', 'degree', 'email', 'specialty', 'company']:
                if person.get(field):
                    updates.append(f"{field} = %s")
                    params.append(person[field])

            if person.get('is_comp'):
                updates.append("is_comp = %s")
                params.append(True)

            params.append(npi)
            cur.execute(f"UPDATE print_list_subscribers SET {', '.join(updates)} WHERE npi = %s", params)
            result['messages'].append(f"Updated existing subscriber, added to: {', '.join(lists_to_add)}")
        else:
            cur.execute("""
                INSERT INTO print_list_subscribers
                (npi, first_name, last_name, degree, email, address_1, city, state, zipcode,
                 subscribed_lists, is_subscribed, is_comp, subscribe_date, source, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s, NOW(), 'manual', NOW(), NOW())
            """, (npi, person.get('first_name'), person.get('last_name'), person.get('degree'),
                  person.get('email'), person.get('address_1'), person.get('city'),
                  person.get('state'), person.get('zipcode'),
                  ','.join(lists_to_add) if lists_to_add else None,
                  person.get('is_comp', False)))
            result['messages'].append(f"New subscriber created, lists: {', '.join(lists_to_add) if lists_to_add else 'none'}")

        add_activity_log(conn, npi, 'subscribe', f"Lists: {', '.join(lists_to_add)}. Source: manual input")

    elif action == 'unsubscribe':
        lists_to_remove = person.get('lists', [])
        reason = person.get('reason', '')

        if existing:
            new_subscribed = existing.get('subscribed_lists', '') or ''
            new_unsubscribed = existing.get('unsubscribed_lists', '') or ''

            if lists_to_remove:
                for l in lists_to_remove:
                    new_subscribed = remove_list(new_subscribed, l)
                    new_unsubscribed = add_list(new_unsubscribed, l)
            else:
                if new_subscribed:
                    for l in new_subscribed.split(','):
                        l = l.strip()
                        if l:
                            new_unsubscribed = add_list(new_unsubscribed, l)
                new_subscribed = ''

            is_still_subscribed = bool(new_subscribed.strip())

            cur.execute("""
                UPDATE print_list_subscribers
                SET subscribed_lists = %s, unsubscribed_lists = %s, is_subscribed = %s,
                    unsubscribe_reason = %s, unsubscribe_date = NOW(), updated_at = NOW()
                WHERE id = %s
            """, (new_subscribed or None, new_unsubscribed or None, is_still_subscribed, reason, existing['id']))

            removed_str = ', '.join(lists_to_remove) if lists_to_remove else 'all'
            result['messages'].append(f"Unsubscribed from: {removed_str}")
            add_activity_log(conn, npi or 'N/A', 'unsubscribe', f"{result['name']}. Lists: {removed_str}. Reason: {reason}")
        else:
            unsub_lists = ','.join(lists_to_remove) if lists_to_remove else None
            cur.execute("""
                INSERT INTO print_list_subscribers
                (npi, first_name, last_name, degree, email, address_1, city, state, zipcode,
                 subscribed_lists, unsubscribed_lists, is_subscribed, is_comp,
                 unsubscribe_reason, unsubscribe_date, source, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s,
                        NULL, %s, FALSE, %s,
                        %s, NOW(), 'manual', NOW(), NOW())
            """, (npi, person.get('first_name'), person.get('last_name'), person.get('degree'),
                  person.get('email'), person.get('address_1'), person.get('city'),
                  person.get('state'), person.get('zipcode'),
                  unsub_lists, person.get('is_comp', False),
                  reason))

            removed_str = ', '.join(lists_to_remove) if lists_to_remove else 'all'
            result['messages'].append(f"Created as unsubscribed (was not in database). Lists: {removed_str}")
            add_activity_log(conn, npi or 'N/A', 'unsubscribe', f"New record: {result['name']}. Lists: {removed_str}. Reason: {reason}")

    if person.get('suggest_blacklist') and person.get('address_1'):
        bl_reason = person.get('reason') or 'Flagged during manual update'
        try:
            cur2 = conn.cursor()
            cur2.execute("""
                INSERT INTO blacklisted_addresses (address_1, city, state, zipcode, reason, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT DO NOTHING
            """, (normalize_address(person['address_1']), (person.get('city') or '').upper(),
                  person.get('state'), person.get('zipcode'), bl_reason))
            cur2.close()
            result['messages'].append(f"Address blacklisted: {person['address_1']}")
        except Exception:
            result['messages'].append('Note: Could not add to blacklist (may already exist)')

    cur.close()
    return result

@print_lists_bp.route('/ncoa-upload', methods=['POST'])
def ncoa_upload():
    confirm = request.form.get('confirm', 'false') == 'true'

    if not confirm:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        try:
            content = file.read().decode('utf-8', errors='replace')
            reader = csv.DictReader(io.StringIO(content))
            rows = list(reader)
        except Exception as e:
            return jsonify({'error': f'Failed to parse CSV: {str(e)}'}), 400

        conn = get_db_connection()
        try:
            results = process_ncoa_rows(conn, rows)
            return jsonify(results)
        finally:
            conn.close()
    else:
        data = request.form.get('data')
        if not data:
            return jsonify({'error': 'No data to confirm'}), 400

        import json
        updates = json.loads(data)
        conn = get_db_connection()
        try:
            applied = apply_ncoa_updates(conn, updates)
            conn.commit()
            return jsonify({'applied': applied})
        except Exception as e:
            conn.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()

def process_ncoa_rows(conn, rows):
    address_updates = []
    unsubscribe_candidates = []
    not_found = []

    cur = conn.cursor(cursor_factory=RealDictCursor)

    def get_col(row, candidates):
        for c in candidates:
            for key in row:
                if key.strip().lower().replace(' ', '_').replace('-', '_') == c.lower():
                    return (row[key] or '').strip()
        return ''

    for row in rows:
        first_name = get_col(row, ['first_name', 'firstname', 'first'])
        last_name = get_col(row, ['last_name', 'lastname', 'last'])

        if not first_name and not last_name:
            individual_name = get_col(row, ['individual_name', 'name', 'full_name'])
            if individual_name:
                parts = individual_name.split(None, 1)
                first_name = parts[0] if parts else ''
                last_name = parts[1] if len(parts) > 1 else ''

        old_addr = get_col(row, ['old_address', 'old_address_1', 'original_address', 'input_address',
                                  'previous_delivery_address', 'previous_address'])
        new_addr = get_col(row, ['new_address', 'new_address_1', 'updated_address', 'delivery_point',
                                  'current_delivery_address', 'current_address'])
        old_city = get_col(row, ['old_city', 'input_city', 'previous_city'])
        new_city = get_col(row, ['new_city', 'updated_city', 'delivery_city', 'current_city'])
        old_state = get_col(row, ['old_state', 'input_state', 'previous_state'])
        new_state = get_col(row, ['new_state', 'updated_state', 'delivery_state', 'current_state'])
        old_zip = get_col(row, ['old_zip', 'old_zipcode', 'input_zip', 'input_zipcode',
                                 'previous_zip+4', 'previous_zip', 'previous_zipcode'])
        new_zip = get_col(row, ['new_zip', 'new_zipcode', 'updated_zip', 'delivery_zip',
                                 'current_zip+4', 'current_zip', 'current_zipcode'])
        return_code = get_col(row, ['return_code', 'returncode', 'ncoa_return_code', 'code'])
        new_suite = get_col(row, ['current_suite/apartment', 'current_suite_apartment', 'new_suite',
                                   'new_address_2', 'current_alternate_address'])
        old_suite = get_col(row, ['previous_suite/apartment', 'previous_suite_apartment', 'old_suite',
                                   'old_address_2', 'previous_alternate_address'])

        def split_suite(addr, suite):
            if suite:
                return addr, suite
            m = re.match(r'^(.+?)\s+((?:STE|SUITE|APT|APARTMENT|UNIT|BLDG|#)\s*.+)$', addr, re.IGNORECASE)
            if m:
                return m.group(1).strip(), m.group(2).strip()
            return addr, ''

        old_addr_full = old_addr
        new_addr_full = new_addr
        new_addr, new_addr_2 = split_suite(new_addr, new_suite)
        old_addr_street, old_addr_2 = split_suite(old_addr, old_suite)

        norm_first = normalize_name(first_name)
        norm_last = normalize_name(last_name)
        norm_old_street = normalize_name(old_addr_street)

        cur.execute("""
            SELECT * FROM print_list_subscribers
            WHERE UPPER(TRIM(first_name)) = %s AND UPPER(TRIM(last_name)) = %s
            AND UPPER(TRIM(COALESCE(address_1, ''))) = %s
            AND is_subscribed = TRUE
            ORDER BY updated_at DESC LIMIT 1
        """, (norm_first, norm_last, norm_old_street))
        subscriber = cur.fetchone()

        if not subscriber:
            cur.execute("""
                SELECT * FROM print_list_subscribers
                WHERE UPPER(TRIM(first_name)) = %s AND UPPER(TRIM(last_name)) = %s
                AND UPPER(TRIM(COALESCE(city, ''))) = %s
                AND UPPER(TRIM(COALESCE(state, ''))) = %s
                AND is_subscribed = TRUE
                ORDER BY updated_at DESC LIMIT 1
            """, (norm_first, norm_last, normalize_name(old_city), normalize_name(old_state)))
            subscriber = cur.fetchone()

        if not subscriber:
            not_found.append({
                'name': f"{first_name} {last_name}",
                'old_address': old_addr,
                'return_code': return_code,
            })
            continue

        old_display = ', '.join(filter(None, [old_addr, old_city, f"{old_state} {old_zip}".strip()]))
        new_display_parts = [new_addr]
        if new_addr_2:
            new_display_parts.append(new_addr_2)
        new_display_parts.extend([new_city, f"{new_state} {new_zip}".strip()])
        new_display = ', '.join(filter(None, new_display_parts))

        entry = {
            'subscriber_id': subscriber['id'],
            'npi': subscriber.get('npi'),
            'name': f"{subscriber['first_name']} {subscriber['last_name']}",
            'current_lists': subscriber.get('subscribed_lists', ''),
            'old_address': old_display,
            'new_address': new_display,
            'new_address_1': new_addr,
            'new_address_2': new_addr_2,
            'new_city': new_city,
            'new_state': new_state,
            'new_zipcode': new_zip,
            'return_code': return_code,
        }

        try:
            code_num = int(return_code) if return_code else 0
        except ValueError:
            code_num = 0

        if 20 <= code_num <= 29:
            entry['reason'] = f'NCOA return code {return_code} (unable to forward)'
            unsubscribe_candidates.append(entry)
        elif normalize_address(old_addr_full) == normalize_address(new_addr_full) and old_addr_full:
            entry['reason'] = 'Address unchanged - verify status'
            unsubscribe_candidates.append(entry)
        elif new_addr:
            address_updates.append(entry)
        else:
            entry['reason'] = f'No new address provided (code: {return_code})'
            unsubscribe_candidates.append(entry)

    cur.close()

    return {
        'address_updates': address_updates,
        'unsubscribe_candidates': unsubscribe_candidates,
        'not_found': not_found,
        'summary': {
            'total_rows': len(rows),
            'updates': len(address_updates),
            'unsubscribes': len(unsubscribe_candidates),
            'not_found': len(not_found),
        }
    }

def apply_ncoa_updates(conn, updates):
    cur = conn.cursor()
    applied = {'address_updates': 0, 'unsubscribes': 0}

    def title_case_addr(val):
        if not val:
            return val
        return ' '.join(w.capitalize() if w.isalpha() else w for w in val.split())

    for update in updates.get('address_updates', []):
        sid = update['subscriber_id']
        tc_addr1 = title_case_addr(update['new_address_1'])
        tc_addr2 = title_case_addr(update.get('new_address_2', ''))
        tc_city = title_case_addr(update['new_city'])
        tc_state = (update['new_state'] or '').upper()
        tc_zip = update['new_zipcode']

        cur.execute("""
            UPDATE print_list_subscribers
            SET address_history = COALESCE(address_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                    'address', address_1, 'address_2', address_2, 'city', city, 'state', state, 'zipcode', zipcode, 'changed_at', NOW()::text
                )),
                old_address_1 = address_1, old_address_2 = address_2, old_city = city, old_state = state, old_zipcode = zipcode,
                address_1 = %s, address_2 = %s, city = %s, state = %s, zipcode = %s, updated_at = NOW()
            WHERE id = %s
        """, (tc_addr1, tc_addr2, tc_city, tc_state, tc_zip, sid))

        npi = update.get('npi')
        if npi:
            uc_addr1 = (update['new_address_1'] or '').upper()
            uc_city = (update['new_city'] or '').upper()
            uc_state = tc_state
            uc_zip = tc_zip
            cascade_address_update(conn, npi, uc_addr1, uc_city, uc_state, uc_zip)
            add_activity_log(conn, npi, 'ncoa_address_update', f"New: {update['new_address_1']}, {update['new_city']}, {update['new_state']}")

        applied['address_updates'] += 1

    for unsub in updates.get('unsubscribes', []):
        sid = unsub['subscriber_id']
        reason = unsub.get('reason', 'NCOA unsubscribe')
        cur.execute("""
            UPDATE print_list_subscribers
            SET unsubscribed_lists = COALESCE(subscribed_lists, ''),
                subscribed_lists = NULL, is_subscribed = FALSE,
                unsubscribe_reason = %s, unsubscribe_date = NOW(), updated_at = NOW()
            WHERE id = %s
        """, (reason, sid))

        npi = unsub.get('npi')
        add_activity_log(conn, npi, 'ncoa_unsubscribe', reason)
        applied['unsubscribes'] += 1

    cur.close()
    return applied

@print_lists_bp.route('/subscription-upload', methods=['POST'])
def subscription_upload():
    confirm = request.form.get('confirm', 'false') == 'true'

    if not confirm:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        target_list = request.form.get('list', 'JCAD')

        try:
            content = file.read().decode('utf-8', errors='replace')
            reader = csv.DictReader(io.StringIO(content))
            rows = list(reader)
        except Exception as e:
            return jsonify({'error': f'Failed to parse CSV: {str(e)}'}), 400

        conn = get_db_connection()
        try:
            results = process_subscription_rows(conn, rows, target_list)
            return jsonify(results)
        finally:
            conn.close()
    else:
        import json
        data = json.loads(request.form.get('data', '{}'))
        conn = get_db_connection()
        try:
            applied = apply_subscription_imports(conn, data)
            conn.commit()
            return jsonify({'applied': applied})
        except Exception as e:
            conn.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()

def process_subscription_rows(conn, rows, target_list):
    valid = []
    issues = []
    cur = conn.cursor(cursor_factory=RealDictCursor)

    def get_col(row, candidates):
        for c in candidates:
            for key in row:
                if key.strip().lower().replace(' ', '_').replace('-', '_') == c.lower():
                    return (row[key] or '').strip()
        return ''

    for i, row in enumerate(rows):
        npi = get_col(row, ['npi', 'npi_number'])
        first_name = get_col(row, ['first_name', 'firstname', 'first'])
        last_name = get_col(row, ['last_name', 'lastname', 'last'])
        degree = get_col(row, ['degree', 'credential', 'credentials', 'suffix'])
        email = get_col(row, ['email', 'email_address'])
        address = get_col(row, ['address', 'address_1', 'street', 'mailing_address'])
        city = get_col(row, ['city'])
        state = get_col(row, ['state'])
        zipcode = get_col(row, ['zip', 'zipcode', 'zip_code', 'postal_code'])
        specialty = get_col(row, ['specialty', 'speciality'])
        company = get_col(row, ['company', 'organization', 'practice', 'practice_name'])

        entry = {
            'row_num': i + 1,
            'npi': npi,
            'first_name': first_name,
            'last_name': last_name,
            'degree': degree,
            'email': email,
            'address_1': address,
            'city': city,
            'state': state,
            'zipcode': zipcode,
            'specialty': specialty,
            'company': company,
            'target_list': target_list,
            'status': 'valid',
            'messages': [],
            'auto_corrections': [],
        }

        missing = []
        if not first_name:
            missing.append('first_name')
        if not last_name:
            missing.append('last_name')
        if not address:
            missing.append('address')
        if missing:
            entry['status'] = 'missing'
            entry['messages'].append(f"Missing: {', '.join(missing)}")

        if target_list == 'NPPA':
            deg_upper = degree.upper() if degree else ''
            if deg_upper in [d.upper() for d in NPPA_INELIGIBLE]:
                entry['status'] = 'ineligible'
                entry['messages'].append(f"{degree} is not eligible for NPPA")
            elif deg_upper not in [d.upper() for d in NPPA_ELIGIBLE] and degree:
                entry['messages'].append(f"Verify NPPA eligibility for degree: {degree}")

        if target_list == 'NPPA':
            entry['auto_corrections'].append('Auto-add JCAD')

        if npi:
            cur.execute("SELECT id, subscribed_lists, address_1, city, state FROM print_list_subscribers WHERE npi = %s", (npi,))
            existing = cur.fetchone()
            if existing:
                current_lists = existing.get('subscribed_lists', '') or ''
                if target_list in current_lists:
                    entry['status'] = 'duplicate'
                    entry['messages'].append(f"Already subscribed to {target_list}")
                elif current_lists:
                    entry['messages'].append(f"Existing subscriber on: {current_lists}")
                if existing.get('address_1') and address:
                    if normalize_address(existing['address_1']) != normalize_address(address):
                        entry['auto_corrections'].append(f"Address differs: {existing['address_1']}, {existing['city']}, {existing['state']}")

        bl = check_blacklist(conn, address, city, state, zipcode)
        if bl:
            entry['status'] = 'blacklisted'
            entry['messages'].append(f"Blacklisted address: {bl.get('reason', '')}")

        if entry['status'] in ['ineligible', 'blacklisted', 'duplicate']:
            issues.append(entry)
        elif entry['status'] == 'missing':
            issues.append(entry)
        else:
            valid.append(entry)

    cur.close()

    return {
        'valid': valid,
        'issues': issues,
        'target_list': target_list,
        'summary': {
            'total': len(rows),
            'valid': len(valid),
            'issues': len(issues),
        }
    }

def apply_subscription_imports(conn, data):
    cur = conn.cursor(cursor_factory=RealDictCursor)
    applied = 0
    target_list = data.get('target_list', 'JCAD')

    for entry in data.get('entries', []):
        npi = entry.get('npi')
        lists_to_add = [target_list]
        if target_list == 'NPPA':
            lists_to_add.append('JCAD')

        existing = None
        if npi:
            cur.execute("SELECT * FROM print_list_subscribers WHERE npi = %s", (npi,))
            existing = cur.fetchone()

        if existing:
            new_subscribed = existing.get('subscribed_lists', '') or ''
            for l in lists_to_add:
                new_subscribed = add_list(new_subscribed, l)

            cur.execute("""
                UPDATE print_list_subscribers
                SET subscribed_lists = %s, is_subscribed = TRUE, updated_at = NOW(),
                    first_name = COALESCE(%s, first_name), last_name = COALESCE(%s, last_name),
                    degree = COALESCE(%s, degree), email = COALESCE(%s, email),
                    specialty = COALESCE(%s, specialty), company = COALESCE(%s, company)
                WHERE npi = %s
            """, (new_subscribed, entry.get('first_name'), entry.get('last_name'),
                  entry.get('degree'), entry.get('email'), entry.get('specialty'),
                  entry.get('company'), npi))
        else:
            cur.execute("""
                INSERT INTO print_list_subscribers
                (npi, first_name, last_name, degree, email, address_1, city, state, zipcode,
                 specialty, company, subscribed_lists, is_subscribed, subscribe_date, source, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, NOW(), 'subscription_form', NOW(), NOW())
            """, (npi, entry.get('first_name'), entry.get('last_name'), entry.get('degree'),
                  entry.get('email'), entry.get('address_1'), entry.get('city'),
                  entry.get('state'), entry.get('zipcode'), entry.get('specialty'),
                  entry.get('company'), ','.join(lists_to_add)))

        add_activity_log(conn, npi, 'subscription_form', f"Lists: {', '.join(lists_to_add)}")
        applied += 1

    cur.close()
    return applied

@print_lists_bp.route('/blacklist-address', methods=['POST'])
def blacklist_address():
    data = request.json
    address_1 = data.get('address_1', '').strip()
    city = data.get('city', '').strip()
    state = data.get('state', '').strip()
    zipcode = data.get('zipcode', '').strip()
    reason = data.get('reason', '').strip()
    unsubscribe_all = data.get('unsubscribe_all', False)

    if not address_1:
        return jsonify({'error': 'Address is required'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            INSERT INTO blacklisted_addresses (address_1, city, state, zipcode, reason, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (address_1, city, state, zipcode, reason))
        bl_id = cur.fetchone()['id']

        unsubscribed = 0
        if unsubscribe_all:
            norm_addr = normalize_address(address_1)
            cur.execute("""
                SELECT id, npi, subscribed_lists FROM print_list_subscribers
                WHERE UPPER(TRIM(address_1)) = %s AND is_subscribed = TRUE
            """, (norm_addr,))
            matches = cur.fetchall()
            for m in matches:
                cur.execute("""
                    UPDATE print_list_subscribers
                    SET unsubscribed_lists = COALESCE(subscribed_lists, ''),
                        subscribed_lists = NULL, is_subscribed = FALSE,
                        is_address_blacklisted = TRUE,
                        unsubscribe_reason = %s, unsubscribe_date = NOW(), updated_at = NOW()
                    WHERE id = %s
                """, (f'Address blacklisted: {reason}', m['id']))
                add_activity_log(conn, m.get('npi'), 'blacklist_unsubscribe', f"Address blacklisted: {address_1}")
                unsubscribed += 1

        conn.commit()
        cur.close()

        return jsonify({
            'blacklist_id': bl_id,
            'unsubscribed_count': unsubscribed,
            'message': f'Address blacklisted. {unsubscribed} subscribers affected.'
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@print_lists_bp.route('/export/<list_name>', methods=['GET'])
def export_list(list_name):
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT npi, first_name, last_name, degree, email, specialty, company, title,
                   address_1, address_2, city, state, zipcode, country,
                   subscribed_lists, is_comp, subscribe_date, source, notes
            FROM print_list_subscribers
            WHERE subscribed_lists LIKE %s AND is_subscribed = TRUE
            ORDER BY last_name, first_name
        """, (f'%{list_name}%',))
        rows = cur.fetchall()
        cur.close()

        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=rows[0].keys())
            writer.writeheader()
            for row in rows:
                for key in row:
                    if isinstance(row[key], datetime):
                        row[key] = row[key].strftime('%Y-%m-%d')
                writer.writerow(row)

        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename={list_name}_subscribers_{datetime.now().strftime("%Y%m%d")}.csv'}
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@print_lists_bp.route('/activity-log', methods=['GET'])
def get_activity_log():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    offset = (page - 1) * per_page

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("SELECT COUNT(*) as total FROM print_list_activity_log")
        total = cur.fetchone()['total']

        cur.execute("""
            SELECT l.*, s.first_name, s.last_name
            FROM print_list_activity_log l
            LEFT JOIN print_list_subscribers s ON l.npi = s.npi
            ORDER BY l.created_at DESC
            LIMIT %s OFFSET %s
        """, (per_page, offset))
        rows = cur.fetchall()
        cur.close()

        for row in rows:
            for key in row:
                if isinstance(row[key], datetime):
                    row[key] = row[key].isoformat()

        return jsonify({
            'logs': rows,
            'total': total,
            'page': page,
            'total_pages': (total + per_page - 1) // per_page
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@print_lists_bp.route('/import-existing', methods=['POST'])
def import_existing():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    list_name = request.form.get('list', 'JCAD')
    is_comp = request.form.get('is_comp', 'false') == 'true'

    try:
        content = file.read().decode('utf-8', errors='replace')
        reader = csv.DictReader(io.StringIO(content))
        rows = list(reader)
    except Exception as e:
        return jsonify({'error': f'Failed to parse: {str(e)}'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        imported = 0
        updated = 0

        def get_col(row, candidates):
            for c in candidates:
                for key in row:
                    if key.strip().lower().replace(' ', '_').replace('-', '_') == c.lower():
                        return (row[key] or '').strip()
            return ''

        for row in rows:
            npi = get_col(row, ['npi', 'npi_number'])
            first_name = get_col(row, ['first_name', 'firstname', 'first'])
            last_name = get_col(row, ['last_name', 'lastname', 'last'])
            degree = get_col(row, ['degree', 'credential'])
            email = get_col(row, ['email', 'email_address'])
            address = get_col(row, ['address', 'address_1', 'street'])
            city = get_col(row, ['city'])
            state = get_col(row, ['state'])
            zipcode = get_col(row, ['zip', 'zipcode', 'zip_code'])
            specialty = get_col(row, ['specialty'])
            company = get_col(row, ['company', 'organization', 'practice'])

            existing = None
            if npi:
                cur.execute("SELECT id, subscribed_lists FROM print_list_subscribers WHERE npi = %s", (npi,))
                existing = cur.fetchone()

            if existing:
                new_lists = add_list(existing.get('subscribed_lists', '') or '', list_name)
                cur.execute("""
                    UPDATE print_list_subscribers
                    SET subscribed_lists = %s, is_comp = %s, updated_at = NOW()
                    WHERE id = %s
                """, (new_lists, is_comp, existing['id']))
                updated += 1
            else:
                cur.execute("""
                    INSERT INTO print_list_subscribers
                    (npi, first_name, last_name, degree, email, address_1, city, state, zipcode,
                     specialty, company, subscribed_lists, is_subscribed, is_comp, subscribe_date, source, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s, NOW(), 'import', NOW(), NOW())
                """, (npi, first_name, last_name, degree, email, address, city, state, zipcode,
                      specialty, company, list_name, is_comp))
                imported += 1

        conn.commit()
        cur.close()

        return jsonify({
            'imported': imported,
            'updated': updated,
            'total': len(rows),
            'list': list_name,
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()