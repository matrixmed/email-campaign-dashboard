from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from models import BrandEditorAgency
from datetime import datetime
import os

brand_management_bp = Blueprint('brand_management', __name__)

def get_session():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()

@brand_management_bp.route('', methods=['GET'])
def get_all_brands():
    try:
        sales_member = request.args.get('sales_member')
        session = get_session()

        if sales_member:
            brands = session.query(BrandEditorAgency).filter_by(sales_member=sales_member).order_by(BrandEditorAgency.brand.asc()).all()
        else:
            brands = session.query(BrandEditorAgency).order_by(BrandEditorAgency.sales_member.asc(), BrandEditorAgency.brand.asc()).all()

        result = [{
            'id': b.id,
            'sales_member': b.sales_member,
            'brand': b.brand,
            'agency': b.agency,
            'pharma_company': b.pharma_company,
            'is_active': b.is_active
        } for b in brands]

        session.close()

        return jsonify({
            'status': 'success',
            'brands': result
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@brand_management_bp.route('/entry', methods=['POST'])
def create_brand_entry():
    try:
        data = request.json

        if not data.get('brand'):
            return jsonify({
                'status': 'error',
                'message': 'brand is required'
            }), 400

        session = get_session()

        existing = session.query(BrandEditorAgency).filter_by(
            sales_member=data.get('sales_member'),
            brand=data['brand']
        ).first()

        if existing:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Brand already assigned to this sales member'
            }), 400

        brand_entry = BrandEditorAgency(
            sales_member=data.get('sales_member'),
            brand=data.get('brand'),
            agency=data.get('agency'),
            pharma_company=data.get('pharma_company'),
            is_active=data.get('is_active', True)
        )

        session.add(brand_entry)
        session.commit()

        entry_id = brand_entry.id
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Brand entry created successfully',
            'id': entry_id
        }), 201

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@brand_management_bp.route('/<int:entry_id>', methods=['PUT'])
def update_brand_entry(entry_id):
    try:
        data = request.json
        session = get_session()

        entry = session.query(BrandEditorAgency).filter_by(id=entry_id).first()

        if not entry:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Brand entry not found'
            }), 404

        if 'sales_member' in data:
            entry.sales_member = data['sales_member']
        if 'brand' in data:
            entry.brand = data['brand']
        if 'agency' in data:
            entry.agency = data['agency']
        if 'pharma_company' in data:
            entry.pharma_company = data['pharma_company']
        if 'is_active' in data:
            entry.is_active = data['is_active']

        entry.updated_at = datetime.utcnow()

        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Brand entry updated successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@brand_management_bp.route('/<int:entry_id>', methods=['DELETE'])
def delete_brand_entry(entry_id):
    try:
        session = get_session()
        entry = session.query(BrandEditorAgency).filter_by(id=entry_id).first()

        if not entry:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Brand entry not found'
            }), 404

        session.delete(entry)
        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Brand entry deleted successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500