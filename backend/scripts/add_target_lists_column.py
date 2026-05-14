import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

def add_target_lists_columns():
    DATABASE_URL = os.getenv('DATABASE_URL') or 'postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill'
    engine = create_engine(DATABASE_URL)

    statements = [
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS target_lists JSON DEFAULT '[]'::json",
        "ALTER TABLE universal_profiles ADD COLUMN IF NOT EXISTS target_lists JSON DEFAULT '[]'::json",
        "CREATE INDEX IF NOT EXISTS idx_universal_npi_target ON universal_profiles(npi)",
    ]

    with engine.begin() as conn:
        for stmt in statements:
            print(f"Running: {stmt}")
            conn.execute(text(stmt))
        print("Done.")

if __name__ == '__main__':
    add_target_lists_columns()