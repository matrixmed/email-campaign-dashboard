from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, or_
from models import CMIExpectedReport, CampaignReportingMetadata, CMIContractValue
from datetime import datetime, timedelta
import os

expected_reports_bp = Blueprint('expected_reports', __name__)

def get_session():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()


def get_current_reporting_week():
    today = datetime.now()
    days_since_monday = today.weekday()
    current_monday = today - timedelta(days=days_since_monday)
    reporting_monday = current_monday - timedelta(days=7)
    reporting_sunday = reporting_monday + timedelta(days=6)
    return reporting_monday.date(), reporting_sunday.date()


@expected_reports_bp.route('/expected', methods=['GET'])
@cross_origin()
def get_expected_reports():
    try:
        session = get_session()
        week_start, week_end = get_current_reporting_week()

        week_param = request.args.get('week')
        if week_param:
            week_start = datetime.strptime(week_param, '%Y-%m-%d').date()
            week_end = week_start + timedelta(days=6)

        reports = session.query(CMIExpectedReport).filter(
            CMIExpectedReport.reporting_week_start == week_start
        ).order_by(
            CMIExpectedReport.is_matched,
            CMIExpectedReport.brand_name
        ).all()

        placement_ids = [str(r.cmi_placement_id) for r in reports if r.cmi_placement_id]
        contracts = {}
        if placement_ids:
            contract_records = session.query(CMIContractValue).all()
            for c in contract_records:
                if c.placement_id:
                    contracts[str(c.placement_id)] = {
                        'notes': c.notes,
                        'placement_description': c.placement_description,
                        'metric': c.metric,
                        'frequency': c.frequency
                    }

        result = []
        for r in reports:
            contract = contracts.get(str(r.cmi_placement_id), {}) if r.cmi_placement_id else {}
            result.append({
                'id': r.id,
                'cmi_placement_id': r.cmi_placement_id,
                'client_placement_id': r.client_placement_id,
                'contract_number': r.contract_number,
                'client_name': r.client_name,
                'brand_name': r.brand_name,
                'supplier': r.supplier,
                'vehicle_name': r.vehicle_name,
                'placement_description': r.placement_description or contract.get('placement_description'),
                'buy_type': r.buy_type,
                'channel': r.channel,
                'data_type': r.data_type,
                'expected_data_frequency': r.expected_data_frequency,
                'reporting_week_start': r.reporting_week_start.isoformat() if r.reporting_week_start else None,
                'reporting_week_end': r.reporting_week_end.isoformat() if r.reporting_week_end else None,
                'date_data_expected': r.date_data_expected.isoformat() if r.date_data_expected else None,
                'matched_campaign_id': r.matched_campaign_id,
                'matched_metadata_id': r.matched_metadata_id,
                'is_matched': r.is_matched,
                'match_type': r.match_type,
                'is_agg_only': r.is_agg_only,
                'attached_to_campaign_id': r.attached_to_campaign_id,
                'is_standalone': r.is_standalone,
                'agg_metric': r.agg_metric,
                'agg_value': r.agg_value,
                'status': r.status,
                'is_submitted': r.is_submitted,
                'source_file': r.source_file,
                'notes': r.notes,
                'contract_notes': contract.get('notes'),
                'contract_metric': contract.get('metric'),
                'contract_frequency': contract.get('frequency')
            })

        session.close()

        return jsonify({
            'status': 'success',
            'week_start': week_start.isoformat(),
            'week_end': week_end.isoformat(),
            'reports': result,
            'count': len(result)
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@expected_reports_bp.route('/expected/<int:report_id>/match', methods=['POST'])
@cross_origin()
def match_expected_report(report_id):
    try:
        session = get_session()
        data = request.json

        report = session.query(CMIExpectedReport).filter_by(id=report_id).first()
        if not report:
            return jsonify({'status': 'error', 'message': 'Report not found'}), 404

        if data.get('campaign_id'):
            report.matched_campaign_id = data['campaign_id']
            report.match_type = 'manual_campaign'
        if data.get('metadata_id'):
            report.matched_metadata_id = data['metadata_id']
            report.match_type = 'manual_metadata'

        if data.get('assigned_campaign_name'):
            report.assigned_campaign_name = data['assigned_campaign_name']
        if data.get('assigned_send_date'):
            report.assigned_send_date = datetime.strptime(data['assigned_send_date'], '%Y-%m-%d').date()

        report.is_matched = True
        report.status = 'matched'
        report.updated_at = datetime.utcnow()

        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Report matched successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@expected_reports_bp.route('/expected/<int:report_id>/attach', methods=['POST'])
@cross_origin()
def attach_expected_report(report_id):
    try:
        session = get_session()
        data = request.json

        report = session.query(CMIExpectedReport).filter_by(id=report_id).first()
        if not report:
            return jsonify({'status': 'error', 'message': 'Report not found'}), 404

        attach_to_id = data.get('attach_to_campaign_id')
        if attach_to_id:
            report.attached_to_campaign_id = attach_to_id
            report.is_standalone = False
        else:
            report.attached_to_campaign_id = None
            report.is_standalone = True

        report.status = 'attached' if attach_to_id else 'standalone'
        report.updated_at = datetime.utcnow()

        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Report attached successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@expected_reports_bp.route('/expected/<int:report_id>/detach', methods=['POST'])
@cross_origin()
def detach_expected_report(report_id):
    try:
        session = get_session()

        report = session.query(CMIExpectedReport).filter_by(id=report_id).first()
        if not report:
            return jsonify({'status': 'error', 'message': 'Report not found'}), 404

        report.attached_to_campaign_id = None
        report.is_standalone = False
        report.is_matched = False
        report.match_type = None
        report.status = 'pending'
        report.updated_at = datetime.utcnow()

        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Report detached successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@expected_reports_bp.route('/expected/<int:report_id>/agg-values', methods=['POST'])
@cross_origin()
def set_agg_values(report_id):
    try:
        session = get_session()
        data = request.json

        report = session.query(CMIExpectedReport).filter_by(id=report_id).first()
        if not report:
            return jsonify({'status': 'error', 'message': 'Report not found'}), 404

        if data.get('agg_metric'):
            report.agg_metric = data['agg_metric']
        if data.get('agg_value') is not None:
            report.agg_value = data['agg_value']

        report.updated_at = datetime.utcnow()

        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'AGG values updated successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@expected_reports_bp.route('/expected/<int:report_id>/move-to-due', methods=['POST'])
@cross_origin()
def move_to_due(report_id):
    try:
        session = get_session()
        data = request.json or {}

        report = session.query(CMIExpectedReport).filter_by(id=report_id).first()
        if not report:
            return jsonify({'status': 'error', 'message': 'Report not found'}), 404

        assigned_campaign_id = data.get('assigned_campaign_id')
        assigned_campaign_name = data.get('assigned_campaign_name')
        assigned_send_date = data.get('assigned_send_date')
        notes = data.get('notes')

        if assigned_campaign_name:
            report.assigned_campaign_name = assigned_campaign_name
        if assigned_send_date:
            report.assigned_send_date = datetime.strptime(assigned_send_date, '%Y-%m-%d').date()
        if assigned_campaign_id:
            report.matched_campaign_id = assigned_campaign_id

        if notes:
            if report.notes:
                report.notes = f"{report.notes}\n---\n{notes}"
            else:
                report.notes = notes

        report.is_matched = True
        report.match_type = 'manual_move_to_due'
        report.status = 'moved_to_due'
        report.updated_at = datetime.utcnow()

        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Report moved to due this week'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@expected_reports_bp.route('/expected/auto-match', methods=['POST'])
@cross_origin()
def auto_match_expected_reports():
    try:
        session = get_session()
        week_start, week_end = get_current_reporting_week()

        expected_reports = session.query(CMIExpectedReport).filter(
            CMIExpectedReport.reporting_week_start == week_start,
            CMIExpectedReport.is_matched == False
        ).all()

        metadata_records = session.query(CampaignReportingMetadata).all()

        metadata_by_placement = {}
        for m in metadata_records:
            if m.cmi_placement_id:
                metadata_by_placement[str(m.cmi_placement_id)] = m

        matched_count = 0
        for report in expected_reports:
            if report.cmi_placement_id and str(report.cmi_placement_id) in metadata_by_placement:
                matched_meta = metadata_by_placement[str(report.cmi_placement_id)]
                report.matched_metadata_id = matched_meta.id
                report.is_matched = True
                report.match_type = 'auto_placement_id'
                report.status = 'matched'
                report.updated_at = datetime.utcnow()
                matched_count += 1

        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'matched_count': matched_count,
            'message': f'Auto-matched {matched_count} expected reports'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@expected_reports_bp.route('/expected/no-data', methods=['GET'])
@cross_origin()
def get_no_data_reports():
    try:
        session = get_session()
        week_start, week_end = get_current_reporting_week()

        week_param = request.args.get('week')
        if week_param:
            week_start = datetime.strptime(week_param, '%Y-%m-%d').date()

        reports = session.query(CMIExpectedReport).filter(
            CMIExpectedReport.reporting_week_start == week_start,
            CMIExpectedReport.is_matched == False,
            CMIExpectedReport.status.in_(['pending', 'no_data'])
        ).order_by(
            CMIExpectedReport.data_type,
            CMIExpectedReport.brand_name
        ).all()

        contract_values = session.query(CMIContractValue).all()
        contracts_by_placement = {}
        for cv in contract_values:
            if cv.placement_id:
                contracts_by_placement[str(cv.placement_id)] = {
                    'contract_number': cv.contract_number,
                    'client': cv.client,
                    'brand': cv.brand,
                    'vehicle': cv.vehicle,
                    'placement_description': cv.placement_description,
                    'buy_component_type': cv.buy_component_type,
                    'frequency': cv.frequency,
                    'metric': cv.metric,
                    'data_type': cv.data_type,
                    'notes': cv.notes
                }

        pld_and_agg = []
        pld_only = []
        agg_only = []

        placement_types = {}
        for r in reports:
            pid = r.cmi_placement_id
            if pid not in placement_types:
                placement_types[pid] = set()
            if r.data_type:
                placement_types[pid].add(r.data_type.upper())

        for r in reports:
            contract_data = contracts_by_placement.get(str(r.cmi_placement_id), {})

            report_dict = {
                'id': r.id,
                'cmi_placement_id': r.cmi_placement_id,
                'client_placement_id': r.client_placement_id,
                'contract_number': r.contract_number or contract_data.get('contract_number'),
                'client_name': r.client_name or contract_data.get('client'),
                'brand_name': r.brand_name or contract_data.get('brand'),
                'supplier': r.supplier,
                'vehicle_name': r.vehicle_name or contract_data.get('vehicle'),
                'placement_description': r.placement_description or contract_data.get('placement_description'),
                'data_type': r.data_type,
                'expected_data_frequency': r.expected_data_frequency or contract_data.get('frequency'),
                'reporting_week_start': r.reporting_week_start.isoformat() if r.reporting_week_start else None,
                'reporting_week_end': r.reporting_week_end.isoformat() if r.reporting_week_end else None,
                'is_agg_only': r.is_agg_only,
                'agg_metric': r.agg_metric or contract_data.get('metric'),
                'agg_value': r.agg_value,
                'status': r.status,
                'buy_component_type': contract_data.get('buy_component_type'),
                'contract_notes': contract_data.get('notes'),
                'contract_metric': contract_data.get('metric'),
                'has_contract_match': bool(contract_data)
            }

            contract_data_type = contract_data.get('data_type', '').upper() if contract_data else ''
            report_data_type = (r.data_type or '').upper()

            if contract_data_type:
                if contract_data_type == 'AGG':
                    if report_data_type == 'AGG':
                        report_dict['is_agg_only'] = True
                        agg_only.append(report_dict)
                elif contract_data_type in ('PLD & AGG', 'PLD AND AGG', 'PLD&AGG'):
                    pld_and_agg.append(report_dict)
                elif contract_data_type == 'PLD':
                    if report_data_type == 'PLD':
                        pld_only.append(report_dict)
                else:
                    pld_and_agg.append(report_dict)
            else:
                types_for_placement = placement_types.get(r.cmi_placement_id, set())

                if 'PLD' in types_for_placement and 'AGG' in types_for_placement:
                    pld_and_agg.append(report_dict)
                elif 'PLD' in types_for_placement:
                    pld_only.append(report_dict)
                elif 'AGG' in types_for_placement:
                    report_dict['is_agg_only'] = True
                    agg_only.append(report_dict)
                else:
                    if r.data_type and r.data_type.upper() == 'AGG':
                        report_dict['is_agg_only'] = True
                        agg_only.append(report_dict)
                    else:
                        pld_and_agg.append(report_dict)

        session.close()

        return jsonify({
            'status': 'success',
            'week_start': week_start.isoformat(),
            'pld_and_agg': pld_and_agg,
            'pld_only': pld_only,
            'agg_only': agg_only,
            'total': len(reports)
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500