import psycopg2
from psycopg2.extras import execute_values
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

def update_user_addresses():
    try:
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = conn.cursor()

        print("Loading full_list.csv from Azure...")
        full_list_url = 'https://emaildash.blob.core.windows.net/user-data/full_list.csv?sp=r&st=2025-10-08T18:19:10Z&se=2027-05-21T02:34:10Z&spr=https&sv=2024-11-04&sr=b&sig=BGZ%2BSLNpeSgDlhirN8o7r6Cm1aiWKIhiPmYa66Q3zQw%3D'

        chunk_size = 50000
        total_updated = 0
        chunks_processed = 0

        cols_to_use = ['Email', 'Address 1', 'City', 'State_Code']

        sample_df = pd.read_csv(full_list_url, nrows=5)
        print(f"Available columns: {sample_df.columns.tolist()}")

        print(f"\nUsing columns: {cols_to_use}")
        print("Processing CSV and updating user_profiles in batches...")

        for chunk in pd.read_csv(full_list_url, usecols=cols_to_use, chunksize=chunk_size):
            chunks_processed += 1

            chunk['Email'] = chunk['Email'].astype(str).str.strip().str.lower()
            chunk['Address 1'] = chunk['Address 1'].astype(str).str.strip()
            chunk['City'] = chunk['City'].astype(str).str.strip()
            chunk['State_Code'] = chunk['State_Code'].astype(str).str.strip()

            chunk = chunk[
                (chunk['Email'].notna()) &
                (chunk['Email'] != 'nan') &
                (chunk['Email'] != '')
            ]

            chunk['Address 1'] = chunk['Address 1'].replace('nan', '')
            chunk['City'] = chunk['City'].replace('nan', '')
            chunk['State_Code'] = chunk['State_Code'].replace('nan', '')

            if len(chunk) == 0:
                print(f"  Chunk {chunks_processed}: No valid data, skipping")
                continue

            cursor.execute("""
                CREATE TEMP TABLE IF NOT EXISTS temp_address_updates (
                    email VARCHAR(255),
                    address VARCHAR(500),
                    city VARCHAR(100),
                    state VARCHAR(50)
                )
            """)
            cursor.execute("TRUNCATE temp_address_updates")

            values = [
                (row['Email'], row['Address 1'], row['City'], row['State_Code'])
                for _, row in chunk.iterrows()
            ]
            execute_values(cursor, """
                INSERT INTO temp_address_updates (email, address, city, state) VALUES %s
            """, values, page_size=1000)

            cursor.execute("""
                UPDATE user_profiles up
                SET
                    address = CASE WHEN t.address != '' THEN t.address ELSE up.address END,
                    city = CASE WHEN t.city != '' THEN t.city ELSE up.city END,
                    state = CASE WHEN t.state != '' THEN t.state ELSE up.state END
                FROM temp_address_updates t
                WHERE LOWER(up.email) = LOWER(t.email)
                AND (
                    (up.address IS NULL OR up.address = '') OR
                    (up.state IS NULL OR up.state = '')
                )
            """)

            rows_updated = cursor.rowcount
            total_updated += rows_updated
            conn.commit()

            print(f"  Chunk {chunks_processed}: Processed {len(chunk):,} rows, updated {rows_updated:,} records (total: {total_updated:,})")

        print(f"\nSuccessfully updated {total_updated} user profiles with address data")

        cursor.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(NULLIF(address, '')) as has_address,
                COUNT(NULLIF(city, '')) as has_city,
                COUNT(NULLIF(state, '')) as has_state
            FROM user_profiles
            WHERE npi IS NOT NULL
        """)
        row = cursor.fetchone()
        print(f"\nUser profiles with NPI:")
        print(f"  Total:       {row[0]}")
        print(f"  Has Address: {row[1]}")
        print(f"  Has City:    {row[2]}")
        print(f"  Has State:   {row[3]}")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    update_user_addresses()
