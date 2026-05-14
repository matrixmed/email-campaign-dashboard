import os
import sys
import json
from datetime import datetime, timezone

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values, RealDictCursor
from dotenv import load_dotenv

load_dotenv()

FULL_LIST_URL = (
    'https://emaildash.blob.core.windows.net/user-data/full_list.csv'
    '?sp=r&st=2025-10-08T18:19:10Z&se=2027-05-21T02:34:10Z&spr=https'
    '&sv=2024-11-04&sr=b&sig=BGZ%2BSLNpeSgDlhirN8o7r6Cm1aiWKIhiPmYa66Q3zQw%3D'
)
MASTER_LIST_NAME = '*Master List'
SOURCE_TAG = 'backfill_initial'
USER_CHUNK = 5000
INSERT_BATCH = 5000


def parse_dt(s):
    if s is None:
        return None
    if isinstance(s, datetime):
        return s
    if isinstance(s, float) and pd.isna(s):
        return None
    s = str(s).strip()
    if not s or s.lower() == 'nan':
        return None
    dt = pd.to_datetime(s, errors='coerce')
    if pd.isna(dt):
        return None
    return dt.to_pydatetime()


def load_dates_from_csv():
    print(f"Loading full_list.csv from Azure (master-list rows are the date source)...")
    cols = ['Email', 'List Name', 'Date Subscribed', 'Date Unsubscribed']
    sample = pd.read_csv(FULL_LIST_URL, nrows=5)
    missing = [c for c in cols if c not in sample.columns]
    if missing:
        raise RuntimeError(f"CSV missing expected columns: {missing}. Got: {sample.columns.tolist()}")

    dates = {}
    n = 0
    for chunk in pd.read_csv(FULL_LIST_URL, usecols=cols, chunksize=50000):
        for _, row in chunk.iterrows():
            email = str(row['Email']).strip().lower()
            if not email or email == 'nan':
                continue
            sub_dt = parse_dt(row.get('Date Subscribed'))
            unsub_dt = parse_dt(row.get('Date Unsubscribed'))
            if email not in dates:
                dates[email] = {'sub': sub_dt, 'unsub': unsub_dt}
            else:
                if sub_dt and (not dates[email]['sub'] or sub_dt < dates[email]['sub']):
                    dates[email]['sub'] = sub_dt
                if unsub_dt and (not dates[email]['unsub'] or unsub_dt > dates[email]['unsub']):
                    dates[email]['unsub'] = unsub_dt
        n += len(chunk)
        print(f"  read {n:,} rows from CSV; unique emails so far: {len(dates):,}")
    print(f"CSV loaded: {len(dates):,} unique emails")
    return dates


def coerce_jsonb_list(val):
    if val is None:
        return []
    if isinstance(val, list):
        return [str(x) for x in val if x]
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, list):
                return [str(x) for x in parsed if x]
        except Exception:
            return []
    return []


def build_events_for_user(user, dates_map):
    email = (user['email'] or '').strip().lower()
    info = dates_map.get(email, {})
    sub_at = info.get('sub') or user['created_at']
    unsub_at = info.get('unsub') or sub_at

    out = []
    uid = user['id']

    for name in coerce_jsonb_list(user['digital_lists_subscribed']):
        dim = 'master' if name == MASTER_LIST_NAME else 'list'
        out.append((uid, email, dim, name, 'added', SOURCE_TAG, None, sub_at))

    for name in coerce_jsonb_list(user['digital_lists_unsubscribed']):
        out.append((uid, email, 'list', f'[unsub] {name}', 'added', SOURCE_TAG, None, unsub_at))

    for name in coerce_jsonb_list(user['ac_tags']):
        out.append((uid, email, 'tag', name, 'added', SOURCE_TAG, None, sub_at))

    for name in coerce_jsonb_list(user['ac_segments']):
        out.append((uid, email, 'segment', name, 'added', SOURCE_TAG, None, sub_at))

    return out


def insert_events_idempotent(conn, rows):
    if not rows:
        return 0
    cur = conn.cursor()
    cur.execute("""
        CREATE TEMP TABLE IF NOT EXISTS _bf_events (
            user_profile_id INTEGER,
            email TEXT,
            dimension TEXT,
            name TEXT,
            event TEXT,
            source TEXT,
            reason TEXT,
            at TIMESTAMP
        ) ON COMMIT DROP
    """)
    cur.execute("TRUNCATE _bf_events")
    execute_values(cur,
        "INSERT INTO _bf_events (user_profile_id, email, dimension, name, event, source, reason, at) VALUES %s",
        rows, page_size=INSERT_BATCH,
    )
    cur.execute("""
        INSERT INTO ac_membership_events
            (user_profile_id, email, dimension, name, event, at, source, reason)
        SELECT t.user_profile_id, t.email, t.dimension, t.name, t.event, t.at, t.source, t.reason
        FROM _bf_events t
        WHERE NOT EXISTS (
            SELECT 1 FROM ac_membership_events e
            WHERE e.user_profile_id = t.user_profile_id
              AND e.dimension = t.dimension
              AND e.name = t.name
              AND e.event = t.event
        )
    """)
    inserted = cur.rowcount
    conn.commit()
    cur.close()
    return inserted


def run(dry_run=False):
    dates_map = load_dates_from_csv()

    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT COUNT(*) AS c FROM user_profiles WHERE email IS NOT NULL")
    total_users = cur.fetchone()['c']
    print(f"Scanning {total_users:,} user_profiles rows...")

    cur.execute("""
        SELECT id, email, created_at,
               digital_lists_subscribed, digital_lists_unsubscribed,
               ac_tags, ac_segments
        FROM user_profiles
        WHERE email IS NOT NULL
        ORDER BY id
    """)

    total_events_built = 0
    total_inserted = 0
    users_seen = 0
    pending = []

    while True:
        users = cur.fetchmany(USER_CHUNK)
        if not users:
            break
        for u in users:
            users_seen += 1
            pending.extend(build_events_for_user(u, dates_map))

        total_events_built += len(pending)
        if dry_run:
            print(f"  [dry-run] users={users_seen:,}/{total_users:,} events_built={total_events_built:,}")
            pending = []
            continue

        ins = insert_events_idempotent(conn, pending)
        total_inserted += ins
        print(f"  users={users_seen:,}/{total_users:,} batch_events={len(pending):,} inserted={ins:,} cumulative={total_inserted:,}")
        pending = []

    cur.close()
    conn.close()
    print(f"\nDone. users_processed={users_seen:,} events_built={total_events_built:,} inserted={total_inserted:,}")


if __name__ == '__main__':
    dry = '--dry-run' in sys.argv
    if dry:
        print(">>> DRY RUN — no DB writes <<<")
    run(dry_run=dry)