import os
import sys
from sqlalchemy import create_engine, text

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models import Base, CMIReportResult
from dotenv import load_dotenv

load_dotenv()

def run_migration():
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        return False

    print("Connecting to database...")
    engine = create_engine(database_url)

    try:
        print("Creating cmi_report_results table...")
        CMIReportResult.__table__.create(engine, checkfirst=True)
        print("Table created successfully!")

        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'cmi_report_results'
                );
            """))
            exists = result.scalar()

            if exists:
                print("Table verification successful!")

                result = conn.execute(text("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'cmi_report_results'
                    ORDER BY ordinal_position;
                """))

                print("\nTable structure:")
                print("-" * 60)
                for row in result:
                    nullable = "NULL" if row[2] == 'YES' else "NOT NULL"
                    print(f"  {row[0]:<30} {row[1]:<20} {nullable}")
                print("-" * 60)

                return True
            else:
                print("ERROR: Table verification failed")
                return False

    except Exception as e:
        print(f"ERROR: Migration failed - {str(e)}")
        return False
    finally:
        engine.dispose()

if __name__ == "__main__":
    print("=" * 60)
    print("CMI Report Result Table Migration")
    print("=" * 60)
    success = run_migration()
    print("=" * 60)

    if success:
        print("Migration completed successfully!")
        sys.exit(0)
    else:
        print("Migration failed!")
        sys.exit(1)