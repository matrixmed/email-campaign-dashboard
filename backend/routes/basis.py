from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, func, desc
from models import (
    BasisCampaign, BasisLineItem, BasisVendor, BasisProperty,
    BasisDailyStats, BasisRecommendation, BasisRecommendationImpact, BasisSyncLog
)
from datetime import datetime, timedelta
import os

basis_bp = Blueprint('basis', __name__)

def get_session():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()


@basis_bp.route('/recommendations', methods=['GET'])
def get_recommendations():
    try:
        session = get_session()

        status = request.args.get('status')
        rec_type = request.args.get('type')
        priority = request.args.get('priority')
        campaign_id = request.args.get('campaign_id')
        limit = request.args.get('limit', 50, type=int)

        query = session.query(BasisRecommendation)

        if status:
            query = query.filter(BasisRecommendation.status == status)
        if rec_type:
            query = query.filter(BasisRecommendation.recommendation_type == rec_type)
        if priority:
            query = query.filter(BasisRecommendation.priority == priority)
        if campaign_id:
            query = query.filter(BasisRecommendation.basis_campaign_id == campaign_id)

        recommendations = query.order_by(
            desc(BasisRecommendation.recommendation_date),
            desc(BasisRecommendation.priority == 'high'),
            desc(BasisRecommendation.confidence_score)
        ).limit(limit).all()

        result = []
        for rec in recommendations:
            result.append({
                'id': rec.id,
                'recommendation_date': rec.recommendation_date.isoformat() if rec.recommendation_date else None,
                'recommendation_type': rec.recommendation_type,
                'category': rec.category,
                'priority': rec.priority,
                'campaign_id': rec.basis_campaign_id,
                'campaign_name': rec.campaign_name,
                'line_item_id': rec.basis_line_item_id,
                'line_item_name': rec.line_item_name,
                'vendor_name': rec.vendor_name,
                'property_name': rec.property_name,
                'title': rec.title,
                'description': rec.description,
                'rationale': rec.rationale,
                'action_items': rec.action_items,
                'expected_impact': rec.expected_impact,
                'baseline_metrics': rec.baseline_metrics,
                'benchmark_metrics': rec.benchmark_metrics,
                'confidence_score': rec.confidence_score,
                'status': rec.status,
                'implemented_at': rec.implemented_at.isoformat() if rec.implemented_at else None,
                'implemented_by': rec.implemented_by,
                'implementation_notes': rec.implementation_notes,
                'impact_measured': rec.impact_measured,
                'impact_status': rec.impact_status,
                'impact_summary': rec.impact_summary,
                'created_at': rec.created_at.isoformat() if rec.created_at else None
            })

        session.close()
        return jsonify({'status': 'success', 'recommendations': result}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/recommendations/<int:rec_id>', methods=['GET'])
def get_recommendation_detail(rec_id):
    try:
        session = get_session()
        rec = session.query(BasisRecommendation).filter_by(id=rec_id).first()

        if not rec:
            session.close()
            return jsonify({'status': 'error', 'message': 'Recommendation not found'}), 404

        impact = session.query(BasisRecommendationImpact).filter_by(
            recommendation_id=rec_id
        ).order_by(desc(BasisRecommendationImpact.measurement_date)).first()

        result = {
            'id': rec.id,
            'recommendation_date': rec.recommendation_date.isoformat() if rec.recommendation_date else None,
            'recommendation_type': rec.recommendation_type,
            'category': rec.category,
            'priority': rec.priority,
            'campaign_id': rec.basis_campaign_id,
            'campaign_name': rec.campaign_name,
            'line_item_id': rec.basis_line_item_id,
            'line_item_name': rec.line_item_name,
            'vendor_name': rec.vendor_name,
            'property_name': rec.property_name,
            'title': rec.title,
            'description': rec.description,
            'rationale': rec.rationale,
            'action_items': rec.action_items,
            'expected_impact': rec.expected_impact,
            'baseline_metrics': rec.baseline_metrics,
            'benchmark_metrics': rec.benchmark_metrics,
            'confidence_score': rec.confidence_score,
            'status': rec.status,
            'approved_at': rec.approved_at.isoformat() if rec.approved_at else None,
            'approved_by': rec.approved_by,
            'implemented_at': rec.implemented_at.isoformat() if rec.implemented_at else None,
            'implemented_by': rec.implemented_by,
            'implementation_notes': rec.implementation_notes,
            'dismissed_at': rec.dismissed_at.isoformat() if rec.dismissed_at else None,
            'dismissed_by': rec.dismissed_by,
            'dismissed_reason': rec.dismissed_reason,
            'impact_measured': rec.impact_measured,
            'impact_status': rec.impact_status,
            'impact_summary': rec.impact_summary,
            'created_at': rec.created_at.isoformat() if rec.created_at else None,
            'impact': None
        }

        if impact:
            result['impact'] = {
                'id': impact.id,
                'measurement_date': impact.measurement_date.isoformat() if impact.measurement_date else None,
                'measurement_period': impact.measurement_period,
                'implementation_validated': impact.implementation_validated,
                'validation_method': impact.validation_method,
                'baseline_metrics': impact.baseline_metrics,
                'post_implementation_metrics': impact.post_implementation_metrics,
                'metric_changes': impact.metric_changes,
                'impact_score': impact.impact_score,
                'impact_category': impact.impact_category,
                'success_summary': impact.success_summary,
                'lessons_learned': impact.lessons_learned,
                'follow_up_recommendations': impact.follow_up_recommendations
            }

        session.close()
        return jsonify({'status': 'success', 'recommendation': result}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/recommendations/<int:rec_id>/approve', methods=['PUT'])
def approve_recommendation(rec_id):
    try:
        session = get_session()
        rec = session.query(BasisRecommendation).filter_by(id=rec_id).first()

        if not rec:
            session.close()
            return jsonify({'status': 'error', 'message': 'Recommendation not found'}), 404

        data = request.get_json() or {}

        rec.status = 'approved'
        rec.approved_at = datetime.utcnow()
        rec.approved_by = data.get('approved_by', 'user')
        rec.updated_at = datetime.utcnow()

        session.commit()
        session.close()

        return jsonify({'status': 'success', 'message': 'Recommendation approved'}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/recommendations/<int:rec_id>/implement', methods=['PUT'])
def implement_recommendation(rec_id):
    try:
        session = get_session()
        rec = session.query(BasisRecommendation).filter_by(id=rec_id).first()

        if not rec:
            session.close()
            return jsonify({'status': 'error', 'message': 'Recommendation not found'}), 404

        data = request.get_json() or {}

        rec.status = 'implemented'
        rec.implemented_at = datetime.utcnow()
        rec.implemented_by = data.get('implemented_by', 'user')
        rec.implementation_notes = data.get('notes', '')
        rec.updated_at = datetime.utcnow()

        session.commit()
        session.close()

        return jsonify({'status': 'success', 'message': 'Recommendation marked as implemented'}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/recommendations/<int:rec_id>/dismiss', methods=['PUT'])
def dismiss_recommendation(rec_id):
    try:
        session = get_session()
        rec = session.query(BasisRecommendation).filter_by(id=rec_id).first()

        if not rec:
            session.close()
            return jsonify({'status': 'error', 'message': 'Recommendation not found'}), 404

        data = request.get_json() or {}

        rec.status = 'dismissed'
        rec.dismissed_at = datetime.utcnow()
        rec.dismissed_by = data.get('dismissed_by', 'user')
        rec.dismissed_reason = data.get('reason', '')
        rec.updated_at = datetime.utcnow()

        session.commit()
        session.close()

        return jsonify({'status': 'success', 'message': 'Recommendation dismissed'}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/impacts', methods=['GET'])
def get_impacts():
    try:
        session = get_session()

        category = request.args.get('category')
        limit = request.args.get('limit', 50, type=int)

        query = session.query(BasisRecommendationImpact)

        if category:
            query = query.filter(BasisRecommendationImpact.impact_category == category)

        impacts = query.order_by(
            desc(BasisRecommendationImpact.measurement_date)
        ).limit(limit).all()

        result = []
        for impact in impacts:
            rec = session.query(BasisRecommendation).filter_by(id=impact.recommendation_id).first()

            result.append({
                'id': impact.id,
                'recommendation_id': impact.recommendation_id,
                'recommendation_title': rec.title if rec else None,
                'recommendation_type': rec.recommendation_type if rec else None,
                'campaign_name': rec.campaign_name if rec else None,
                'measurement_date': impact.measurement_date.isoformat() if impact.measurement_date else None,
                'measurement_period': impact.measurement_period,
                'implementation_validated': impact.implementation_validated,
                'baseline_metrics': impact.baseline_metrics,
                'post_implementation_metrics': impact.post_implementation_metrics,
                'metric_changes': impact.metric_changes,
                'impact_score': impact.impact_score,
                'impact_category': impact.impact_category,
                'success_summary': impact.success_summary,
                'lessons_learned': impact.lessons_learned,
                'follow_up_recommendations': impact.follow_up_recommendations
            })

        session.close()
        return jsonify({'status': 'success', 'impacts': result}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/daily-stats', methods=['GET'])
def get_daily_stats():
    try:
        session = get_session()

        campaign_id = request.args.get('campaign_id')
        line_item_id = request.args.get('line_item_id')
        vendor_name = request.args.get('vendor')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 100, type=int)

        query = session.query(BasisDailyStats)

        if campaign_id:
            query = query.filter(BasisDailyStats.basis_campaign_id == campaign_id)
        if line_item_id:
            query = query.filter(BasisDailyStats.basis_line_item_id == line_item_id)
        if vendor_name:
            query = query.filter(BasisDailyStats.vendor_name == vendor_name)
        if start_date:
            query = query.filter(BasisDailyStats.report_date >= start_date)
        if end_date:
            query = query.filter(BasisDailyStats.report_date <= end_date)

        stats = query.order_by(desc(BasisDailyStats.report_date)).limit(limit).all()

        result = []
        for stat in stats:
            result.append({
                'id': stat.id,
                'report_date': stat.report_date.isoformat() if stat.report_date else None,
                'campaign_id': stat.basis_campaign_id,
                'campaign_name': stat.campaign_name,
                'line_item_id': stat.basis_line_item_id,
                'line_item_name': stat.line_item_name,
                'vendor_name': stat.vendor_name,
                'property_name': stat.property_name,
                'impressions': stat.impressions,
                'clicks': stat.clicks,
                'spend': stat.spend,
                'ecpm': stat.ecpm,
                'ecpc': stat.ecpc,
                'ecpa': stat.ecpa,
                'ctr': stat.ctr,
                'viewability_rate': stat.viewability_rate,
                'pacing_percentage': stat.pacing_percentage,
                'day_of_week': stat.day_of_week
            })

        session.close()
        return jsonify({'status': 'success', 'stats': result}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/benchmarks', methods=['GET'])
def get_benchmarks():
    try:
        session = get_session()

        days_back = request.args.get('days', 14, type=int)
        campaign_id = request.args.get('campaign_id')

        cutoff_date = datetime.utcnow().date() - timedelta(days=days_back)

        query = session.query(
            func.avg(BasisDailyStats.ecpc).label('avg_ecpc'),
            func.avg(BasisDailyStats.ctr).label('avg_ctr'),
            func.avg(BasisDailyStats.ecpm).label('avg_ecpm'),
            func.sum(BasisDailyStats.impressions).label('total_impressions'),
            func.sum(BasisDailyStats.clicks).label('total_clicks'),
            func.sum(BasisDailyStats.spend).label('total_spend'),
            func.count(BasisDailyStats.id).label('data_points')
        ).filter(BasisDailyStats.report_date >= cutoff_date)

        if campaign_id:
            query = query.filter(BasisDailyStats.basis_campaign_id == campaign_id)

        result = query.first()

        vendor_stats = session.query(
            BasisDailyStats.vendor_name,
            func.avg(BasisDailyStats.ecpc).label('avg_ecpc'),
            func.avg(BasisDailyStats.ctr).label('avg_ctr'),
            func.sum(BasisDailyStats.impressions).label('impressions'),
            func.sum(BasisDailyStats.spend).label('spend')
        ).filter(
            BasisDailyStats.report_date >= cutoff_date
        ).group_by(BasisDailyStats.vendor_name).all()

        vendors = []
        for v in vendor_stats:
            if v.vendor_name:
                vendors.append({
                    'vendor_name': v.vendor_name,
                    'avg_ecpc': float(v.avg_ecpc) if v.avg_ecpc else None,
                    'avg_ctr': float(v.avg_ctr) if v.avg_ctr else None,
                    'impressions': v.impressions,
                    'spend': float(v.spend) if v.spend else None
                })

        session.close()

        return jsonify({
            'status': 'success',
            'benchmarks': {
                'period_days': days_back,
                'avg_ecpc': float(result.avg_ecpc) if result.avg_ecpc else None,
                'avg_ctr': float(result.avg_ctr) if result.avg_ctr else None,
                'avg_ecpm': float(result.avg_ecpm) if result.avg_ecpm else None,
                'total_impressions': result.total_impressions or 0,
                'total_clicks': result.total_clicks or 0,
                'total_spend': float(result.total_spend) if result.total_spend else 0,
                'data_points': result.data_points or 0
            },
            'vendor_benchmarks': vendors
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/campaigns', methods=['GET'])
def get_campaigns():
    try:
        session = get_session()

        status = request.args.get('status')
        brand = request.args.get('brand')
        limit = request.args.get('limit', 100, type=int)

        query = session.query(BasisCampaign)

        if status:
            query = query.filter(BasisCampaign.status == status)
        if brand:
            query = query.filter(BasisCampaign.brand_name.ilike(f'%{brand}%'))

        campaigns = query.order_by(desc(BasisCampaign.start_date)).limit(limit).all()

        result = []
        for c in campaigns:
            result.append({
                'id': c.id,
                'basis_campaign_id': c.basis_campaign_id,
                'campaign_name': c.campaign_name,
                'client_name': c.client_name,
                'brand_name': c.brand_name,
                'status': c.status,
                'approved_budget': c.approved_budget,
                'start_date': c.start_date.isoformat() if c.start_date else None,
                'end_date': c.end_date.isoformat() if c.end_date else None,
                'last_synced_at': c.last_synced_at.isoformat() if c.last_synced_at else None
            })

        session.close()
        return jsonify({'status': 'success', 'campaigns': result}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/line-items', methods=['GET'])
def get_line_items():
    try:
        session = get_session()

        campaign_id = request.args.get('campaign_id')
        status = request.args.get('status')
        limit = request.args.get('limit', 100, type=int)

        query = session.query(BasisLineItem)

        if campaign_id:
            query = query.filter(BasisLineItem.basis_campaign_id == campaign_id)
        if status:
            query = query.filter(BasisLineItem.status == status)

        line_items = query.order_by(desc(BasisLineItem.start_date)).limit(limit).all()

        result = []
        for li in line_items:
            result.append({
                'id': li.id,
                'basis_line_item_id': li.basis_line_item_id,
                'basis_campaign_id': li.basis_campaign_id,
                'line_item_name': li.line_item_name,
                'status': li.status,
                'budget': li.budget,
                'pacing_percentage': li.pacing_percentage,
                'vendor_name': li.vendor_name,
                'property_name': li.property_name,
                'start_date': li.start_date.isoformat() if li.start_date else None,
                'end_date': li.end_date.isoformat() if li.end_date else None
            })

        session.close()
        return jsonify({'status': 'success', 'line_items': result}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/sync-logs', methods=['GET'])
def get_sync_logs():
    try:
        session = get_session()

        limit = request.args.get('limit', 20, type=int)

        logs = session.query(BasisSyncLog).order_by(
            desc(BasisSyncLog.sync_started_at)
        ).limit(limit).all()

        result = []
        for log in logs:
            result.append({
                'id': log.id,
                'sync_started_at': log.sync_started_at.isoformat() if log.sync_started_at else None,
                'sync_completed_at': log.sync_completed_at.isoformat() if log.sync_completed_at else None,
                'sync_status': log.sync_status,
                'endpoint': log.endpoint,
                'sync_type': log.sync_type,
                'records_processed': log.records_processed,
                'records_inserted': log.records_inserted,
                'records_updated': log.records_updated,
                'records_failed': log.records_failed,
                'execution_time_seconds': log.execution_time_seconds,
                'errors': log.errors
            })

        session.close()
        return jsonify({'status': 'success', 'sync_logs': result}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/summary', methods=['GET'])
def get_summary():
    try:
        session = get_session()

        pending_count = session.query(func.count(BasisRecommendation.id)).filter(
            BasisRecommendation.status == 'pending'
        ).scalar()

        approved_count = session.query(func.count(BasisRecommendation.id)).filter(
            BasisRecommendation.status == 'approved'
        ).scalar()

        implemented_count = session.query(func.count(BasisRecommendation.id)).filter(
            BasisRecommendation.status == 'implemented'
        ).scalar()

        positive_impacts = session.query(func.count(BasisRecommendationImpact.id)).filter(
            BasisRecommendationImpact.impact_score > 0.3
        ).scalar()

        negative_impacts = session.query(func.count(BasisRecommendationImpact.id)).filter(
            BasisRecommendationImpact.impact_score < -0.3
        ).scalar()

        week_ago = datetime.utcnow().date() - timedelta(days=7)
        recent_stats = session.query(
            func.sum(BasisDailyStats.impressions).label('impressions'),
            func.sum(BasisDailyStats.clicks).label('clicks'),
            func.sum(BasisDailyStats.spend).label('spend')
        ).filter(BasisDailyStats.report_date >= week_ago).first()

        last_sync = session.query(BasisSyncLog).filter(
            BasisSyncLog.sync_status == 'completed'
        ).order_by(desc(BasisSyncLog.sync_completed_at)).first()

        session.close()

        return jsonify({
            'status': 'success',
            'summary': {
                'recommendations': {
                    'pending': pending_count or 0,
                    'approved': approved_count or 0,
                    'implemented': implemented_count or 0
                },
                'impacts': {
                    'positive': positive_impacts or 0,
                    'negative': negative_impacts or 0
                },
                'last_7_days': {
                    'impressions': recent_stats.impressions or 0 if recent_stats else 0,
                    'clicks': recent_stats.clicks or 0 if recent_stats else 0,
                    'spend': float(recent_stats.spend) if recent_stats and recent_stats.spend else 0
                },
                'last_sync': last_sync.sync_completed_at.isoformat() if last_sync and last_sync.sync_completed_at else None
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500