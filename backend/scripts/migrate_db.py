import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

def migrate_database():
    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE brand_editor_agency
            ALTER COLUMN sales_member DROP NOT NULL;
        """))
        conn.commit()
        print("Successfully removed NOT NULL constraint from sales_member")

if __name__ == '__main__':
    migrate_database()