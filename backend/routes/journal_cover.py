from flask import Blueprint, request, jsonify
import requests
import re

journal_cover_bp = Blueprint('journal_cover', __name__)

@journal_cover_bp.route('', methods=['GET'])
def get_journal_cover():
    issue_url = request.args.get('issue_url')

    if not issue_url:
        return jsonify({
            'status': 'error',
            'message': 'issue_url parameter is required'
        }), 400

    try:
        resp = requests.get(issue_url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        resp.raise_for_status()
        html = resp.text

        og_match = re.search(
            r'<meta\s+(?:property|name)=["\']og:image["\']\s+content=["\']([^"\']+)["\']',
            html, re.IGNORECASE
        )
        if not og_match:
            og_match = re.search(
                r'<meta\s+content=["\']([^"\']+)["\']\s+(?:property|name)=["\']og:image["\']',
                html, re.IGNORECASE
            )

        if not og_match:
            og_match = re.search(
                r'<meta\s+(?:property|name)=["\']twitter:image["\']\s+content=["\']([^"\']+)["\']',
                html, re.IGNORECASE
            )
            if not og_match:
                og_match = re.search(
                    r'<meta\s+content=["\']([^"\']+)["\']\s+(?:property|name)=["\']twitter:image["\']',
                    html, re.IGNORECASE
                )

        if not og_match:
            og_match = re.search(
                r'(https?://img\.coverstand\.com/[^"\'\s]+\.jpg)',
                html, re.IGNORECASE
            )

        if og_match:
            cover_url = og_match.group(1)
            return jsonify({
                'status': 'success',
                'cover_url': cover_url
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Could not find cover image on the page'
            }), 404

    except requests.exceptions.Timeout:
        return jsonify({
            'status': 'error',
            'message': 'Request timed out fetching the journal page'
        }), 504
    except requests.exceptions.RequestException as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch journal page: {str(e)}'
        }), 500