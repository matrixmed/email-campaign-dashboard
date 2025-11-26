import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import Base
from sqlalchemy import create_engine, inspect, text

def check_existing_tables(engine):
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    basis_tables = [
        'basis_campaigns',
        'basis_line_items',
        'basis_vendors',
        'basis_properties',
        'basis_daily_stats',
        'basis_recommendations',
        'basis_recommendation_impacts',
        'basis_sync_logs'
    ]

    print("\nChecking existing tables:")
    for table in basis_tables:
        status = "EXISTS" if table in existing_tables else "MISSING"
        print(f"  {status}: {table}")

    missing = [t for t in basis_tables if t not in existing_tables]
    return missing, existing_tables

def fix_duplicate_indexes(engine):
    old_indexes = [
        'idx_campaign_status',
        'idx_type_priority',
        'idx_impact_tracking',
        'idx_vendor_property',
        'idx_pacing',
    ]

    with engine.connect() as conn:
        for idx in old_indexes:
            try:
                conn.execute(text(f"DROP INDEX IF EXISTS {idx}"))
                conn.commit()
                print(f"  Dropped old index: {idx}")
            except Exception as e:
                print(f"  Could not drop {idx}: {e}")

def main():
    load_dotenv()

    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("ERROR: DATABASE_URL not found in environment variables")
        print("Make sure you have a .env file with DATABASE_URL set")
        sys.exit(1)

    print(f"Connecting to database...")
    print(f"Database: {db_url.split('@')[-1] if '@' in db_url else 'local'}")

    try:
        engine = create_engine(db_url)
        print("\nDatabase connection successful")

        missing_tables, existing_tables = check_existing_tables(engine)

        if any(t in existing_tables for t in ['basis_line_items', 'basis_recommendations']):
            print("\nFixing old index names...")
            fix_duplicate_indexes(engine)

        print("\nCreating missing tables...")
        Base.metadata.create_all(engine)

        if missing_tables:
            print(f"\nCreated {len(missing_tables)} new table(s):")
            for table in missing_tables:
                print(f"  - {table}")
        else:
            print("\nAll Basis tables already exist - updated indexes only")

        print("\nDatabase initialization complete!")
        print("\nYou can now run the Basis data sync pipeline.")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()