import os
import csv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import BrandEditorAgency, Base
from dotenv import load_dotenv

load_dotenv()

def seed_brands():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    existing = session.query(BrandEditorAgency).first()
    if existing:
        print("Brands already seeded. Skipping.")
        session.close()
        return

    csv_file_path = os.path.join(os.path.dirname(__file__), 'brands_sales_pharma.csv')

    with open(csv_file_path, 'r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file)
        entries = []

        for row in csv_reader:
            sales_member = row.get('Sales_member', '').strip()
            brand = row.get('Brand', '').strip()
            pharma = row.get('Pharma_company', '').strip()
            active = row.get('Active', '').strip().upper() == 'TRUE'

            if not brand:
                continue

            entry = BrandEditorAgency(
                editor_name=sales_member if sales_member else None,
                brand=brand,
                agency=None,
                pharma_company=pharma if pharma else None,
                is_active=active
            )
            entries.append(entry)

        session.bulk_save_objects(entries)
        session.commit()
        print(f"Successfully seeded {len(entries)} brand entries from CSV")

    session.close()

if __name__ == '__main__':
    seed_brands()
