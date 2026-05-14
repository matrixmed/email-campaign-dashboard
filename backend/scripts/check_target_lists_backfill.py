import os
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL') or 'postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill'

engine = create_engine(DATABASE_URL)

def main():
    with engine.connect() as conn:
        print("=" * 80)
        print("Recent CMI metadata uploads (last 10)")
        print("=" * 80)
        rows = conn.execute(text("""
            SELECT campaign_id, campaign_name, target_list_id, uploaded_at, updated_at
            FROM campaign_reporting_metadata
            ORDER BY GREATEST(COALESCE(updated_at, uploaded_at), COALESCE(uploaded_at, updated_at)) DESC
            LIMIT 10
        """)).mappings().all()

        for r in rows:
            print(f"  uploaded={r['uploaded_at']}  updated={r['updated_at']}")
            print(f"    campaign_id   = {r['campaign_id']}")
            print(f"    campaign_name = {r['campaign_name']}")
            print(f"    target_list_id= {r['target_list_id']}")
            print()

        print("=" * 80)
        print("Target list backfill — match counts per recent campaign")
        print("=" * 80)
        for r in rows:
            cid = r['campaign_id']
            pattern = f'%"campaign_id": "{cid}"%'

            u = conn.execute(text(
                "SELECT COUNT(*) FROM universal_profiles WHERE target_lists::text LIKE :p"
            ), {'p': pattern}).scalar()

            usr = conn.execute(text(
                "SELECT COUNT(*) FROM user_profiles WHERE target_lists::text LIKE :p"
            ), {'p': pattern}).scalar()

            print(f"  {cid}")
            print(f"    universal_profiles tagged: {u}")
            print(f"    user_profiles      tagged: {usr}")
            print()

        print("=" * 80)
        print("Overall target_lists population")
        print("=" * 80)
        u_total = conn.execute(text(
            "SELECT COUNT(*) FROM universal_profiles WHERE target_lists IS NOT NULL AND target_lists::text <> '[]' AND target_lists::text <> 'null'"
        )).scalar()
        usr_total = conn.execute(text(
            "SELECT COUNT(*) FROM user_profiles WHERE target_lists IS NOT NULL AND target_lists::text <> '[]' AND target_lists::text <> 'null'"
        )).scalar()
        print(f"  universal_profiles with non-empty target_lists: {u_total}")
        print(f"  user_profiles      with non-empty target_lists: {usr_total}")

        print()
        print("=" * 80)
        print("Sample tagged universal_profiles (first 3)")
        print("=" * 80)
        sample = conn.execute(text("""
            SELECT npi, first_name, last_name, target_lists
            FROM universal_profiles
            WHERE target_lists IS NOT NULL AND target_lists::text <> '[]' AND target_lists::text <> 'null'
            LIMIT 3
        """)).mappings().all()
        for s in sample:
            tl = s['target_lists']
            if isinstance(tl, str):
                try:
                    tl = json.loads(tl)
                except Exception:
                    pass
            print(f"  npi={s['npi']}  name={s['first_name']} {s['last_name']}")
            print(f"    target_lists ({len(tl) if isinstance(tl, list) else '?'} entries):")
            if isinstance(tl, list):
                for entry in tl[:5]:
                    print(f"      - {entry}")
            print()


if __name__ == '__main__':
    main()