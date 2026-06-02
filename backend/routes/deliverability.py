from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor

from db_pool import get_db_connection

deliverability_bp = Blueprint('deliverability', __name__)

def _rate(num, denom):
    if not denom:
        return None
    return (num / denom) * 100

def _compose_rows(per_dim_events):
    out = []
    for dim_value, events in per_dim_events.items():
        sent = events.get('sent', 0)
        opens = events.get('opens', 0)
        clicks = events.get('clicks', 0)
        bounces = events.get('bounces', 0)
        unsubs = events.get('unsubs', 0)
        delivered = max(sent - bounces, 0)
        out.append({
            'dim_value': dim_value,
            'sent': sent,
            'delivered': delivered,
            'opens': opens,
            'clicks': clicks,
            'bounces': bounces,
            'unsubs': unsubs,
            'open_rate': _rate(opens, delivered),
            'click_rate': _rate(clicks, opens),
            'bounce_rate': _rate(bounces, sent),
            'unsub_rate': _rate(unsubs, delivered),
        })
    return out

@deliverability_bp.route('/campaign-breakdown', methods=['POST'])
def campaign_breakdown():
    body = request.get_json() or {}
    campaign_ids = body.get('campaign_ids') or []
    if not campaign_ids:
        return jsonify({'error': 'campaign_ids are required'}), 400

    campaign_ids = [str(c) for c in campaign_ids]

    with get_db_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SET LOCAL statement_timeout = '60s'")

        cursor.execute("""
            WITH pe AS (
                SELECT LOWER(email) AS em,
                       LOWER(SPLIT_PART(email, '@', 2)) AS dim_value,
                       bool_or(event_type = 'sent') AS s,
                       bool_or(event_type = 'bounce') AS b,
                       bool_or(event_type = 'open') AS o,
                       bool_or(event_type = 'click') AS c,
                       bool_or(event_type = 'unsubscribe') AS u
                FROM campaign_interactions
                WHERE campaign_id = ANY(%s) AND email LIKE '%%@%%'
                GROUP BY LOWER(email), LOWER(SPLIT_PART(email, '@', 2))
            )
            SELECT COALESCE(dim_value, 'unknown') AS dim_value,
                   COUNT(*) FILTER (WHERE s) AS sent,
                   COUNT(*) FILTER (WHERE s AND b) AS bounces,
                   COUNT(*) FILTER (WHERE s AND NOT b AND o) AS opens,
                   COUNT(*) FILTER (WHERE s AND NOT b AND c) AS clicks,
                   COUNT(*) FILTER (WHERE s AND NOT b AND u) AS unsubs
            FROM pe
            GROUP BY dim_value
        """, (campaign_ids,))
        per_domain = {}
        for row in cursor.fetchall():
            dv = row['dim_value'] or 'unknown'
            per_domain[dv] = {
                'sent': int(row['sent'] or 0),
                'bounces': int(row['bounces'] or 0),
                'opens': int(row['opens'] or 0),
                'clicks': int(row['clicks'] or 0),
                'unsubs': int(row['unsubs'] or 0),
            }

        cursor.execute("""
            WITH pe AS (
                SELECT LOWER(email) AS em,
                       bool_or(event_type = 'sent') AS s,
                       bool_or(event_type = 'bounce') AS b,
                       bool_or(event_type = 'open') AS o,
                       bool_or(event_type = 'click') AS c,
                       bool_or(event_type = 'unsubscribe') AS u
                FROM campaign_interactions
                WHERE campaign_id = ANY(%s) AND email LIKE '%%@%%'
                GROUP BY LOWER(email)
            )
            SELECT UPPER(up.state) AS dim_value,
                   COUNT(DISTINCT pe.em) FILTER (WHERE pe.s) AS sent,
                   COUNT(DISTINCT pe.em) FILTER (WHERE pe.s AND pe.b) AS bounces,
                   COUNT(DISTINCT pe.em) FILTER (WHERE pe.s AND NOT pe.b AND pe.o) AS opens,
                   COUNT(DISTINCT pe.em) FILTER (WHERE pe.s AND NOT pe.b AND pe.c) AS clicks,
                   COUNT(DISTINCT pe.em) FILTER (WHERE pe.s AND NOT pe.b AND pe.u) AS unsubs
            FROM pe
            JOIN user_profiles up ON LOWER(up.email) = pe.em
            WHERE up.state IS NOT NULL AND up.state <> ''
            GROUP BY UPPER(up.state)
        """, (campaign_ids,))
        per_state = {}
        for row in cursor.fetchall():
            dv = (row['dim_value'] or '').upper() or 'UNKNOWN'
            per_state[dv] = {
                'sent': int(row['sent'] or 0),
                'bounces': int(row['bounces'] or 0),
                'opens': int(row['opens'] or 0),
                'clicks': int(row['clicks'] or 0),
                'unsubs': int(row['unsubs'] or 0),
            }

        cursor.close()

    domains = [{'domain': r['dim_value'], **{k: v for k, v in r.items() if k != 'dim_value'}}
               for r in _compose_rows(per_domain)]
    states = [{'state': r['dim_value'], **{k: v for k, v in r.items() if k != 'dim_value'}}
              for r in _compose_rows(per_state)]
    domains.sort(key=lambda x: x['sent'] or 0, reverse=True)
    states.sort(key=lambda x: x['sent'] or 0, reverse=True)

    return jsonify({'domains': domains, 'states': states})