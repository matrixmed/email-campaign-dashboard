import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

def add_profile_timeline_indexes():
    DATABASE_URL = os.getenv('DATABASE_URL') or 'postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill'
    engine = create_engine(DATABASE_URL)

    statements = [
        "CREATE INDEX IF NOT EXISTS idx_ci_email_lower ON campaign_interactions(LOWER(email))",
        "CREATE INDEX IF NOT EXISTS idx_ci_email_lower_ts ON campaign_interactions(LOWER(email), timestamp DESC)",
        "CREATE INDEX IF NOT EXISTS idx_up_email_lower ON user_profiles(LOWER(email))",
    ]

    results = []
    with engine.connect().execution_options(isolation_level='AUTOCOMMIT') as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
                results.append((stmt, 'ok', None))
            except Exception as e:
                results.append((stmt, 'failed', str(e)))
    return results

if __name__ == '__main__':
    results = add_profile_timeline_indexes()
    failures = [r for r in results if r[1] != 'ok']
    sys.exit(1 if failures else 0)