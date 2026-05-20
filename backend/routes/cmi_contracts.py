from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from models import CMIContractValue, CmiOrphanNoDataSubmission, Base
from datetime import datetime, timedelta
import os
import csv
from io import StringIO

cmi_contracts_bp = Blueprint('cmi_contracts', __name__)

def get_session():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()

_orphan_table_ensured = False

def ensure_orphan_table():
    global _orphan_table_ensured
    if _orphan_table_ensured:
        return
    engine = create_engine(os.getenv('DATABASE_URL'))
    CmiOrphanNoDataSubmission.__table__.create(bind=engine, checkfirst=True)
    _orphan_table_ensured = True

def get_current_reporting_week_start():
    today = datetime.now()
    days_since_monday = today.weekday()
    current_monday = today - timedelta(days=days_since_monday)
    reporting_monday = current_monday - timedelta(days=7)
    return reporting_monday.date()

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
            'year': c.year,
            'gcm_placement_ids': c.gcm_placement_ids,
            'creative_code': c.creative_code,
            'last_attached_campaign_name': c.last_attached_campaign_name,
            'last_attached_campaign_brand': c.last_attached_campaign_brand
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
        if 'gcm_placement_ids' in data:
            contract.gcm_placement_ids = data['gcm_placement_ids']
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

@cmi_contracts_bp.route('/by-placement/<placement_id>', methods=['PUT'])
def update_contract_by_placement(placement_id):
    try:
        data = request.json
        session = get_session()

        contract = session.query(CMIContractValue).filter_by(placement_id=str(placement_id)).first()

        if not contract:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Contract not found'
            }), 404

        if 'metric' in data:
            contract.metric = data['metric']
        if 'gcm_placement_ids' in data:
            contract.gcm_placement_ids = data['gcm_placement_ids']
        if 'creative_code' in data:
            contract.creative_code = data['creative_code']
        if 'last_attached_campaign_name' in data:
            contract.last_attached_campaign_name = data['last_attached_campaign_name']
        if 'last_attached_campaign_brand' in data:
            contract.last_attached_campaign_brand = data['last_attached_campaign_brand']
        contract.updated_at = datetime.utcnow()

        session.commit()

        result = {
            'id': contract.id,
            'placement_id': contract.placement_id,
            'metric': contract.metric,
            'gcm_placement_ids': contract.gcm_placement_ids,
            'creative_code': contract.creative_code,
            'last_attached_campaign_name': contract.last_attached_campaign_name,
            'last_attached_campaign_brand': contract.last_attached_campaign_brand,
            'brand': contract.brand,
            'notes': contract.notes
        }

        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Contract updated successfully',
            'contract': result
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

CONTRACT_TO_CMI_FIELD = {
    'contract_number': 'contract_number',
    'client': 'client_name',
    'brand': 'brand_name',
    'vehicle': 'vehicle_name',
    'placement_description': 'placement_description',
    'buy_component_type': 'ad_format',
    'metric': 'contracted_metric',
    'data_type': 'data_type',
    'frequency': 'expected_data_frequency',
}

def _norm(v):
    if v is None:
        return ''
    s = str(v).strip().lower()
    if s.endswith('.0') and s[:-2].isdigit():
        s = s[:-2]
    return ''.join(ch for ch in s if ch.isalnum())

def _effective_frequency(explicit, data_type):
    if explicit and str(explicit).strip():
        return str(explicit).strip()
    if not data_type:
        return None
    dt = str(data_type).upper()
    if 'PLD' in dt or 'HCP' in dt:
        return 'Weekly'
    if 'AGG' in dt:
        return 'Monthly'
    return None

def _effective_metric(explicit):
    if explicit and str(explicit).strip():
        return str(explicit).strip()
    return 'Opens_unique'

@cmi_contracts_bp.route('/validation', methods=['GET'])
def get_contracts_with_validation():
    try:
        year = request.args.get('year', type=int)
        session = get_session()

        query = session.query(CMIContractValue)
        if year:
            query = query.filter(CMIContractValue.year == year)
        contracts = query.order_by(CMIContractValue.id.asc()).all()

        contract_ids = [c.placement_id for c in contracts if c.placement_id]

        cmi_rows = {}
        if contract_ids:
            placeholders = ','.join([f":p{i}" for i in range(len(contract_ids))])
            params = {f"p{i}": pid for i, pid in enumerate(contract_ids)}
            result = session.execute(text(f"""
                SELECT cmi_placement_id, contract_number, client_name, brand_name,
                       vehicle_name, placement_description, ad_format, media_tactic_id,
                       expected_data_frequency, contracted_metric, tactic_name,
                       buying_channel, is_amo, start_date, end_date, is_current,
                       data_type
                FROM cmi_metadata_schedule
                WHERE cmi_placement_id IN ({placeholders})
            """), params)
            cols = result.keys()
            for row in result:
                d = dict(zip(cols, row))
                cmi_rows[d['cmi_placement_id']] = d

        result_contracts = []
        for c in contracts:
            cmi = cmi_rows.get(c.placement_id)
            mismatches = {}
            if cmi:
                cmi_vehicle_composite = None
                if cmi.get('vehicle_name') and cmi.get('tactic_name'):
                    cmi_vehicle_composite = f"{cmi['vehicle_name']} - {cmi['tactic_name']}"
                elif cmi.get('tactic_name'):
                    cmi_vehicle_composite = cmi['tactic_name']
                elif cmi.get('vehicle_name'):
                    cmi_vehicle_composite = cmi['vehicle_name']

                effective_data_type_cmi = cmi.get('data_type')
                effective_data_type_ours = c.data_type or effective_data_type_cmi

                for our_col, cmi_col in CONTRACT_TO_CMI_FIELD.items():
                    our_val = getattr(c, our_col, None)
                    if our_col == 'vehicle':
                        cmi_val = cmi_vehicle_composite
                    elif our_col == 'frequency':
                        cmi_val = _effective_frequency(cmi.get(cmi_col), effective_data_type_cmi)
                        our_val = _effective_frequency(our_val, effective_data_type_ours)
                        if cmi_val is None:
                            continue
                    elif our_col == 'metric':
                        cmi_val = _effective_metric(cmi.get(cmi_col))
                        our_val = _effective_metric(our_val)
                    else:
                        cmi_val = cmi.get(cmi_col)
                    if _norm(our_val) != _norm(cmi_val):
                        mismatches[our_col] = {
                            'ours': our_val if our_val not in (None, '') else None,
                            'cmi': cmi_val if cmi_val not in (None, '') else None
                        }

            result_contracts.append({
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
                'year': c.year,
                'gcm_placement_ids': c.gcm_placement_ids,
                'creative_code': c.creative_code,
                'last_attached_campaign_name': c.last_attached_campaign_name,
                'last_attached_campaign_brand': c.last_attached_campaign_brand,
                'cmi_match_status': (
                    'no_cmi_record' if cmi is None
                    else ('full_match' if not mismatches else 'partial_mismatch')
                ),
                'cmi_mismatches': mismatches,
                'cmi_is_current': cmi.get('is_current') if cmi else None
            })

        result = session.execute(text("""
            SELECT cmi_placement_id, contract_number, client_name, brand_name,
                   vehicle_name, tactic_name, placement_description, ad_format,
                   media_tactic_id, expected_data_frequency, contracted_metric,
                   start_date, end_date, buying_channel, data_type
            FROM cmi_metadata_schedule
            WHERE is_current = TRUE
              AND cmi_placement_id NOT IN (
                  SELECT placement_id FROM cmi_contract_values WHERE placement_id IS NOT NULL
              )
            ORDER BY brand_name, cmi_placement_id
        """))
        cols = result.keys()
        cmi_only = []
        for row in result:
            d = dict(zip(cols, row))
            if year and d.get('start_date') and d['start_date'].year != year and \
               d.get('end_date') and d['end_date'].year != year:
                continue
            vehicle_composite = None
            if d.get('vehicle_name') and d.get('tactic_name'):
                vehicle_composite = f"{d['vehicle_name']} - {d['tactic_name']}"
            elif d.get('tactic_name'):
                vehicle_composite = d['tactic_name']
            elif d.get('vehicle_name'):
                vehicle_composite = d['vehicle_name']
            cmi_only.append({
                'placement_id': d['cmi_placement_id'],
                'contract_number': d['contract_number'],
                'client': d['client_name'],
                'brand': d['brand_name'],
                'vehicle': vehicle_composite,
                'placement_description': d['placement_description'],
                'buy_component_type': d['ad_format'],
                'media_tactic_id': d['media_tactic_id'],
                'frequency': _effective_frequency(d['expected_data_frequency'], d['data_type']),
                'metric': _effective_metric(d['contracted_metric']),
                'data_type': d['data_type'],
            })

        session.close()

        return jsonify({
            'status': 'success',
            'contracts': result_contracts,
            'cmi_only': cmi_only,
            'summary': {
                'total': len(result_contracts),
                'full_match': sum(1 for c in result_contracts if c['cmi_match_status'] == 'full_match'),
                'partial_mismatch': sum(1 for c in result_contracts if c['cmi_match_status'] == 'partial_mismatch'),
                'no_cmi_record': sum(1 for c in result_contracts if c['cmi_match_status'] == 'no_cmi_record'),
                'cmi_only': len(cmi_only),
            }
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


@cmi_contracts_bp.route('/orphan-no-data/<placement_id>/submit', methods=['PUT'])
def submit_orphan_no_data(placement_id):
    try:
        ensure_orphan_table()
        data = request.json or {}
        is_submitted = bool(data.get('is_submitted', False))
        week_start = get_current_reporting_week_start()

        session = get_session()
        row = session.query(CmiOrphanNoDataSubmission).filter_by(
            placement_id=str(placement_id),
            reporting_week_start=week_start
        ).first()

        if is_submitted:
            now = datetime.utcnow()
            if row:
                row.is_submitted = True
                row.submitted_at = now
                row.updated_at = now
            else:
                row = CmiOrphanNoDataSubmission(
                    placement_id=str(placement_id),
                    reporting_week_start=week_start,
                    is_submitted=True,
                    submitted_at=now
                )
                session.add(row)
        else:
            if row:
                session.delete(row)

        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'placement_id': str(placement_id),
            'reporting_week_start': week_start.isoformat(),
            'is_submitted': is_submitted
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@cmi_contracts_bp.route('/orphan-no-data/submissions', methods=['GET'])
def get_orphan_no_data_submissions():
    try:
        ensure_orphan_table()
        week_param = request.args.get('week')
        if week_param:
            week_start = datetime.strptime(week_param, '%Y-%m-%d').date()
        else:
            week_start = get_current_reporting_week_start()

        session = get_session()
        rows = session.query(CmiOrphanNoDataSubmission).filter_by(
            reporting_week_start=week_start,
            is_submitted=True
        ).all()

        submissions = [{
            'placement_id': r.placement_id,
            'reporting_week_start': r.reporting_week_start.isoformat(),
            'submitted_at': r.submitted_at.strftime('%Y-%m-%d %H:%M:%S') if r.submitted_at else None
        } for r in rows]

        session.close()

        return jsonify({
            'status': 'success',
            'reporting_week_start': week_start.isoformat(),
            'submissions': submissions
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500