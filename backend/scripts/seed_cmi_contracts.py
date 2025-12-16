import os
import csv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import CMIContractValue, Base
from dotenv import load_dotenv

load_dotenv()

def seed_cmi_contracts():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    count = session.query(CMIContractValue).count()
    if count > 0:
        print(f"CMI contracts already seeded ({count} records). Skipping.")
        session.close()
        return

    csv_files = [
        ('CMI Contract Values - 2024.csv', 2024),
        ('CMI Contract Values - 2025.csv', 2025),
        ('CMI Contract Values - 2026.csv', 2026),
    ]

    total_inserted = 0
    seen_ids = set()

    for csv_filename, year in csv_files:
        csv_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), csv_filename)

        if not os.path.exists(csv_file_path):
            print(f"Warning: {csv_filename} not found, skipping.")
            continue

        contracts = []
        file_duplicates = 0

        with open(csv_file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)

            for row in csv_reader:
                placement_id = row.get('Placement ID', '').strip()

                if not placement_id:
                    continue

                if placement_id in seen_ids:
                    file_duplicates += 1
                    continue

                seen_ids.add(placement_id)

                contract = CMIContractValue(
                    contract_number=row.get('Contract #', '').strip(),
                    client=row.get('Client', '').strip(),
                    brand=row.get('Brand', '').strip(),
                    vehicle=row.get('Vehicle', '').strip(),
                    placement_id=placement_id,
                    placement_description=row.get('Placement Description', '').strip(),
                    buy_component_type=row.get('Buy Component Type', '').strip(),
                    frequency=row.get('Frequency', '').strip(),
                    metric=row.get('Metric', '').strip(),
                    data_type=row.get('PLD Type', row.get('Data Type', '')).strip(),
                    notes=row.get('Notes', '').strip(),
                    year=year
                )
                contracts.append(contract)

        if contracts:
            session.bulk_save_objects(contracts)
            session.commit()
            total_inserted += len(contracts)
            print(f"Inserted {len(contracts)} contracts from {csv_filename} (year={year})")
            if file_duplicates > 0:
                print(f"  Skipped {file_duplicates} duplicate placement IDs")

    print(f"\nTotal: Successfully seeded {total_inserted} CMI contracts from all CSV files")
    session.close()

if __name__ == '__main__':
    seed_cmi_contracts()
