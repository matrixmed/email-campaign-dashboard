import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config['DATABASE_URL'] = os.getenv('DATABASE_URL')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Email Campaign Dashboard API is running'
    }), 200

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'message': 'Email Campaign Dashboard API',
        'version': '1.0.0',
        'endpoints': {
            'health': '/api/health',
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
