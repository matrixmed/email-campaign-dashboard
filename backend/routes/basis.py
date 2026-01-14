from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, func, desc
from models import (
    BasisCampaign, BasisDailyStats, BasisRecommendation, BasisExchangeStats
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

        rec_type = request.args.get('type')
        priority = request.args.get('priority')
        limit = request.args.get('limit', 50, type=int)

        query = session.query(BasisRecommendation)

        if rec_type:
            query = query.filter(BasisRecommendation.recommendation_type == rec_type)
        if priority:
            query = query.filter(BasisRecommendation.priority == priority)

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
                'vendor_name': rec.vendor_name,
                'property_name': rec.property_name,
                'title': rec.title,
                'description': rec.description,
                'rationale': rec.rationale,
                'action_items': rec.action_items,
                'expected_impact': rec.expected_impact,
                'baseline_metrics': rec.baseline_metrics,
                'expected_outcome': rec.benchmark_metrics,
                'confidence_score': rec.confidence_score,
                'created_at': rec.created_at.isoformat() if rec.created_at else None
            })

        session.close()
        return jsonify({'status': 'success', 'recommendations': result}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/exchange-stats', methods=['GET'])
def get_exchange_stats():
    try:
        session = get_session()

        group_by = request.args.get('group_by', 'exchange')
        campaign_id = request.args.get('campaign_id')
        performance_filter = request.args.get('performance', 'all')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        use_latest = request.args.get('use_latest', 'true').lower() == 'true'

        base_query = session.query(BasisExchangeStats)

        if use_latest and not start_date and not end_date:
            date_counts = session.query(
                BasisExchangeStats.report_date,
                func.count(func.distinct(BasisExchangeStats.basis_campaign_id)).label('campaign_count')
            ).group_by(BasisExchangeStats.report_date).order_by(
                func.count(func.distinct(BasisExchangeStats.basis_campaign_id)).desc()
            ).first()

            if date_counts:
                best_date = date_counts[0]
                base_query = base_query.filter(BasisExchangeStats.report_date == best_date)

        if campaign_id:
            base_query = base_query.filter(BasisExchangeStats.basis_campaign_id == campaign_id)

        if start_date:
            base_query = base_query.filter(BasisExchangeStats.report_date >= start_date)
        if end_date:
            base_query = base_query.filter(BasisExchangeStats.report_date <= end_date)

        if group_by == 'campaign':
            stats = base_query.with_entities(
                BasisExchangeStats.basis_campaign_id,
                func.sum(BasisExchangeStats.impressions).label('impressions'),
                func.sum(BasisExchangeStats.clicks).label('clicks'),
                func.sum(BasisExchangeStats.spend).label('spend'),
                func.sum(BasisExchangeStats.bids).label('bids')
            ).group_by(BasisExchangeStats.basis_campaign_id).all()

            campaign_ids = [s.basis_campaign_id for s in stats]
            campaigns = session.query(BasisCampaign).filter(
                BasisCampaign.basis_campaign_id.in_(campaign_ids)
            ).all()
            campaign_map = {c.basis_campaign_id: {'name': c.campaign_name, 'brand': c.brand_name} for c in campaigns}

            data = []
            for s in stats:
                if s.impressions and s.impressions > 0:
                    campaign_info = campaign_map.get(s.basis_campaign_id, {})
                    data.append({
                        'id': s.basis_campaign_id,
                        'name': campaign_info.get('name', s.basis_campaign_id),
                        'brand': campaign_info.get('brand', 'Unknown'),
                        'impressions': s.impressions,
                        'clicks': s.clicks,
                        'spend': float(s.spend),
                        'ecpm': round((s.spend / s.impressions) * 1000, 2),
                        'ctr': round((s.clicks / s.impressions) * 100, 4) if s.impressions > 0 else 0,
                        'ecpc': round(s.spend / s.clicks, 2) if s.clicks > 0 else None
                    })

        elif group_by == 'brand':
            campaign_ids_query = base_query.with_entities(
                BasisExchangeStats.basis_campaign_id
            ).distinct()

            campaigns = session.query(BasisCampaign).filter(
                BasisCampaign.basis_campaign_id.in_(campaign_ids_query)
            ).all()

            brand_campaigns = {}
            for c in campaigns:
                brand = c.brand_name or 'Unknown'
                if brand not in brand_campaigns:
                    brand_campaigns[brand] = []
                brand_campaigns[brand].append(c.basis_campaign_id)

            date_filter = None
            if use_latest and not start_date and not end_date:
                date_counts = session.query(
                    BasisExchangeStats.report_date,
                    func.count(func.distinct(BasisExchangeStats.basis_campaign_id))
                ).group_by(BasisExchangeStats.report_date).order_by(
                    func.count(func.distinct(BasisExchangeStats.basis_campaign_id)).desc()
                ).first()
                if date_counts:
                    date_filter = date_counts[0]

            data = []
            for brand, camp_ids in brand_campaigns.items():
                brand_query = session.query(
                    func.sum(BasisExchangeStats.impressions).label('impressions'),
                    func.sum(BasisExchangeStats.clicks).label('clicks'),
                    func.sum(BasisExchangeStats.spend).label('spend'),
                    func.count(func.distinct(BasisExchangeStats.basis_campaign_id)).label('campaign_count')
                ).filter(BasisExchangeStats.basis_campaign_id.in_(camp_ids))

                if date_filter:
                    brand_query = brand_query.filter(BasisExchangeStats.report_date == date_filter)
                if start_date:
                    brand_query = brand_query.filter(BasisExchangeStats.report_date >= start_date)
                if end_date:
                    brand_query = brand_query.filter(BasisExchangeStats.report_date <= end_date)

                stats = brand_query.first()

                if stats and stats.impressions and stats.impressions > 0:
                    data.append({
                        'name': brand,
                        'campaign_count': stats.campaign_count,
                        'impressions': stats.impressions,
                        'clicks': stats.clicks,
                        'spend': float(stats.spend),
                        'ecpm': round((stats.spend / stats.impressions) * 1000, 2),
                        'ctr': round((stats.clicks / stats.impressions) * 100, 4) if stats.impressions > 0 else 0,
                        'ecpc': round(stats.spend / stats.clicks, 2) if stats.clicks > 0 else None
                    })
        else:
            exchanges = base_query.with_entities(
                BasisExchangeStats.exchange_name,
                func.sum(BasisExchangeStats.impressions).label('impressions'),
                func.sum(BasisExchangeStats.clicks).label('clicks'),
                func.sum(BasisExchangeStats.spend).label('spend'),
                func.sum(BasisExchangeStats.bids).label('bids')
            ).group_by(BasisExchangeStats.exchange_name).all()

            data = []
            for ex in exchanges:
                if ex.impressions and ex.impressions > 0:
                    data.append({
                        'name': ex.exchange_name,
                        'impressions': ex.impressions,
                        'clicks': ex.clicks,
                        'spend': float(ex.spend),
                        'bids': ex.bids or 0,
                        'ecpm': round((ex.spend / ex.impressions) * 1000, 2),
                        'ctr': round((ex.clicks / ex.impressions) * 100, 4) if ex.impressions > 0 else 0,
                        'ecpc': round(ex.spend / ex.clicks, 2) if ex.clicks > 0 else None,
                        'win_rate': round((ex.impressions / ex.bids * 100), 2) if ex.bids and ex.bids > 0 else None
                    })

        if not data:
            session.close()
            return jsonify({
                'status': 'success',
                'data': [],
                'summary': {},
                'group_by': group_by
            }), 200

        total_spend = sum(d['spend'] for d in data)
        total_clicks = sum(d['clicks'] for d in data)
        total_imps = sum(d['impressions'] for d in data)

        avg_ecpc = total_spend / total_clicks if total_clicks > 0 else 0
        avg_ctr = (total_clicks / total_imps) * 100 if total_imps > 0 else 0
        avg_ecpm = (total_spend / total_imps) * 1000 if total_imps > 0 else 0

        win_rates = [d['win_rate'] for d in data if d.get('win_rate')]
        avg_win_rate = sum(win_rates) / len(win_rates) if win_rates else 0

        sorted_data = sorted([d for d in data if d.get('ecpm')], key=lambda x: x['ecpm'])

        for i, item in enumerate(sorted_data):
            item['rank'] = i + 1

            item['vs_avg_ecpm'] = round(((item['ecpm'] - avg_ecpm) / avg_ecpm) * 100, 0) if avg_ecpm > 0 else 0
            item['vs_avg_ecpc'] = round(((item['ecpc'] - avg_ecpc) / avg_ecpc) * 100, 0) if avg_ecpc > 0 and item.get('ecpc') else None
            item['vs_avg_ctr'] = round(((item['ctr'] - avg_ctr) / avg_ctr) * 100, 0) if avg_ctr > 0 else 0

            ecpm_ratio = item['ecpm'] / avg_ecpm if avg_ecpm > 0 else 1
            volume_pct = (item['impressions'] / total_imps * 100) if total_imps > 0 else 0
            item['volume_pct'] = round(volume_pct, 1)

            win_rate = item.get('win_rate') or 0

            is_high_volume = volume_pct >= 8
            is_medium_volume = volume_pct >= 3
            is_cheap = ecpm_ratio < 0.85
            is_expensive = ecpm_ratio > 1.3
            is_very_expensive = ecpm_ratio > 1.6
            has_opportunity = win_rate < 50 and win_rate > 0
            is_overbidding = win_rate > 90

            current_impressions = item.get('impressions', 0)
            bids = item.get('bids', 0)
            if bids > 0 and win_rate < 70:
                potential_impressions = int(bids * 0.70) - current_impressions
                item['potential_gain'] = max(0, potential_impressions)
                item['potential_gain_pct'] = round((potential_impressions / current_impressions * 100), 0) if current_impressions > 0 else 0
            else:
                item['potential_gain'] = 0
                item['potential_gain_pct'] = 0

            if item['potential_gain'] > 0:
                item['potential_cost'] = round(item['potential_gain'] / 1000 * item['ecpm'], 2)
            else:
                item['potential_cost'] = 0

            if is_high_volume and is_cheap:
                item['recommendation'] = 'scale'
                item['recommendation_text'] = 'Scale Up'
                item['status'] = 'excellent'
                item['action_detail'] = f'{volume_pct}% of engagement at {round((1-ecpm_ratio)*100)}% below avg cost'

            elif is_high_volume and not is_expensive:
                item['recommendation'] = 'maintain'
                item['recommendation_text'] = 'Maintain'
                item['status'] = 'good'
                item['action_detail'] = f'Core source: {volume_pct}% of engagement at acceptable cost'

            elif is_high_volume and is_expensive:
                item['recommendation'] = 'optimize'
                item['recommendation_text'] = 'Optimize'
                item['status'] = 'average'
                if is_overbidding:
                    item['action_detail'] = f'{volume_pct}% of engagement but overbidding (win rate {round(win_rate)}%) - lower bid'
                else:
                    item['action_detail'] = f'{volume_pct}% of engagement - expensive but hard to replace this volume'

            elif is_medium_volume and is_cheap and has_opportunity:
                item['recommendation'] = 'increase_bid'
                item['recommendation_text'] = 'Raise Bid'
                item['status'] = 'good'
                item['action_detail'] = f'Only {round(win_rate)}% win rate - raise bid to capture +{item["potential_gain_pct"]}% more impressions'

            elif is_medium_volume and is_cheap:
                item['recommendation'] = 'maintain_priority'
                item['recommendation_text'] = 'Prioritize'
                item['status'] = 'good'
                item['action_detail'] = f'{volume_pct}% of engagement at good price - prioritize'

            elif is_medium_volume and is_expensive:
                item['recommendation'] = 'review'
                item['recommendation_text'] = 'Review'
                item['status'] = 'below_avg'
                item['action_detail'] = f'{volume_pct}% of engagement at +{round((ecpm_ratio-1)*100)}% above avg - find alternatives?'

            elif not is_medium_volume and is_very_expensive:
                item['recommendation'] = 'reduce'
                item['recommendation_text'] = 'Reduce'
                item['status'] = 'poor'
                item['action_detail'] = f'Only {volume_pct}% of engagement at +{round((ecpm_ratio-1)*100)}% above avg - consider reducing'

            elif not is_medium_volume and is_cheap and has_opportunity:
                item['recommendation'] = 'test_increase'
                item['recommendation_text'] = 'Test'
                item['status'] = 'average'
                item['action_detail'] = f'Low volume ({volume_pct}%) but cheap - test raising bid to see if more volume available'

            elif not is_medium_volume and is_cheap:
                item['recommendation'] = 'maintain'
                item['recommendation_text'] = 'Maintain'
                item['status'] = 'average'
                item['action_detail'] = f'Small volume ({volume_pct}%) at good price - limited but efficient'

            else:
                item['recommendation'] = 'maintain'
                item['recommendation_text'] = 'Maintain'
                item['status'] = 'average'
                item['action_detail'] = f'{volume_pct}% of engagement at avg cost'

            if is_overbidding:
                item['bid_insight'] = f'Win rate {round(win_rate)}% - likely overbidding, test lowering bid'
            elif has_opportunity and is_cheap:
                item['bid_insight'] = f'Win rate {round(win_rate)}% with good eCPM - opportunity to capture more volume'
            elif has_opportunity:
                item['bid_insight'] = f'Win rate {round(win_rate)}% - could gain volume but already at/above avg cost'
            else:
                item['bid_insight'] = None

        if performance_filter != 'all':
            sorted_data = [d for d in sorted_data if d.get('status') == performance_filter]

        session.close()

        return jsonify({
            'status': 'success',
            'data': sorted_data,
            'group_by': group_by,
            'summary': {
                'total_items': len(data),
                'total_spend': round(total_spend, 2),
                'total_clicks': total_clicks,
                'total_impressions': total_imps,
                'avg_ecpc': round(avg_ecpc, 2),
                'avg_ctr': round(avg_ctr, 4),
                'avg_ecpm': round(avg_ecpm, 2),
                'avg_win_rate': round(avg_win_rate, 2) if avg_win_rate else None,
                'excellent_count': len([d for d in sorted_data if d.get('status') == 'excellent']),
                'good_count': len([d for d in sorted_data if d.get('status') == 'good']),
                'average_count': len([d for d in sorted_data if d.get('status') == 'average']),
                'below_avg_count': len([d for d in sorted_data if d.get('status') == 'below_avg']),
                'poor_count': len([d for d in sorted_data if d.get('status') == 'poor'])
            }
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/property-stats', methods=['GET'])
def get_property_stats():
    try:
        session = get_session()

        exchange = request.args.get('exchange')
        vendor = request.args.get('vendor')
        campaign_id = request.args.get('campaign_id')
        min_impressions = request.args.get('min_impressions', 100, type=int)
        days = request.args.get('days', 30, type=int)
        limit = request.args.get('limit', 100, type=int)

        cutoff_date = datetime.utcnow().date() - timedelta(days=days)

        query = session.query(
            BasisDailyStats.property_name,
            BasisDailyStats.vendor_name,
            func.sum(BasisDailyStats.impressions).label('impressions'),
            func.sum(BasisDailyStats.clicks).label('clicks'),
            func.sum(BasisDailyStats.spend).label('spend'),
            func.count(func.distinct(BasisDailyStats.report_date)).label('days_active')
        ).filter(
            BasisDailyStats.report_date >= cutoff_date,
            BasisDailyStats.property_name.isnot(None),
            BasisDailyStats.property_name != ''
        )

        if exchange:
            query = query.filter(BasisDailyStats.vendor_name == exchange)
        if vendor:
            query = query.filter(BasisDailyStats.vendor_name == vendor)
        if campaign_id:
            query = query.filter(BasisDailyStats.basis_campaign_id == campaign_id)

        query = query.group_by(
            BasisDailyStats.property_name,
            BasisDailyStats.vendor_name
        ).having(
            func.sum(BasisDailyStats.impressions) >= min_impressions
        )

        results = query.all()

        if not results:
            session.close()
            return jsonify({
                'status': 'success',
                'data': [],
                'summary': {}
            }), 200

        total_impressions = sum(r.impressions or 0 for r in results)
        total_spend = sum(float(r.spend or 0) for r in results)
        total_clicks = sum(r.clicks or 0 for r in results)
        avg_ecpm = (total_spend / total_impressions * 1000) if total_impressions > 0 else 0
        avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0

        data = []
        for r in results:
            if not r.impressions or r.impressions < min_impressions:
                continue

            spend = float(r.spend or 0)
            impressions = r.impressions
            clicks = r.clicks or 0

            ecpm = (spend / impressions * 1000) if impressions > 0 else 0
            ctr = (clicks / impressions * 100) if impressions > 0 else 0
            ecpc = (spend / clicks) if clicks > 0 else None
            volume_pct = (impressions / total_impressions * 100) if total_impressions > 0 else 0
            ecpm_ratio = ecpm / avg_ecpm if avg_ecpm > 0 else 1

            if ecpm_ratio < 0.7 and ctr >= avg_ctr:
                status = 'excellent'
            elif ecpm_ratio < 0.9:
                status = 'good'
            elif ecpm_ratio <= 1.2:
                status = 'average'
            elif ecpm_ratio <= 1.5:
                status = 'below_avg'
            else:
                status = 'poor'

            data.append({
                'property_name': r.property_name,
                'exchange': r.vendor_name,
                'impressions': impressions,
                'clicks': clicks,
                'spend': round(spend, 2),
                'ecpm': round(ecpm, 2),
                'ctr': round(ctr, 4),
                'ecpc': round(ecpc, 2) if ecpc else None,
                'volume_pct': round(volume_pct, 2),
                'vs_avg_ecpm': round((ecpm_ratio - 1) * 100, 1),
                'vs_avg_ctr': round((ctr / avg_ctr - 1) * 100, 1) if avg_ctr > 0 else 0,
                'days_active': r.days_active,
                'status': status
            })

        sorted_data = sorted(data, key=lambda x: x['impressions'], reverse=True)[:limit]

        session.close()
        return jsonify({
            'status': 'success',
            'data': sorted_data,
            'summary': {
                'total_properties': len(data),
                'total_impressions': total_impressions,
                'total_clicks': total_clicks,
                'total_spend': round(total_spend, 2),
                'avg_ecpm': round(avg_ecpm, 2),
                'avg_ctr': round(avg_ctr, 4),
                'excellent_count': len([d for d in data if d['status'] == 'excellent']),
                'good_count': len([d for d in data if d['status'] == 'good']),
                'poor_count': len([d for d in data if d['status'] == 'poor'])
            }
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500