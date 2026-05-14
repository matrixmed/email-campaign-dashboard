import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("""
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'print_list_subscribers' ORDER BY ordinal_position
""")
print("=== print_list_subscribers columns ===")
for r in cur.fetchall():
    print(f"  {r['column_name']}: {r['data_type']}")

print()
cur.execute("SELECT COUNT(*) AS c FROM print_list_subscribers")
print("Total rows:", cur.fetchone()['c'])

cur.execute("SELECT COUNT(*) AS c FROM print_list_subscribers WHERE is_subscribed = TRUE")
print("Total subscribed:", cur.fetchone()['c'])

cur.execute("SELECT COUNT(*) AS c FROM print_list_subscribers WHERE is_subscribed = FALSE")
print("Total unsubscribed:", cur.fetchone()['c'])

print()
print("=== Subscribed list breakdown (active) ===")
cur.execute("""
    SELECT subscribed_lists, COUNT(*) AS c FROM print_list_subscribers
    WHERE is_subscribed = TRUE GROUP BY subscribed_lists ORDER BY c DESC LIMIT 30
""")
for r in cur.fetchall():
    print(f"  {r['subscribed_lists']}: {r['c']}")

print()
print("=== Counts per list keyword (active) ===")
for kw in ['JCAD', 'NPPA', 'BT']:
    cur.execute("SELECT COUNT(*) AS c FROM print_list_subscribers WHERE subscribed_lists LIKE %s AND is_subscribed = TRUE",
                (f'%{kw}%',))
    print(f"  {kw}: {cur.fetchone()['c']}")

print()
print("=== Counts JCAD + Comp combos ===")
cur.execute("SELECT COUNT(*) AS c FROM print_list_subscribers WHERE subscribed_lists LIKE %s AND is_comp = TRUE AND is_subscribed = TRUE", ('%JCAD%',))
print(f"  JCAD Comp: {cur.fetchone()['c']}")
cur.execute("SELECT COUNT(*) AS c FROM print_list_subscribers WHERE subscribed_lists LIKE %s AND is_comp = TRUE AND is_subscribed = TRUE", ('%BT%',))
print(f"  BT Comp: {cur.fetchone()['c']}")

print()
print("=== Sample active JCAD rows ===")
cur.execute("""
    SELECT npi, first_name, last_name, address_1, city, state, zipcode, subscribed_lists, is_comp
    FROM print_list_subscribers WHERE subscribed_lists LIKE '%JCAD%' AND is_subscribed = TRUE LIMIT 5
""")
for r in cur.fetchall():
    print(f"  {r}")

print()
print("=== Sample unsubscribed_lists values (top 30 distinct) ===")
cur.execute("""
    SELECT unsubscribed_lists, COUNT(*) AS c FROM print_list_subscribers
    WHERE is_subscribed = FALSE AND unsubscribed_lists IS NOT NULL
    GROUP BY unsubscribed_lists ORDER BY c DESC LIMIT 30
""")
for r in cur.fetchall():
    print(f"  '{r['unsubscribed_lists']}': {r['c']}")

print()
print("=== Hot Topics-style unsubscribed_lists (LIKE %Hot%) ===")
cur.execute("""
    SELECT unsubscribed_lists, COUNT(*) AS c FROM print_list_subscribers
    WHERE unsubscribed_lists ILIKE '%hot topics%' OR unsubscribed_lists ILIKE '%anemia%'
      OR unsubscribed_lists ILIKE '%bladder%' OR unsubscribed_lists ILIKE '%breast%'
      OR unsubscribed_lists ILIKE '%CLL%' OR unsubscribed_lists ILIKE '%NSCLC%'
      OR unsubscribed_lists ILIKE '%psoriasis%' OR unsubscribed_lists ILIKE '%alopecia%'
    GROUP BY unsubscribed_lists ORDER BY c DESC LIMIT 40
""")
for r in cur.fetchall():
    print(f"  '{r['unsubscribed_lists']}': {r['c']}")

cur.close()
conn.close()