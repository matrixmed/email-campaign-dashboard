import os
from dotenv import load_dotenv
from models import get_session, UserProfile
from sqlalchemy import text
import json

load_dotenv()

def deduplicate_users():
    print("Starting user deduplication...")
    session = get_session()

    result = session.execute(text("SELECT COUNT(*) FROM user_profiles"))
    before_count = result.scalar()
    print(f"Total records before: {before_count}")

    print("Deleting duplicate records (keeping first occurrence for each email)...")
    result = session.execute(text("""
        DELETE FROM user_profiles
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY email ORDER BY id ASC) as rn
                FROM user_profiles
            ) t
            WHERE rn > 1
        )
    """))

    deleted_count = result.rowcount
    session.commit()
    print(f"Deleted {deleted_count} duplicate records")

    result = session.execute(text("SELECT COUNT(*) FROM user_profiles"))
    after_count = result.scalar()
    result = session.execute(text("SELECT COUNT(DISTINCT email) FROM user_profiles"))
    unique_emails = result.scalar()

    print(f"\nDeduplication complete!")
    print(f"Total records: {before_count} -> {after_count}")
    print(f"Unique emails: {unique_emails}")
    print(f"Records removed: {deleted_count}")

    session.close()

if __name__ == '__main__':
    deduplicate_users()