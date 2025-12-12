from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, or_, and_, func
from models import (
    CampaignReportManager,
    CampaignReportingMetadata,
    CMIContractValue,
    CMIExpectedReport
)
from datetime import datetime, timedelta
import os

unified_reports_bp = Blueprint('unified_reports', __name__)

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


CLIENT_ID_MAPPINGS = {
    "Lilly": "contact_lilly_id",
    "J&J": "contact_j&j_id",
    "AstraZeneca": "contact_astrazeneca_id",
    "Abbvie": "contact_abbvie_id",
    "BI": "contact_bi_id",
    "DG": "contact_dg_id",
    "DSI": "contact_dsi_id"
}


def get_client_id_field(client_name):
    if not client_name:
        return None
    for key, value in CLIENT_ID_MAPPINGS.items():
        if key.lower() in client_name.lower():
            return value
    return None


@unified_reports_bp.route('/due-this-week', methods=['GET'])
@cross_origin()
def get_due_this_week():
    try:
        session = get_session()
        week_start, week_end = get_current_reporting_week()

        week_param = request.args.get('week')
        if week_param:
            week_start = datetime.strptime(week_param, '%Y-%m-%d').date()
            week_end = week_start + timedelta(days=6)

        days_back = request.args.get('days_back', 21, type=int)
        cutoff_date = (datetime.now() - timedelta(days=days_back)).date()

        campaigns = session.query(CampaignReportManager).filter(
            or_(
                CampaignReportManager.reporting_week_start >= cutoff_date,
                CampaignReportManager.reporting_week_start.is_(None)
            ),
            CampaignReportManager.batch != 'no_data' 
        ).all()

        metadata_records = session.query(CampaignReportingMetadata).all()
        metadata_lookup = {}
        for m in metadata_records:
            key = f"{(m.campaign_name or '').lower().strip()}_{m.send_date}"
            metadata_lookup[key] = m
            if m.campaign_id:
                metadata_lookup[f"id_{m.campaign_id}"] = m

        contracts = session.query(CMIContractValue).all()
        contracts_by_placement = {}
        for c in contracts:
            if c.placement_id:
                contracts_by_placement[str(c.placement_id)] = c

        expected_reports = session.query(CMIExpectedReport).filter(
            CMIExpectedReport.reporting_week_start == week_start
        ).all()
        expected_placement_ids = {str(e.cmi_placement_id) for e in expected_reports if e.cmi_placement_id}

        result = []
        for campaign in campaigns:
            campaign_name_normalized = (campaign.campaign_name or '').lower().strip()
            send_date = campaign.send_date.date() if campaign.send_date else None

            metadata_key = f"{campaign_name_normalized}_{send_date}"
            metadata = metadata_lookup.get(metadata_key) or metadata_lookup.get(f"id_{campaign.campaign_id}")

            placement_id = campaign.cmi_placement_id or (metadata.cmi_placement_id if metadata else None)

            contract = contracts_by_placement.get(str(placement_id)) if placement_id else None

            is_cmi_expected = str(placement_id) in expected_placement_ids if placement_id else False

            report_data = {
                'id': campaign.id,
                'campaign_name': campaign.campaign_name,
                'send_date': campaign.send_date.strftime('%Y-%m-%d') if campaign.send_date else None,
                'brand': campaign.brand_name,
                'agency': campaign.agency,
                'batch': campaign.batch,
                'is_submitted': campaign.is_submitted,
                'reporting_week_start': campaign.reporting_week_start.isoformat() if campaign.reporting_week_start else None,

                'cmi_placement_id': placement_id,
                'client_placement_id': metadata.client_placement_id if metadata else campaign.client_placement_id,
                'target_list_id': metadata.target_list_id if metadata else campaign.target_list_id,
                'creative_code': metadata.creative_code if metadata else campaign.creative_code,
                'gcm_placement_id': metadata.gcm_placement_id if metadata else campaign.gcm_placement_id,
                'gcm_placement_id2': metadata.gcm_placement_id2 if metadata else campaign.gcm_placement_id2,
                'supplier': metadata.supplier if metadata else campaign.supplier,
                'vehicle_name': metadata.vehicle_name if metadata else campaign.vehicle_name,
                'placement_description': metadata.placement_description if metadata else campaign.placement_description,

                'has_client_id': bool(metadata.client_id if metadata else campaign.client_id),
                'client_id_field': None, 

                'buy_component_type': contract.buy_component_type if contract else campaign.buy_component_type,
                'contract_number': contract.contract_number if contract else campaign.contract_number,
                'client': contract.client if contract else None,
                'frequency': contract.frequency if contract else campaign.expected_data_frequency,
                'contract_metric': contract.metric if contract else None,
                'contract_notes': contract.notes if contract else None,

                'has_metadata': metadata is not None,
                'has_contract': contract is not None,
                'is_cmi_expected': is_cmi_expected,

                'match_confidence': campaign.match_confidence
            }

            client_name = contract.client if contract else None
            if client_name:
                report_data['client_id_field'] = get_client_id_field(client_name)

            result.append(report_data)

        session.close()

        return jsonify({
            'status': 'success',
            'week_start': week_start.isoformat(),
            'week_end': week_end.isoformat(),
            'reports': result,
            'count': len(result)
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@unified_reports_bp.route('/no-data', methods=['GET'])
@cross_origin()
def get_no_data_reports():
    try:
        session = get_session()
        week_start, week_end = get_current_reporting_week()

        week_param = request.args.get('week')
        if week_param:
            week_start = datetime.strptime(week_param, '%Y-%m-%d').date()
            week_end = week_start + timedelta(days=6)

        expected_reports = session.query(CMIExpectedReport).filter(
            CMIExpectedReport.reporting_week_start == week_start
        ).all()

        contracts = session.query(CMIContractValue).all()
        contracts_by_placement = {}
        for c in contracts:
            if c.placement_id:
                contracts_by_placement[str(c.placement_id)] = c

        campaigns_with_data = session.query(CampaignReportManager).filter(
            CampaignReportManager.reporting_week_start == week_start,
            CampaignReportManager.batch != 'no_data'
        ).all()

        metadata_records = session.query(CampaignReportingMetadata).all()

        placement_ids_with_data = set()
        for c in campaigns_with_data:
            if c.cmi_placement_id:
                placement_ids_with_data.add(str(c.cmi_placement_id))
        for m in metadata_records:
            if m.cmi_placement_id:
                placement_ids_with_data.add(str(m.cmi_placement_id))

        grouped = {}
        for report in expected_reports:
            pid = str(report.cmi_placement_id) if report.cmi_placement_id else f"unknown_{report.id}"
            if pid not in grouped:
                grouped[pid] = {
                    'reports': [],
                    'data_types': set()
                }
            grouped[pid]['reports'].append(report)
            if report.data_type:
                grouped[pid]['data_types'].add(report.data_type.upper())

        pld_and_agg = []
        agg_only = []
        matched_reports = []  

        for placement_id, group in grouped.items():
            has_data = placement_id in placement_ids_with_data

            contract = contracts_by_placement.get(placement_id)

            rep_report = group['reports'][0]

            report_data = {
                'id': rep_report.id,
                'cmi_placement_id': rep_report.cmi_placement_id,
                'client_placement_id': rep_report.client_placement_id,
                'brand': contract.brand if contract else rep_report.brand_name,
                'vehicle': contract.vehicle if contract else rep_report.vehicle_name,
                'supplier': rep_report.supplier,
                'placement_description': contract.placement_description if contract else rep_report.placement_description,
                'data_types': list(group['data_types']),
                'reporting_week_start': rep_report.reporting_week_start.isoformat() if rep_report.reporting_week_start else None,

                'contract_number': contract.contract_number if contract else rep_report.contract_number,
                'client': contract.client if contract else rep_report.client_name,
                'buy_component_type': contract.buy_component_type if contract else rep_report.buy_type,
                'frequency': (contract.frequency if contract and contract.frequency else None) or rep_report.expected_data_frequency,
                'contract_metric': (contract.metric if contract and contract.metric else None) or rep_report.agg_metric,
                'contract_notes': contract.notes if contract else rep_report.notes,
                'has_contract_match': contract is not None,

                'is_agg_only': rep_report.is_agg_only,
                'agg_metric': rep_report.agg_metric,
                'agg_value': rep_report.agg_value,
                'status': rep_report.status
            }

            if has_data:
                matched_reports.append(report_data)
            else:
                has_pld = 'PLD' in group['data_types'] or 'DETAIL' in group['data_types']
                has_agg = 'AGG' in group['data_types'] or 'AGGREGATE' in group['data_types']

                if has_pld:
                    pld_and_agg.append(report_data)
                elif has_agg:
                    report_data['is_agg_only'] = True
                    agg_only.append(report_data)

        pld_and_agg.sort(key=lambda x: (x.get('brand') or '').lower())
        agg_only.sort(key=lambda x: (x.get('brand') or '').lower())

        all_expected_placement_ids = list({str(e.cmi_placement_id) for e in expected_reports if e.cmi_placement_id})

        session.close()

        return jsonify({
            'status': 'success',
            'week_start': week_start.isoformat(),
            'week_end': week_end.isoformat(),
            'pld_and_agg': pld_and_agg,
            'agg_only': agg_only,
            'matched_placement_ids': list(placement_ids_with_data),
            'all_expected_placement_ids': all_expected_placement_ids,
            'total_expected': len(expected_reports),
            'total_no_data': len(pld_and_agg) + len(agg_only)
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@unified_reports_bp.route('/batch-json', methods=['POST'])
@cross_origin()
def generate_batch_json():
    try:
        data = request.json
        campaign_ids = data.get('campaign_ids', [])
        attached_aggs = data.get('attached_aggs', {})
        standalone_aggs = data.get('standalone_aggs', [])

        session = get_session()
        week_start, week_end = get_current_reporting_week()

        campaigns = session.query(CampaignReportManager).filter(
            CampaignReportManager.id.in_(campaign_ids)
        ).all()

        metadata_records = session.query(CampaignReportingMetadata).all()
        metadata_lookup = {}
        for m in metadata_records:
            key = f"{(m.campaign_name or '').lower().strip()}_{m.send_date}"
            metadata_lookup[key] = m

        contracts = session.query(CMIContractValue).all()
        contracts_by_placement = {str(c.placement_id): c for c in contracts if c.placement_id}

        batch_records = []

        for campaign in campaigns:
            campaign_name_normalized = (campaign.campaign_name or '').lower().strip()
            send_date = campaign.send_date.date() if campaign.send_date else None
            metadata = metadata_lookup.get(f"{campaign_name_normalized}_{send_date}")

            placement_id = campaign.cmi_placement_id or (metadata.cmi_placement_id if metadata else None)
            contract = contracts_by_placement.get(str(placement_id)) if placement_id else None

            client_id_field = ""
            if contract and contract.client:
                client_id_field = get_client_id_field(contract.client) or ""

            record = {
                "folder": week_start.strftime("%B").lower(),
                "dateOfSubmission": datetime.now().strftime("%m%d%Y"),
                "mondayDate": week_start.strftime("%m%d%Y"),
                "mondaydate": week_start.strftime("%m/%d/%Y"),
                "start_date": f"{week_start}T00:00:00",
                "end_date": f"{week_end}T23:59:59",

                "internal_campaign_name": campaign.campaign_name or "",
                "client_campaign_name": "",

                "TargetListID": metadata.target_list_id if metadata else campaign.target_list_id or "",
                "CMI_PlacementID": placement_id or "",
                "Client_PlacementID": metadata.client_placement_id if metadata else campaign.client_placement_id or "",
                "Creative_Code": metadata.creative_code if metadata else campaign.creative_code or "",
                "GCM_Placement_ID": metadata.gcm_placement_id if metadata else campaign.gcm_placement_id or "",
                "GCM_Placement_ID2": metadata.gcm_placement_id2 if metadata else campaign.gcm_placement_id2 or "",
                "Client_ID": client_id_field,

                "finalFileName": f"{campaign.brand_name or 'Unknown'}_PLD_{contract.contract_number if contract else ''}_",
                "aggFileName": f"{campaign.brand_name or 'Unknown'}_AGG_{contract.contract_number if contract else ''}_",

                "Brand_Name": campaign.brand_name or "",
                "Supplier": metadata.supplier if metadata else campaign.supplier or "",
                "Vehicle_Name": metadata.vehicle_name if metadata else campaign.vehicle_name or "",
                "Placement_Description": metadata.placement_description if metadata else campaign.placement_description or "",

                "Buy_Component_Type": contract.buy_component_type if contract else campaign.buy_component_type or "",
                "Campaign_Type": "email",  

                "_metadata_source": "unified_api",
                "_match_confidence": campaign.match_confidence
            }

            campaign_aggs = attached_aggs.get(str(campaign.id), [])
            if campaign_aggs:
                record["attached_agg"] = []
                for agg in campaign_aggs:
                    agg_contract = contracts_by_placement.get(str(agg.get('cmi_placement_id')))
                    record["attached_agg"].append({
                        "CMI_PlacementID": agg.get('cmi_placement_id', ''),
                        "Client_PlacementID": agg.get('client_placement_id', ''),
                        "Brand_Name": agg.get('brand', ''),
                        "Vehicle_Name": agg.get('vehicle', ''),
                        "Placement_Description": agg_contract.placement_description if agg_contract else '',
                        "Buy_Component_Type": agg_contract.buy_component_type if agg_contract else '',
                        "contract_number": agg_contract.contract_number if agg_contract else '',
                        "metric": agg.get('agg_metric', agg_contract.metric if agg_contract else ''),
                        "value": agg.get('agg_value', '')
                    })

            batch_records.append(record)

        for agg in standalone_aggs:
            agg_contract = contracts_by_placement.get(str(agg.get('cmi_placement_id')))
            standalone_record = {
                "folder": week_start.strftime("%B").lower(),
                "dateOfSubmission": datetime.now().strftime("%m%d%Y"),
                "mondayDate": week_start.strftime("%m%d%Y"),
                "mondaydate": week_start.strftime("%m/%d/%Y"),
                "start_date": f"{week_start}T00:00:00",
                "end_date": f"{week_end}T23:59:59",

                "internal_campaign_name": f"Standalone AGG - {agg.get('brand', 'Unknown')}",
                "is_standalone_agg": True,

                "CMI_PlacementID": agg.get('cmi_placement_id', ''),
                "Client_PlacementID": agg.get('client_placement_id', ''),
                "Brand_Name": agg.get('brand', ''),
                "Vehicle_Name": agg.get('vehicle', ''),
                "Placement_Description": agg_contract.placement_description if agg_contract else '',
                "Buy_Component_Type": agg_contract.buy_component_type if agg_contract else '',
                "contract_number": agg_contract.contract_number if agg_contract else '',

                "aggFileName": f"{agg.get('brand', 'Unknown')}_AGG_{agg_contract.contract_number if agg_contract else ''}_",

                "agg_metric": agg.get('agg_metric', agg_contract.metric if agg_contract else ''),
                "agg_value": agg.get('agg_value', ''),

                "_metadata_source": "standalone_agg"
            }
            batch_records.append(standalone_record)

        session.close()

        return jsonify({
            'status': 'success',
            'records': batch_records,
            'count': len(batch_records),
            'week_start': week_start.isoformat()
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@unified_reports_bp.route('/contract-values', methods=['GET'])
@cross_origin()
def get_contract_values():
    try:
        session = get_session()
        year = request.args.get('year', 2025, type=int)

        contracts = session.query(CMIContractValue).filter(
            CMIContractValue.year == year
        ).all()

        result = [{
            'placement_id': c.placement_id,
            'contract_number': c.contract_number,
            'client': c.client,
            'brand': c.brand,
            'vehicle': c.vehicle,
            'placement_description': c.placement_description,
            'buy_component_type': c.buy_component_type,
            'frequency': c.frequency,
            'metric': c.metric,
            'data_type': c.data_type,
            'notes': c.notes
        } for c in contracts]

        session.close()

        return jsonify({
            'status': 'success',
            'contracts': result,
            'count': len(result)
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500