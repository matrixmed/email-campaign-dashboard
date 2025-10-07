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

    existing = session.query(CMIContractValue).first()
    if existing:
        print("CMI contracts already seeded. Skipping.")
        session.close()
        return

    csv_file_path = os.path.join(os.path.dirname(__file__), 'CMI Contract Values - 2025.csv')

    with open(csv_file_path, 'r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file)
        contracts = []

        for row in csv_reader:
            contract = CMIContractValue(
                contract_number=row.get('Contract #', '').strip(),
                client=row.get('Client', '').strip(),
                brand=row.get('Brand', '').strip(),
                vehicle=row.get('Vehicle', '').strip(),
                placement_id=row.get('Placement ID', '').strip(),
                placement_description=row.get('Placement Description', '').strip(),
                buy_component_type=row.get('Buy Component Type', '').strip(),
                data_type=row.get('Data Type', '').strip(),
                notes=row.get('Notes', '').strip()
            )
            contracts.append(contract)

        session.bulk_save_objects(contracts)
        session.commit()
        print(f"Successfully seeded {len(contracts)} CMI contracts from CSV")

    session.close()

if __name__ == '__main__':
    seed_cmi_contracts()
