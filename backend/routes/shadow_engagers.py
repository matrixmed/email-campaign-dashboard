from flask import Blueprint, jsonify
from psycopg2.extras import RealDictCursor
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db_pool import get_db_connection

shadow_engagers_bp = Blueprint('shadow_engagers', __name__)

@shadow_engagers_bp.route('/', methods=['GET'])
def get_shadow_engagers():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT MAX(updated_at) as last_updated FROM shadow_engagers")
        meta = cursor.fetchone()
        last_updated = meta['last_updated'].isoformat() if meta and meta['last_updated'] else None

        cursor.execute("""
            SELECT email, first_name, last_name, specialty,
                   confidence_pct, classification,
                   campaigns_clicked_no_open, campaigns_with_opens,
                   total_campaigns_sent, total_clean_clicks_no_open,
                   distinct_campaigns_clicked
            FROM shadow_engagers
            ORDER BY confidence_pct DESC
        """)
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            'last_updated': last_updated,
            'count': len(rows),
            'engagers': rows
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500