from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from models import CMIContractValue
from datetime import datetime
import os
import csv
from io import StringIO

cmi_contracts_bp = Blueprint('cmi_contracts', __name__)

def get_session():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()

@cmi_contracts_bp.route('', methods=['GET'])
def get_all_contracts():
    try:
        year = request.args.get('year', type=int)

        session = get_session()
        query = session.query(CMIContractValue)

        if year:
            query = query.filter(CMIContractValue.year == year)

        contracts = query.order_by(CMIContractValue.id.asc()).all()

        result = [{
            'id': c.id,
            'contract_number': c.contract_number,
            'client': c.client,
            'brand': c.brand,
            'vehicle': c.vehicle,
            'placement_id': c.placement_id,
            'placement_description': c.placement_description,
            'buy_component_type': c.buy_component_type,
            'media_tactic_id': c.media_tactic_id,
            'frequency': c.frequency,
            'metric': c.metric,
            'data_type': c.data_type,
            'notes': c.notes,
            'year': c.year
        } for c in contracts]

        session.close()

        return jsonify({
            'status': 'success',
            'contracts': result
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@cmi_contracts_bp.route('', methods=['POST'])
def create_contract():
    try:
        data = request.json

        if not data.get('placement_id'):
            return jsonify({
                'status': 'error',
                'message': 'placement_id is required'
            }), 400

        session = get_session()

        existing = session.query(CMIContractValue).filter_by(placement_id=data['placement_id']).first()
        if existing:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Contract with this placement_id already exists'
            }), 400

        contract = CMIContractValue(
            contract_number=data.get('contract_number'),
            client=data.get('client'),
            brand=data.get('brand'),
            vehicle=data.get('vehicle'),
            placement_id=data.get('placement_id'),
            placement_description=data.get('placement_description'),
            buy_component_type=data.get('buy_component_type'),
            media_tactic_id=data.get('media_tactic_id'),
            frequency=data.get('frequency'),
            metric=data.get('metric'),
            data_type=data.get('data_type'),
            notes=data.get('notes'),
            year=data.get('year', 2025)
        )

        session.add(contract)
        session.commit()

        contract_id = contract.id
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Contract created successfully',
            'id': contract_id
        }), 201

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@cmi_contracts_bp.route('/<int:contract_id>', methods=['PUT'])
def update_contract(contract_id):
    try:
        data = request.json
        session = get_session()

        contract = session.query(CMIContractValue).filter_by(id=contract_id).first()

        if not contract:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Contract not found'
            }), 404

        if data.get('placement_id') and data['placement_id'] != contract.placement_id:
            existing = session.query(CMIContractValue).filter_by(placement_id=data['placement_id']).first()
            if existing:
                session.close()
                return jsonify({
                    'status': 'error',
                    'message': 'Another contract with this placement_id already exists'
                }), 400

        contract.contract_number = data.get('contract_number', contract.contract_number)
        contract.client = data.get('client', contract.client)
        contract.brand = data.get('brand', contract.brand)
        contract.vehicle = data.get('vehicle', contract.vehicle)
        contract.placement_id = data.get('placement_id', contract.placement_id)
        contract.placement_description = data.get('placement_description', contract.placement_description)
        contract.buy_component_type = data.get('buy_component_type', contract.buy_component_type)
        contract.media_tactic_id = data.get('media_tactic_id', contract.media_tactic_id)
        contract.frequency = data.get('frequency', contract.frequency)
        contract.metric = data.get('metric', contract.metric)
        contract.data_type = data.get('data_type', contract.data_type)
        contract.notes = data.get('notes', contract.notes)
        contract.year = data.get('year', contract.year)
        contract.updated_at = datetime.utcnow()

        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Contract updated successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@cmi_contracts_bp.route('/<int:contract_id>', methods=['DELETE'])
def delete_contract(contract_id):
    try:
        session = get_session()
        contract = session.query(CMIContractValue).filter_by(id=contract_id).first()

        if not contract:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Contract not found'
            }), 404

        session.delete(contract)
        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Contract deleted successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@cmi_contracts_bp.route('/export', methods=['GET'])
def export_contracts():
    try:
        year = request.args.get('year', type=int)

        session = get_session()
        query = session.query(CMIContractValue)

        if year:
            query = query.filter(CMIContractValue.year == year)

        contracts = query.order_by(CMIContractValue.id.asc()).all()

        output = StringIO()
        writer = csv.writer(output)

        writer.writerow([
            'Contract #', 'Client', 'Brand', 'Vehicle',
            'Placement ID', 'Placement Description',
            'Buy Component Type', 'Media Tactic ID', 'Frequency', 'Metric', 'Data Type', 'Notes', 'Year'
        ])

        for c in contracts:
            writer.writerow([
                c.contract_number or '',
                c.client or '',
                c.brand or '',
                c.vehicle or '',
                c.placement_id or '',
                c.placement_description or '',
                c.buy_component_type or '',
                c.media_tactic_id or '',
                c.frequency or '',
                c.metric or '',
                c.data_type or '',
                c.notes or '',
                c.year or ''
            ])

        session.close()

        csv_content = output.getvalue()
        output.close()

        return csv_content, 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=cmi_contracts.csv'
        }

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500