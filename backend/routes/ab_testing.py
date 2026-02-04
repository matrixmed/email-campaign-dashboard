from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, distinct, text
from models import ABTest, ABTestGroup, BrandEditorAgency, CampaignInteraction
from datetime import datetime
import os

ab_testing_bp = Blueprint('ab_testing', __name__)


def get_session():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()


def serialize_test(test, session):
    groups = session.query(ABTestGroup).filter_by(ab_test_id=test.id).order_by(ABTestGroup.group_label).all()
    return {
        'id': test.id,
        'base_campaign_name': test.base_campaign_name,
        'description': test.description,
        'category': test.category,
        'market': test.market,
        'notes': test.notes,
        'status': test.status,
        'created_at': test.created_at.isoformat() if test.created_at else None,
        'updated_at': test.updated_at.isoformat() if test.updated_at else None,
        'groups': [{
            'id': g.id,
            'ab_test_id': g.ab_test_id,
            'group_label': g.group_label,
            'campaign_name_pattern': g.campaign_name_pattern,
            'subcategory': g.subcategory,
            'notes': g.notes,
        } for g in groups]
    }


@ab_testing_bp.route('/tests', methods=['GET'])
def get_all_tests():
    try:
        session = get_session()
        tests = session.query(ABTest).order_by(ABTest.updated_at.desc()).all()
        result = [serialize_test(t, session) for t in tests]
        session.close()

        return jsonify({
            'status': 'success',
            'tests': result
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@ab_testing_bp.route('/tests', methods=['POST'])
def create_or_update_test():
    try:
        data = request.json
        base_name = data.get('base_campaign_name')

        if not base_name:
            return jsonify({
                'status': 'error',
                'message': 'base_campaign_name is required'
            }), 400

        session = get_session()
        existing = session.query(ABTest).filter_by(base_campaign_name=base_name).first()

        if existing:
            if 'description' in data:
                existing.description = data['description']
            if 'category' in data:
                existing.category = data['category']
            if 'market' in data:
                existing.market = data['market']
            if 'notes' in data:
                existing.notes = data['notes']
            if 'status' in data:
                existing.status = data['status']
            existing.updated_at = datetime.utcnow()
            session.commit()
            test = existing
        else:
            test = ABTest(
                base_campaign_name=base_name,
                description=data.get('description'),
                category=data.get('category'),
                market=data.get('market'),
                notes=data.get('notes'),
                status=data.get('status', 'active')
            )
            session.add(test)
            session.commit()

        groups_data = data.get('groups', [])
        for g in groups_data:
            existing_group = session.query(ABTestGroup).filter_by(
                ab_test_id=test.id,
                group_label=g.get('group_label')
            ).first()

            if existing_group:
                if 'campaign_name_pattern' in g:
                    existing_group.campaign_name_pattern = g['campaign_name_pattern']
                if 'subcategory' in g:
                    existing_group.subcategory = g['subcategory']
                if 'notes' in g:
                    existing_group.notes = g['notes']
                existing_group.updated_at = datetime.utcnow()
            else:
                new_group = ABTestGroup(
                    ab_test_id=test.id,
                    group_label=g.get('group_label', ''),
                    campaign_name_pattern=g.get('campaign_name_pattern'),
                    subcategory=g.get('subcategory'),
                    notes=g.get('notes')
                )
                session.add(new_group)

        session.commit()
        result = serialize_test(test, session)
        session.close()

        return jsonify({
            'status': 'success',
            'test': result
        }), 201

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@ab_testing_bp.route('/tests/<int:test_id>', methods=['PUT'])
def update_test(test_id):
    try:
        data = request.json
        session = get_session()
        test = session.query(ABTest).filter_by(id=test_id).first()

        if not test:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Test not found'
            }), 404

        if 'description' in data:
            test.description = data['description']
        if 'category' in data:
            test.category = data['category']
        if 'market' in data:
            test.market = data['market']
        if 'notes' in data:
            test.notes = data['notes']
        if 'status' in data:
            test.status = data['status']
        test.updated_at = datetime.utcnow()

        session.commit()
        result = serialize_test(test, session)
        session.close()

        return jsonify({
            'status': 'success',
            'test': result
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@ab_testing_bp.route('/tests/<int:test_id>', methods=['DELETE'])
def delete_test(test_id):
    try:
        session = get_session()
        test = session.query(ABTest).filter_by(id=test_id).first()

        if not test:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Test not found'
            }), 404

        session.query(ABTestGroup).filter_by(ab_test_id=test_id).delete()
        session.delete(test)
        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Test deleted successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@ab_testing_bp.route('/groups/<int:group_id>', methods=['PUT'])
def update_group(group_id):
    try:
        data = request.json
        session = get_session()
        group = session.query(ABTestGroup).filter_by(id=group_id).first()

        if not group:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Group not found'
            }), 404

        if 'subcategory' in data:
            group.subcategory = data['subcategory']
        if 'notes' in data:
            group.notes = data['notes']
        if 'campaign_name_pattern' in data:
            group.campaign_name_pattern = data['campaign_name_pattern']
        group.updated_at = datetime.utcnow()

        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Group updated successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@ab_testing_bp.route('/campaign-details', methods=['GET'])
def get_campaign_details():
    try:
        pattern = request.args.get('pattern', '')
        if not pattern:
            return jsonify({'status': 'error', 'message': 'pattern required'}), 400

        session = get_session()
        interactions = session.query(
            CampaignInteraction.campaign_name,
            CampaignInteraction.campaign_subject,
            CampaignInteraction.timestamp
        ).filter(
            CampaignInteraction.campaign_name.ilike(f'%{pattern}%'),
            CampaignInteraction.event_type == 'sent'
        ).order_by(CampaignInteraction.timestamp.desc()).limit(50).all()

        results = [{
            'campaign_name': i.campaign_name,
            'subject': i.campaign_subject,
            'send_time': i.timestamp.isoformat() if i.timestamp else None
        } for i in interactions]

        session.close()
        return jsonify({
            'status': 'success',
            'details': results
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@ab_testing_bp.route('/dropdown-options', methods=['GET'])
def get_dropdown_options():
    try:
        session = get_session()

        categories = [r[0] for r in session.query(distinct(ABTest.category)).filter(ABTest.category.isnot(None)).all()]
        markets = [r[0] for r in session.query(distinct(ABTest.market)).filter(ABTest.market.isnot(None)).all()]
        subcategories = [r[0] for r in session.query(distinct(ABTestGroup.subcategory)).filter(ABTestGroup.subcategory.isnot(None)).all()]

        session.close()

        return jsonify({
            'status': 'success',
            'categories': sorted(categories),
            'markets': sorted(markets),
            'subcategories': sorted(subcategories)
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@ab_testing_bp.route('/markets', methods=['GET'])
def get_markets():
    try:
        session = get_session()

        industries = [r[0] for r in session.query(distinct(BrandEditorAgency.industry)).filter(
            BrandEditorAgency.industry.isnot(None),
            BrandEditorAgency.industry != ''
        ).all()]

        ab_markets = [r[0] for r in session.query(distinct(ABTest.market)).filter(
            ABTest.market.isnot(None),
            ABTest.market != ''
        ).all()]

        all_markets = sorted(set(industries + ab_markets))

        session.close()

        return jsonify({
            'status': 'success',
            'markets': all_markets
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@ab_testing_bp.route('/campaigns', methods=['GET'])
def get_ab_campaigns():
    try:
        engine = create_engine(os.getenv('DATABASE_URL'))
        with engine.connect() as conn:
            deployments = conn.execute(text("""
                SELECT campaign_id, full_campaign_name, send_date, subject_line
                FROM campaign_deployments
                WHERE full_campaign_name ~* '- group [a-z]'
                ORDER BY send_date DESC
            """))

            campaign_meta = {}
            campaign_ids = []
            for row in deployments:
                campaign_meta[row.campaign_id] = {
                    'name': row.full_campaign_name,
                    'send_date': row.send_date.isoformat() if row.send_date else None,
                    'subject_line': row.subject_line,
                }
                campaign_ids.append(row.campaign_id)

            if not campaign_ids:
                return jsonify({'status': 'success', 'campaigns': []}), 200

            metrics = conn.execute(text("""
                SELECT
                    campaign_id,
                    COUNT(DISTINCT email) FILTER (WHERE event_type = 'sent') as sent,
                    COUNT(DISTINCT email) FILTER (WHERE event_type = 'open') as unique_opens,
                    COUNT(*) FILTER (WHERE event_type = 'open') as total_opens,
                    COUNT(DISTINCT email) FILTER (WHERE event_type = 'click') as unique_clicks,
                    COUNT(*) FILTER (WHERE event_type = 'click') as total_clicks,
                    COUNT(*) FILTER (WHERE event_type = 'bounce') as bounces
                FROM campaign_interactions
                WHERE campaign_id = ANY(:ids)
                GROUP BY campaign_id
            """), {'ids': campaign_ids})

            live_data = {}
            for row in metrics:
                live_data[row.campaign_id] = row

            campaigns = []
            for cid, meta in campaign_meta.items():
                live = live_data.get(cid)
                sent = live.sent if live else 0
                bounces = live.bounces if live else 0
                delivered = max(sent - bounces, 0)

                campaigns.append({
                    'Campaign': meta['name'],
                    'Send_Date': meta['send_date'],
                    'Sent': sent,
                    'Delivered': delivered,
                    'Unique_Opens': live.unique_opens if live else 0,
                    'Total_Opens': live.total_opens if live else 0,
                    'Unique_Clicks': live.unique_clicks if live else 0,
                    'Total_Clicks': live.total_clicks if live else 0,
                    'Hard_Bounces': bounces,
                    'Soft_Bounces': 0,
                    'Total_Bounces': bounces,
                    'Filtered_Bot_Clicks': 0,
                })

        return jsonify({
            'status': 'success',
            'campaigns': campaigns
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@ab_testing_bp.route('/historical', methods=['GET'])
def get_historical_results():
    try:
        session = get_session()

        tests = session.query(ABTest).filter_by(status='completed').order_by(ABTest.updated_at.desc()).all()
        results = []

        for test in tests:
            groups = session.query(ABTestGroup).filter_by(ab_test_id=test.id).all()

            results.append({
                'id': test.id,
                'base_campaign_name': test.base_campaign_name,
                'category': test.category,
                'market': test.market,
                'description': test.description,
                'notes': test.notes,
                'status': test.status,
                'updated_at': test.updated_at.isoformat() if test.updated_at else None,
                'groups': [{
                    'group_label': g.group_label,
                    'subcategory': g.subcategory,
                    'notes': g.notes
                } for g in groups],
                'results': []
            })

        session.close()

        return jsonify({
            'status': 'success',
            'historical': results
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
