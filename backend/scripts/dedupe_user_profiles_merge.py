import os
import sys
import time
from collections import defaultdict

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL') or \
    'postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill?sslmode=require'

SCALAR_PREFERRED = [
    'contact_id', 'first_name', 'last_name', 'npi', 'specialty', 'degree',
    'address', 'city', 'state', 'zipcode', 'country',
    'old_state', 'old_zipcode',
    'inactive_reason', 'inactive_source',
    'unsubscribe_reason',
]
JSONB_ARRAY_COLS = [
    'digital_lists_subscribed', 'digital_lists_unsubscribed',
    'ac_tags', 'ac_segments',
    'print_lists_subscribed', 'print_lists_unsubscribed',
    'target_lists', 'address_history',
]


def get_existing_columns(cur):
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'user_profiles'
    """)
    return {r[0] for r in cur.fetchall()}


def fetch_duplicate_groups(cur):
    cur.execute("""
        SELECT LOWER(TRIM(email)) AS e
        FROM user_profiles
        WHERE email IS NOT NULL AND email <> ''
        GROUP BY 1
        HAVING COUNT(*) > 1
        ORDER BY 1
    """)
    return [r[0] for r in cur.fetchall()]


def fetch_rows_for_email(cur, email_lc, present_cols):
    cols = ['id', 'email', 'is_active', 'created_at', 'updated_at',
            'inactive_at'] + SCALAR_PREFERRED + JSONB_ARRAY_COLS
    cols = [c for c in cols if c in present_cols]
    col_list = ', '.join(cols)
    cur.execute(
        f"""SELECT {col_list} FROM user_profiles
            WHERE LOWER(TRIM(email)) = %s
            ORDER BY id ASC""",
        (email_lc,),
    )
    return cur.fetchall(), cols


def merge_rows(rows, cols):
    if not rows:
        return None
    winner = dict(rows[0])
    losers = [dict(r) for r in rows[1:]]
    all_rows = [winner] + losers
    merged = dict(winner)

    for col in SCALAR_PREFERRED:
        if col not in cols:
            continue
        if merged.get(col) in (None, '', 'nan', 'NaN'):
            for src in losers:
                v = src.get(col)
                if v not in (None, '', 'nan', 'NaN'):
                    merged[col] = v
                    break

    for col in JSONB_ARRAY_COLS:
        if col not in cols:
            continue
        seen = []
        for src in all_rows:
            v = src.get(col) or []
            if isinstance(v, str):
                try:
                    import json as _json
                    v = _json.loads(v) or []
                except Exception:
                    v = []
            for item in v:
                if item not in seen:
                    seen.append(item)
        merged[col] = seen

    if 'created_at' in cols:
        created_values = [r.get('created_at') for r in all_rows if r.get('created_at') is not None]
        merged['created_at'] = min(created_values) if created_values else None

    if 'inactive_at' in cols:
        inactive_values = [r.get('inactive_at') for r in all_rows if r.get('inactive_at') is not None]
        merged['inactive_at'] = max(inactive_values) if inactive_values else None

    merged_subs = merged.get('digital_lists_subscribed') or []
    merged['is_active'] = len(merged_subs) > 0
    if merged['is_active']:
        if 'inactive_reason' in cols:
            merged['inactive_reason'] = None
        if 'inactive_source' in cols:
            merged['inactive_source'] = None
        if 'inactive_at' in cols:
            merged['inactive_at'] = None

    merged['email'] = (merged.get('email') or '').strip().lower()
    return winner, losers, merged


def apply_merge(conn, winner, losers, merged, cols):
    cur = conn.cursor()
    import json as _json

    loser_ids = [l['id'] for l in losers]
    if loser_ids:
        cur.execute(
            "UPDATE ac_membership_events SET user_profile_id = %s WHERE user_profile_id = ANY(%s)",
            (winner['id'], loser_ids),
        )
        cur.execute("DELETE FROM user_profiles WHERE id = ANY(%s)", (loser_ids,))

    sets = []
    params = []
    for col in SCALAR_PREFERRED + ['email']:
        if col in cols:
            sets.append(f"{col} = %s")
            params.append(merged.get(col))
    for col in JSONB_ARRAY_COLS:
        if col in cols:
            sets.append(f"{col} = %s::jsonb")
            params.append(_json.dumps(merged.get(col) or []))
    if 'created_at' in cols:
        sets.append("created_at = %s")
        params.append(merged.get('created_at'))
    if 'inactive_at' in cols:
        sets.append("inactive_at = %s")
        params.append(merged.get('inactive_at'))
    sets.append("is_active = %s")
    params.append(bool(merged.get('is_active')))
    sets.append("updated_at = NOW()")
    params.append(winner['id'])

    cur.execute(f"UPDATE user_profiles SET {', '.join(sets)} WHERE id = %s", params)
    cur.close()


def run(dry_run):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    present_cols = get_existing_columns(cur)
    groups = fetch_duplicate_groups(cur)
    total_groups = len(groups)
    print(f'duplicate-email groups: {total_groups:,}')
    cur.close()

    if dry_run:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        sample = groups[:5]
        for email_lc in sample:
            rows, cols = fetch_rows_for_email(cur, email_lc, present_cols)
            _, losers, merged = merge_rows(rows, cols)
            print(f'  {email_lc}: {len(rows)} rows -> 1 row; merged subs={len(merged["digital_lists_subscribed"])}, tags={len(merged.get("ac_tags") or [])}, segs={len(merged.get("ac_segments") or [])}, is_active={merged["is_active"]}, would_delete_ids={[l["id"] for l in losers]}')
        cur.close()
        # Estimate row reduction
        cur = conn.cursor()
        cur.execute("""
            SELECT COUNT(*) - COUNT(DISTINCT LOWER(TRIM(email)))
            FROM user_profiles WHERE email IS NOT NULL AND email <> ''
        """)
        excess = cur.fetchone()[0]
        cur.close()
        print(f'\n[dry-run] rows that would be deleted (merged-into-winner): ~{excess:,}')
        print('[dry-run] no DB writes performed')
        conn.close()
        return

    started = time.time()
    success = 0
    failed = 0
    rows_deleted = 0
    cur = conn.cursor(cursor_factory=RealDictCursor)
    for i, email_lc in enumerate(groups, 1):
        for retry in range(3):
            try:
                rows, cols = fetch_rows_for_email(cur, email_lc, present_cols)
                if len(rows) < 2:
                    break
                winner, losers, merged = merge_rows(rows, cols)
                apply_merge(conn, winner, losers, merged, cols)
                conn.commit()
                success += 1
                rows_deleted += len(losers)
                break
            except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
                print(f'  [conn lost {email_lc}] reconnecting: {e}', flush=True)
                try: conn.close()
                except Exception: pass
                conn = None
                for reconnect_try in range(10):
                    try:
                        time.sleep(min(2 ** reconnect_try, 60))
                        conn = psycopg2.connect(DATABASE_URL, connect_timeout=30)
                        cur = conn.cursor(cursor_factory=RealDictCursor)
                        print(f'  [reconnected after {reconnect_try+1} tries]', flush=True)
                        break
                    except Exception as recon_err:
                        print(f'  [reconnect attempt {reconnect_try+1} failed: {recon_err}]', flush=True)
                if conn is None:
                    print(f'  [could not reconnect after 10 tries; aborting cleanly]', flush=True)
                    raise SystemExit(2)
            except Exception as e:
                conn.rollback()
                failed += 1
                print(f'  FAILED {email_lc}: {e}', flush=True)
                break
        if i % 500 == 0:
            elapsed = time.time() - started
            rate = i / max(elapsed, 0.001)
            eta = (total_groups - i) / max(rate, 0.001)
            print(f'  {i:,}/{total_groups:,} groups; merged={success:,} failed={failed:,} deleted={rows_deleted:,} eta={eta:.0f}s', flush=True)
    cur.close()
    print(f'\nDONE in {time.time()-started:.0f}s: merged_groups={success:,} failed_groups={failed:,} rows_deleted={rows_deleted:,}', flush=True)
    conn.close()


if __name__ == '__main__':
    dry = '--dry-run' in sys.argv
    if dry:
        print('>>> DRY RUN — no DB writes <<<')
    run(dry_run=dry)