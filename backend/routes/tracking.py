from flask import Blueprint, request, jsonify
from datetime import datetime
from db_pool import get_db_connection

tracking_bp = Blueprint('tracking', __name__)

@tracking_bp.route('/v', methods=['POST'])
def track_visitor():
    conn = None
    try:
        data = request.get_json() or {}
        fp = data.get('f')

        if not fp:
            return '', 204

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO visitors (fingerprint, user_agent, screen_resolution, timezone, language, platform, environment, first_seen, last_seen, visit_count)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), 1)
            ON CONFLICT (fingerprint)
            DO UPDATE SET
                last_seen = NOW(),
                visit_count = visitors.visit_count + 1,
                updated_at = NOW()
            RETURNING id, visit_count
        """, (
            fp,
            data.get('ua', '')[:500],
            data.get('sr', ''),
            data.get('tz', ''),
            data.get('l', ''),
            data.get('p', ''),
            data.get('e', 'prod')
        ))

        conn.commit()
        cursor.close()

        return '', 204

    except Exception as e:
        if conn:
            conn.rollback()
        return '', 204
    finally:
        if conn:
            conn.close()

@tracking_bp.route('/p', methods=['POST'])
def track_pageview():
    conn = None
    try:
        data = request.get_json() or {}
        fp = data.get('f')
        sid = data.get('s')
        path = data.get('p')

        if not fp or not path:
            return '', 204

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO page_views (fingerprint, session_id, page_path, referrer, environment, entered_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (fp, sid or '', path, data.get('r', ''), data.get('e', 'prod')))

        result = cursor.fetchone()
        page_view_id = result[0] if result else None

        conn.commit()
        cursor.close()

        return jsonify({'i': page_view_id}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return '', 204
    finally:
        if conn:
            conn.close()

@tracking_bp.route('/d', methods=['POST'])
def track_duration():
    conn = None
    try:
        data = request.get_json() or {}
        page_view_id = data.get('i')
        duration = data.get('d')
        scroll = data.get('sc')

        if not page_view_id:
            return '', 204

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE page_views
            SET duration_seconds = %s, scroll_depth = %s
            WHERE id = %s
        """, (duration, scroll, page_view_id))

        conn.commit()
        cursor.close()

        return '', 204

    except Exception as e:
        if conn:
            conn.rollback()
        return '', 204
    finally:
        if conn:
            conn.close()

@tracking_bp.route('/a', methods=['POST'])
def track_action():
    conn = None
    try:
        data = request.get_json() or {}
        fp = data.get('f')

        if not fp:
            return '', 204

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO user_actions (fingerprint, session_id, page_path, action_type, target_element, target_text, action_metadata, environment)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            fp,
            data.get('s', ''),
            data.get('p', ''),
            data.get('t', 'click'),
            data.get('el', ''),
            data.get('tx', '')[:500] if data.get('tx') else '',
            data.get('m'),
            data.get('e', 'prod')
        ))

        conn.commit()
        cursor.close()

        return '', 204

    except Exception as e:
        if conn:
            conn.rollback()
        return '', 204
    finally:
        if conn:
            conn.close()

@tracking_bp.route('/stats', methods=['GET'])
def get_stats():
    conn = None
    try:
        env = request.args.get('env', 'prod')

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                (SELECT COUNT(*) FROM visitors WHERE environment = %s) as total_visitors,
                (SELECT COUNT(*) FROM visitors WHERE environment = %s AND last_seen > NOW() - INTERVAL '24 hours') as active_24h,
                (SELECT COUNT(*) FROM page_views WHERE environment = %s AND entered_at > NOW() - INTERVAL '24 hours') as pageviews_24h,
                (SELECT AVG(duration_seconds) FROM page_views WHERE environment = %s AND duration_seconds IS NOT NULL AND duration_seconds < 3600) as avg_duration
        """, (env, env, env, env))

        row = cursor.fetchone()
        cursor.close()

        return jsonify({
            'environment': env,
            'total_visitors': row[0] or 0,
            'active_24h': row[1] or 0,
            'pageviews_24h': row[2] or 0,
            'avg_duration_seconds': round(row[3] or 0, 1)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@tracking_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                environment,
                COUNT(*) as total_visitors,
                COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '24 hours') as active_24h,
                COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '7 days') as active_7d,
                AVG(visit_count) as avg_visits
            FROM visitors
            GROUP BY environment
        """)
        env_stats = {}
        for row in cursor.fetchall():
            env_stats[row[0]] = {
                'total_visitors': row[1],
                'active_24h': row[2],
                'active_7d': row[3],
                'avg_visits_per_user': round(row[4] or 0, 1)
            }

        cursor.execute("""
            SELECT
                environment,
                COUNT(*) as total_pageviews,
                COUNT(*) FILTER (WHERE entered_at > NOW() - INTERVAL '24 hours') as pageviews_24h,
                AVG(duration_seconds) FILTER (WHERE duration_seconds IS NOT NULL AND duration_seconds < 3600) as avg_duration,
                AVG(scroll_depth) FILTER (WHERE scroll_depth IS NOT NULL) as avg_scroll
            FROM page_views
            GROUP BY environment
        """)
        for row in cursor.fetchall():
            if row[0] in env_stats:
                env_stats[row[0]].update({
                    'total_pageviews': row[1],
                    'pageviews_24h': row[2],
                    'avg_duration_seconds': round(row[3] or 0, 1),
                    'avg_scroll_depth': round(row[4] or 0, 1)
                })

        cursor.execute("""
            SELECT environment, page_path, COUNT(*) as views,
                   AVG(duration_seconds) FILTER (WHERE duration_seconds < 3600) as avg_duration
            FROM page_views
            GROUP BY environment, page_path
            ORDER BY environment, views DESC
        """)
        top_pages = {'dev': [], 'prod': []}
        for row in cursor.fetchall():
            env = row[0] or 'prod'
            if env in top_pages and len(top_pages[env]) < 10:
                top_pages[env].append({
                    'page': row[1],
                    'views': row[2],
                    'avg_duration': round(row[3] or 0, 1)
                })

        cursor.execute("""
            SELECT v.fingerprint, v.environment, v.first_seen, v.last_seen, v.visit_count,
                   v.screen_resolution, v.timezone, v.language, v.platform,
                   COUNT(DISTINCT pv.session_id) as sessions,
                   COUNT(pv.id) as total_pageviews
            FROM visitors v
            LEFT JOIN page_views pv ON v.fingerprint = pv.fingerprint
            GROUP BY v.id
            ORDER BY v.last_seen DESC
            LIMIT 100
        """)
        visitors = []
        for row in cursor.fetchall():
            visitors.append({
                'fingerprint': row[0][:8] + '...',
                'fingerprint_full': row[0],
                'environment': row[1],
                'first_seen': row[2].isoformat() if row[2] else None,
                'last_seen': row[3].isoformat() if row[3] else None,
                'visit_count': row[4],
                'screen': row[5],
                'timezone': row[6],
                'language': row[7],
                'platform': row[8],
                'sessions': row[9],
                'pageviews': row[10]
            })

        cursor.execute("""
            SELECT DISTINCT ON (session_id)
                session_id, fingerprint, environment,
                MIN(entered_at) as started,
                MAX(entered_at) as last_activity,
                COUNT(*) as pages_viewed,
                SUM(duration_seconds) FILTER (WHERE duration_seconds < 3600) as total_duration
            FROM page_views
            WHERE entered_at > NOW() - INTERVAL '7 days'
            GROUP BY session_id, fingerprint, environment
            ORDER BY session_id, started DESC
            LIMIT 50
        """)
        sessions = []
        for row in cursor.fetchall():
            sessions.append({
                'session_id': row[0][:8] + '...',
                'session_id_full': row[0],
                'fingerprint': row[1][:8] + '...',
                'environment': row[2],
                'started': row[3].isoformat() if row[3] else None,
                'last_activity': row[4].isoformat() if row[4] else None,
                'pages_viewed': row[5],
                'total_duration': row[6] or 0
            })

        cursor.execute("""
            SELECT environment, action_type, COUNT(*) as count
            FROM user_actions
            WHERE timestamp > NOW() - INTERVAL '7 days'
            GROUP BY environment, action_type
            ORDER BY count DESC
        """)
        actions = {'dev': {}, 'prod': {}}
        for row in cursor.fetchall():
            env = row[0] or 'prod'
            if env in actions:
                actions[env][row[1]] = row[2]

        cursor.execute("""
            SELECT environment, target_text, COUNT(*) as clicks
            FROM user_actions
            WHERE action_type = 'click' AND target_text IS NOT NULL AND target_text != ''
            GROUP BY environment, target_text
            ORDER BY clicks DESC
            LIMIT 50
        """)
        clicked_elements = {'dev': [], 'prod': []}
        for row in cursor.fetchall():
            env = row[0] or 'prod'
            if env in clicked_elements:
                clicked_elements[env].append({
                    'element': row[1][:50],
                    'clicks': row[2]
                })

        cursor.execute("""
            SELECT
                environment,
                DATE_TRUNC('hour', entered_at) as hour,
                COUNT(*) as pageviews
            FROM page_views
            WHERE entered_at > NOW() - INTERVAL '24 hours'
            GROUP BY environment, hour
            ORDER BY hour
        """)
        hourly = {'dev': [], 'prod': []}
        for row in cursor.fetchall():
            env = row[0] or 'prod'
            if env in hourly:
                hourly[env].append({
                    'hour': row[1].isoformat() if row[1] else None,
                    'pageviews': row[2]
                })

        cursor.execute("""
            SELECT
                environment,
                DATE_TRUNC('day', entered_at) as day,
                COUNT(*) as pageviews,
                COUNT(DISTINCT fingerprint) as unique_visitors
            FROM page_views
            WHERE entered_at > NOW() - INTERVAL '30 days'
            GROUP BY environment, day
            ORDER BY day
        """)
        daily = {'dev': [], 'prod': []}
        for row in cursor.fetchall():
            env = row[0] or 'prod'
            if env in daily:
                daily[env].append({
                    'day': row[1].strftime('%Y-%m-%d') if row[1] else None,
                    'pageviews': row[2],
                    'unique_visitors': row[3]
                })

        cursor.close()

        return jsonify({
            'environment_stats': env_stats,
            'top_pages': top_pages,
            'visitors': visitors,
            'sessions': sessions,
            'actions': actions,
            'clicked_elements': clicked_elements,
            'hourly_activity': hourly,
            'daily_activity': daily
        }), 200

    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500
    finally:
        if conn:
            conn.close()

@tracking_bp.route('/visitor/<fingerprint>', methods=['GET'])
def get_visitor_detail(fingerprint):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT fingerprint, environment, first_seen, last_seen, visit_count,
                   user_agent, screen_resolution, timezone, language, platform
            FROM visitors WHERE fingerprint = %s
        """, (fingerprint,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Visitor not found'}), 404

        visitor = {
            'fingerprint': row[0],
            'environment': row[1],
            'first_seen': row[2].isoformat() if row[2] else None,
            'last_seen': row[3].isoformat() if row[3] else None,
            'visit_count': row[4],
            'user_agent': row[5],
            'screen': row[6],
            'timezone': row[7],
            'language': row[8],
            'platform': row[9]
        }

        cursor.execute("""
            SELECT session_id, page_path, referrer, entered_at, duration_seconds, scroll_depth
            FROM page_views
            WHERE fingerprint = %s
            ORDER BY entered_at DESC
            LIMIT 200
        """, (fingerprint,))
        pageviews = []
        for row in cursor.fetchall():
            pageviews.append({
                'session': row[0][:8] + '...' if row[0] else None,
                'page': row[1],
                'referrer': row[2],
                'entered_at': row[3].isoformat() if row[3] else None,
                'duration': row[4],
                'scroll': row[5]
            })

        cursor.execute("""
            SELECT session_id, page_path, action_type, target_element, target_text, timestamp
            FROM user_actions
            WHERE fingerprint = %s
            ORDER BY timestamp DESC
            LIMIT 200
        """, (fingerprint,))
        user_actions = []
        for row in cursor.fetchall():
            user_actions.append({
                'session': row[0][:8] + '...' if row[0] else None,
                'page': row[1],
                'action': row[2],
                'element': row[3],
                'text': row[4][:100] if row[4] else None,
                'timestamp': row[5].isoformat() if row[5] else None
            })

        cursor.close()

        return jsonify({
            'visitor': visitor,
            'pageviews': pageviews,
            'actions': user_actions
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()