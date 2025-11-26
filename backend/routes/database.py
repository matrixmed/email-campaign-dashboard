from flask import Blueprint, jsonify
from models import init_db, Base, CMIContractValue, BrandEditorAgency
import os
import csv
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

db_bp = Blueprint('database', __name__)

@db_bp.route('/init', methods=['POST'])
def initialize_database():
    try:
        engine = init_db()
        return jsonify({
            'status': 'success',
            'message': 'Database schema initialized successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@db_bp.route('/tables', methods=['GET'])
def list_tables():
    try:
        engine = create_engine(os.getenv('DATABASE_URL'))
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        return jsonify({
            'status': 'success',
            'tables': tables
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@db_bp.route('/seed-contracts', methods=['POST'])
def seed_cmi_contracts():
    try:
        engine = create_engine(os.getenv('DATABASE_URL'))
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)
        session = Session()

        existing = session.query(CMIContractValue).first()
        if existing:
            session.close()
            return jsonify({
                'status': 'success',
                'message': 'CMI contracts already seeded. Skipping.',
                'count': 0
            }), 200

        csv_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'CMI Contract Values - 2025.csv')

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
            count = len(contracts)

        session.close()
        return jsonify({
            'status': 'success',
            'message': f'Successfully seeded {count} CMI contracts from CSV',
            'count': count
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@db_bp.route('/seed-brands', methods=['POST'])
def seed_brands():
    try:
        engine = create_engine(os.getenv('DATABASE_URL'))
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)
        session = Session()

        existing = session.query(BrandEditorAgency).first()
        if existing:
            session.close()
            return jsonify({
                'status': 'success',
                'message': 'Brands already seeded. Skipping.',
                'count': 0
            }), 200

        csv_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'brands_sales_pharma.csv')

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
            count = len(entries)

        session.close()
        return jsonify({
            'status': 'success',
            'message': f'Successfully seeded {count} brand entries from CSV',
            'count': count
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500