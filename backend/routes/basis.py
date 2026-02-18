from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, func, desc
from models import BasisCampaign, BasisDailyStats, BasisExchangeStats
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
        recommendations = []

        exchange_data = session.query(
            BasisExchangeStats.exchange_name,
            func.sum(BasisExchangeStats.impressions).label('impressions'),
            func.sum(BasisExchangeStats.clicks).label('clicks'),
            func.sum(BasisExchangeStats.spend).label('spend'),
            func.sum(BasisExchangeStats.bids).label('bids')
        ).group_by(BasisExchangeStats.exchange_name).all()

        if not exchange_data:
            session.close()
            return jsonify({'status': 'success', 'recommendations': [], 'summary': {}}), 200

        total_impr = sum(ex.impressions or 0 for ex in exchange_data)
        total_spend = sum(float(ex.spend or 0) for ex in exchange_data)
        total_clicks = sum(ex.clicks or 0 for ex in exchange_data)
        total_bids = sum(ex.bids or 0 for ex in exchange_data)
        avg_ecpm = (total_spend / total_impr * 1000) if total_impr > 0 else 0
        avg_ctr = (total_clicks / total_impr * 100) if total_impr > 0 else 0
        overall_win_rate = (total_impr / total_bids * 100) if total_bids > 0 else 0

        exchange_analysis = []
        for ex in exchange_data:
            impr = ex.impressions or 0
            if impr < 100:
                continue
            clicks = ex.clicks or 0
            spend = float(ex.spend or 0)
            bids = ex.bids or 0
            ecpm = (spend / impr * 1000) if impr > 0 else 0
            ctr = (clicks / impr * 100) if impr > 0 else 0
            win_rate = (impr / bids * 100) if bids > 0 else 0
            vol_pct = (impr / total_impr * 100) if total_impr > 0 else 0
            ecpm_vs_avg = ((ecpm - avg_ecpm) / avg_ecpm * 100) if avg_ecpm > 0 else 0
            potential_impr = int(bids * 0.20) - impr if bids > 0 and win_rate < 20 else 0
            potential_impr = max(0, potential_impr)

            exchange_analysis.append({
                'name': ex.exchange_name,
                'impressions': impr,
                'clicks': clicks,
                'spend': spend,
                'bids': bids,
                'ecpm': ecpm,
                'ctr': ctr,
                'win_rate': win_rate,
                'volume_pct': vol_pct,
                'ecpm_vs_avg': ecpm_vs_avg,
                'potential_gain': potential_impr
            })


        for ex in exchange_analysis:
            win_rate = ex['win_rate']
            ecpm = ex['ecpm']
            vol_pct = ex['volume_pct']
            ecpm_vs_avg = ex['ecpm_vs_avg']
            potential = ex['potential_gain']
            name = ex['name']

            if win_rate >= 50 and vol_pct >= 1:
                overbid_pct = min(40, int((win_rate - 20) / 1.5))
                savings = ex['spend'] * (overbid_pct / 100)
                multiplier = round(0.5 + (20 / win_rate) * 0.5, 2)
                recommendations.append({
                    'id': f'exch_overbid_{name.lower().replace(" ", "_")}',
                    'type': 'exchange_bid_multiplier',
                    'category': 'cost_savings',
                    'priority': 'high' if vol_pct >= 5 else 'medium',
                    'exchange': name,
                    'title': f'Significantly lower bid on {name}',
                    'description': f'{win_rate:.0f}% win rate is far above the 10-20% industry norm. You\'re likely paying much more than necessary.',
                    'current_state': f'{win_rate:.0f}% win rate, ${ecpm:.2f} eCPM, {vol_pct:.1f}% of volume',
                    'action': {
                        'type': 'set_exchange_bid_multiplier',
                        'exchange': name,
                        'recommended_multiplier': multiplier,
                        'current_win_rate': round(win_rate, 1),
                        'target_win_rate': 20
                    },
                    'impact': {
                        'estimated_savings': round(savings, 2),
                        'savings_pct': overbid_pct,
                        'confidence': 'high'
                    },
                    'how_to': f'Campaign > Inventory tab > Exchange Bid Multipliers > Set {name} to {multiplier}x',
                    'metrics': {
                        'impressions': ex['impressions'],
                        'spend': round(ex['spend'], 2),
                        'win_rate': round(win_rate, 1),
                        'ecpm': round(ecpm, 2)
                    }
                })

            elif win_rate >= 35 and win_rate < 50 and vol_pct >= 3:
                overbid_pct = min(25, int((win_rate - 20) / 2))
                savings = ex['spend'] * (overbid_pct / 100)
                multiplier = round(0.7 + (20 / win_rate) * 0.3, 2)
                recommendations.append({
                    'id': f'exch_highwin_{name.lower().replace(" ", "_")}',
                    'type': 'exchange_bid_multiplier',
                    'category': 'cost_savings',
                    'priority': 'medium',
                    'exchange': name,
                    'title': f'Reduce bid on {name}',
                    'description': f'{win_rate:.0f}% win rate is above the 10-20% industry norm. Bid reduction can save money.',
                    'current_state': f'{win_rate:.0f}% win rate, ${ecpm:.2f} eCPM, {vol_pct:.1f}% of volume',
                    'action': {
                        'type': 'set_exchange_bid_multiplier',
                        'exchange': name,
                        'recommended_multiplier': multiplier,
                        'current_win_rate': round(win_rate, 1),
                        'target_win_rate': 20
                    },
                    'impact': {
                        'estimated_savings': round(savings, 2),
                        'savings_pct': overbid_pct,
                        'confidence': 'medium'
                    },
                    'how_to': f'Campaign > Inventory tab > Exchange Bid Multipliers > Set {name} to {multiplier}x',
                    'metrics': {
                        'impressions': ex['impressions'],
                        'spend': round(ex['spend'], 2),
                        'win_rate': round(win_rate, 1),
                        'ecpm': round(ecpm, 2)
                    }
                })

            if win_rate < 10 and win_rate > 0 and potential > 5000 and ecpm_vs_avg < 0:
                multiplier = round(1.0 + ((20 - win_rate) / 50), 2)
                multiplier = min(1.4, multiplier)
                est_cost = (potential / 1000) * ecpm * multiplier
                recommendations.append({
                    'id': f'exch_growth_{name.lower().replace(" ", "_")}',
                    'type': 'exchange_bid_multiplier',
                    'category': 'growth',
                    'priority': 'high' if potential > 20000 else 'medium',
                    'exchange': name,
                    'title': f'Increase bid on {name} for +{potential:,} impressions',
                    'description': f'Only {win_rate:.0f}% win rate at {ecpm_vs_avg:.0f}% below avg cost. Room to grow toward 15-20% win rate.',
                    'current_state': f'{win_rate:.0f}% win rate, ${ecpm:.2f} eCPM ({ecpm_vs_avg:.0f}% vs avg), {vol_pct:.1f}% of volume',
                    'action': {
                        'type': 'set_exchange_bid_multiplier',
                        'exchange': name,
                        'recommended_multiplier': multiplier,
                        'current_win_rate': round(win_rate, 1),
                        'target_win_rate': 20
                    },
                    'impact': {
                        'potential_impressions': potential,
                        'estimated_cost': round(est_cost, 2),
                        'cost_per_1k': round(ecpm * multiplier, 2),
                        'confidence': 'high' if win_rate > 5 else 'medium'
                    },
                    'how_to': f'Campaign > Inventory tab > Exchange Bid Multipliers > Set {name} to {multiplier}x',
                    'metrics': {
                        'impressions': ex['impressions'],
                        'bids': ex['bids'],
                        'win_rate': round(win_rate, 1),
                        'ecpm': round(ecpm, 2)
                    }
                })

            elif win_rate >= 10 and win_rate < 15 and potential > 3000 and ecpm_vs_avg < 10:
                multiplier = round(1.0 + ((20 - win_rate) / 80), 2)
                est_cost = (potential / 1000) * ecpm * multiplier
                recommendations.append({
                    'id': f'exch_moderate_{name.lower().replace(" ", "_")}',
                    'type': 'exchange_bid_multiplier',
                    'category': 'growth',
                    'priority': 'medium',
                    'exchange': name,
                    'title': f'Slight bid increase on {name} for +{potential:,} impressions',
                    'description': f'{win_rate:.0f}% win rate is good but slightly below optimal 15-20%. Small increase could capture more.',
                    'current_state': f'{win_rate:.0f}% win rate, ${ecpm:.2f} eCPM, {vol_pct:.1f}% of volume',
                    'action': {
                        'type': 'set_exchange_bid_multiplier',
                        'exchange': name,
                        'recommended_multiplier': multiplier,
                        'current_win_rate': round(win_rate, 1),
                        'target_win_rate': 20
                    },
                    'impact': {
                        'potential_impressions': potential,
                        'estimated_cost': round(est_cost, 2),
                        'confidence': 'medium'
                    },
                    'how_to': f'Campaign > Inventory tab > Exchange Bid Multipliers > Set {name} to {multiplier}x',
                    'metrics': {
                        'impressions': ex['impressions'],
                        'win_rate': round(win_rate, 1),
                        'ecpm': round(ecpm, 2)
                    }
                })

            ctr = ex['ctr']
            ctr_vs_avg = ((ctr - avg_ctr) / avg_ctr * 100) if avg_ctr > 0 else 0
            if vol_pct < 1 and ecpm_vs_avg > 50 and ex['impressions'] < 5000 and ctr_vs_avg < 0:
                recommendations.append({
                    'id': f'exch_block_{name.lower().replace(" ", "_")}',
                    'type': 'exchange_disable',
                    'category': 'cost_savings',
                    'priority': 'low',
                    'exchange': name,
                    'title': f'Consider disabling {name}',
                    'description': f'Low volume ({vol_pct:.1f}%), expensive ({ecpm_vs_avg:.0f}% above avg), and below-avg CTR.',
                    'current_state': f'{ex["impressions"]:,} impressions, ${ecpm:.2f} eCPM, {ctr:.3f}% CTR',
                    'action': {
                        'type': 'disable_exchange',
                        'exchange': name
                    },
                    'impact': {
                        'estimated_savings': round(ex['spend'], 2),
                        'volume_loss_pct': round(vol_pct, 2),
                        'confidence': 'medium'
                    },
                    'how_to': f'Campaign > Inventory tab > Uncheck {name} from exchange list',
                    'metrics': {
                        'impressions': ex['impressions'],
                        'spend': round(ex['spend'], 2),
                        'ecpm': round(ecpm, 2),
                        'ctr': round(ctr, 3)
                    }
                })

        top_exchange = max(exchange_analysis, key=lambda x: x['volume_pct']) if exchange_analysis else None
        if top_exchange and top_exchange['volume_pct'] > 40:
            recommendations.append({
                'id': 'concentration_risk',
                'type': 'diversification',
                'category': 'efficiency',
                'priority': 'medium',
                'exchange': top_exchange['name'],
                'title': f'High concentration on {top_exchange["name"]} ({top_exchange["volume_pct"]:.0f}%)',
                'description': f'Over 40% of impressions come from one exchange. Consider diversifying to reduce risk.',
                'current_state': f'{top_exchange["name"]} provides {top_exchange["volume_pct"]:.1f}% of all impressions',
                'action': {
                    'type': 'review_exchange_mix',
                    'dominant_exchange': top_exchange['name'],
                    'concentration_pct': round(top_exchange['volume_pct'], 1)
                },
                'impact': {
                    'benefit': 'Reduced dependency on single exchange',
                    'confidence': 'medium'
                },
                'how_to': 'Review exchange performance and consider raising bids on underutilized exchanges',
                'metrics': {
                    'dominant_exchange_volume': round(top_exchange['volume_pct'], 1),
                    'dominant_exchange_impressions': top_exchange['impressions']
                }
            })

        domain_data = session.query(
            BasisDailyStats.property_name,
            func.sum(BasisDailyStats.impressions).label('impressions'),
            func.sum(BasisDailyStats.clicks).label('clicks'),
            func.sum(BasisDailyStats.spend).label('spend')
        ).filter(
            BasisDailyStats.property_name.isnot(None),
            func.length(BasisDailyStats.property_name) > 0
        ).group_by(BasisDailyStats.property_name).having(
            func.sum(BasisDailyStats.impressions) >= 500
        ).all()

        if domain_data:
            dom_total_impr = sum(d.impressions or 0 for d in domain_data)
            dom_total_spend = sum(float(d.spend or 0) for d in domain_data)
            dom_total_clicks = sum(d.clicks or 0 for d in domain_data)
            dom_avg_ecpm = (dom_total_spend / dom_total_impr * 1000) if dom_total_impr > 0 else 0
            dom_avg_ctr = (dom_total_clicks / dom_total_impr * 100) if dom_total_impr > 0 else 0

            high_ctr_domains = []
            expensive_low_value_domains = []

            for d in domain_data:
                impr = d.impressions or 0
                clicks = d.clicks or 0
                spend = float(d.spend or 0)
                if impr < 500:
                    continue
                ecpm = (spend / impr * 1000) if impr > 0 else 0
                ctr = (clicks / impr * 100) if impr > 0 else 0
                ecpm_vs_avg = ((ecpm - dom_avg_ecpm) / dom_avg_ecpm * 100) if dom_avg_ecpm > 0 else 0
                vol_pct = (impr / dom_total_impr * 100) if dom_total_impr > 0 else 0

                if ctr >= dom_avg_ctr * 2 and ctr >= 0.05 and impr >= 1000:
                    high_ctr_domains.append({
                        'name': d.property_name,
                        'impressions': impr,
                        'clicks': clicks,
                        'ctr': ctr,
                        'ecpm': ecpm,
                        'ctr_vs_avg': round((ctr / dom_avg_ctr - 1) * 100, 0) if dom_avg_ctr > 0 else 0
                    })

                if ecpm_vs_avg > 30 and vol_pct < 1 and ctr < dom_avg_ctr * 0.5 and spend >= 10:
                    expensive_low_value_domains.append({
                        'name': d.property_name,
                        'impressions': impr,
                        'spend': spend,
                        'ecpm': ecpm,
                        'ecpm_vs_avg': ecpm_vs_avg,
                        'vol_pct': vol_pct,
                        'clicks': clicks,
                        'ctr': ctr
                    })

            expensive_low_value_domains.sort(key=lambda x: x['ecpm_vs_avg'], reverse=True)
            for dom in expensive_low_value_domains[:3]:
                recommendations.append({
                    'id': f'domain_expensive_{dom["name"][:20].lower().replace(" ", "_").replace(".", "_")}',
                    'type': 'domain_blocklist',
                    'category': 'cost_savings',
                    'priority': 'low',
                    'domain': dom['name'],
                    'title': f'Consider blocking {dom["name"][:40]}',
                    'description': f'Expensive ({dom["ecpm_vs_avg"]:.0f}% above avg eCPM) with minimal volume ({dom["vol_pct"]:.2f}% of impressions). Low ROI.',
                    'current_state': f'{dom["impressions"]:,} impressions at ${dom["ecpm"]:.2f} eCPM ({dom["ecpm_vs_avg"]:.0f}% above avg)',
                    'action': {
                        'type': 'add_to_blocklist',
                        'domain': dom['name']
                    },
                    'impact': {
                        'estimated_savings': round(dom['spend'] * 0.3, 2),
                        'impressions_lost': dom['impressions'],
                        'volume_pct_lost': round(dom['vol_pct'], 2),
                        'confidence': 'medium'
                    },
                    'how_to': 'Campaign > Domain Lists > Add to blocklist OR Campaign > Domains view > Set status to Blocked',
                    'metrics': {
                        'impressions': dom['impressions'],
                        'spend': round(dom['spend'], 2),
                        'clicks': dom['clicks'],
                        'ecpm': round(dom['ecpm'], 2),
                        'ctr': round(dom['ctr'], 3)
                    }
                })

            high_ctr_domains.sort(key=lambda x: x['ctr'], reverse=True)
            if len(high_ctr_domains) >= 3:
                top_performers = high_ctr_domains[:10]
                total_high_ctr_impr = sum(d['impressions'] for d in top_performers)
                total_high_ctr_clicks = sum(d['clicks'] for d in top_performers)
                domain_names = [d['name'] for d in top_performers[:5]]
                recommendations.append({
                    'id': 'domain_allowlist_high_ctr',
                    'type': 'domain_allowlist',
                    'category': 'engagement',
                    'priority': 'high',
                    'title': f'Create allowlist with {len(top_performers)} high-CTR domains',
                    'description': f'These domains have {round(total_high_ctr_clicks/total_high_ctr_impr*100, 2)}% avg CTR vs {dom_avg_ctr:.3f}% overall.',
                    'current_state': f'{total_high_ctr_impr:,} impressions, {total_high_ctr_clicks} clicks across {len(top_performers)} domains',
                    'action': {
                        'type': 'create_allowlist',
                        'domains': [d['name'] for d in top_performers]
                    },
                    'impact': {
                        'ctr_improvement': f'{round((total_high_ctr_clicks/total_high_ctr_impr)/(dom_avg_ctr/100) - 1, 1) * 100 if dom_avg_ctr > 0 else 0:.0f}% higher CTR',
                        'confidence': 'high'
                    },
                    'how_to': 'Campaign > Domain Lists > Create new allowlist > Add these domains',
                    'top_domains': [{'name': d['name'][:50], 'ctr': f'{d["ctr"]:.3f}%', 'impressions': d['impressions']} for d in top_performers[:5]],
                    'metrics': {
                        'domains_count': len(top_performers),
                        'total_impressions': total_high_ctr_impr,
                        'total_clicks': total_high_ctr_clicks,
                        'avg_ctr': round(total_high_ctr_clicks / total_high_ctr_impr * 100, 3) if total_high_ctr_impr > 0 else 0
                    }
                })

        campaigns = session.query(BasisCampaign).filter(
            BasisCampaign.status == 'online'
        ).all()

        for camp in campaigns:
            raw = camp.raw_response or {}
            freq_cap = raw.get('frequencyCapping', {})
            freq_impr = freq_cap.get('impressions', 0)
            freq_hours = freq_cap.get('periodInHours', 0)

            if freq_impr == 0 or freq_hours == 0:
                recommendations.append({
                    'id': f'camp_freq_{camp.basis_campaign_id}',
                    'type': 'frequency_cap',
                    'category': 'efficiency',
                    'priority': 'low',
                    'campaign_id': camp.basis_campaign_id,
                    'campaign_name': camp.campaign_name,
                    'title': f'No frequency cap on {camp.campaign_name[:30]}',
                    'description': 'Without a frequency cap, you may show the same ad repeatedly to users who have already seen it.',
                    'current_state': 'No frequency cap configured',
                    'action': {
                        'type': 'set_frequency_cap',
                        'note': 'Set based on campaign goals (prospecting: 2-3/day, retargeting: 5-7/day, brand: 1-2/day)'
                    },
                    'impact': {
                        'benefit': 'Reach more unique users',
                        'confidence': 'medium'
                    },
                    'how_to': 'Campaign > General tab > Frequency Capping > Configure based on campaign type'
                })

        recommendations.sort(key=lambda x: (
            0 if x['priority'] == 'high' else 1 if x['priority'] == 'medium' else 2,
            0 if x['category'] == 'cost_savings' else 1 if x['category'] == 'growth' else 2
        ))

        total_savings = sum(
            r.get('impact', {}).get('estimated_savings', 0)
            for r in recommendations
            if r['category'] == 'cost_savings'
        )
        total_potential = sum(
            r.get('impact', {}).get('potential_impressions', 0)
            for r in recommendations
            if r['category'] == 'growth'
        )

        session.close()
        return jsonify({
            'status': 'success',
            'recommendations': recommendations,
            'summary': {
                'total_recommendations': len(recommendations),
                'high_priority': len([r for r in recommendations if r['priority'] == 'high']),
                'medium_priority': len([r for r in recommendations if r['priority'] == 'medium']),
                'low_priority': len([r for r in recommendations if r['priority'] == 'low']),
                'cost_savings_recs': len([r for r in recommendations if r['category'] == 'cost_savings']),
                'growth_recs': len([r for r in recommendations if r['category'] == 'growth']),
                'engagement_recs': len([r for r in recommendations if r['category'] == 'engagement']),
                'efficiency_recs': len([r for r in recommendations if r['category'] == 'efficiency']),
                'estimated_total_savings': round(total_savings, 2),
                'estimated_impression_gain': total_potential,
                'portfolio_metrics': {
                    'total_impressions': total_impr,
                    'total_spend': round(total_spend, 2),
                    'total_clicks': total_clicks,
                    'avg_ecpm': round(avg_ecpm, 2),
                    'avg_ctr': round(avg_ctr, 4),
                    'overall_win_rate': round(overall_win_rate, 1)
                }
            }
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@basis_bp.route('/last-updated', methods=['GET'])
def get_last_updated():
    try:
        session = get_session()

        result = session.query(func.max(BasisExchangeStats.report_date)).scalar()

        session.close()

        if result:
            return jsonify({
                'status': 'success',
                'last_updated': result.isoformat() if hasattr(result, 'isoformat') else str(result)
            }), 200
        else:
            return jsonify({
                'status': 'success',
                'last_updated': None
            }), 200

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

        base_query = session.query(BasisExchangeStats)

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

            data = []
            for brand, camp_ids in brand_campaigns.items():
                brand_query = session.query(
                    func.sum(BasisExchangeStats.impressions).label('impressions'),
                    func.sum(BasisExchangeStats.clicks).label('clicks'),
                    func.sum(BasisExchangeStats.spend).label('spend'),
                    func.count(func.distinct(BasisExchangeStats.basis_campaign_id)).label('campaign_count')
                ).filter(BasisExchangeStats.basis_campaign_id.in_(camp_ids))

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
            has_opportunity = win_rate < 10 and win_rate > 0
            is_overbidding = win_rate > 35

            current_impressions = item.get('impressions', 0)
            bids = item.get('bids', 0)
            if bids > 0 and win_rate < 20:
                potential_impressions = int(bids * 0.20) - current_impressions
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
                    item['action_detail'] = f'{volume_pct}% of engagement but overbidding (win rate {round(win_rate)}% vs 10-20% ideal) - lower bid'
                else:
                    item['action_detail'] = f'{volume_pct}% of engagement - expensive but hard to replace this volume'

            elif is_medium_volume and is_cheap and has_opportunity:
                item['recommendation'] = 'increase_bid'
                item['recommendation_text'] = 'Raise Bid'
                item['status'] = 'good'
                item['action_detail'] = f'Only {round(win_rate)}% win rate (below 10-20% ideal) - raise bid to capture more impressions'

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
                item['action_detail'] = f'Low volume ({volume_pct}%) but cheap with {round(win_rate)}% win rate - test raising bid for more volume'

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
                item['bid_insight'] = f'Win rate {round(win_rate)}% (ideal: 10-20%) - overbidding, test lowering bid'
            elif has_opportunity and is_cheap:
                item['bid_insight'] = f'Win rate {round(win_rate)}% (below 10-20% ideal) with good eCPM - opportunity to capture more volume'
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
        days = request.args.get('days', 365, type=int)
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
            func.length(BasisDailyStats.property_name) > 0
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
