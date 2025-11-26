import psycopg2
from psycopg2.extras import execute_values
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

def seed_user_npis():
    try:
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = conn.cursor()

        print("Loading full_list.csv from Azure...")
        full_list_url = 'https://emaildash.blob.core.windows.net/user-data/full_list.csv?sp=r&st=2025-10-08T18:19:10Z&se=2027-05-21T02:34:10Z&spr=https&sv=2024-11-04&sr=b&sig=BGZ%2BSLNpeSgDlhirN8o7r6Cm1aiWKIhiPmYa66Q3zQw%3D'

        chunk_size = 50000
        total_updated = 0
        chunks_processed = 0

        sample_df = pd.read_csv(full_list_url, nrows=100)

        npi_col = 'NPI_ID'
        if npi_col not in sample_df.columns:
            print(f"ERROR: Could not find NPI_ID column")
            print(f"Available columns: {sample_df.columns.tolist()}")
            return

        email_col = None
        for col in sample_df.columns:
            if 'EMAIL' in col.upper() or 'MAIL' in col.upper():
                email_col = col
                break

        if not email_col:
            print(f"ERROR: Could not find email column")
            print(f"Available columns: {sample_df.columns.tolist()}")
            return

        print(f"Found columns - NPI: {npi_col}, Email: {email_col}")

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
            print("Modifying 'npi' column size if needed...")
            cursor.execute("ALTER TABLE user_profiles ALTER COLUMN npi TYPE VARCHAR(50)")
            conn.commit()

        print("Processing CSV and updating user_profiles in batches...")

        for chunk in pd.read_csv(full_list_url, usecols=[npi_col, email_col], chunksize=chunk_size):
            chunks_processed += 1

            chunk[npi_col] = chunk[npi_col].astype(str).str.strip()
            chunk[email_col] = chunk[email_col].astype(str).str.strip().str.lower()

            chunk = chunk[
                (chunk[npi_col].notna()) &
                (chunk[email_col].notna()) &
                (chunk[npi_col] != 'nan') &
                (chunk[email_col] != 'nan') &
                (chunk[npi_col] != 'NaN') &
                (chunk[email_col] != '')
            ]

            if len(chunk) == 0:
                print(f"  Chunk {chunks_processed}: No valid data, skipping")
                continue

            cursor.execute("""
                CREATE TEMP TABLE IF NOT EXISTS temp_npi_updates (
                    email VARCHAR(255),
                    npi VARCHAR(50)
                )
            """)
            cursor.execute("TRUNCATE temp_npi_updates")

            values = [(row[email_col], row[npi_col]) for _, row in chunk.iterrows()]
            execute_values(cursor, """
                INSERT INTO temp_npi_updates (email, npi) VALUES %s
            """, values, page_size=1000)

            cursor.execute("""
                UPDATE user_profiles up
                SET npi = t.npi
                FROM temp_npi_updates t
                WHERE LOWER(up.email) = LOWER(t.email)
                AND up.npi IS NULL
            """)

            rows_updated = cursor.rowcount
            total_updated += rows_updated
            conn.commit()

            print(f"  Chunk {chunks_processed}: Processed {len(chunk):,} rows, updated {rows_updated:,} records (total: {total_updated:,})")

        print(f"\nSuccessfully updated {total_updated} user profiles with NPI values")

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