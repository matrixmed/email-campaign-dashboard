from flask import Blueprint, jsonify, request
from sqlalchemy import text
from db_pool import get_db_connection as get_connection

market_intelligence_bp = Blueprint('market_intelligence', __name__)

@market_intelligence_bp.route('/clinical-trials', methods=['GET'])
def get_clinical_trials():
    therapeutic_area = request.args.get('therapeutic_area')
    sponsor_class = request.args.get('sponsor_class', 'INDUSTRY')
    months_ahead = request.args.get('months_ahead', 18, type=int)

    try:
        conn = get_connection()
        cur = conn.cursor()

        filters = []
        params = {}

        if therapeutic_area and therapeutic_area != 'all':
            filters.append("therapeutic_area = %(therapeutic_area)s")
            params['therapeutic_area'] = therapeutic_area

        if sponsor_class and sponsor_class != 'all':
            filters.append("sponsor_class = %(sponsor_class)s")
            params['sponsor_class'] = sponsor_class

        where = "WHERE " + " AND ".join(filters) if filters else ""

        cur.execute(f"""
            SELECT nct_id, title, sponsor_name, sponsor_class, phase, status,
                   conditions, interventions, enrollment_count,
                   start_date, primary_completion_date, completion_date,
                   therapeutic_area
            FROM clinical_trials
            {where}
            ORDER BY primary_completion_date ASC NULLS LAST
        """, params)

        columns = [desc[0] for desc in cur.description]
        trials = [dict(zip(columns, row)) for row in cur.fetchall()]

        for t in trials:
            for k, v in t.items():
                if hasattr(v, 'isoformat'):
                    t[k] = v.isoformat()

        cur.execute(f"""
            SELECT sponsor_name, COUNT(*) as trial_count,
                   COUNT(*) FILTER (WHERE primary_completion_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '%(months)s months') as upcoming_count
            FROM clinical_trials
            {where}
            GROUP BY sponsor_name
            ORDER BY trial_count DESC
            LIMIT 30
        """.replace('%(months)s', str(months_ahead)), params)

        sponsor_cols = [desc[0] for desc in cur.description]
        sponsors = [dict(zip(sponsor_cols, row)) for row in cur.fetchall()]

        cur.execute(f"""
            SELECT therapeutic_area, COUNT(*) as total,
                   COUNT(*) FILTER (WHERE sponsor_class = 'INDUSTRY') as industry,
                   COUNT(*) FILTER (WHERE status = 'RECRUITING') as recruiting,
                   COUNT(*) FILTER (WHERE primary_completion_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '18 months') as completing_soon
            FROM clinical_trials
            GROUP BY therapeutic_area
            ORDER BY total DESC
        """)

        area_cols = [desc[0] for desc in cur.description]
        by_area = [dict(zip(area_cols, row)) for row in cur.fetchall()]

        conn.close()

        return jsonify({
            'status': 'success',
            'trials': trials,
            'top_sponsors': sponsors,
            'by_therapeutic_area': by_area,
            'total': len(trials)
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@market_intelligence_bp.route('/pdufa-dates', methods=['GET'])
def get_pdufa_dates():
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT drug_name, company_name, application_type,
                   therapeutic_area, target_date, status, source_url
            FROM pdufa_dates
            ORDER BY target_date ASC
        """)

        columns = [desc[0] for desc in cur.description]
        dates = [dict(zip(columns, row)) for row in cur.fetchall()]

        for d in dates:
            for k, v in d.items():
                if hasattr(v, 'isoformat'):
                    d[k] = v.isoformat()

        conn.close()

        return jsonify({
            'status': 'success',
            'dates': dates,
            'total': len(dates),
            'pending': sum(1 for d in dates if d['status'] == 'pending')
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@market_intelligence_bp.route('/open-payments', methods=['GET'])
def get_open_payments():
    manufacturer = request.args.get('manufacturer')
    specialty = request.args.get('specialty')
    limit = request.args.get('limit', 50, type=int)

    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT manufacturer_name, COUNT(DISTINCT npi) as hcp_count,
                   SUM(total_payments) as total_spend,
                   AVG(avg_payment) as avg_per_payment,
                   MAX(program_year) as latest_year
            FROM open_payments_summary
            GROUP BY manufacturer_name
            ORDER BY total_spend DESC
            LIMIT %(limit)s
        """, {'limit': limit})

        cols = [desc[0] for desc in cur.description]
        manufacturers = [dict(zip(cols, row)) for row in cur.fetchall()]

        for m in manufacturers:
            for k, v in m.items():
                if hasattr(v, 'isoformat'):
                    m[k] = v.isoformat()
                elif hasattr(v, '__float__'):
                    m[k] = float(v)

        cur.execute("""
            SELECT specialty, COUNT(DISTINCT npi) as hcp_count,
                   SUM(total_payments) as total_spend
            FROM open_payments_summary
            GROUP BY specialty
            ORDER BY total_spend DESC
            LIMIT 20
        """)

        spec_cols = [desc[0] for desc in cur.description]
        specialties = [dict(zip(spec_cols, row)) for row in cur.fetchall()]

        for s in specialties:
            for k, v in s.items():
                if hasattr(v, '__float__'):
                    s[k] = float(v)

        cur.execute("""
            SELECT COUNT(DISTINCT npi) as total_hcps,
                   COUNT(DISTINCT manufacturer_name) as total_manufacturers,
                   SUM(total_payments) as total_spend,
                   COUNT(*) as total_records
            FROM open_payments_summary
        """)

        summary_row = cur.fetchone()
        summary = {
            'total_hcps': summary_row[0],
            'total_manufacturers': summary_row[1],
            'total_spend': float(summary_row[2]) if summary_row[2] else 0,
            'total_records': summary_row[3]
        }

        cur.execute("""
            SELECT COUNT(DISTINCT op.npi) as matched_hcps
            FROM open_payments_summary op
            INNER JOIN user_profiles up ON op.npi = up.npi
            WHERE up.npi IS NOT NULL AND up.npi != ''
        """)

        matched = cur.fetchone()
        summary['matched_to_audience'] = matched[0] if matched else 0

        conn.close()

        return jsonify({
            'status': 'success',
            'manufacturers': manufacturers,
            'specialties': specialties,
            'summary': summary
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@market_intelligence_bp.route('/open-payments/manufacturer/<manufacturer_name>', methods=['GET'])
def get_manufacturer_detail(manufacturer_name):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT npi, physician_name, specialty,
                   total_payments, payment_count, avg_payment, max_payment,
                   latest_payment_date, program_year
            FROM open_payments_summary
            WHERE manufacturer_name = %(manufacturer)s
            ORDER BY total_payments DESC
        """, {'manufacturer': manufacturer_name})

        cols = [desc[0] for desc in cur.description]
        hcps = [dict(zip(cols, row)) for row in cur.fetchall()]

        for h in hcps:
            for k, v in h.items():
                if hasattr(v, 'isoformat'):
                    h[k] = v.isoformat()
                elif hasattr(v, '__float__'):
                    h[k] = float(v)

        cur.execute("""
            SELECT op.npi, op.physician_name, op.specialty,
                   op.total_payments, op.payment_count
            FROM open_payments_summary op
            INNER JOIN user_profiles up ON op.npi = up.npi
            WHERE op.manufacturer_name = %(manufacturer)s
            AND up.npi IS NOT NULL AND up.npi != ''
            ORDER BY op.total_payments DESC
        """, {'manufacturer': manufacturer_name})

        matched_cols = [desc[0] for desc in cur.description]
        matched = [dict(zip(matched_cols, row)) for row in cur.fetchall()]

        for m in matched:
            for k, v in m.items():
                if hasattr(v, '__float__'):
                    m[k] = float(v)

        conn.close()

        return jsonify({
            'status': 'success',
            'hcps': hcps,
            'matched_to_audience': matched,
            'total_hcps': len(hcps),
            'total_in_audience': len(matched)
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@market_intelligence_bp.route('/open-payments/manufacturer/<manufacturer_name>/export', methods=['GET'])
def export_manufacturer_kols(manufacturer_name):
    import csv
    import io
    from flask import Response

    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT op.npi, op.physician_name, op.specialty,
                   op.total_payments, op.payment_count, op.avg_payment,
                   op.max_payment, op.program_year,
                   CASE WHEN up.npi IS NOT NULL THEN 'Yes' ELSE 'No' END as in_audience
            FROM open_payments_summary op
            LEFT JOIN user_profiles up ON op.npi = up.npi AND up.npi IS NOT NULL AND up.npi != ''
            WHERE op.manufacturer_name = %(manufacturer)s
            ORDER BY op.total_payments DESC
        """, {'manufacturer': manufacturer_name})

        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        conn.close()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(columns)
        for row in rows:
            writer.writerow([float(v) if hasattr(v, '__float__') and v is not None else (v.isoformat() if hasattr(v, 'isoformat') else v) for v in row])

        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename={manufacturer_name}_kols.csv'}
        )
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@market_intelligence_bp.route('/pubmed-trends', methods=['GET'])
def get_pubmed_trends():
    therapeutic_area = request.args.get('therapeutic_area')

    try:
        conn = get_connection()
        cur = conn.cursor()

        filters = []
        params = {}

        if therapeutic_area and therapeutic_area != 'all':
            filters.append("therapeutic_area = %(therapeutic_area)s")
            params['therapeutic_area'] = therapeutic_area

        where = "WHERE " + " AND ".join(filters) if filters else ""

        cur.execute(f"""
            SELECT search_term, therapeutic_area, year, month, publication_count
            FROM pubmed_trends
            {where}
            ORDER BY search_term, year, month
        """, params)

        columns = [desc[0] for desc in cur.description]
        trends = [dict(zip(columns, row)) for row in cur.fetchall()]

        cur.execute(f"""
            WITH yearly AS (
                SELECT search_term, therapeutic_area, year,
                       SUM(publication_count) as total
                FROM pubmed_trends
                WHERE month = 0
                {("AND " + " AND ".join(filters)) if filters else ""}
                GROUP BY search_term, therapeutic_area, year
            ),
            growth AS (
                SELECT a.search_term, a.therapeutic_area,
                       a.year as current_year,
                       a.total as current_total, b.total as prev_total,
                       CASE WHEN b.total > 0
                           THEN ROUND(((a.total - b.total)::numeric / b.total) * 100, 1)
                           ELSE NULL END as growth_pct
                FROM yearly a
                JOIN yearly b ON a.search_term = b.search_term AND a.year = b.year + 1
                WHERE b.total > 10
            )
            SELECT * FROM growth
            WHERE growth_pct IS NOT NULL
            ORDER BY current_year DESC, growth_pct DESC
        """, params)

        growth_cols = [desc[0] for desc in cur.description]
        growth = [dict(zip(growth_cols, row)) for row in cur.fetchall()]

        for g in growth:
            for k, v in g.items():
                if hasattr(v, '__float__'):
                    g[k] = float(v)

        conn.close()

        return jsonify({
            'status': 'success',
            'trends': trends,
            'growth': growth
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@market_intelligence_bp.route('/patent-expirations', methods=['GET'])
def get_patent_expirations():
    years_ahead = request.args.get('years_ahead', 3, type=int)

    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT drug_name, active_ingredient, applicant,
                   patent_expiration_date, dosage_form, route,
                   COUNT(*) as patent_count
            FROM patent_expirations
            WHERE patent_expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '1 year' * %(years)s
            AND drug_name IS NOT NULL AND drug_name != ''
            GROUP BY drug_name, active_ingredient, applicant, patent_expiration_date, dosage_form, route
            ORDER BY patent_expiration_date ASC
        """, {'years': years_ahead})

        columns = [desc[0] for desc in cur.description]
        expirations = [dict(zip(columns, row)) for row in cur.fetchall()]

        for e in expirations:
            for k, v in e.items():
                if hasattr(v, 'isoformat'):
                    e[k] = v.isoformat()

        cur.execute("""
            SELECT applicant, COUNT(DISTINCT drug_name) as drug_count,
                   MIN(patent_expiration_date) as earliest_expiry
            FROM patent_expirations
            WHERE patent_expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '1 year' * %(years)s
            AND drug_name IS NOT NULL AND drug_name != ''
            GROUP BY applicant
            ORDER BY drug_count DESC
            LIMIT 20
        """, {'years': years_ahead})

        app_cols = [desc[0] for desc in cur.description]
        by_applicant = [dict(zip(app_cols, row)) for row in cur.fetchall()]

        for a in by_applicant:
            for k, v in a.items():
                if hasattr(v, 'isoformat'):
                    a[k] = v.isoformat()

        conn.close()

        return jsonify({
            'status': 'success',
            'expirations': expirations,
            'by_applicant': by_applicant,
            'total': len(expirations)
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@market_intelligence_bp.route('/market-benchmarks', methods=['GET'])
def get_market_benchmarks():
    channel = request.args.get('channel')

    try:
        conn = get_connection()
        cur = conn.cursor()

        filters = []
        params = {}

        if channel and channel != 'all':
            filters.append("channel = %(channel)s")
            params['channel'] = channel

        where = "WHERE " + " AND ".join(filters) if filters else ""

        cur.execute(f"""
            SELECT source, metric_name, metric_value, metric_unit,
                   channel, therapeutic_area, platform, year, quarter, notes
            FROM market_benchmarks
            {where}
            ORDER BY channel, metric_name
        """, params)

        columns = [desc[0] for desc in cur.description]
        benchmarks = [dict(zip(columns, row)) for row in cur.fetchall()]

        for b in benchmarks:
            for k, v in b.items():
                if hasattr(v, '__float__'):
                    b[k] = float(v)

        conn.close()

        return jsonify({
            'status': 'success',
            'benchmarks': benchmarks,
            'total': len(benchmarks)
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@market_intelligence_bp.route('/opportunities', methods=['GET'])
def get_opportunities():
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            WITH trial_signals AS (
                SELECT sponsor_name as company,
                       COUNT(*) as total_trials,
                       COUNT(*) FILTER (WHERE primary_completion_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '18 months') as upcoming_trials,
                       COUNT(*) FILTER (WHERE status = 'RECRUITING') as recruiting,
                       ARRAY_AGG(DISTINCT therapeutic_area) FILTER (WHERE therapeutic_area IS NOT NULL) as trial_areas
                FROM clinical_trials
                WHERE sponsor_class = 'INDUSTRY'
                GROUP BY sponsor_name
            ),
            payment_signals AS (
                SELECT manufacturer_name as company,
                       COUNT(DISTINCT npi) as total_kols,
                       SUM(total_payments) as total_spend,
                       ROUND(AVG(total_payments)::numeric, 2) as avg_spend_per_kol
                FROM open_payments_summary
                GROUP BY manufacturer_name
            ),
            audience_signals AS (
                SELECT op.manufacturer_name as company,
                       COUNT(DISTINCT op.npi) as audience_kols
                FROM open_payments_summary op
                INNER JOIN user_profiles up ON op.npi = up.npi
                WHERE up.npi IS NOT NULL AND up.npi != ''
                GROUP BY op.manufacturer_name
            ),
            pdufa_signals AS (
                SELECT company_name as company,
                       COUNT(*) as pdufa_count,
                       COUNT(*) FILTER (WHERE status = 'pending') as pending_pdufa,
                       MIN(target_date) FILTER (WHERE status = 'pending') as next_pdufa_date
                FROM pdufa_dates
                GROUP BY company_name
            ),
            patent_signals AS (
                SELECT applicant as company,
                       COUNT(DISTINCT drug_name) as expiring_drugs
                FROM patent_expirations
                WHERE patent_expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '3 years'
                AND drug_name IS NOT NULL AND drug_name != ''
                GROUP BY applicant
            ),
            all_companies AS (
                SELECT company FROM trial_signals
                UNION SELECT company FROM payment_signals
                UNION SELECT company FROM pdufa_signals
            )
            SELECT
                ac.company,
                COALESCE(ts.total_trials, 0) as total_trials,
                COALESCE(ts.upcoming_trials, 0) as upcoming_trials,
                COALESCE(ts.recruiting, 0) as recruiting,
                ts.trial_areas,
                COALESCE(ps.total_kols, 0) as total_kols,
                COALESCE(ps.total_spend, 0) as total_spend,
                COALESCE(aus.audience_kols, 0) as audience_kols,
                COALESCE(pf.pending_pdufa, 0) as pending_pdufa,
                pf.next_pdufa_date,
                COALESCE(pat.expiring_drugs, 0) as expiring_drugs,
                (
                    CASE WHEN COALESCE(ts.upcoming_trials, 0) > 0 THEN 25 ELSE 0 END +
                    LEAST(COALESCE(ts.upcoming_trials, 0) * 5, 25) +
                    CASE WHEN COALESCE(pf.pending_pdufa, 0) > 0 THEN 20 ELSE 0 END +
                    CASE WHEN COALESCE(aus.audience_kols, 0) > 0 THEN 15 ELSE 0 END +
                    LEAST(COALESCE(aus.audience_kols, 0)::float / GREATEST(COALESCE(ps.total_kols, 1), 1) * 15, 15) +
                    CASE WHEN COALESCE(ps.total_spend, 0) > 1000000 THEN 10
                         WHEN COALESCE(ps.total_spend, 0) > 100000 THEN 5
                         ELSE 0 END +
                    CASE WHEN COALESCE(pat.expiring_drugs, 0) > 0 THEN 10 ELSE 0 END
                ) as opportunity_score
            FROM all_companies ac
            LEFT JOIN trial_signals ts ON ac.company = ts.company
            LEFT JOIN payment_signals ps ON ac.company = ps.company
            LEFT JOIN audience_signals aus ON ac.company = aus.company
            LEFT JOIN pdufa_signals pf ON ac.company = pf.company
            LEFT JOIN patent_signals pat ON ac.company = pat.company
            WHERE (
                COALESCE(ts.upcoming_trials, 0) > 0 OR
                COALESCE(pf.pending_pdufa, 0) > 0 OR
                COALESCE(aus.audience_kols, 0) > 0 OR
                COALESCE(ps.total_spend, 0) > 100000
            )
            ORDER BY opportunity_score DESC, total_spend DESC
            LIMIT 100
        """)

        columns = [desc[0] for desc in cur.description]
        opportunities = [dict(zip(columns, row)) for row in cur.fetchall()]

        for o in opportunities:
            for k, v in o.items():
                if hasattr(v, 'isoformat'):
                    o[k] = v.isoformat()
                elif hasattr(v, '__float__'):
                    o[k] = float(v)
                elif v is None:
                    o[k] = None

        conn.close()

        return jsonify({
            'status': 'success',
            'opportunities': opportunities,
            'total': len(opportunities)
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@market_intelligence_bp.route('/company/<company_name>', methods=['GET'])
def get_company_profile(company_name):
    try:
        conn = get_connection()
        cur = conn.cursor()

        search = f"%{company_name}%"

        cur.execute("""
            SELECT nct_id, title, phase, status, conditions, interventions,
                   enrollment_count, primary_completion_date, therapeutic_area
            FROM clinical_trials
            WHERE sponsor_name ILIKE %(search)s AND sponsor_class = 'INDUSTRY'
            ORDER BY primary_completion_date ASC NULLS LAST
        """, {'search': search})
        trial_cols = [d[0] for d in cur.description]
        trials = [dict(zip(trial_cols, r)) for r in cur.fetchall()]

        cur.execute("""
            SELECT drug_name, company_name, application_type,
                   therapeutic_area, target_date, status
            FROM pdufa_dates
            WHERE company_name ILIKE %(search)s
            ORDER BY target_date
        """, {'search': search})
        pdufa_cols = [d[0] for d in cur.description]
        pdufa = [dict(zip(pdufa_cols, r)) for r in cur.fetchall()]

        cur.execute("""
            SELECT npi, physician_name, specialty,
                   total_payments, payment_count, avg_payment, max_payment, program_year
            FROM open_payments_summary
            WHERE manufacturer_name ILIKE %(search)s
            ORDER BY total_payments DESC
        """, {'search': search})
        kol_cols = [d[0] for d in cur.description]
        kols = [dict(zip(kol_cols, r)) for r in cur.fetchall()]

        cur.execute("""
            SELECT op.npi, op.physician_name, op.specialty,
                   op.total_payments, op.payment_count
            FROM open_payments_summary op
            INNER JOIN user_profiles up ON op.npi = up.npi
            WHERE op.manufacturer_name ILIKE %(search)s
            AND up.npi IS NOT NULL AND up.npi != ''
            ORDER BY op.total_payments DESC
        """, {'search': search})
        matched_cols = [d[0] for d in cur.description]
        matched_kols = [dict(zip(matched_cols, r)) for r in cur.fetchall()]

        cur.execute("""
            SELECT SUM(total_payments) as total_spend,
                   COUNT(DISTINCT npi) as hcp_count,
                   ROUND(AVG(total_payments)::numeric, 2) as avg_per_hcp
            FROM open_payments_summary
            WHERE manufacturer_name ILIKE %(search)s
        """, {'search': search})
        spend_row = cur.fetchone()
        spend_summary = {
            'total_spend': float(spend_row[0]) if spend_row[0] else 0,
            'hcp_count': spend_row[1] or 0,
            'avg_per_hcp': float(spend_row[2]) if spend_row[2] else 0
        }

        cur.execute("""
            SELECT drug_name, active_ingredient, patent_expiration_date,
                   COUNT(*) as patent_count
            FROM patent_expirations
            WHERE applicant ILIKE %(search)s
            AND patent_expiration_date >= CURRENT_DATE
            AND drug_name IS NOT NULL AND drug_name != ''
            GROUP BY drug_name, active_ingredient, patent_expiration_date
            ORDER BY patent_expiration_date ASC
            LIMIT 30
        """, {'search': search})
        patent_cols = [d[0] for d in cur.description]
        patents = [dict(zip(patent_cols, r)) for r in cur.fetchall()]

        all_items = trials + kols + pdufa + patents + matched_kols
        for item in all_items:
            for k, v in item.items():
                if hasattr(v, 'isoformat'):
                    item[k] = v.isoformat()
                elif hasattr(v, '__float__'):
                    item[k] = float(v)

        upcoming = [t for t in trials if t.get('primary_completion_date') and t['primary_completion_date'] >= str(__import__('datetime').date.today())]

        conn.close()

        return jsonify({
            'status': 'success',
            'company': company_name,
            'trials': {
                'total': len(trials),
                'upcoming_18mo': len([t for t in upcoming if t.get('primary_completion_date')]),
                'recruiting': len([t for t in trials if t.get('status') == 'RECRUITING']),
                'items': trials
            },
            'pdufa': {
                'total': len(pdufa),
                'pending': len([p for p in pdufa if p.get('status') == 'pending']),
                'items': pdufa
            },
            'kols': {
                'total': len(kols),
                'in_audience': len(matched_kols),
                'items': kols,
                'matched': matched_kols,
                'spend': spend_summary
            },
            'patents': {
                'total': len(patents),
                'items': patents
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@market_intelligence_bp.route('/summary', methods=['GET'])
def get_mi_summary():
    try:
        conn = get_connection()
        cur = conn.cursor()

        stats = {}

        cur.execute("SELECT COUNT(*) FROM clinical_trials WHERE sponsor_class = 'INDUSTRY'")
        stats['industry_trials'] = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM clinical_trials
            WHERE sponsor_class = 'INDUSTRY'
            AND primary_completion_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '18 months'
        """)
        stats['upcoming_trials'] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM pdufa_dates WHERE status = 'pending'")
        stats['pending_pdufa'] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(DISTINCT npi) FROM open_payments_summary")
        stats['total_kols'] = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(DISTINCT op.npi)
            FROM open_payments_summary op
            INNER JOIN user_profiles up ON op.npi = up.npi
            WHERE up.npi IS NOT NULL AND up.npi != ''
        """)
        stats['matched_kols'] = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM patent_expirations
            WHERE patent_expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '3 years'
        """)
        stats['expiring_patents'] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM pubmed_trends")
        stats['pubmed_records'] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM market_benchmarks")
        stats['benchmarks'] = cur.fetchone()[0]

        conn.close()

        return jsonify({'status': 'success', 'stats': stats})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500