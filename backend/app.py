import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config['DATABASE_URL'] = os.getenv('DATABASE_URL')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

from routes.database import db_bp
from routes.dashboards import dashboards_bp
from routes.campaigns import campaigns_bp
from routes.cmi_contracts import cmi_contracts_bp
from routes.brand_management import brand_management_bp
from routes.users import users_bp
from routes.list_analysis import list_analysis_bp

app.register_blueprint(db_bp, url_prefix='/api/db')
app.register_blueprint(dashboards_bp, url_prefix='/api/dashboards')
app.register_blueprint(campaigns_bp, url_prefix='/api/campaigns')
app.register_blueprint(cmi_contracts_bp, url_prefix='/api/cmi-contracts')
app.register_blueprint(brand_management_bp, url_prefix='/api/brand-management')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(list_analysis_bp, url_prefix='/api/list-analysis')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Email Campaign Dashboard API is running'
    }), 200

@app.route('/api/db-test', methods=['GET'])
def db_test():
    try:
        import psycopg2
        conn = psycopg2.connect(app.config['DATABASE_URL'])
        cursor = conn.cursor()
        cursor.execute('SELECT version();')
        version = cursor.fetchone()
        cursor.close()
        conn.close()
        return jsonify({
            'status': 'success',
            'postgres_version': version[0]
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'message': 'Email Campaign Dashboard API',
        'version': '1.0.0',
        'endpoints': {
            'health': '/api/health',
            'db_test': '/api/db-test',
            'dashboards': '/api/dashboards',
            'campaigns': '/api/campaigns',
            'cmi_contracts': '/api/cmi-contracts',
            'brand_management': '/api/brand-management',
            'reports': '/api/reports'
        }
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
