from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from db_pool import get_db_connection
import logging

validation_flags_bp = Blueprint('validation_flags', __name__)
logger = logging.getLogger(__name__)


@validation_flags_bp.route('/active', methods=['GET'])
def get_active_flags():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id,
                campaign_id,
                campaign_name,
                category,
                severity,
                description,
                recommendation,
                issue_type,
                local_value,
                api_value,
                tolerance_pct,
                deviation_pct,
                file_type,
                send_date,
                days_old,
                detected_at,
                expires_at
            FROM campaign_validation_flags
            WHERE is_active = TRUE
                AND is_resolved = FALSE
                AND expires_at > NOW()
            ORDER BY
                CASE severity
                    WHEN 'HIGH' THEN 1
                    WHEN 'MEDIUM' THEN 2
                    WHEN 'LOW' THEN 3
                END,
                detected_at DESC
        """)

        columns = [
            'id', 'campaign_id', 'campaign_name', 'category', 'severity',
            'description', 'recommendation', 'issue_type', 'local_value',
            'api_value', 'tolerance_pct', 'deviation_pct', 'file_type',
            'send_date', 'days_old', 'detected_at', 'expires_at'
        ]

        flags = []
        for row in cursor.fetchall():
            flag = dict(zip(columns, row))
            if flag['send_date']:
                flag['send_date'] = flag['send_date'].isoformat()
            if flag['detected_at']:
                flag['detected_at'] = flag['detected_at'].isoformat()
            if flag['expires_at']:
                flag['expires_at'] = flag['expires_at'].isoformat()
            flags.append(flag)

        cursor.close()

        by_campaign = {}
        for flag in flags:
            cid = flag['campaign_id'] or flag['campaign_name']
            if cid not in by_campaign:
                by_campaign[cid] = {
                    'campaign_id': flag['campaign_id'],
                    'campaign_name': flag['campaign_name'],
                    'flags': []
                }
            by_campaign[cid]['flags'].append(flag)

        high_count = sum(1 for f in flags if f['severity'] == 'HIGH')
        medium_count = sum(1 for f in flags if f['severity'] == 'MEDIUM')
        low_count = sum(1 for f in flags if f['severity'] == 'LOW')

        return jsonify({
            'success': True,
            'total_flags': len(flags),
            'summary': {
                'high': high_count,
                'medium': medium_count,
                'low': low_count
            },
            'flags': flags,
            'by_campaign': list(by_campaign.values())
        }), 200

    except Exception as e:
        logger.error(f"Error fetching active flags: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()


@validation_flags_bp.route('/campaign/<campaign_id>', methods=['GET'])
def get_flags_for_campaign(campaign_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id,
                campaign_id,
                campaign_name,
                category,
                severity,
                description,
                recommendation,
                issue_type,
                local_value,
                api_value,
                tolerance_pct,
                deviation_pct,
                detected_at,
                expires_at
            FROM campaign_validation_flags
            WHERE campaign_id = %s
                AND is_active = TRUE
                AND is_resolved = FALSE
                AND expires_at > NOW()
            ORDER BY severity, detected_at DESC
        """, (campaign_id,))

        columns = [
            'id', 'campaign_id', 'campaign_name', 'category', 'severity',
            'description', 'recommendation', 'issue_type', 'local_value',
            'api_value', 'tolerance_pct', 'deviation_pct', 'detected_at', 'expires_at'
        ]

        flags = []
        for row in cursor.fetchall():
            flag = dict(zip(columns, row))
            if flag['detected_at']:
                flag['detected_at'] = flag['detected_at'].isoformat()
            if flag['expires_at']:
                flag['expires_at'] = flag['expires_at'].isoformat()
            flags.append(flag)

        cursor.close()

        return jsonify({
            'success': True,
            'campaign_id': campaign_id,
            'flags': flags,
            'has_flags': len(flags) > 0
        }), 200

    except Exception as e:
        logger.error(f"Error fetching flags for campaign {campaign_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()


@validation_flags_bp.route('/resolve/<int:flag_id>', methods=['POST'])
def resolve_flag(flag_id):
    conn = None
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'manual')

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE campaign_validation_flags
            SET is_active = FALSE,
                is_resolved = TRUE,
                resolved_at = NOW(),
                resolved_reason = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id
        """, (reason, flag_id))

        result = cursor.fetchone()
        conn.commit()
        cursor.close()

        if result:
            return jsonify({
                'success': True,
                'message': f'Flag {flag_id} resolved'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Flag not found'
            }), 404

    except Exception as e:
        logger.error(f"Error resolving flag {flag_id}: {str(e)}")
        if conn:
            conn.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()


@validation_flags_bp.route('/history', methods=['GET'])
def get_flag_history():
    conn = None
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id,
                campaign_id,
                campaign_name,
                category,
                severity,
                description,
                issue_type,
                is_active,
                is_resolved,
                resolved_at,
                resolved_reason,
                detected_at,
                expires_at
            FROM campaign_validation_flags
            ORDER BY detected_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))

        columns = [
            'id', 'campaign_id', 'campaign_name', 'category', 'severity',
            'description', 'issue_type', 'is_active', 'is_resolved',
            'resolved_at', 'resolved_reason', 'detected_at', 'expires_at'
        ]

        flags = []
        for row in cursor.fetchall():
            flag = dict(zip(columns, row))
            if flag['detected_at']:
                flag['detected_at'] = flag['detected_at'].isoformat()
            if flag['expires_at']:
                flag['expires_at'] = flag['expires_at'].isoformat()
            if flag['resolved_at']:
                flag['resolved_at'] = flag['resolved_at'].isoformat()
            flags.append(flag)

        cursor.execute("SELECT COUNT(*) FROM campaign_validation_flags")
        total = cursor.fetchone()[0]

        cursor.close()

        return jsonify({
            'success': True,
            'flags': flags,
            'total': total,
            'limit': limit,
            'offset': offset
        }), 200

    except Exception as e:
        logger.error(f"Error fetching flag history: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()