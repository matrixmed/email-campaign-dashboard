import os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'routes'))
os.environ.setdefault('DATABASE_URL','postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill')
from db_pool import init_pool, get_db_connection
from psycopg2.extras import RealDictCursor
init_pool(min_conn=1, max_conn=3)

def timed(label, fn):
    t0 = time.time()
    try:
        result = fn()
        print(f"[{label}] OK in {time.time()-t0:.2f}s")
        return result
    except Exception as e:
        print(f"[{label}] FAIL in {time.time()-t0:.2f}s: {e}")
        return None

print("=" * 70)
print("TEST 1: Timing Intelligence (no filters, default 6mo)")
print("=" * 70)
def timing_no_filter():
    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SET LOCAL statement_timeout = '60s'")
        cur.execute("""
            SELECT
                EXTRACT(HOUR FROM ci.timestamp)::int AS hour,
                EXTRACT(DOW  FROM ci.timestamp)::int AS dow,
                COUNT(*) FILTER (WHERE ci.event_type = 'open') AS opens,
                COUNT(*) FILTER (WHERE ci.event_type = 'sent') AS sends
            FROM campaign_interactions ci
            WHERE ci.event_type IN ('open','sent')
              AND ci.timestamp >= NOW() - INTERVAL '6 months'
            GROUP BY 1, 2
        """)
        rows = cur.fetchall()
        total_opens = sum(int(r['opens'] or 0) for r in rows)
        total_sends = sum(int(r['sends'] or 0) for r in rows)
        return {'rows': len(rows), 'total_opens': total_opens, 'total_sends': total_sends}
r = timed("timing_no_filter", timing_no_filter)
print(f"  -> {r}")

print()
print("=" * 70)
print("TEST 2: Timing with specialty filter (1 specialty)")
print("=" * 70)
def timing_with_specialty():
    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SET LOCAL statement_timeout = '60s'")
        cur.execute("""
            SELECT specialty, COUNT(*) as n
            FROM user_profiles
            WHERE specialty IS NOT NULL AND specialty != ''
            GROUP BY specialty
            ORDER BY n DESC
            LIMIT 3
        """)
        specs = [r['specialty'] for r in cur.fetchall()]
        print(f"  Top specialties: {specs}")
        cur.execute("""
            SELECT
                EXTRACT(HOUR FROM ci.timestamp)::int AS hour,
                EXTRACT(DOW  FROM ci.timestamp)::int AS dow,
                COUNT(*) FILTER (WHERE ci.event_type = 'open') AS opens,
                COUNT(*) FILTER (WHERE ci.event_type = 'sent') AS sends
            FROM campaign_interactions ci
            INNER JOIN user_profiles up ON up.email = LOWER(ci.email)
            WHERE ci.event_type IN ('open','sent')
              AND ci.timestamp >= NOW() - INTERVAL '6 months'
              AND up.specialty = %s
            GROUP BY 1, 2
        """, (specs[0],))
        rows = cur.fetchall()
        return {'rows': len(rows), 'sum_opens': sum(int(r['opens'] or 0) for r in rows)}
r = timed("timing_with_specialty", timing_with_specialty)
print(f"  -> {r}")

print()
print("=" * 70)
print("TEST 3: Timing time-to-open query")
print("=" * 70)
def time_to_open():
    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SET LOCAL statement_timeout = '60s'")
        cur.execute("""
            WITH first_events AS (
                SELECT
                    ci.email,
                    ci.campaign_id,
                    MIN(ci.timestamp) FILTER (WHERE ci.event_type = 'sent') AS sent_time,
                    MIN(ci.timestamp) FILTER (WHERE ci.event_type = 'open') AS open_time
                FROM campaign_interactions ci
                WHERE ci.event_type IN ('sent','open')
                  AND ci.timestamp >= NOW() - INTERVAL '6 months'
                GROUP BY ci.email, ci.campaign_id
                HAVING MIN(ci.timestamp) FILTER (WHERE ci.event_type = 'sent') IS NOT NULL
                   AND MIN(ci.timestamp) FILTER (WHERE ci.event_type = 'open') IS NOT NULL
            )
            SELECT EXTRACT(EPOCH FROM (open_time - sent_time))/3600 AS hours_to_open
            FROM first_events
            WHERE open_time > sent_time
            LIMIT 5
        """)
        rows = cur.fetchall()
        return {'sample_rows': len(rows), 'sample_hours': [float(r['hours_to_open']) for r in rows]}
r = timed("time_to_open", time_to_open)
print(f"  -> {r}")

print()
print("=" * 70)
print("TEST 4: Geographic-main - state aggregate (core path)")
print("=" * 70)
def geo_state():
    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SET LOCAL statement_timeout = '60s'")
        cur.execute("""
            SELECT
                LEFT(REGEXP_REPLACE(zipcode, '[^0-9]', '', 'g'), 3) as zip_prefix,
                COUNT(*) as count
            FROM user_profiles
            WHERE zipcode IS NOT NULL AND zipcode != ''
              AND LENGTH(REGEXP_REPLACE(zipcode, '[^0-9]', '', 'g')) >= 5
            GROUP BY LEFT(REGEXP_REPLACE(zipcode, '[^0-9]', '', 'g'), 3)
        """)
        rows = cur.fetchall()
        return {'zip_prefixes': len(rows), 'total_audience': sum(r['count'] for r in rows)}
r = timed("geo_state", geo_state)
print(f"  -> {r}")

print()
print("=" * 70)
print("TEST 5: Geographic-main - engaged state (LOWER join, the slow one)")
print("=" * 70)
def geo_engaged():
    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SET LOCAL statement_timeout = '60s'")
        cur.execute("""
            SELECT
                LEFT(REGEXP_REPLACE(up.zipcode, '[^0-9]', '', 'g'), 3) as zip_prefix,
                COUNT(DISTINCT up.email) as count
            FROM user_profiles up
            INNER JOIN campaign_interactions ci ON LOWER(up.email) = ci.email
            WHERE up.zipcode IS NOT NULL AND up.zipcode != ''
              AND LENGTH(REGEXP_REPLACE(up.zipcode, '[^0-9]', '', 'g')) >= 5
              AND ci.event_type = 'open'
            GROUP BY LEFT(REGEXP_REPLACE(up.zipcode, '[^0-9]', '', 'g'), 3)
        """)
        rows = cur.fetchall()
        return {'engaged_zip_prefixes': len(rows), 'total_engaged': sum(r['count'] for r in rows)}
r = timed("geo_engaged", geo_engaged)
print(f"  -> {r}")

print()
print("=" * 70)
print("TEST 6: Geographic-custom - never_opened (NEW NOT EXISTS path)")
print("=" * 70)
def geo_never():
    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SET LOCAL statement_timeout = '60s'")
        cur.execute("""
            SELECT COUNT(*) as cnt
            FROM user_profiles up
            WHERE up.zipcode IS NOT NULL AND up.zipcode != ''
              AND NOT EXISTS (
                  SELECT 1 FROM campaign_interactions ci
                  WHERE ci.email = LOWER(up.email) AND ci.event_type = 'open'
              )
        """)
        return cur.fetchone()
r = timed("geo_never_opened", geo_never)
print(f"  -> {r}")

print()
print("=" * 70)
print("DONE")
print("=" * 70)