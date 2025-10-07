from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from models import DashboardSave
from datetime import datetime
import os
import json

dashboards_bp = Blueprint('dashboards', __name__)

def get_session():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()

@dashboards_bp.route('/save', methods=['POST'])
def save_dashboard():
    try:
        data = request.json
        user_id = data.get('user_id', 'default_user')
        title = data.get('title')
        state_json = data.get('state_json')
        theme = data.get('theme', 'default')

        if not title or not state_json:
            return jsonify({
                'status': 'error',
                'message': 'Title and state_json are required'
            }), 400

        session = get_session()

        dashboard = DashboardSave(
            user_id=user_id,
            title=title,
            state_json=json.dumps(state_json) if isinstance(state_json, dict) else state_json,
            theme=theme
        )

        session.add(dashboard)
        session.commit()

        dashboard_id = dashboard.id
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Dashboard saved successfully',
            'id': dashboard_id
        }), 201

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@dashboards_bp.route('/list', methods=['GET'])
def list_dashboards():
    try:
        user_id = request.args.get('user_id', 'default_user')
        session = get_session()

        dashboards = session.query(DashboardSave).filter_by(user_id=user_id).order_by(DashboardSave.updated_at.desc()).all()

        result = [{
            'id': d.id,
            'title': d.title,
            'theme': d.theme,
            'created_at': d.created_at.isoformat(),
            'updated_at': d.updated_at.isoformat()
        } for d in dashboards]

        session.close()

        return jsonify({
            'status': 'success',
            'dashboards': result
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@dashboards_bp.route('/<int:dashboard_id>', methods=['GET'])
def get_dashboard(dashboard_id):
    try:
        session = get_session()
        dashboard = session.query(DashboardSave).filter_by(id=dashboard_id).first()

        if not dashboard:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Dashboard not found'
            }), 404

        result = {
            'id': dashboard.id,
            'user_id': dashboard.user_id,
            'title': dashboard.title,
            'state_json': json.loads(dashboard.state_json) if dashboard.state_json else {},
            'theme': dashboard.theme,
            'created_at': dashboard.created_at.isoformat(),
            'updated_at': dashboard.updated_at.isoformat()
        }

        session.close()

        return jsonify({
            'status': 'success',
            'dashboard': result
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@dashboards_bp.route('/<int:dashboard_id>', methods=['DELETE'])
def delete_dashboard(dashboard_id):
    try:
        session = get_session()
        dashboard = session.query(DashboardSave).filter_by(id=dashboard_id).first()

        if not dashboard:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Dashboard not found'
            }), 404

        session.delete(dashboard)
        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Dashboard deleted successfully'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
