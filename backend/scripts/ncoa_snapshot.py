import os
import json
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

import psycopg2
from psycopg2.extras import RealDictCursor

PEOPLE = [
    ('RENNY', 'ABRAHAM'), ('ARINDAM', 'BAGCHI'), ('AUNG', 'BAJAJ'),
    ('KAREN', 'BOSSOLT LO RUSSO'), ('MARK', 'BYRON'), ('SARAH', 'CONLON'),
    ('ANTHONY', 'CORCORAN'), ('CHRISTOPHER', 'DIBLASIO'), ('DAVID', 'DRAPER'),
    ('HEIDI', 'EGLOFF'), ('MOHAMMAD', 'FEKRAZAD'), ('GORDON', 'FIFER'),
    ('LEONARDO', 'FORERO'), ('SARAH', 'FRIEND'), ('ELLSWORTH', 'GRANT'),
    ('JOHN', 'HAJJAR'), ('KRISTOPHER', 'HANSEN'), ('ROBERT', 'HORN'),
    ('AKM', 'HOSSAIN'), ('ANDREW', 'ISKANDAR'), ('SRINIVAS', 'JUJJAVARAPU'),
    ('MADHURI', 'KADIYALA'), ('ANDREA', 'KATZ'), ('DANIEL', 'KOBRINSKI'),
    ('ARVIND', 'KUMAR'), ('MATTHEW', 'LABRIOLA'), ('ERICA', 'LAMBERT'),
    ('GILBERTO', 'LOPES'), ('RUOYU', 'MIAO'), ('MAJID', 'MIKHAIL'),
    ('PAUL', 'NEUSTEIN'), ('FOLUSO', 'OGUNLEYE'), ('GRIGORI', 'OKOEV'),
    ('TAYLOR', 'ORTIZ'), ('ATULKUMAR', 'PATEL'), ('MOHAMAD', 'PAZOOKI'),
    ('ANASTAS', 'PROVATAS'), ('MOHAMMED', 'QURAISHI'),
    ('JEYANTHI', 'RAMANARAYANAN'), ('SRINI', 'REDDY'), ('SUNIL', 'REDDY'),
    ('TERRENCE', 'REGAN'), ('MARY', 'SEHL'), ('HENRY', 'SHAPIRO'),
    ('AVANI', 'SINGH'), ('PRIYA', 'SINGH'), ('ORRENZO', 'SNYDER'),
    ('MARK', 'STONE'), ('RAFEE', 'TALUKDER'), ('EDIT', 'TOLNAI'),
    ('JEN-CHIN', 'WANG'), ('IRIM', 'YASIN'),
]

last_names = list({ln for _, ln in PEOPLE})

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("""
    SELECT id, npi, first_name, last_name,
           practice_address_1, practice_city, practice_state, practice_zipcode,
           mailing_address_1, mailing_city, mailing_state, mailing_zipcode,
           provider_status, provider_status_source, is_active,
           COALESCE(jsonb_array_length(address_history), 0) AS hist_n
    FROM universal_profiles
    WHERE UPPER(TRIM(last_name)) = ANY(%s)
""", (last_names,))
up_rows = cur.fetchall()

cur.execute("""
    SELECT id, npi, first_name, last_name, address, city, state, zipcode, is_active,
           inactive_reason, inactive_source,
           COALESCE(jsonb_array_length(address_history), 0) AS hist_n
    FROM user_profiles
    WHERE UPPER(TRIM(last_name)) = ANY(%s)
""", (last_names,))
u_rows = cur.fetchall()

cur.execute("""
    SELECT id, npi, first_name, last_name, address, city, state, zipcode, is_active,
           print_lists_subscribed
    FROM print_only_contacts
    WHERE UPPER(TRIM(last_name)) = ANY(%s)
""", (last_names,))
p_rows = cur.fetchall()

cur.execute("""
    SELECT id, npi, first_name, last_name, address_1, city, state, zipcode,
           subscribed_lists, is_subscribed, is_comp
    FROM print_list_subscribers
    WHERE UPPER(TRIM(last_name)) = ANY(%s)
""", (last_names,))
pls_rows = cur.fetchall()

snapshot = {}
for fn, ln in PEOPLE:
    key = f'{fn} {ln}'
    snapshot[key] = {
        'universal_profiles': [dict(r) for r in up_rows
                                if (r['first_name'] or '').upper() == fn and (r['last_name'] or '').upper() == ln],
        'user_profiles': [dict(r) for r in u_rows
                           if (r['first_name'] or '').upper() == fn and (r['last_name'] or '').upper() == ln],
        'print_only_contacts': [dict(r) for r in p_rows
                                 if (r['first_name'] or '').upper() == fn and (r['last_name'] or '').upper() == ln],
        'print_list_subscribers': [dict(r) for r in pls_rows
                                    if (r['first_name'] or '').upper() == fn and (r['last_name'] or '').upper() == ln],
    }

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ncoa_before_snapshot.json')
with open(out, 'w') as f:
    json.dump(snapshot, f, indent=2, default=str)

matched_up = sum(1 for v in snapshot.values() if v['universal_profiles'])
matched_u = sum(1 for v in snapshot.values() if v['user_profiles'])
matched_p = sum(1 for v in snapshot.values() if v['print_only_contacts'])
matched_pls = sum(1 for v in snapshot.values() if v['print_list_subscribers'])
print(f'matched universal_profiles:   {matched_up}/{len(PEOPLE)}')
print(f'matched user_profiles:        {matched_u}/{len(PEOPLE)}')
print(f'matched print_only_contacts:  {matched_p}/{len(PEOPLE)}')
print(f'matched print_list_subscribers:{matched_pls}/{len(PEOPLE)}')
print()
print('No DB match anywhere:')
for k, v in snapshot.items():
    if not (v['universal_profiles'] or v['user_profiles'] or v['print_only_contacts'] or v['print_list_subscribers']):
        print(f'  {k}')
print()
print('Snapshot:', out)
conn.close()