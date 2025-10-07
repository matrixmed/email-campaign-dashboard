from flask import Blueprint, jsonify
from models import init_db, Base
import os
from sqlalchemy import create_engine, inspect

db_bp = Blueprint('database', __name__)

@db_bp.route('/init', methods=['POST'])
def initialize_database():
    try:
        engine = init_db()
        return jsonify({
            'status': 'success',
            'message': 'Database schema initialized successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@db_bp.route('/tables', methods=['GET'])
def list_tables():
    try:
        engine = create_engine(os.getenv('DATABASE_URL'))
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        return jsonify({
            'status': 'success',
            'tables': tables
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
