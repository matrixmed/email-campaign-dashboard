from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from models import CMIReportResult
from datetime import datetime
import os

cmi_reports_bp = Blueprint('cmi_reports', __name__)

def get_session():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()

@cmi_reports_bp.route('/reports/week/<week_start>', methods=['GET'])
@cross_origin()
def get_reports_by_week(week_start):
    """Get all CMI reports for a specific week"""
    try:
        session = get_session()

        # Parse the week_start date (format: YYYY-MM-DD)
        week_date = datetime.strptime(week_start, '%Y-%m-%d').date()

        reports = session.query(CMIReportResult).filter(
            CMIReportResult.reporting_week_start == week_date
        ).order_by(
            CMIReportResult.report_category,
            CMIReportResult.brand_name
        ).all()

        result = [{
            'id': r.id,
            'campaign_id': r.campaign_id,
            'campaign_name': r.campaign_name,
            'standardized_campaign_name': r.standardized_campaign_name,
            'send_date': r.send_date.isoformat() if r.send_date else None,
            'reporting_week_start': r.reporting_week_start.isoformat() if r.reporting_week_start else None,
            'reporting_week_end': r.reporting_week_end.isoformat() if r.reporting_week_end else None,
            'report_category': r.report_category,
            'match_confidence': r.match_confidence,
            'cmi_placement_id': r.cmi_placement_id,
            'client_id': r.client_id,
            'client_placement_id': r.client_placement_id,
            'placement_description': r.placement_description,
            'supplier': r.supplier,
            'brand_name': r.brand_name,
            'vehicle_name': r.vehicle_name,
            'target_list_id': r.target_list_id,
            'creative_code': r.creative_code,
            'gcm_placement_id': r.gcm_placement_id,
            'gcm_placement_id2': r.gcm_placement_id2,
            'contract_number': r.contract_number,
            'data_type': r.data_type,
            'expected_data_frequency': r.expected_data_frequency,
            'buy_component_type': r.buy_component_type,
            'is_reportable': r.is_reportable,
            'notes': r.notes,
            'requires_manual_review': r.requires_manual_review,
            'is_submitted': r.is_submitted,
            'submitted_at': r.submitted_at.isoformat() if r.submitted_at else None,
            'submitted_by': r.submitted_by,
            'created_at': r.created_at.isoformat() if r.created_at else None,
            'updated_at': r.updated_at.isoformat() if r.updated_at else None
        } for r in reports]

        session.close()

        return jsonify({
            'status': 'success',
            'week_start': week_start,
            'reports': result,
            'count': len(result)
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@cmi_reports_bp.route('/reports/<int:report_id>/submit', methods=['PUT', 'OPTIONS'])
@cross_origin()
def update_submission_status(report_id):
    """Update the submission status of a CMI report"""
    try:
        data = request.json
        session = get_session()

        report = session.query(CMIReportResult).filter_by(id=report_id).first()

        if not report:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Report not found'
            }), 404

        # Update submission status
        is_submitted = data.get('is_submitted', False)
        report.is_submitted = is_submitted

        if is_submitted:
            report.submitted_at = datetime.utcnow()
            report.submitted_by = data.get('submitted_by', 'user')
        else:
            # If unmarking as submitted, clear the submission data
            report.submitted_at = None
            report.submitted_by = None

        report.updated_at = datetime.utcnow()

        # Get values before closing session
        result_data = {
            'status': 'success',
            'message': 'Submission status updated successfully',
            'is_submitted': report.is_submitted,
            'submitted_at': report.submitted_at.isoformat() if report.submitted_at else None
        }

        session.commit()
        session.close()

        return jsonify(result_data), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@cmi_reports_bp.route('/reports/week/<week_start>/submit', methods=['PUT', 'OPTIONS'])
@cross_origin()
def submit_entire_week(week_start):
    """Mark all reports for a specific week as submitted"""
    try:
        data = request.json
        session = get_session()

        week_date = datetime.strptime(week_start, '%Y-%m-%d').date()

        reports = session.query(CMIReportResult).filter(
            CMIReportResult.reporting_week_start == week_date
        ).all()

        if not reports:
            session.close()
            return jsonify({
                'status': 'error',
                'message': f'No reports found for week {week_start}'
            }), 404

        is_submitted = data.get('is_submitted', True)
        submitted_by = data.get('submitted_by', 'user')

        updated_count = 0
        for report in reports:
            report.is_submitted = is_submitted
            if is_submitted:
                report.submitted_at = datetime.utcnow()
                report.submitted_by = submitted_by
            else:
                report.submitted_at = None
                report.submitted_by = None
            report.updated_at = datetime.utcnow()
            updated_count += 1

        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': f'Updated {updated_count} reports for week {week_start}',
            'updated_count': updated_count,
            'is_submitted': is_submitted
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@cmi_reports_bp.route('/reports/category/<category>', methods=['GET'])
@cross_origin()
def get_reports_by_category(category):
    """Get all reports by category (confirmed_match, no_data, aggregate_investigation)"""
    try:
        session = get_session()

        reports = session.query(CMIReportResult).filter(
            CMIReportResult.report_category == category
        ).order_by(
            CMIReportResult.reporting_week_start.desc(),
            CMIReportResult.brand_name
        ).all()

        result = [{
            'id': r.id,
            'campaign_name': r.campaign_name,
            'brand_name': r.brand_name,
            'reporting_week_start': r.reporting_week_start.isoformat() if r.reporting_week_start else None,
            'report_category': r.report_category,
            'is_submitted': r.is_submitted,
            'submitted_at': r.submitted_at.isoformat() if r.submitted_at else None,
            'cmi_placement_id': r.cmi_placement_id,
            'data_type': r.data_type
        } for r in reports]

        session.close()

        return jsonify({
            'status': 'success',
            'category': category,
            'reports': result,
            'count': len(result)
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@cmi_reports_bp.route('/reports/stats', methods=['GET'])
@cross_origin()
def get_reports_stats():
    """Get statistics about CMI reports"""
    try:
        session = get_session()

        # Get counts by category
        confirmed = session.query(CMIReportResult).filter(
            CMIReportResult.report_category == 'confirmed_match'
        ).count()

        no_data = session.query(CMIReportResult).filter(
            CMIReportResult.report_category == 'no_data'
        ).count()

        aggregate = session.query(CMIReportResult).filter(
            CMIReportResult.report_category == 'aggregate_investigation'
        ).count()

        # Get submission stats
        total_reports = session.query(CMIReportResult).count()
        submitted_reports = session.query(CMIReportResult).filter(
            CMIReportResult.is_submitted == True
        ).count()

        pending_reports = total_reports - submitted_reports

        session.close()

        return jsonify({
            'status': 'success',
            'stats': {
                'by_category': {
                    'confirmed_match': confirmed,
                    'no_data': no_data,
                    'aggregate_investigation': aggregate
                },
                'by_submission': {
                    'total': total_reports,
                    'submitted': submitted_reports,
                    'pending': pending_reports
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@cmi_reports_bp.route('/reports/all', methods=['GET'])
@cross_origin()
def get_all_reports():
    """
    Get all reports with optional filtering
    Query params:
    - days_back: Number of days to look back (default: 21)
    - brand: Filter by brand name
    - agency: Filter by agency
    - batch: Filter by batch (validated, no_data, investigation, unexpected, non_cmi)
    - is_cmi: Filter CMI brands only (true/false)
    """
    try:
        from datetime import datetime, timedelta
        session = get_session()

        # Get query parameters
        days_back = request.args.get('days_back', 21, type=int)
        brand_filter = request.args.get('brand')
        agency_filter = request.args.get('agency')
        batch_filter = request.args.get('batch')
        is_cmi_filter = request.args.get('is_cmi')

        # Calculate date cutoff - use reporting week, not send date
        cutoff_date = (datetime.now() - timedelta(days=days_back)).date()

        # Build query - filter by reporting_week_start
        from sqlalchemy import or_
        query = session.query(CMIReportResult).filter(
            or_(
                CMIReportResult.reporting_week_start >= cutoff_date,
                CMIReportResult.reporting_week_start.is_(None)
            )
        )

        # Apply filters
        if brand_filter:
            query = query.filter(CMIReportResult.brand_name.ilike(f'%{brand_filter}%'))
        if agency_filter:
            query = query.filter(CMIReportResult.agency.ilike(f'%{agency_filter}%'))
        if batch_filter:
            query = query.filter(CMIReportResult.batch == batch_filter)
        if is_cmi_filter is not None:
            is_cmi_bool = is_cmi_filter.lower() == 'true'
            query = query.filter(CMIReportResult.is_cmi_brand == is_cmi_bool)

        # Order by reporting week descending, then send date
        reports = query.order_by(
            CMIReportResult.reporting_week_start.desc().nullslast(),
            CMIReportResult.send_date.desc().nullslast()
        ).all()

        # Format for frontend (matching old JSON structure)
        result = []
        for r in reports:
            report_data = {
                'id': r.id,  # Database ID for submissions
                'campaign_id': r.campaign_id or r.campaign_name,
                'campaign_name': r.campaign_name,
                'brand': r.brand_name,
                'agency': r.agency,
                'send_date': r.send_date.strftime('%Y-%m-%d') if r.send_date else None,
                'monday_date': r.reporting_week_start.strftime('%Y-%m-%d') if r.reporting_week_start else None,
                'is_no_data_report': r.batch == 'no_data',
                'batch': r.batch,
                'is_cmi_brand': r.is_cmi_brand,
                'match_confidence': r.match_confidence,
                'is_submitted': r.is_submitted,
                'submitted_at': r.submitted_at.strftime('%Y-%m-%d %H:%M:%S') if r.submitted_at else None
            }

            # Add CMI metadata if this is a CMI brand
            if r.is_cmi_brand and r.cmi_placement_id:
                # Calculate dates for CMI metadata
                if r.reporting_week_start and r.reporting_week_end:
                    week_start = r.reporting_week_start
                    week_end = r.reporting_week_end
                    previous_monday = week_start - timedelta(days=7)

                    report_data['cmi_metadata'] = {
                        'Brand_Name': r.brand_name or '',
                        'Vehicle_Name': r.vehicle_name or '',
                        'Supplier': r.supplier or '',
                        'CMI_PlacementID': r.cmi_placement_id or '',
                        'Client_PlacementID': r.client_placement_id or '',
                        'Client_ID': r.client_id or '',
                        'TargetListID': r.target_list_id or '',
                        'Creative_Code': r.creative_code or '',
                        'GCM_Placement_ID': r.gcm_placement_id or '',
                        'GCM_Placement_ID2': r.gcm_placement_id2 or '',
                        'Placement_Description': r.placement_description or '',
                        'contract_number': r.contract_number or '',
                        'Buy_Component_Type': r.buy_component_type or '',
                        'Campaign_Type': 'email',
                        'placement_id': r.cmi_placement_id or '',
                        'target_list_id': r.target_list_id or '',
                        'creative_code': r.creative_code or '',
                        'match_confidence': r.match_confidence
                    }

            result.append(report_data)

        session.close()

        print(f"[API] Returning {len(result)} reports")
        if result:
            print(f"[API] Sample report: {result[0].get('campaign_name', 'N/A')[:50]}...")

        return jsonify(result), 200

    except Exception as e:
        import traceback
        print(f"[API ERROR] Error in get_all_reports: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
