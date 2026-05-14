import os
import json
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

import psycopg2
from psycopg2.extras import RealDictCursor

EXPECTED_UPDATES = [
    ('1891174397', 'RENNY', 'ABRAHAM', '6340 BURBANK WAY', 'PLANO', 'TX', '75024'),
    ('1922404367', 'ARINDAM', 'BAGCHI', '10323 WADING HERON DR', 'ARLINGTON', 'TN', '38002'),
    ('1598177255', 'AUNG', 'BAJAJ', '8671 N IRONWOOD RESERVE WAY', 'TUCSON', 'AZ', '85743'),
    ('1154315877', 'MARK', 'BYRON', '825 S 1ST ST', 'JESUP', 'GA', '31545'),
    ('1861425829', 'SARAH', 'CONLON', '4545 W BRAIDED REIN', 'FLAGSTAFF', 'AZ', '86005'),
    ('1891959292', 'ANTHONY', 'CORCORAN', '1111 FRANKLIN AVE # 3C', 'GARDEN CITY', 'NY', '11530'),
    ('1952524274', 'CHRISTOPHER', 'DIBLASIO', '6321 DANIELS PKWY STE 200', 'FORT MYERS', 'FL', '33912'),
    ('1487093274', 'HEIDI', 'EGLOFF', '3069 RAILWAY DR SW', 'BYRON CENTER', 'MI', '49315'),
    ('1518006543', 'MOHAMMAD', 'FEKRAZAD', '27127 BACKDROP LN', 'VALENCIA', 'CA', '91381'),
    ('1700847464', 'LEONARDO', 'FORERO', '1826 POINT WEST PKWY', 'AMARILLO', 'TX', '79124'),
    ('1205156585', 'SARAH', 'FRIEND', '4512 CHARDONNAY CT', 'ATLANTA', 'GA', '30338'),
    ('1043233760', 'ELLSWORTH', 'GRANT', '1127 WILSHIRE BLVD STE 900', 'LOS ANGELES', 'CA', '90017'),
    ('1104894435', 'JOHN', 'HAJJAR', '680 KINDERKAMACK RD STE 300', 'ORADELL', 'NJ', '07649'),
    ('1326485202', 'KRISTOPHER', 'HANSEN', '27 CAMPBELL AVE SW', 'ROANOKE', 'VA', '24011'),
    ('1629426705', 'ROBERT', 'HORN', '1907 CAPELLA CRK', 'SAN ANTONIO', 'TX', '78260'),
    ('1609302017', 'ANDREW', 'ISKANDAR', '6 FOREST HILL DR', 'CHERRY HILL', 'NJ', '08003'),
    ('1467426320', 'MADHURI', 'KADIYALA', '207 CALLE DIAMANTE', 'SEDONA', 'AZ', '86336'),
    ('1295927739', 'ANDREA', 'KATZ', '1680 S CENTRAL BLVD STE 112', 'JUPITER', 'FL', '33458'),
    ('1255610473', 'DANIEL', 'KOBRINSKI', '700 3RD ST STE 302', 'NEPTUNE BEACH', 'FL', '32266'),
    ('1861590689', 'ARVIND', 'KUMAR', '17495 LA GRANGE RD', 'TINLEY PARK', 'IL', '60487'),
    ('1841653425', 'MATTHEW', 'LABRIOLA', '306 BARRINGTON OVERLOOK DR', 'DURHAM', 'NC', '27703'),
    ('1285803528', 'ERICA', 'LAMBERT', '209 ARLINGTON AVE', 'LINWOOD', 'NJ', '08221'),
    ('1912350596', 'GILBERTO', 'LOPES', '928 CAPTIVA DR', 'HOLLYWOOD', 'FL', '33019'),
    ('1568967149', 'RUOYU', 'MIAO', '1098 CENTRAL PARK RD', 'DECATUR', 'GA', '30033'),
    ('1043384035', 'MAJID', 'MIKHAIL', '724 KILBURN RD', 'WILMINGTON', 'DE', '19803'),
    ('1972766772', 'FOLUSO', 'OGUNLEYE', '2512 ELDERBERRY LN', 'CARLSBAD', 'CA', '92008'),
    ('1346635679', 'GRIGORI', 'OKOEV', '2939 POLAND SPRINGS DR', 'ELLICOTT CITY', 'MD', '21042'),
    ('1306065446', 'TAYLOR', 'ORTIZ', '15 OAK MEADOW RD', 'LINCOLN', 'MA', '01773'),
    ('1033292685', 'ATULKUMAR', 'PATEL', '384 VINCA CIR NW', 'KENNESAW', 'GA', '30144'),
    ('1497740054', 'ANASTAS', 'PROVATAS', '111 17TH AVE E', 'ALEXANDRIA', 'MN', '56308'),
    ('1588661490', 'MOHAMMED', 'QURAISHI', 'PO BOX 591056', 'HOUSTON', 'TX', '77259'),
    ('1538269394', 'JEYANTHI', 'RAMANARAYANAN', '1402 28TH AVENUE CT', 'MILTON', 'WA', '98354'),
    ('1972627446', 'SRINI', 'REDDY', '1826 POINT WEST PKWY', 'AMARILLO', 'TX', '79124'),
    ('1578645057', 'SUNIL', 'REDDY', '3974 LONESOME PINE RD', 'REDWOOD CITY', 'CA', '94061'),
    ('1245281179', 'TERRENCE', 'REGAN', '61 MEMORIAL MEDICAL PKWY STE 3803', 'PALM COAST', 'FL', '32164'),
    ('1447403076', 'MARY', 'SEHL', '16820 EDGAR ST', 'PACIFIC PALISADES', 'CA', '90272'),
    ('1477591709', 'HENRY', 'SHAPIRO', '1680 S CENTRAL BLVD STE 112', 'JUPITER', 'FL', '33458'),
    ('1861996076', 'AVANI', 'SINGH', '1170 GULF BLVD APT 605', 'CLEARWATER BEACH', 'FL', '33767'),
    ('1265502876', 'PRIYA', 'SINGH', '11672 ALDERHILL TER', 'SAN DIEGO', 'CA', '92131'),
    ('1720171259', 'ORRENZO', 'SNYDER', '987 TURTLE SHELL LN', 'MESQUITE', 'NV', '89027'),
    ('1750745360', 'RAFEE', 'TALUKDER', '24447 GLEAMING GLEN CT', 'KATY', 'TX', '77493'),
    ('1558358630', 'EDIT', 'TOLNAI', '1680 S CENTRAL BLVD STE 112', 'JUPITER', 'FL', '33458'),
    ('1205938115', 'JEN-CHIN', 'WANG', '20 BRISTOL DR', 'MANHASSET', 'NY', '11030'),
    ('1699921734', 'IRIM', 'YASIN', '15009 GAILLARDIA LN', 'OKLAHOMA CITY', 'OK', '73142'),
]

EXPECTED_UNDELV = [
    ('1023111572', 'AKM', 'HOSSAIN'),
    ('1578529731', 'PAUL', 'NEUSTEIN'),
]


def addr_match(db_val, target):
    if not db_val:
        return False
    return target.upper().strip().replace('.', '').replace(',', '') in db_val.upper().strip().replace('.', '').replace(',', '')


conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor(cursor_factory=RealDictCursor)

print('=' * 80)
print('ADDRESS UPDATES — verifying cascade across all tables')
print('=' * 80)

success = 0
fail = []

for npi, fn, ln, new_addr, new_city, new_state, new_zip in EXPECTED_UPDATES:
    cur.execute("""
        SELECT id, first_name, last_name, practice_address_1, practice_city, practice_state,
               mailing_address_1, mailing_city, mailing_state,
               old_practice_address_1, old_mailing_address_1,
               COALESCE(jsonb_array_length(address_history), 0) AS hist_n,
               (SELECT e->>'event' FROM jsonb_array_elements(COALESCE(address_history, '[]'::jsonb)) e
                WHERE e->>'event' = 'address_update'
                ORDER BY e->>'changed_at' DESC LIMIT 1) AS last_event,
               (SELECT e->>'source' FROM jsonb_array_elements(COALESCE(address_history, '[]'::jsonb)) e
                WHERE e->>'event' = 'address_update'
                ORDER BY e->>'changed_at' DESC LIMIT 1) AS last_source
        FROM universal_profiles WHERE npi = %s
    """, (npi,))
    up = cur.fetchone()

    cur.execute("""
        SELECT id, first_name, last_name, address, city, state,
               COALESCE(jsonb_array_length(address_history), 0) AS hist_n,
               (SELECT e->>'event' FROM jsonb_array_elements(COALESCE(address_history, '[]'::jsonb)) e
                WHERE e->>'event' = 'address_update'
                ORDER BY e->>'changed_at' DESC LIMIT 1) AS last_event,
               (SELECT e->>'source' FROM jsonb_array_elements(COALESCE(address_history, '[]'::jsonb)) e
                WHERE e->>'event' = 'address_update'
                ORDER BY e->>'changed_at' DESC LIMIT 1) AS last_source
        FROM user_profiles WHERE npi = %s
    """, (npi,))
    u_list = cur.fetchall()

    cur.execute("""
        SELECT id, first_name, last_name, address, city, state,
               COALESCE(jsonb_array_length(address_history), 0) AS hist_n
        FROM print_only_contacts WHERE npi = %s
    """, (npi,))
    p_list = cur.fetchall()

    issues = []

    up_matched_practice = up and addr_match(up['practice_address_1'], new_addr)
    up_matched_mailing = up and addr_match(up['mailing_address_1'], new_addr)
    up_matched = up_matched_practice or up_matched_mailing

    u_matched_any = any(addr_match(r['address'], new_addr) for r in u_list)
    u_history_any = any(r['hist_n'] > 0 and r['last_event'] == 'address_update' for r in u_list)

    if up and not up_matched:
        issues.append(f"UP#{up['id']} address NOT updated: practice={up['practice_address_1']!r} mail={up['mailing_address_1']!r}")
    if up and up['hist_n'] == 0:
        issues.append(f"UP#{up['id']} address_history is EMPTY")

    if u_list and not u_matched_any:
        issues.append(f"user_profiles addresses NOT updated: {[(r['id'], r['address']) for r in u_list]}")
    if u_list and not u_history_any:
        issues.append(f"user_profiles address_history NOT recorded for any row")

    if not up and not u_list:
        issues.append("NO record found in universal_profiles OR user_profiles by NPI")

    if issues:
        fail.append({'name': f'{fn} {ln}', 'npi': npi, 'issues': issues})
    else:
        success += 1

print(f'\nSUCCESS: {success}/{len(EXPECTED_UPDATES)}')
if fail:
    print(f'\nFAILED ({len(fail)}):')
    for f in fail:
        print(f"\n  {f['name']} (NPI {f['npi']}):")
        for iss in f['issues']:
            print(f"    - {iss}")

print()
print('=' * 80)
print('UNDELIVERABLES — verifying flag + cascade')
print('=' * 80)

for npi, fn, ln in EXPECTED_UNDELV:
    print(f'\n--- {fn} {ln} (NPI {npi}) ---')
    cur.execute("""
        SELECT id, is_active, provider_status, provider_status_source, unsubscribe_reason,
               COALESCE(jsonb_array_length(address_history), 0) AS hist_n,
               (SELECT e->>'event' FROM jsonb_array_elements(COALESCE(address_history, '[]'::jsonb)) e
                WHERE e->>'event' = 'undeliverable'
                ORDER BY e->>'changed_at' DESC LIMIT 1) AS last_event,
               (SELECT e->>'source' FROM jsonb_array_elements(COALESCE(address_history, '[]'::jsonb)) e
                WHERE e->>'event' = 'undeliverable'
                ORDER BY e->>'changed_at' DESC LIMIT 1) AS last_source
        FROM universal_profiles WHERE npi = %s
    """, (npi,))
    up = cur.fetchone()
    if up:
        print(f"  UP#{up['id']}: is_active={up['is_active']} status={up['provider_status']} src={up['provider_status_source']} reason={up['unsubscribe_reason']!r} hist_n={up['hist_n']} last_event={up['last_event']} src_in_hist={up['last_source']}")

    cur.execute("""
        SELECT id, is_active, inactive_reason, inactive_source, inactive_at, unsubscribe_reason,
               COALESCE(jsonb_array_length(address_history), 0) AS hist_n,
               (SELECT e->>'event' FROM jsonb_array_elements(COALESCE(address_history, '[]'::jsonb)) e
                WHERE e->>'event' = 'undeliverable'
                ORDER BY e->>'changed_at' DESC LIMIT 1) AS last_event
        FROM user_profiles WHERE npi = %s
    """, (npi,))
    for u in cur.fetchall():
        print(f"  U#{u['id']}:  is_active={u['is_active']} inactive_reason={u['inactive_reason']!r} src={u['inactive_source']} hist_n={u['hist_n']} last_event={u['last_event']}")

    cur.execute("""
        SELECT id, is_active, unsubscribe_reason,
               COALESCE(jsonb_array_length(address_history), 0) AS hist_n
        FROM print_only_contacts WHERE npi = %s
    """, (npi,))
    for p in cur.fetchall():
        print(f"  POC#{p['id']}: is_active={p['is_active']} reason={p['unsubscribe_reason']!r} hist_n={p['hist_n']}")

conn.close()