from flask import Blueprint, request, jsonify
from models import get_session
from sqlalchemy import text

vendor_match_bp = Blueprint('vendor_match', __name__)

def _clean_npis(raw):
    if isinstance(raw, str):
        raw = raw.replace(',', '\n').replace(';', '\n').split('\n')
    if not isinstance(raw, list):
        return [], []
    valid = []
    invalid = []
    seen = set()
    for item in raw:
        npi = str(item).strip().replace('-', '').replace(' ', '')
        if not npi:
            continue
        if npi.isdigit() and len(npi) == 10:
            if npi not in seen:
                seen.add(npi)
                valid.append(npi)
        else:
            invalid.append(str(item).strip())
    return valid, invalid

@vendor_match_bp.route('/lookup', methods=['POST'])
def vendor_match_lookup():
    try:
        data = request.get_json()
        if not data or 'npis' not in data:
            return jsonify({'status': 'error', 'message': 'Missing "npis" field'}), 400

        valid, invalid = _clean_npis(data['npis'])
        if not valid:
            return jsonify({'status': 'error', 'message': 'No valid 10-digit NPIs found'}), 400

        session = get_session()
        try:
            flags = {}
            for i in range(0, len(valid), 5000):
                chunk = valid[i:i + 5000]
                placeholders = ','.join([f':n{j}' for j in range(len(chunk))])
                params = {f'n{j}': npi for j, npi in enumerate(chunk)}
                rows = session.execute(text(f"""
                    SELECT npi, COALESCE(iqvia_match, false), COALESCE(hld_match, false)
                    FROM universal_profiles
                    WHERE npi IN ({placeholders})
                """), params).fetchall()
                for row in rows:
                    flags[str(row[0])] = (bool(row[1]), bool(row[2]))

            results = []
            iqvia_count = hld_count = both_count = neither_count = 0
            for npi in valid:
                iqvia, hld = flags.get(npi, (False, False))
                if iqvia:
                    iqvia_count += 1
                if hld:
                    hld_count += 1
                if iqvia and hld:
                    both_count += 1
                if not iqvia and not hld:
                    neither_count += 1
                results.append({'npi': npi, 'iqvia': iqvia, 'hld': hld})

            return jsonify({
                'status': 'success',
                'requested': len(valid),
                'iqvia_count': iqvia_count,
                'hld_count': hld_count,
                'both_count': both_count,
                'neither_count': neither_count,
                'invalid_count': len(invalid),
                'invalid_npis': invalid[:100],
                'results': results,
            }), 200
        finally:
            session.close()

    except Exception as e:
        import traceback
        return jsonify({'status': 'error', 'message': str(e), 'trace': traceback.format_exc()}), 500