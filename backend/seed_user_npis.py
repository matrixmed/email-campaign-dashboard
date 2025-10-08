import psycopg2
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

def seed_user_npis():
    """
    Populate NPI values in user_profiles table using full_list.csv
    """
    try:
        # Connect to database
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = conn.cursor()

        print("Loading full_list.csv from Azure...")
        full_list_url = 'https://emaildash.blob.core.windows.net/user-data/full_list.csv?sp=r&st=2025-10-08T18:19:10Z&se=2027-05-21T02:34:10Z&spr=https&sv=2024-11-04&sr=b&sig=BGZ%2BSLNpeSgDlhirN8o7r6Cm1aiWKIhiPmYa66Q3zQw%3D'

        # Read CSV in chunks
        chunk_size = 50000
        total_updated = 0
        chunks_processed = 0

        # First, detect columns from a small sample
        sample_df = pd.read_csv(full_list_url, nrows=100)

        # Find NPI column
        npi_col = None
        for col in sample_df.columns:
            if 'NPI' in col.upper():
                npi_col = col
                break

        # Find Email column
        email_col = None
        for col in sample_df.columns:
            if 'EMAIL' in col.upper() or 'MAIL' in col.upper():
                email_col = col
                break

        if not npi_col or not email_col:
            print(f"ERROR: Could not find required columns")
            print(f"Available columns: {sample_df.columns.tolist()}")
            return

        print(f"Found columns - NPI: {npi_col}, Email: {email_col}")

        # Check if npi column exists in user_profiles
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'user_profiles' AND column_name = 'npi'
        """)

        if not cursor.fetchone():
            print("Adding 'npi' column to user_profiles table...")
            cursor.execute("ALTER TABLE user_profiles ADD COLUMN npi VARCHAR(50)")
            conn.commit()
            print("Column 'npi' added successfully")
        else:
            # Modify existing column if it's too small
            print("Modifying 'npi' column size if needed...")
            cursor.execute("ALTER TABLE user_profiles ALTER COLUMN npi TYPE VARCHAR(50)")
            conn.commit()

        # Process CSV in chunks
        print("Processing CSV and updating user_profiles...")

        for chunk in pd.read_csv(full_list_url, usecols=[npi_col, email_col], chunksize=chunk_size):
            chunks_processed += 1

            # Clean data
            chunk[npi_col] = chunk[npi_col].astype(str).str.strip()
            chunk[email_col] = chunk[email_col].astype(str).str.strip().str.lower()

            # Build update queries
            for _, row in chunk.iterrows():
                npi = row[npi_col]
                email = row[email_col]

                if pd.notna(npi) and pd.notna(email) and npi != 'nan' and email != 'nan':
                    cursor.execute("""
                        UPDATE user_profiles
                        SET npi = %s
                        WHERE LOWER(email) = %s AND npi IS NULL
                    """, (npi, email))
                    total_updated += cursor.rowcount

            conn.commit()

            if chunks_processed % 10 == 0:
                print(f"Processed {chunks_processed} chunks, {total_updated} records updated")

        print(f"\n✓ Successfully updated {total_updated} user profiles with NPI values")

        # Show statistics
        cursor.execute("SELECT COUNT(*) FROM user_profiles WHERE npi IS NOT NULL")
        total_with_npi = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM user_profiles")
        total_users = cursor.fetchone()[0]

        print(f"Total user profiles with NPI: {total_with_npi}/{total_users}")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    seed_user_npis()
