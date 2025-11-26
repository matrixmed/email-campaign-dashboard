import csv
import os
import sys
import tempfile
import zipfile
from datetime import datetime
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
import time

DATABASE_URL = 'postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill'

def get_latest_nppes_url():
    current_date = datetime.now()
    month_name = current_date.strftime("%B")
    year = current_date.year

    url = f"https://download.cms.gov/nppes/NPPES_Data_Dissemination_{month_name}_{year}.zip"
    print(f"Attempting to download: {url}")
    return url

def download_file(url, destination):
    print(f"\nDownloading from: {url}")
    print("This will take 10-20 minutes depending on your connection...")

    try:
        response = requests.get(url, stream=True, timeout=600)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0

        with open(destination, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)

                    if downloaded % (100 * 1024 * 1024) == 0:
                        progress = (downloaded / total_size * 100) if total_size > 0 else 0
                        print(f"Downloaded: {downloaded / (1024*1024):.0f} MB ({progress:.1f}%)")

        print(f"Download complete! Size: {downloaded / (1024*1024):.0f} MB")
        return True
    except Exception as e:
        print(f"Download failed: {e}")
        return False

def extract_csv_from_zip(zip_path, extract_to):
    print(f"\nExtracting ZIP file...")

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            csv_files = [f for f in zip_ref.namelist() if f.startswith('npidata_pfile') and f.endswith('.csv')]

            if not csv_files:
                print("ERROR: No npidata CSV file found in ZIP")
                return None

            csv_file = csv_files[0]
            print(f"Found CSV: {csv_file}")

            zip_ref.extract(csv_file, extract_to)
            csv_path = os.path.join(extract_to, csv_file)

            print(f"Extracted to: {csv_path}")
            return csv_path
    except Exception as e:
        print(f"Extraction failed: {e}")
        return None

def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, '%m/%d/%Y').date()
    except:
        return None

def parse_npi_row(row):
    try:
        enumeration_date = parse_date(row.get('Provider Enumeration Date'))
        last_update_date = parse_date(row.get('Last Update Date'))
        deactivation_date = parse_date(row.get('NPI Deactivation Date'))
        is_active = deactivation_date is None

        return {
            'npi': row.get('NPI', '').strip(),
            'entity_type': row.get('Entity Type Code', '').strip(),
            'first_name': row.get('Provider First Name', '').strip()[:100] or None,
            'last_name': row.get('Provider Last Name (Legal Name)', '').strip()[:100] or None,
            'middle_name': row.get('Provider Middle Name', '').strip()[:100] or None,
            'organization_name': row.get('Provider Organization Name (Legal Business Name)', '').strip()[:255] or None,
            'credential': row.get('Provider Credential Text', '').strip()[:50] or None,
            'mailing_address_1': row.get('Provider First Line Business Mailing Address', '').strip()[:255] or None,
            'mailing_address_2': row.get('Provider Second Line Business Mailing Address', '').strip()[:255] or None,
            'mailing_city': row.get('Provider Business Mailing Address City Name', '').strip()[:100] or None,
            'mailing_state': row.get('Provider Business Mailing Address State Name', '').strip()[:50] or None,
            'mailing_zipcode': row.get('Provider Business Mailing Address Postal Code', '').strip()[:20] or None,
            'mailing_country': row.get('Provider Business Mailing Address Country Code (If outside U.S.)', '').strip()[:100] or None,
            'practice_address_1': row.get('Provider First Line Business Practice Location Address', '').strip()[:255] or None,
            'practice_address_2': row.get('Provider Second Line Business Practice Location Address', '').strip()[:255] or None,
            'practice_city': row.get('Provider Business Practice Location Address City Name', '').strip()[:100] or None,
            'practice_state': row.get('Provider Business Practice Location Address State Name', '').strip()[:50] or None,
            'practice_zipcode': row.get('Provider Business Practice Location Address Postal Code', '').strip()[:20] or None,
            'practice_country': row.get('Provider Business Practice Location Address Country Code (If outside U.S.)', '').strip()[:100] or None,
            'primary_taxonomy_code': row.get('Healthcare Provider Taxonomy Code_1', '').strip()[:50] or None,
            'primary_specialty': None,
            'enumeration_date': enumeration_date,
            'last_update_date': last_update_date,
            'deactivation_date': deactivation_date,
            'is_active': is_active,
            'last_synced_at': datetime.now()
        }
    except Exception as e:
        return None

def upsert_batch(engine, records):
    if not records:
        return 0

    upsert_query = text("""
        INSERT INTO universal_profiles (
            npi, entity_type, first_name, last_name, middle_name, organization_name, credential,
            mailing_address_1, mailing_address_2, mailing_city, mailing_state, mailing_zipcode, mailing_country,
            practice_address_1, practice_address_2, practice_city, practice_state, practice_zipcode, practice_country,
            primary_taxonomy_code, primary_specialty, enumeration_date, last_update_date, deactivation_date,
            is_active, last_synced_at, created_at, updated_at
        ) VALUES (
            :npi, :entity_type, :first_name, :last_name, :middle_name, :organization_name, :credential,
            :mailing_address_1, :mailing_address_2, :mailing_city, :mailing_state, :mailing_zipcode, :mailing_country,
            :practice_address_1, :practice_address_2, :practice_city, :practice_state, :practice_zipcode, :practice_country,
            :primary_taxonomy_code, :primary_specialty, :enumeration_date, :last_update_date, :deactivation_date,
            :is_active, :last_synced_at, :created_at, :updated_at
        )
        ON CONFLICT (npi) DO UPDATE SET
            entity_type = EXCLUDED.entity_type,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            middle_name = EXCLUDED.middle_name,
            organization_name = EXCLUDED.organization_name,
            credential = EXCLUDED.credential,
            mailing_address_1 = EXCLUDED.mailing_address_1,
            mailing_address_2 = EXCLUDED.mailing_address_2,
            mailing_city = EXCLUDED.mailing_city,
            mailing_state = EXCLUDED.mailing_state,
            mailing_zipcode = EXCLUDED.mailing_zipcode,
            mailing_country = EXCLUDED.mailing_country,
            practice_address_1 = EXCLUDED.practice_address_1,
            practice_address_2 = EXCLUDED.practice_address_2,
            practice_city = EXCLUDED.practice_city,
            practice_state = EXCLUDED.practice_state,
            practice_zipcode = EXCLUDED.practice_zipcode,
            practice_country = EXCLUDED.practice_country,
            primary_taxonomy_code = EXCLUDED.primary_taxonomy_code,
            enumeration_date = EXCLUDED.enumeration_date,
            last_update_date = EXCLUDED.last_update_date,
            deactivation_date = EXCLUDED.deactivation_date,
            is_active = EXCLUDED.is_active,
            last_synced_at = EXCLUDED.last_synced_at,
            updated_at = EXCLUDED.updated_at
    """)

    max_retries = 3
    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                now = datetime.now()
                for record in records:
                    record['created_at'] = now
                    record['updated_at'] = now

                conn.execute(upsert_query, records)
                conn.commit()
                return len(records)
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"  Retry {attempt + 1} after error")
                time.sleep(2)
                engine.dispose() 
            else:
                print(f"Batch failed after {max_retries} attempts: {str(e)[:100]}")
                return 0
    return 0

def import_csv(csv_path, batch_size=1000):
    print(f"\nStarting import...")
    print(f"Connecting to database...")

    engine = create_engine(DATABASE_URL, poolclass=NullPool)

    total_processed = 0
    total_inserted = 0
    batch = []
    last_connection_refresh = time.time()

    print(f"Processing CSV (batch size: {batch_size})...")
    print("This will take 30-60 minutes for 8.5M records...")

    try:
        with open(csv_path, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)

            for row in reader:
                parsed = parse_npi_row(row)

                if parsed and parsed['npi']:
                    batch.append(parsed)

                    if len(batch) >= batch_size:
                        inserted = upsert_batch(engine, batch)
                        total_processed += len(batch)
                        total_inserted += inserted

                        if total_processed % 50000 == 0:
                            print(f"Processed: {total_processed:,} records")

                        batch = []

                        if time.time() - last_connection_refresh > 60:
                            engine.dispose()
                            last_connection_refresh = time.time()

            if batch:
                inserted = upsert_batch(engine, batch)
                total_processed += len(batch)
                total_inserted += inserted

        print("="*60)
        print("Import Complete!")
        print(f"Total records processed: {total_processed:,}")
        print(f"Records inserted/updated: {total_inserted:,}")
        print("="*60)

        return True

    except Exception as e:
        print(f"Import failed: {e}")
        return False

def main():
    print("="*60)
    print("NPI Data Download & Import Script")
    print("="*60)
    print()

    temp_dir = tempfile.mkdtemp()
    print(f"Created temp directory: {temp_dir}")

    try:
        nppes_url = get_latest_nppes_url()
        zip_path = os.path.join(temp_dir, 'nppes_data.zip')

        if not download_file(nppes_url, zip_path):
            print("\nDownload failed. Aborting.")
            return False

        csv_path = extract_csv_from_zip(zip_path, temp_dir)
        if not csv_path:
            print("\nExtraction failed. Aborting.")
            return False

        success = import_csv(csv_path)

        if success:
            print("\n" + "="*60)
            print("SUCCESS! NPI database is ready!")
            print("="*60)

            print("\nCleaning up...")
            try:
                import shutil
                shutil.rmtree(temp_dir)
                print("Temp files deleted")
            except Exception as e:
                print(f"Temp cleanup warning: {e}")

            try:
                os.remove(__file__)
                print(f"Deleted: {__file__}")
            except Exception as e:
                print(f"Could not delete script: {e}")

            return True
        else:
            print("\nImport failed.")
            return False

    except Exception as e:
        print(f"\nFatal error: {e}")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)