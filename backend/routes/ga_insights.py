import re
from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor
from db_pool import get_db_connection

ga_insights_bp = Blueprint('ga_insights', __name__)

MAX_USER_EVENTS = 5000

DISEASE_KEYWORDS = {
    'Atopic Dermatitis': ['atopic', 'eczema', 'dupixent', 'rinvoq', 'opzelura', 'adbry', 'cibinqo', 'eucrisa', 'nemluvio'],
    'Psoriasis': ['psoriasis', 'skyrizi', 'cosentyx', 'taltz', 'otezla', 'bimzelx', 'sotyktu', 'tremfya', 'zoryve', 'vtama'],
    'Generalized Pustular Psoriasis': ['generalized pustular psoriasis', 'gpp', 'spevigo', 'spesolimab', 'pustular'],
    'Vitiligo': ['vitiligo', 'depigmentation', 'repigmentation'],
    'Acne': ['acne', 'winlevi', 'clascoterone', 'isotretinoin', 'absorica', 'cabtreo', 'twyneo', 'amzeeq', 'seysara'],
    'Alopecia Areata': ['alopecia', 'hair loss', 'leqselvi', 'litfulo', 'deuruxolitinib', 'hair regrowth'],
    'Melanoma': ['melanoma', 'basal cell', 'squamous cell', 'mohs', 'skin cancer', 'pigmented lesion', 'castle bioscience', 'decisiondx'],
    'Prurigo Nodularis': ['prurigo nodularis', 'prurigo', 'chronic pruritus'],
    'Chronic Hand Eczema': ['hand eczema', 'anzupgo', 'delgocitinib'],
    'Hidradenitis Suppurativa': ['hidradenitis suppurativa', 'hidradenitis'],
    'Rosacea': ['rosacea', 'soolantra', 'rhofade', 'zilxi'],
    'Seborrheic Dermatitis': ['seborrheic dermatitis', 'seborrheic'],
    'Molluscum Contagiosum': ['molluscum', 'ycanth'],
    'Cosmetic Dermatology': ['cosmetic', 'aesthetic', 'botox', 'filler', 'laser', 'skinbetter', 'rejuven', 'anti-aging'],
    'Breast Cancer': ['breast cancer', 'verzenio', 'truqap', 'phesgo', 'enhertu', 'itovebi', 'halaven'],
    'Lung Cancer': ['lung cancer', 'nsclc', 'sclc', 'tagrisso', 'imfinzi', 'keytruda', 'tecentriq'],
    'Multiple Myeloma': ['multiple myeloma', 'carvykti', 'bcma'],
    'Chronic Lymphocytic Leukemia': ['chronic lymphocytic leukemia', 'cll', 'calquence', 'jaypirca'],
    'Lymphoma': ['lymphoma', 'mcl', 'breyanzi'],
    'Renal Cell Carcinoma': ['renal cell', 'rcc', 'cabometyx'],
    "Alzheimers Disease": ['alzheimer', 'kisunla'],
    "Parkinsons Disease": ['parkinson', 'vyalev'],
    'Multiple Sclerosis': ['multiple sclerosis', 'ocrevus'],
}
_SHORT_KW = {'gpp', 'cll', 'mcl', 'rcc', 'bcma', 'nsclc', 'sclc'}
_DISEASE_PATTERNS = []
for _dis, _kws in DISEASE_KEYWORDS.items():
    for _kw in _kws:
        _DISEASE_PATTERNS.append((_dis, re.compile(r'\b' + re.escape(_kw) + r'\b') if _kw in _SHORT_KW else _kw))

_NO_PAGE_TOPIC_DOMAINS = ('mydigitalpublication.com', 'digitaleditions.walsworth.com', 'bluetoad.com')
_MASTHEAD_NOISE = [
    'journal of clinical and aesthetic dermatology', 'clinical and aesthetic dermatology',
    'innovations in clinical neuroscience', 'nutrition and health review', 'bariatric times',
    'oncology matrix', 'page not found', 'jcad',
]
_HT_PROPERTY_DISEASE = {
    'HT in CLL DE': 'Chronic Lymphocytic Leukemia',
    'HT in NSCLC DE': 'Lung Cancer',
    'HT in Breast Cancer DE': 'Breast Cancer',
}

def classify_page_disease(title, url, prop=None):
    u = (url or '').lower()
    if any(d in u for d in _NO_PAGE_TOPIC_DOMAINS):
        return _HT_PROPERTY_DISEASE.get(prop)
    slug = u.split('?')[0].split('#')[0].replace('-', ' ').replace('/', ' ')
    t = (title or '').lower() + ' ' + slug
    for noise in _MASTHEAD_NOISE:
        t = t.replace(noise, ' ')
    for dis, pat in _DISEASE_PATTERNS:
        if isinstance(pat, str):
            if pat in t:
                return dis
        elif pat.search(t):
            return dis
    return None

def _clean_url(u):
    u = (u or "").strip()
    if not u:
        return ""
    u = u.split("?")[0].split("#")[0].lower()
    return u

def _url_variants(u):
    base = _clean_url(u)
    if not base:
        return []
    stripped = base.rstrip("/")
    variants = {base, stripped, stripped + "/"}
    return list(variants)

@ga_insights_bp.route('/user-events', methods=['POST'])
def user_events():
    try:
        data = request.get_json() or {}
        upid = (data.get('user_pseudo_id') or '').strip()
        if not upid:
            return jsonify({'success': False, 'error': 'user_pseudo_id is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SET statement_timeout = '20s'")

        cursor.execute("""
            SELECT event, ts, url, page_title, engagement_ms, session_id,
                   city, region, device, source, medium, property, market
            FROM ga_events
            WHERE user_pseudo_id = %s
            ORDER BY ts ASC
            LIMIT %s
        """, (upid, MAX_USER_EVENTS + 1))
        rows = cursor.fetchall()

        truncated = len(rows) > MAX_USER_EVENTS
        rows = rows[:MAX_USER_EVENTS]

        sessions = set()
        page_views = 0
        scrolls = 0
        engagement_ms = 0
        pages = []
        seen_pages = set()
        events = []
        topic_stats = {}
        for r in rows:
            ts_iso = r['ts'].isoformat() if r['ts'] else None
            if r['session_id'] is not None:
                sessions.add(r['session_id'])
            if r['event'] == 'page_view':
                page_views += 1
                cu = (r['url'] or '').split('?')[0]
                if cu and cu not in seen_pages:
                    seen_pages.add(cu)
                    pages.append(cu)
                dis = classify_page_disease(r['page_title'], r['url'], r.get('property'))
                if dis:
                    ts_d = topic_stats.setdefault(dis, {'page_views': 0, 'engagement_ms': 0})
                    ts_d['page_views'] += 1
                    ts_d['engagement_ms'] += r['engagement_ms'] or 0
            elif r['event'] == 'scroll':
                scrolls += 1
            if r['engagement_ms']:
                engagement_ms += r['engagement_ms']
            events.append({
                'event': r['event'],
                'ts': ts_iso,
                'url': r['url'],
                'page_title': r['page_title'],
                'engagement_ms': r['engagement_ms'],
                'session_id': r['session_id'],
                'city': r['city'],
                'region': r['region'],
                'device': r['device'],
                'source': r['source'],
                'property': r['property'],
                'market': r['market'],
            })

        cursor.execute("SET statement_timeout = 0")
        cursor.close()
        conn.close()

        topics_browsed = sorted(
            ({'ta': d, 'page_views': s['page_views'], 'engagement_sec': round(s['engagement_ms'] / 1000.0, 1)}
             for d, s in topic_stats.items()),
            key=lambda x: -x['page_views']
        )

        return jsonify({
            'success': True,
            'user_pseudo_id': upid,
            'truncated': truncated,
            'summary': {
                'total_events': len(events),
                'total_sessions': len(sessions),
                'page_views': page_views,
                'scrolls': scrolls,
                'total_engagement_sec': round(engagement_ms / 1000.0, 1),
                'distinct_pages': len(pages),
                'first_seen': events[0]['ts'] if events else None,
                'last_seen': events[-1]['ts'] if events else None,
            },
            'topics_browsed': topics_browsed,
            'pages_visited': pages,
            'events': events,
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ga_insights_bp.route('/url-viewers', methods=['POST'])
def url_viewers():
    try:
        data = request.get_json() or {}
        raw_url = (data.get('url') or '').strip()
        variants = _url_variants(raw_url)
        if not variants:
            return jsonify({'success': False, 'error': 'url is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SET statement_timeout = '25s'")

        cursor.execute("""
            WITH viewers AS (
                SELECT
                    e.user_pseudo_id,
                    COUNT(*) AS events,
                    COUNT(*) FILTER (WHERE e.event = 'page_view') AS page_views,
                    COALESCE(SUM(e.engagement_ms), 0) AS engagement_ms,
                    COUNT(DISTINCT e.session_id) AS sessions,
                    MIN(e.ts) AS first_seen,
                    MAX(e.ts) AS last_seen,
                    (ARRAY_AGG(e.city ORDER BY e.ts DESC) FILTER (WHERE e.city IS NOT NULL AND e.city <> '(not set)'))[1] AS city,
                    (ARRAY_AGG(e.device ORDER BY e.ts DESC) FILTER (WHERE e.device IS NOT NULL))[1] AS device,
                    (ARRAY_AGG(e.property ORDER BY e.ts DESC))[1] AS property
                FROM ga_events e
                WHERE e.url_clean = ANY(%s)
                GROUP BY e.user_pseudo_id
            )
            SELECT v.*, b.email, b.npi, b.name, b.specialty, b.city AS hcp_city,
                   b.state AS hcp_state, b.confidence, b.distinct_ga_cities
            FROM viewers v
            LEFT JOIN ga_bridges b ON b.user_pseudo_id = v.user_pseudo_id
            ORDER BY v.engagement_ms DESC, v.events DESC
        """, (variants,))
        rows = cursor.fetchall()

        viewers = []
        identified = 0
        total_pv = 0
        total_eng = 0.0
        for r in rows:
            is_id = bool(r['email'] or r['npi'])
            if is_id:
                identified += 1
            eng_ms = float(r['engagement_ms'] or 0)
            total_pv += r['page_views'] or 0
            total_eng += eng_ms
            viewers.append({
                'user_pseudo_id': r['user_pseudo_id'],
                'identified': is_id,
                'name': (r['name'] or '').strip() or None,
                'email': r['email'],
                'npi': r['npi'],
                'specialty': r['specialty'],
                'hcp_city': r['hcp_city'],
                'hcp_state': r['hcp_state'],
                'confidence': r['confidence'],
                'distinct_ga_cities': r['distinct_ga_cities'],
                'events': r['events'],
                'page_views': r['page_views'],
                'sessions': r['sessions'],
                'engagement_sec': round(eng_ms / 1000.0, 1),
                'first_seen': r['first_seen'].isoformat() if r['first_seen'] else None,
                'last_seen': r['last_seen'].isoformat() if r['last_seen'] else None,
                'ga_city': r['city'],
                'device': r['device'],
                'property': r['property'],
            })

        cursor.execute("SET statement_timeout = 0")
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'url': _clean_url(raw_url),
            'matched_variants': variants,
            'summary': {
                'total_viewers': len(viewers),
                'identified_hcps': identified,
                'anonymous': len(viewers) - identified,
                'total_page_views': total_pv,
                'total_engagement_sec': round(total_eng / 1000.0, 1),
            },
            'viewers': viewers,
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ga_insights_bp.route('/top-urls', methods=['GET'])
def top_urls():
    try:
        days = min(int(request.args.get('days', 30)), 365)
        limit = min(int(request.args.get('limit', 100)), 500)
        q = (request.args.get('q') or '').strip().lower()

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SET statement_timeout = '20s'")

        params = [days]
        like = ""
        if q:
            like = "AND url_clean LIKE %s"
            params.append(f"%{q}%")
        params.append(limit)

        cursor.execute(f"""
            SELECT url_clean,
                   COUNT(*) FILTER (WHERE event='page_view') AS page_views,
                   COUNT(DISTINCT user_pseudo_id) AS viewers
            FROM ga_events
            WHERE ts >= now() - (%s || ' days')::interval
              AND url_clean <> ''
              {like}
            GROUP BY url_clean
            HAVING COUNT(*) FILTER (WHERE event='page_view') > 0
            ORDER BY viewers DESC
            LIMIT %s
        """, params)
        rows = cursor.fetchall()
        cursor.execute("SET statement_timeout = 0")
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'urls': [dict(r) for r in rows]}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500