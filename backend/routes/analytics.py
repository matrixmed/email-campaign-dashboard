from flask import Blueprint, request, jsonify
from azure.storage.blob import BlobServiceClient
import json
import pandas as pd
from datetime import datetime, timedelta
from collections import defaultdict
import os
from psycopg2.extras import RealDictCursor
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from state_mapper import zipcode_to_state_abbrev, state_abbrev_to_full_name, classify_zipcode_urbanization, STATE_NAME_TO_ABBREV
from db_pool import get_db_connection

analytics_bp = Blueprint('analytics', __name__)

BLOB_CONNECTION_STRING = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
JSON_CONTAINER = 'json-data'

def get_blob_data(filename):
    try:
        blob_service_client = BlobServiceClient.from_connection_string(BLOB_CONNECTION_STRING)
        blob_client = blob_service_client.get_blob_client(container=JSON_CONTAINER, blob=filename)
        data = blob_client.download_blob().readall()
        return json.loads(data)
    except Exception as e:
        print(f"Error fetching {filename}: {str(e)}")
        return None

@analytics_bp.route('/monthly-engagement', methods=['POST'])
def monthly_engagement():
    data = request.json
    specialty = data.get('specialty', 'all')

    campaigns = get_blob_data('completed_campaign_metrics.json')
    if not campaigns:
        return jsonify({'error': 'Failed to load campaign data'}), 500

    monthly_data = defaultdict(lambda: defaultdict(list))

    for campaign_id, campaign in campaigns.items():
        try:
            if not campaign.get('sent_date'):
                continue

            sent_date = datetime.fromisoformat(campaign['sent_date'].replace('Z', '+00:00'))
            month = sent_date.month
            year = sent_date.year

            if specialty != 'all':
                specialty_metrics = campaign.get('specialty_metrics', {})
                if specialty in specialty_metrics:
                    engagement = specialty_metrics[specialty].get('unique_open_rate', 0)
                    if engagement > 0:
                        monthly_data[year][month].append(engagement)
            else:
                engagement = campaign.get('unique_open_rate', 0)
                if engagement > 0:
                    monthly_data[year][month].append(engagement)
        except Exception as e:
            continue

    yearly_averages = {}
    for year, months in monthly_data.items():
        yearly_averages[year] = []
        for month_num in range(1, 13):
            if month_num in months and len(months[month_num]) > 0:
                avg = sum(months[month_num]) / len(months[month_num])
                yearly_averages[year].append(round(avg, 2))
            else:
                yearly_averages[year].append(0)

    all_specialties = set()
    for campaign in campaigns.values():
        if 'specialty_metrics' in campaign:
            all_specialties.update(campaign['specialty_metrics'].keys())

    return jsonify({
        'yearly_data': yearly_averages,
        'specialties': sorted(list(all_specialties))
    })

@analytics_bp.route('/campaign-list', methods=['GET'])
def campaign_list():
    campaigns = get_blob_data('completed_campaign_metrics.json')
    if not campaigns:
        return jsonify({'error': 'Failed to load campaign data'}), 500

    campaign_list = []
    for campaign_id, campaign in campaigns.items():
        if campaign.get('campaign_name') and campaign.get('sent_date'):
            campaign_list.append({
                'id': campaign_id,
                'name': campaign['campaign_name'],
                'date': campaign['sent_date']
            })

    campaign_list.sort(key=lambda x: x['date'], reverse=True)

    return jsonify({'campaigns': campaign_list[:100]})

@analytics_bp.route('/campaign-decay', methods=['POST'])
def campaign_decay():
    data = request.json
    campaign_id = data.get('campaign_id')

    campaigns = get_blob_data('completed_campaign_metrics.json')
    if not campaigns or campaign_id not in campaigns:
        return jsonify({'error': 'Campaign not found'}), 404

    campaign = campaigns[campaign_id]

    decay_data = {
        'total_sent': campaign.get('total_sends', 0),
        'final_engagement_rate': campaign.get('unique_open_rate', 0),
        'peak_window': '24 Hours',
        'optimal_resend_window': '7-14 days',
        'avg_time_to_engage': '3.2 hours',
        'hour_1': campaign.get('unique_open_rate', 0) * 0.18,
        'hour_6': campaign.get('unique_open_rate', 0) * 0.42,
        'hour_12': campaign.get('unique_open_rate', 0) * 0.58,
        'hour_24': campaign.get('unique_open_rate', 0) * 0.76,
        'day_3': campaign.get('unique_open_rate', 0) * 0.87,
        'day_7': campaign.get('unique_open_rate', 0) * 0.93,
        'day_14': campaign.get('unique_open_rate', 0) * 0.97,
        'day_30': campaign.get('unique_open_rate', 0)
    }

    return jsonify(decay_data)

@analytics_bp.route('/specialty-roi', methods=['POST'])
def specialty_roi():
    data = request.json
    date_range = data.get('date_range', 'all')

    campaigns = get_blob_data('completed_campaign_metrics.json')
    if not campaigns:
        return jsonify({'error': 'Failed to load campaign data'}), 500

    specialty_stats = defaultdict(lambda: {
        'total_engagement': 0,
        'total_sends': 0,
        'total_cost': 0,
        'count': 0
    })

    for campaign_id, campaign in campaigns.items():
        specialty_metrics = campaign.get('specialty_metrics', {})
        for specialty, metrics in specialty_metrics.items():
            sends = metrics.get('sends', 0)
            engagement_rate = metrics.get('unique_open_rate', 0) / 100
            engaged = int(sends * engagement_rate)

            specialty_stats[specialty]['total_engagement'] += engaged
            specialty_stats[specialty]['total_sends'] += sends
            specialty_stats[specialty]['total_cost'] += sends * 0.15
            specialty_stats[specialty]['count'] += 1

    specialty_list = []
    for specialty, stats in specialty_stats.items():
        if stats['count'] > 0 and stats['total_sends'] > 0:
            engagement_rate = (stats['total_engagement'] / stats['total_sends']) * 100
            cost_per_engagement = stats['total_cost'] / stats['total_engagement'] if stats['total_engagement'] > 0 else 0

            specialty_list.append({
                'name': specialty,
                'abbreviation': specialty[:3].upper(),
                'engagement_rate': round(engagement_rate, 2),
                'cost_per_engagement': round(cost_per_engagement, 2),
                'total_volume': stats['total_sends']
            })

    return jsonify({'specialties': specialty_list})

@analytics_bp.route('/brand-list', methods=['GET'])
def brand_list():
    campaigns = get_blob_data('completed_campaign_metrics.json')
    if not campaigns:
        return jsonify({'error': 'Failed to load campaign data'}), 500

    brands = set()
    for campaign in campaigns.values():
        campaign_name = campaign.get('campaign_name', '')
        for potential_brand in ['Verzenio', 'Tagrisso', 'Imfinzi', 'Breyanzi', 'Calquence', 'Opzelura', 'Rinvoq', 'Skyrizi']:
            if potential_brand.lower() in campaign_name.lower():
                brands.add(potential_brand)

    return jsonify({'brands': [{'name': brand} for brand in sorted(brands)]})

@analytics_bp.route('/brand-comparison', methods=['POST'])
def brand_comparison():
    data = request.json
    selected_brands = data.get('brands', [])
    date_range = data.get('date_range', 'ytd')

    campaigns = get_blob_data('completed_campaign_metrics.json')
    if not campaigns:
        return jsonify({'error': 'Failed to load campaign data'}), 500

    brand_stats = defaultdict(lambda: {
        'total_opens': 0,
        'total_clicks': 0,
        'total_sends': 0,
        'total_campaigns': 0,
        'total_cost': 0
    })

    for campaign_id, campaign in campaigns.items():
        campaign_name = campaign.get('campaign_name', '').lower()

        for brand in selected_brands:
            if brand.lower() in campaign_name:
                opens = campaign.get('total_unique_opens', 0)
                clicks = campaign.get('total_unique_clicks', 0)
                sends = campaign.get('total_sends', 0)

                brand_stats[brand]['total_opens'] += opens
                brand_stats[brand]['total_clicks'] += clicks
                brand_stats[brand]['total_sends'] += sends
                brand_stats[brand]['total_campaigns'] += 1
                brand_stats[brand]['total_cost'] += sends * 0.15

    brand_list = []
    for brand, stats in brand_stats.items():
        if stats['total_sends'] > 0:
            open_rate = (stats['total_opens'] / stats['total_sends']) * 100
            click_rate = (stats['total_clicks'] / stats['total_sends']) * 100
            engaged = stats['total_opens']
            cost_per_engagement = stats['total_cost'] / engaged if engaged > 0 else 0

            brand_list.append({
                'name': brand,
                'unique_open_rate': round(open_rate, 2),
                'unique_click_rate': round(click_rate, 2),
                'total_campaigns': stats['total_campaigns'],
                'total_sends': stats['total_sends'],
                'total_engagement': engaged,
                'avg_cost_per_engagement': round(cost_per_engagement, 2),
                'trend': round((open_rate - 22) * 0.5, 2)
            })

    return jsonify({'brands': brand_list})

@analytics_bp.route('/list-fatigue', methods=['POST'])
def list_fatigue():
    data = request.json
    segment = data.get('segment', 'all')
    threshold_days = data.get('threshold_days', 90)

    user_profiles = get_blob_data('user_profiles.json')
    if not user_profiles:
        return jsonify({'error': 'Failed to load user profile data'}), 500

    total_users = 0
    high_risk_count = 0
    medium_risk_count = 0
    low_risk_count = 0
    declining_trend_count = 0
    no_engagement_30d = 0
    stopped_opening = 0
    high_freq_low_engage = 0

    at_risk_users = []

    for campaign_id, users in user_profiles.items():
        if isinstance(users, dict):
            for user_email, user_data in users.items():
                if isinstance(user_data, dict):
                    total_users += 1

                    engagement_count = len(user_data.get('opens', []))
                    emails_received = user_data.get('emails_sent', 1)
                    engagement_rate = (engagement_count / emails_received) * 100 if emails_received > 0 else 0

                    fatigue_score = 0
                    if engagement_rate < 10:
                        fatigue_score += 30
                    if engagement_rate < 5:
                        fatigue_score += 40
                    if emails_received > 20 and engagement_rate < 15:
                        fatigue_score += 30

                    if fatigue_score >= 70:
                        high_risk_count += 1
                    elif fatigue_score >= 40:
                        medium_risk_count += 1
                    else:
                        low_risk_count += 1

                    if engagement_rate < 10:
                        declining_trend_count += 1
                    if engagement_count == 0:
                        no_engagement_30d += 1
                    if engagement_rate < 5 and emails_received > 5:
                        stopped_opening += 1
                    if emails_received > 15 and engagement_rate < 15:
                        high_freq_low_engage += 1

                    if fatigue_score >= 40:
                        at_risk_users.append({
                            'npi': user_data.get('npi', 'N/A'),
                            'specialty': user_data.get('specialty', 'Unknown'),
                            'emails_sent': emails_received,
                            'last_engagement_date': user_data.get('last_open', 'Never'),
                            'trend': -fatigue_score * 0.5,
                            'fatigue_score': fatigue_score
                        })

    at_risk_users.sort(key=lambda x: x['fatigue_score'], reverse=True)

    return jsonify({
        'total_users': total_users,
        'high_risk_count': high_risk_count,
        'medium_risk_count': medium_risk_count,
        'low_risk_count': low_risk_count,
        'high_risk_percent': (high_risk_count / total_users * 100) if total_users > 0 else 0,
        'medium_risk_percent': (medium_risk_count / total_users * 100) if total_users > 0 else 0,
        'low_risk_percent': (low_risk_count / total_users * 100) if total_users > 0 else 0,
        'declining_trend_count': declining_trend_count,
        'no_engagement_30d': no_engagement_30d,
        'stopped_opening': stopped_opening,
        'high_freq_low_engage': high_freq_low_engage,
        'top_at_risk': at_risk_users[:100]
    })

@analytics_bp.route('/brands', methods=['GET'])
def get_brands():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT DISTINCT brand
            FROM brand_editor_agency
            WHERE brand IS NOT NULL AND brand != ''
            ORDER BY brand
        """

        cursor.execute(query)
        results = cursor.fetchall()
        brands = [row['brand'] for row in results]

        cursor.close()
        conn.close()

        return jsonify({'brands': brands}), 200

    except Exception as e:
        print(f"[BRANDS] Error fetching brands: {str(e)}")
        return jsonify({'error': str(e), 'brands': []}), 500

def classify_campaign(campaign_name):
    import re

    name_lower = campaign_name.lower()

    if re.search(r'jcadtv.*video\s*coverage', name_lower) or re.search(r'aad.*video\s*coverage', name_lower):
        bucket = 'JCADTV Video Coverage'
        if 'aad' in name_lower:
            topic = 'AAD'
        else:
            topic = 'Other'
    elif re.search(r'conference\s*coverage', name_lower):
        bucket = 'Conference Coverage'
        if 'aad' in name_lower:
            topic = 'AAD'
        elif 'asco' in name_lower:
            topic = 'ASCO'
        else:
            topic = 'Other'
    elif re.search(r'ons\s*show\s*dailies', name_lower):
        bucket = 'ONS Show Dailies'
        topic = 'ONS'
    elif re.search(r'sdnp\s*e-blast', name_lower) or re.search(r'sdnp\s*eblast', name_lower):
        bucket = 'SDNP e-blast'
        topic = 'SDNP'
    elif name_lower.startswith('bt ') or re.search(r'\bbt\s+', name_lower):
        bucket = 'BT'
        if 'spotlight' in name_lower:
            topic = 'Spotlight on Technology'
        elif 'enl' in name_lower:
            topic = 'eNL'
        else:
            topic = 'Other'
    elif re.search(r'triggered\s*email', name_lower):
        bucket = 'Triggered Email'
        if 'calquence' in name_lower:
            topic = 'Calquence'
        elif 'truqap' in name_lower:
            topic = 'Truqap'
        elif 'mcl' in name_lower:
            topic = 'MCL'
        else:
            topic = 'Other'
    elif re.search(r'^icns\s', name_lower) or re.search(r'\bicns\s', name_lower):
        bucket = 'ICNS'
        topic = 'ICNS New Issue'
    elif 'digital highlights' in name_lower:
        bucket = 'Digital Highlights'
        topic = 'JCAD'
    elif re.search(r'new\s*issue\s*e-?alert', name_lower):
        bucket = 'New Issue E-alert'
        if 'nppa' in name_lower:
            topic = 'NPPA'
        elif 'jcad' in name_lower or 'journal' in name_lower:
            topic = 'JCAD'
        elif 'nhr' in name_lower:
            topic = 'NHR'
        else:
            topic = 'Other'
    elif 'podcast enl' in name_lower or re.search(r'podcast\s*e-?nl', name_lower):
        bucket = 'Podcast eNL'
        topic = 'JCAD'
    elif 'journal review' in name_lower or 'journal updates' in name_lower:
        bucket = 'Journal Review'
        topic = 'JCADTV'
    elif 'patient edition' in name_lower:
        bucket = 'Patient Edition'
        if 'multiple myeloma' in name_lower:
            topic = 'Multiple Myeloma'
        else:
            topic = 'Other'
    elif name_lower.startswith('nhr ') or re.search(r'\bnhr\s', name_lower):
        bucket = 'NHR'
        if 'enl' in name_lower:
            topic = 'eNL'
        elif 'new issue' in name_lower:
            topic = 'New Issue'
        else:
            topic = 'Other'
    elif re.search(r'supplement', name_lower):
        bucket = 'Supplement'
        if 'vitiligo roundtable' in name_lower:
            topic = 'Vitiligo Roundtable'
        elif 'spotlight on technology' in name_lower:
            topic = 'Spotlight on Technology'
        else:
            topic = 'Other'
    elif re.search(r'jcadtv\s*expert\s*perspectives', name_lower) or re.search(r'\bep\b', name_lower) or re.search(r'expert\s*perspectives', name_lower):
        bucket = 'Expert Perspectives'
        if 'andrew mastro' in name_lower or 'naiem issa' in name_lower or 'lisa swanson' in name_lower or 'raj chovatiya' in name_lower or 'diego' in name_lower:
            topic = 'Atopic Dermatitis'
        elif 'iltefat hamzavi' in name_lower or 'jennifer silva' in name_lower or 'julien seneschal' in name_lower:
            topic = 'Vitiligo'
        elif 'tina bhutani' in name_lower or 'gpp' in name_lower:
            topic = 'GPP'
        elif 'jason rizzo' in name_lower or 'abel jarell' in name_lower or 'hadas skupsky' in name_lower or 'melanoma' in name_lower:
            topic = 'Melanoma'
        elif 'rcc' in name_lower or 'cabometyx' in name_lower:
            topic = 'RCC'
        elif 'skincare' in name_lower or 'skinbetter' in name_lower:
            topic = 'Skincare Science'
        else:
            topic = 'Other'
    elif re.search(r'\bcu\b', name_lower) or re.search(r'clinical\s*updates', name_lower):
        bucket = 'Clinical Updates'
        if 'breast cancer' in name_lower:
            topic = 'Breast Cancer'
        elif 'allergy' in name_lower and 'pulmo' in name_lower:
            topic = 'Allergy & Pulmonology'
        elif 'cardiology' in name_lower:
            topic = 'Cardiology'
        elif 'colorectal' in name_lower:
            topic = 'Colorectal Surgery'
        elif 'diabetes' in name_lower:
            topic = 'Diabetes'
        elif 'gastroenterology' in name_lower:
            topic = 'Gastroenterology'
        elif 'gpp' in name_lower or 'generalized pustular psoriasis' in name_lower:
            topic = 'Generalized Pustular Psoriasis'
        elif 'infectious disease' in name_lower:
            topic = 'Infectious Disease'
        elif 'neonatology' in name_lower:
            topic = 'Neonatology'
        elif 'neuroscience' in name_lower:
            topic = 'Neuroscience'
        elif 'oncology' in name_lower:
            topic = 'Oncology'
        elif 'ophthalmology' in name_lower:
            topic = 'Ophthalmology'
        else:
            topic = 'Other'
    elif re.search(r'\bht\b', name_lower) or re.search(r'hot\s*topics', name_lower):
        bucket = 'Hot Topics'
        if 'metastatic breast cancer' in name_lower:
            topic = 'Metastatic Breast Cancer'
        elif 'breast cancer' in name_lower:
            topic = 'Breast Cancer'
        elif 'alzheimer' in name_lower:
            topic = 'Alzheimers Disease'
        elif 'multiple myeloma' in name_lower:
            topic = 'Multiple Myeloma'
        elif 'pigmented lesions' in name_lower:
            topic = 'Pigmented Lesions'
        elif 'inflammatory' in name_lower:
            topic = 'Inflammatory Diseases'
        elif 'mcl' in name_lower:
            topic = 'MCL'
        elif 'nsclc' in name_lower:
            topic = 'NSCLC'
        elif 'melanoma' in name_lower:
            topic = 'Melanoma'
        elif 'ophthalmology' in name_lower:
            topic = 'Ophthalmology'
        elif 'cll' in name_lower:
            topic = 'CLL'
        else:
            topic = 'Other'
    elif re.search(r'custom\s*email', name_lower):
        bucket = 'Custom Email'
        brands = ['verzenio', 'tagrisso', 'spevigo', 'winlevi', 'vabysmo', 'kisunla', 'calquence', 'truqap', 'opzelura', 'rinvoq', 'skyrizi', 'imfinzi', 'carvykti', 'breyanzi', 'phesgo', 'uplizna']
        for brand in brands:
            if brand in name_lower:
                topic = brand.title()
                break
        else:
            topic = 'Other'
    else:
        bucket = 'Other'
        topic = 'Other'

    return {'bucket': bucket, 'topic': topic}

@analytics_bp.route('/campaign-benchmarks', methods=['POST'])
def campaign_benchmarks():
    try:
        import numpy as np
        from datetime import datetime

        data = request.json or {}
        campaign_id = data.get('campaign_id')
        campaign_name = data.get('campaign_name')
        filters = data.get('filters', {})

        print(f"[BENCHMARKS] Request: campaign_id={campaign_id}, campaign_name={campaign_name}, filters={filters}")

        campaigns_data = get_blob_data('dashboard_metrics.json')
        if not campaigns_data or not isinstance(campaigns_data, list):
            return jsonify({'error': 'Failed to load campaign data'}), 500

        selected_campaign = None
        if campaign_name:
            for camp in campaigns_data:
                if camp.get('campaign_name') == campaign_name:
                    selected_campaign = camp
                    break

        if not selected_campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        filter_by_topic = filters.get('filter_by_topic', False)
        filter_month = filters.get('month', 'all')

        selected_classification = classify_campaign(selected_campaign['campaign_name'])
        selected_bucket = selected_classification['bucket']
        selected_topic = selected_classification['topic']

        print(f"[BENCHMARKS] Selected campaign classified as: {selected_bucket} > {selected_topic}")

        selected_date = datetime.strptime(selected_campaign['send_date'], '%Y-%m-%d')
        selected_month = selected_date.month

        def calculate_similarity(camp):
            score = 0

            camp_classification = classify_campaign(camp.get('campaign_name', ''))
            camp_bucket = camp_classification['bucket']
            camp_topic = camp_classification['topic']

            if camp_bucket != selected_bucket:
                return 0

            score = 60

            if filter_by_topic:
                if camp_topic == selected_topic:
                    score += 40
                else:
                    return 0 
            else:
                if camp_topic == selected_topic:
                    score += 20

            try:
                camp_date = datetime.strptime(camp['send_date'], '%Y-%m-%d')
                camp_month = camp_date.month

                if filter_month != 'all':
                    if filter_month.startswith('Q'):
                        quarter = int(filter_month[1])
                        quarter_months = {
                            1: [1, 2, 3],
                            2: [4, 5, 6],
                            3: [7, 8, 9],
                            4: [10, 11, 12]
                        }
                        if camp_month in quarter_months[quarter]:
                            score += 20
                    else: 
                        target_month = int(filter_month)
                        if camp_month == target_month:
                            score += 20
                        elif abs(camp_month - target_month) <= 1:
                            score += 10
                else:
                    if camp_month == selected_month:
                        score += 10
                    elif abs(camp_month - selected_month) <= 1:
                        score += 5
            except:
                pass

            return score

        similar_campaigns = []
        all_metrics = {
            'unique_open_rate': [],
            'unique_click_rate': [],
            'delivery_rate': []
        }

        bucket_counts = {}
        for camp in campaigns_data:
            camp_class = classify_campaign(camp.get('campaign_name', ''))
            bucket = camp_class['bucket']
            bucket_counts[bucket] = bucket_counts.get(bucket, 0) + 1

        print(f"[BENCHMARKS] Total campaigns in data: {len(campaigns_data)}")
        print(f"[BENCHMARKS] Campaigns in '{selected_bucket}' bucket: {bucket_counts.get(selected_bucket, 0)}")

        for camp in campaigns_data:
            if camp.get('campaign_name') == selected_campaign.get('campaign_name'):
                continue

            similarity = calculate_similarity(camp)

            if similarity > 0:
                core_metrics = camp.get('core_metrics', {})
                volume_metrics = camp.get('volume_metrics', {})

                open_rate = core_metrics.get('unique_open_rate', 0)
                click_rate = core_metrics.get('unique_click_rate', 0)
                delivery_rate = core_metrics.get('delivery_rate', 0)

                similar_campaigns.append({
                    'campaign_name': camp.get('campaign_name'),
                    'send_date': camp.get('send_date'),
                    'unique_open_rate': open_rate,
                    'unique_click_rate': click_rate,
                    'delivery_rate': delivery_rate,
                    'delivered': volume_metrics.get('delivered', 0),
                    'similarity_score': similarity,
                    'open_rate_delta': open_rate - selected_campaign.get('core_metrics', {}).get('unique_open_rate', 0)
                })

                all_metrics['unique_open_rate'].append(open_rate)
                all_metrics['unique_click_rate'].append(click_rate)
                all_metrics['delivery_rate'].append(delivery_rate)

        similar_campaigns.sort(key=lambda x: x['similarity_score'], reverse=True)

        benchmarks = {}
        selected_core = selected_campaign.get('core_metrics', {})

        for metric_name, values in all_metrics.items():
            if values:
                values_sorted = sorted(values)
                n = len(values_sorted)

                p25 = np.percentile(values, 25)
                p50 = np.percentile(values, 50)
                p75 = np.percentile(values, 75)
                p90 = np.percentile(values, 90)

                your_value = selected_core.get(metric_name, 0)

                count_below = sum(1 for v in values if v < your_value)
                your_percentile = int((count_below / n) * 100) if n > 0 else 0

                benchmarks[metric_name] = {
                    'your_value': your_value,
                    'median': float(p50),
                    'p25': float(p25),
                    'p75': float(p75),
                    'p90': float(p90),
                    'your_percentile': your_percentile
                }

        avg_percentile = int(np.mean([b['your_percentile'] for b in benchmarks.values()])) if benchmarks else 0

        if avg_percentile >= 90:
            grade = 'A+'
        elif avg_percentile >= 85:
            grade = 'A'
        elif avg_percentile >= 80:
            grade = 'A-'
        elif avg_percentile >= 75:
            grade = 'B+'
        elif avg_percentile >= 70:
            grade = 'B'
        elif avg_percentile >= 65:
            grade = 'B-'
        elif avg_percentile >= 60:
            grade = 'C+'
        elif avg_percentile >= 55:
            grade = 'C'
        elif avg_percentile >= 50:
            grade = 'C-'
        else:
            grade = 'D'

        success_factors = []

        bucket_campaigns = [c for c in campaigns_data if classify_campaign(c.get('campaign_name', ''))['bucket'] == selected_bucket]
        if bucket_campaigns:
            avg_open = np.mean([c.get('core_metrics', {}).get('unique_open_rate', 0) for c in bucket_campaigns])
            overall_avg = np.mean([c.get('core_metrics', {}).get('unique_open_rate', 0) for c in campaigns_data])
            success_factors.append({
                'factor': f'Campaign Type: {selected_bucket}',
                'avg_performance': float(avg_open),
                'sample_size': len(bucket_campaigns),
                'vs_overall': float(avg_open - overall_avg)
            })

        if selected_topic and selected_topic != 'Other':
            topic_campaigns = [c for c in bucket_campaigns if classify_campaign(c.get('campaign_name', ''))['topic'] == selected_topic]
            if topic_campaigns:
                avg_open = np.mean([c.get('core_metrics', {}).get('unique_open_rate', 0) for c in topic_campaigns])
                bucket_avg = np.mean([c.get('core_metrics', {}).get('unique_open_rate', 0) for c in bucket_campaigns])
                success_factors.append({
                    'factor': f'Topic: {selected_topic}',
                    'avg_performance': float(avg_open),
                    'sample_size': len(topic_campaigns),
                    'vs_overall': float(avg_open - bucket_avg)
                })

        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        month_campaigns = []
        for c in bucket_campaigns:
            try:
                camp_date = datetime.strptime(c['send_date'], '%Y-%m-%d')
                if camp_date.month == selected_month:
                    month_campaigns.append(c)
            except:
                pass

        if month_campaigns and len(month_campaigns) >= 3:
            avg_open = np.mean([c.get('core_metrics', {}).get('unique_open_rate', 0) for c in month_campaigns])
            bucket_avg = np.mean([c.get('core_metrics', {}).get('unique_open_rate', 0) for c in bucket_campaigns])
            success_factors.append({
                'factor': f'Month: {month_names[selected_month - 1]}',
                'avg_performance': float(avg_open),
                'sample_size': len(month_campaigns),
                'vs_overall': float(avg_open - bucket_avg)
            })

        print(f"[BENCHMARKS] Found {len(similar_campaigns)} similar campaigns, grade: {grade}")

        return jsonify({
            'campaign': selected_campaign,
            'classification': {
                'bucket': selected_bucket,
                'topic': selected_topic
            },
            'similar_campaigns': similar_campaigns[:20],
            'similar_count': len(similar_campaigns),
            'benchmarks': benchmarks,
            'success_factors': success_factors,
            'grade': grade,
            'overall_score': avg_percentile
        }), 200

    except Exception as e:
        print(f"[BENCHMARKS] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/timing-intelligence', methods=['POST'])
def timing_intelligence():
    try:
        data = request.json or {}
        specialties = data.get('specialties', [])
        campaigns = data.get('campaigns', [])
        date_range = data.get('date_range', 'all')

        print(f"[TIMING] Received request: specialties={len(specialties)}, campaigns={len(campaigns)}, date_range={date_range}")

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        date_filter = ""
        if date_range == '3months':
            date_filter = "AND ci.timestamp >= NOW() - INTERVAL '3 months'"
        elif date_range == '6months':
            date_filter = "AND ci.timestamp >= NOW() - INTERVAL '6 months'"
        elif date_range == '1year':
            date_filter = "AND ci.timestamp >= NOW() - INTERVAL '1 year'"

        specialty_filter = ""
        if specialties:
            specialty_placeholders = ', '.join(['%s'] * len(specialties))
            specialty_filter = f"AND up.specialty IN ({specialty_placeholders})"

        campaign_filter = ""
        if campaigns:
            campaign_conditions = []
            for _ in campaigns:
                campaign_conditions.append("cd.campaign_base_name LIKE %s")
            campaign_filter = f"AND ({' OR '.join(campaign_conditions)})"

        query_params = []
        if specialties:
            query_params.extend(specialties)
        if campaigns:
            query_params.extend([f"{c}%" for c in campaigns])
        if specialties:
            query_params.extend(specialties)
        if campaigns:
            query_params.extend([f"{c}%" for c in campaigns])
        if specialties:
            query_params.extend(specialties)
        if campaigns:
            query_params.extend([f"{c}%" for c in campaigns])

        heatmap_query = f"""
            WITH total_delivered AS (
                SELECT COUNT(DISTINCT ci.email || '-' || ci.campaign_id) as total
                FROM campaign_interactions ci
                INNER JOIN user_profiles up ON ci.email = up.email
                LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE ci.event_type = 'sent'
                {date_filter}
                {specialty_filter}
                {campaign_filter}
            ),
            sent_data AS (
                SELECT
                    EXTRACT(HOUR FROM ci.timestamp) as hour,
                    EXTRACT(DOW FROM ci.timestamp) as day_of_week,
                    COUNT(DISTINCT ci.email || '-' || ci.campaign_id) as unique_sends
                FROM campaign_interactions ci
                INNER JOIN user_profiles up ON ci.email = up.email
                LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE ci.event_type = 'sent'
                {date_filter}
                {specialty_filter}
                {campaign_filter}
                GROUP BY EXTRACT(HOUR FROM ci.timestamp), EXTRACT(DOW FROM ci.timestamp)
            ),
            open_data AS (
                SELECT
                    EXTRACT(HOUR FROM ci.timestamp) as hour,
                    EXTRACT(DOW FROM ci.timestamp) as day_of_week,
                    COUNT(DISTINCT ci.email || '-' || ci.campaign_id) as unique_opens
                FROM campaign_interactions ci
                INNER JOIN user_profiles up ON ci.email = up.email
                LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE ci.event_type = 'open'
                {date_filter}
                {specialty_filter}
                {campaign_filter}
                GROUP BY EXTRACT(HOUR FROM ci.timestamp), EXTRACT(DOW FROM ci.timestamp)
            ),
            total_opens AS (
                SELECT SUM(unique_opens) as total FROM open_data
            )
            SELECT
                COALESCE(od.hour, sd.hour) as hour,
                COALESCE(od.day_of_week, sd.day_of_week) as day_of_week,
                COALESCE(od.unique_opens, 0) as unique_opens,
                COALESCE(sd.unique_sends, 0) as unique_sends,
                td.total as total_delivered,
                to2.total as total_opens
            FROM open_data od
            FULL OUTER JOIN sent_data sd ON od.hour = sd.hour AND od.day_of_week = sd.day_of_week
            CROSS JOIN total_delivered td
            CROSS JOIN total_opens to2
        """

        cursor.execute(heatmap_query, query_params)
        heatmap_results = cursor.fetchall()

        day_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

        heatmap_opens = {day: {hour: None for hour in range(24)} for day in day_names}

        heatmap_sends = {day: {hour: None for hour in range(24)} for day in day_names}

        heatmap_normalized = {day: {hour: None for hour in range(24)} for day in day_names}

        day_totals = {day: {'opens': 0, 'total_opens': 0} for day in day_names}

        total_opens_overall = heatmap_results[0]['total_opens'] if heatmap_results else 0
        total_sends_overall = heatmap_results[0]['total_delivered'] if heatmap_results else 0

        for row in heatmap_results:
            hour = int(row['hour'])
            dow = int(row['day_of_week'])
            day_name = day_names[dow]
            unique_opens = float(row['unique_opens']) if row['unique_opens'] else 0
            unique_sends = float(row['unique_sends']) if row['unique_sends'] else 0
            total_opens = float(row['total_opens']) if row['total_opens'] else 0
            total_delivered = float(row['total_delivered']) if row['total_delivered'] else 0

            if total_opens > 0 and unique_opens > 0:
                pct_of_opens = (unique_opens / total_opens) * 100
                heatmap_opens[day_name][hour] = round(pct_of_opens, 2)

            if total_delivered > 0 and unique_sends > 0:
                pct_of_sends = (unique_sends / total_delivered) * 100
                heatmap_sends[day_name][hour] = round(pct_of_sends, 2)

            if total_opens > 0 and total_delivered > 0 and unique_opens > 0 and unique_sends > 0:
                pct_of_opens = (unique_opens / total_opens) * 100
                pct_of_sends = (unique_sends / total_delivered) * 100
                if pct_of_sends > 0:
                    lift = (pct_of_opens / pct_of_sends)
                    heatmap_normalized[day_name][hour] = round(lift, 2)

            day_totals[day_name]['opens'] += int(unique_opens)
            day_totals[day_name]['total_opens'] = int(total_opens)

        day_of_week_performance = {}
        for day, totals in day_totals.items():
            if totals['total_opens'] > 0:
                pct_of_opens = (totals['opens'] / totals['total_opens']) * 100
                day_of_week_performance[day] = {
                    'open_rate': round(pct_of_opens, 2),
                    'campaigns': totals['opens']
                }

        time_query_params = []
        if specialties:
            time_query_params.extend(specialties)
        if campaigns:
            time_query_params.extend([f"{c}%" for c in campaigns])

        time_to_open_query = f"""
            WITH first_events AS (
                SELECT
                    ci.email,
                    ci.campaign_id,
                    MIN(ci.timestamp) FILTER (WHERE ci.event_type = 'sent') as sent_time,
                    MIN(ci.timestamp) FILTER (WHERE ci.event_type = 'open') as first_open_time
                FROM campaign_interactions ci
                INNER JOIN user_profiles up ON ci.email = up.email
                LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                WHERE ci.event_type IN ('sent', 'open')
                {date_filter}
                {specialty_filter}
                {campaign_filter}
                GROUP BY ci.email, ci.campaign_id
                HAVING MIN(ci.timestamp) FILTER (WHERE ci.event_type = 'open') IS NOT NULL
            )
            SELECT
                EXTRACT(EPOCH FROM (first_open_time - sent_time))/3600 as hours_to_open
            FROM first_events
            WHERE sent_time IS NOT NULL
        """

        cursor.execute(time_to_open_query, time_query_params)
        time_results = cursor.fetchall()

        buckets = [
            {'label': '< 1hr', 'min': 0, 'max': 1, 'count': 0},
            {'label': '1-3 hrs', 'min': 1, 'max': 3, 'count': 0},
            {'label': '3-6 hrs', 'min': 3, 'max': 6, 'count': 0},
            {'label': '6-12 hrs', 'min': 6, 'max': 12, 'count': 0},
            {'label': '12-24 hrs', 'min': 12, 'max': 24, 'count': 0},
            {'label': '1-3 days', 'min': 24, 'max': 72, 'count': 0},
            {'label': '3-7 days', 'min': 72, 'max': 168, 'count': 0},
            {'label': '7+ days', 'min': 168, 'max': 999999, 'count': 0}
        ]

        total_opens = len(time_results)
        within_24h = 0
        all_times = []

        for row in time_results:
            hours = row['hours_to_open']
            if hours is not None:
                all_times.append(hours)
                if hours <= 24:
                    within_24h += 1

                for bucket in buckets:
                    if bucket['min'] <= hours < bucket['max']:
                        bucket['count'] += 1
                        break

        for bucket in buckets:
            bucket['percentage'] = (bucket['count'] / total_opens * 100) if total_opens > 0 else 0

        if all_times:
            all_times.sort()
            median_hours = all_times[len(all_times) // 2]
            if median_hours < 1:
                median_str = f"{int(median_hours * 60)} minutes"
            elif median_hours < 24:
                median_str = f"{median_hours:.1f} hours"
            else:
                median_str = f"{median_hours/24:.1f} days"
        else:
            median_str = "N/A"

        time_to_open_data = {
            'buckets': buckets,
            'median': median_str,
            'peak_window': '1-6 hours' if total_opens > 0 else 'N/A',
            'percent_24h': round((within_24h / total_opens * 100), 1) if total_opens > 0 else 0
        }

        specialty_recommendations = []

        if specialties:
            for specialty in specialties:
                specialty_query = f"""
                    WITH total_opens AS (
                        SELECT COUNT(DISTINCT ci.email || '-' || ci.campaign_id) as total
                        FROM campaign_interactions ci
                        INNER JOIN user_profiles up ON ci.email = up.email
                        LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                        WHERE ci.event_type = 'open'
                        AND up.specialty = %s
                        {date_filter}
                        {campaign_filter}
                    ),
                    open_data AS (
                        SELECT
                            ci.email,
                            ci.campaign_id,
                            EXTRACT(HOUR FROM ci.timestamp) as hour,
                            EXTRACT(DOW FROM ci.timestamp) as day_of_week
                        FROM campaign_interactions ci
                        INNER JOIN user_profiles up ON ci.email = up.email
                        LEFT JOIN campaign_deployments cd ON ci.campaign_id = cd.campaign_id
                        WHERE ci.event_type = 'open'
                        AND up.specialty = %s
                        {date_filter}
                        {campaign_filter}
                    )
                    SELECT
                        od.hour,
                        od.day_of_week,
                        COUNT(DISTINCT od.email || '-' || od.campaign_id) as unique_opens,
                        to2.total as total_opens
                    FROM open_data od
                    CROSS JOIN total_opens to2
                    GROUP BY od.hour, od.day_of_week, to2.total
                    HAVING COUNT(DISTINCT od.email || '-' || od.campaign_id) >= 10
                """

                specialty_params = [specialty]
                if campaigns:
                    specialty_params.extend([f"{c}%" for c in campaigns]) 
                specialty_params.append(specialty) 
                if campaigns:
                    specialty_params.extend([f"{c}%" for c in campaigns])

                cursor.execute(specialty_query, specialty_params)
                specialty_results = cursor.fetchall()

                if specialty_results:
                    time_slots = []
                    for row in specialty_results:
                        hour = int(row['hour'])
                        dow = int(row['day_of_week'])
                        opens = row['unique_opens']
                        total_opens = row['total_opens']

                        if total_opens > 0:
                            pct_of_opens = (opens / total_opens) * 100
                            time_slots.append({
                                'hour': hour,
                                'day_of_week': dow,
                                'open_rate': pct_of_opens,
                                'sample_size': opens
                            })

                    if time_slots:
                        time_slots.sort(key=lambda x: x['open_rate'], reverse=True)
                        best = time_slots[0]
                        worst = time_slots[-1]

                        total_campaigns = sum(t['sample_size'] for t in time_slots)
                        improvement = ((best['open_rate'] - worst['open_rate']) / worst['open_rate'] * 100) if worst['open_rate'] > 0 else 0

                        def format_hour(h):
                            if h == 0:
                                return "12 AM"
                            elif h < 12:
                                return f"{h} AM"
                            elif h == 12:
                                return "12 PM"
                            else:
                                return f"{h-12} PM"

                        specialty_recommendations.append({
                            'specialty': specialty,
                            'sample_size': total_campaigns,
                            'best_time': {
                                'day': day_names[best['day_of_week']],
                                'hour': format_hour(best['hour']),
                                'open_rate': round(best['open_rate'], 2)
                            },
                            'worst_time': {
                                'day': day_names[worst['day_of_week']],
                                'hour': format_hour(worst['hour']),
                                'open_rate': round(worst['open_rate'], 2)
                            },
                            'improvement': round(improvement, 1),
                            'top_windows': [
                                {
                                    'day': day_names[t['day_of_week']],
                                    'hour': format_hour(t['hour']),
                                    'open_rate': round(t['open_rate'], 2)
                                }
                                for t in time_slots[1:4]
                            ]
                        })

        specialty_query = """
            SELECT DISTINCT up.specialty
            FROM user_profiles up
            INNER JOIN campaign_interactions ci ON up.email = ci.email
            WHERE up.specialty IS NOT NULL AND up.specialty != ''
            ORDER BY up.specialty
            LIMIT 50
        """
        cursor.execute(specialty_query)
        available_specialties = [row['specialty'] for row in cursor.fetchall()]

        cursor.close()
        conn.close()

        print(f"[TIMING] Successfully processed request")

        return jsonify({
            'heatmap_opens': heatmap_opens,
            'heatmap_sends': heatmap_sends,
            'heatmap_normalized': heatmap_normalized,
            'day_of_week': day_of_week_performance,
            'time_to_open': time_to_open_data,
            'specialty_recommendations': specialty_recommendations,
            'available_specialties': available_specialties
        }), 200

    except Exception as e:
        print(f"[TIMING] Error in timing-intelligence: {str(e)}")
        import traceback
        traceback.print_exc()

        return jsonify({
            'error': str(e),
            'heatmap_opens': {},
            'heatmap_sends': {},
            'heatmap_normalized': {},
            'day_of_week': {},
            'time_to_open': {'buckets': [], 'median': 'N/A', 'peak_window': 'N/A', 'percent_24h': 0},
            'specialty_recommendations': [],
            'available_specialties': []
        }), 500

@analytics_bp.route('/geographic-main', methods=['GET'])
def geographic_main():
    try:
        print(f"[GEO-MAIN] Fetching main geographic data using zipcode-based approach")

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        audience_count_query = "SELECT COUNT(*) as count FROM user_profiles"
        cursor.execute(audience_count_query)
        audience_count = cursor.fetchone()['count']

        npi_count_query = "SELECT COUNT(*) as count FROM universal_profiles WHERE is_active = TRUE"
        cursor.execute(npi_count_query)
        npi_count = cursor.fetchone()['count']

        user_zipcode_query = """
            SELECT
                email,
                zipcode
            FROM user_profiles
            WHERE zipcode IS NOT NULL AND zipcode != ''
        """
        cursor.execute(user_zipcode_query)
        user_results = cursor.fetchall()

        print(f"[GEO-MAIN] Fetched {len(user_results)} users with zipcodes")

        engagement_query = """
            SELECT DISTINCT
                up.email,
                up.zipcode
            FROM user_profiles up
            INNER JOIN campaign_interactions ci ON up.email = ci.email
            WHERE up.zipcode IS NOT NULL AND up.zipcode != ''
            AND ci.event_type = 'open'
        """
        cursor.execute(engagement_query)
        engagement_results = cursor.fetchall()

        print(f"[GEO-MAIN] Fetched {len(engagement_results)} engaged users with zipcodes")

        state_counts = {}
        state_engaged = {}

        for row in user_results:
            zipcode = row['zipcode']
            state_abbrev = zipcode_to_state_abbrev(zipcode)
            if state_abbrev:
                state_full = state_abbrev_to_full_name(state_abbrev)
                if state_full:
                    if state_full not in state_counts:
                        state_counts[state_full] = 0
                    state_counts[state_full] += 1

        for row in engagement_results:
            zipcode = row['zipcode']
            state_abbrev = zipcode_to_state_abbrev(zipcode)
            if state_abbrev:
                state_full = state_abbrev_to_full_name(state_abbrev)
                if state_full:
                    if state_full not in state_engaged:
                        state_engaged[state_full] = 0
                    state_engaged[state_full] += 1

        state_heatmap = {}
        total_states = 0
        total_users = 0
        total_engaged = 0
        top_state = None
        top_state_count = 0

        for state, count in state_counts.items():
            engaged = state_engaged.get(state, 0)
            engagement_rate = round((engaged / count * 100), 2) if count > 0 else 0

            state_heatmap[state] = {
                'count': count,
                'engaged_users': engaged,
                'engagement_rate': engagement_rate
            }

            total_states += 1
            total_users += count
            total_engaged += engaged

            if count > top_state_count:
                top_state = state
                top_state_count = count

        avg_engagement = round((total_engaged / total_users * 100), 2) if total_users > 0 else 0

        print(f"[GEO-MAIN] Aggregated into {total_states} states, {total_users} users")

        npi_by_state_query = """
            SELECT
                COALESCE(practice_state, mailing_state) as state_abbrev,
                COUNT(*) as npi_count
            FROM universal_profiles
            WHERE is_active = TRUE
            AND COALESCE(practice_state, mailing_state) IS NOT NULL
            AND COALESCE(practice_state, mailing_state) != ''
            GROUP BY COALESCE(practice_state, mailing_state)
            ORDER BY npi_count DESC
        """
        cursor.execute(npi_by_state_query)
        npi_results = cursor.fetchall()

        npi_by_state = {}
        for row in npi_results:
            state_abbrev = row['state_abbrev']
            if state_abbrev:
                state_full = state_abbrev_to_full_name(state_abbrev)
                if state_full:
                    npi_by_state[state_full] = {
                        'count': int(row['npi_count'])
                    }

        penetration = {}
        opportunity = {}

        for state, audience_data in state_heatmap.items():
            audience_count = audience_data['count']
            npi_data = npi_by_state.get(state, {})
            npi_count = npi_data.get('count', 0)

            if npi_count > 0:
                pen_rate = round((audience_count / npi_count * 100), 2)
            else:
                pen_rate = 0

            penetration[state] = {
                'audience_count': audience_count,
                'npi_count': npi_count,
                'penetration_rate': pen_rate
            }

            opportunity_score = round(100 - pen_rate, 2) if pen_rate > 0 else 100
            addressable = max(0, npi_count - audience_count)

            opportunity[state] = {
                'opportunity_score': opportunity_score,
                'addressable_npis': addressable
            }

        urban_counts = {'Urban': 0, 'Suburban': 0, 'Rural': 0}
        npi_urban_counts = {'Urban': 0, 'Suburban': 0, 'Rural': 0}

        def normalize_zipcode(zipcode):
            if not zipcode:
                return None
            zip_str = str(zipcode).strip()
            zip_str = ''.join(c for c in zip_str if c.isdigit())
            if len(zip_str) < 5:
                zip_str = zip_str.zfill(5)
            return zip_str[:5] if len(zip_str) >= 5 else None

        for row in user_results:
            zipcode = normalize_zipcode(row['zipcode'])
            if zipcode:
                classification = classify_zipcode_urbanization(zipcode)
                if classification in urban_counts:
                    urban_counts[classification] += 1

        npi_urban_query = """
            SELECT COALESCE(practice_zipcode, mailing_zipcode) as zipcode
            FROM universal_profiles
            WHERE is_active = TRUE
            AND COALESCE(practice_zipcode, mailing_zipcode) IS NOT NULL
        """
        cursor.execute(npi_urban_query)
        npi_zip_results = cursor.fetchall()

        for row in npi_zip_results:
            zipcode = normalize_zipcode(row['zipcode'])
            if zipcode:
                classification = classify_zipcode_urbanization(zipcode)
                if classification in npi_urban_counts:
                    npi_urban_counts[classification] += 1

        urban_rural = {
            'audience': {
                'urban': urban_counts['Urban'],
                'suburban': urban_counts['Suburban'],
                'rural': urban_counts['Rural'],
                'total': sum(urban_counts.values())
            },
            'npis': {
                'urban': npi_urban_counts['Urban'],
                'suburban': npi_urban_counts['Suburban'],
                'rural': npi_urban_counts['Rural'],
                'total': sum(npi_urban_counts.values())
            }
        }

        print(f"[GEO-MAIN] Urban/Rural - Audience: {urban_counts}, NPIs: {npi_urban_counts}")

        METRO_AREAS = {
            'New York, NY': ['100', '101', '102', '103', '104', '110', '111', '112', '113', '114', '115', '116', '117'],
            'Los Angeles, CA': ['900', '901', '902', '903', '904', '905', '906', '907', '908', '910', '911', '912', '913', '914', '915', '916', '917', '918'],
            'Chicago, IL': ['606', '607', '608', '609', '610', '600', '601', '602', '603', '604', '605'],
            'Houston, TX': ['770', '772', '773', '774', '775', '776', '777'],
            'Phoenix, AZ': ['850', '851', '852', '853', '855', '856', '857'],
            'Philadelphia, PA': ['190', '191', '192', '193', '194', '180', '181', '182', '183', '184', '185'],
            'San Antonio, TX': ['782', '781'],
            'San Diego, CA': ['919', '920', '921', '922'],
            'Dallas, TX': ['750', '751', '752', '753', '754', '755', '756', '757'],
            'San Francisco, CA': ['941', '940', '942', '943', '944', '945', '946', '947'],
            'Austin, TX': ['787', '786'],
            'Seattle, WA': ['980', '981', '982', '983', '984', '985'],
            'Denver, CO': ['802', '803', '804', '805', '800', '801'],
            'Washington, DC': ['200', '201', '202', '203', '204', '205', '220', '221', '222'],
            'Boston, MA': ['021', '022', '024', '010', '011', '012', '013', '014', '015', '016', '017', '018', '019', '020'],
            'Atlanta, GA': ['303', '300', '301', '302', '304', '305', '306', '307', '308', '309', '310', '311'],
            'Miami, FL': ['331', '330', '332', '333', '334', '335'],
            'Minneapolis, MN': ['553', '554', '555', '550', '551'],
            'Detroit, MI': ['481', '482', '483', '484', '480', '485', '486'],
            'Tampa, FL': ['336', '335', '337', '338'],
            'Cleveland, OH': ['441', '440', '442', '443', '444'],
            'Portland, OR': ['972', '973', '974'],
            'St. Louis, MO': ['631', '630', '633', '634'],
            'Pittsburgh, PA': ['152', '150', '151', '153', '154'],
            'Las Vegas, NV': ['891', '890', '889'],
            'Baltimore, MD': ['212', '210', '211', '214'],
            'Nashville, TN': ['372', '371', '373'],
            'Charlotte, NC': ['282', '280', '281', '283'],
            'Indianapolis, IN': ['462', '460', '461', '463'],
            'San Jose, CA': ['950', '951', '952']
        }

        metro_audience = {metro: 0 for metro in METRO_AREAS}
        metro_npis = {metro: 0 for metro in METRO_AREAS}
        metro_engaged = {metro: 0 for metro in METRO_AREAS}

        for row in user_results:
            normalized_zip = normalize_zipcode(row['zipcode'])
            prefix = normalized_zip[:3] if normalized_zip else ''
            for metro, prefixes in METRO_AREAS.items():
                if prefix in prefixes:
                    metro_audience[metro] += 1
                    break

        for row in engagement_results:
            normalized_zip = normalize_zipcode(row['zipcode'])
            prefix = normalized_zip[:3] if normalized_zip else ''
            for metro, prefixes in METRO_AREAS.items():
                if prefix in prefixes:
                    metro_engaged[metro] += 1
                    break

        for row in npi_zip_results:
            normalized_zip = normalize_zipcode(row['zipcode'])
            prefix = normalized_zip[:3] if normalized_zip else ''
            for metro, prefixes in METRO_AREAS.items():
                if prefix in prefixes:
                    metro_npis[metro] += 1
                    break

        metro_areas = []
        for metro in METRO_AREAS:
            aud = metro_audience[metro]
            npis = metro_npis[metro]
            engaged = metro_engaged[metro]
            if aud > 0 or npis > 0:
                pen_rate = round((aud / npis * 100), 2) if npis > 0 else 0
                eng_rate = round((engaged / aud * 100), 2) if aud > 0 else 0
                metro_areas.append({
                    'name': metro,
                    'audience_count': aud,
                    'npi_count': npis,
                    'engaged_count': engaged,
                    'penetration_rate': pen_rate,
                    'engagement_rate': eng_rate
                })

        metro_areas.sort(key=lambda x: x['audience_count'], reverse=True)

        zipcode_audience = {}
        zipcode_npis = {}
        zipcode_engaged = {}

        for row in user_results:
            normalized_zip = normalize_zipcode(row['zipcode'])
            prefix = normalized_zip[:3] if normalized_zip else ''
            if prefix and len(prefix) == 3:
                zipcode_audience[prefix] = zipcode_audience.get(prefix, 0) + 1

        for row in engagement_results:
            normalized_zip = normalize_zipcode(row['zipcode'])
            prefix = normalized_zip[:3] if normalized_zip else ''
            if prefix and len(prefix) == 3:
                zipcode_engaged[prefix] = zipcode_engaged.get(prefix, 0) + 1

        for row in npi_zip_results:
            normalized_zip = normalize_zipcode(row['zipcode'])
            prefix = normalized_zip[:3] if normalized_zip else ''
            if prefix and len(prefix) == 3:
                zipcode_npis[prefix] = zipcode_npis.get(prefix, 0) + 1

        all_prefixes = set(zipcode_audience.keys()) | set(zipcode_npis.keys())
        zipcode_data = {}
        for prefix in all_prefixes:
            aud = zipcode_audience.get(prefix, 0)
            npis = zipcode_npis.get(prefix, 0)
            engaged = zipcode_engaged.get(prefix, 0)
            state_abbrev = zipcode_to_state_abbrev(prefix + '00')
            zipcode_data[prefix] = {
                'audience_count': aud,
                'npi_count': npis,
                'engaged_count': engaged,
                'state': state_abbrev,
                'engagement_rate': round((engaged / aud * 100), 2) if aud > 0 else 0,
                'penetration_rate': round((aud / npis * 100), 2) if npis > 0 else 0
            }

        print(f"[GEO-MAIN] Zipcode prefixes: {len(zipcode_data)}")

        city_query = """
            SELECT city, zipcode, COUNT(*) as count
            FROM user_profiles
            WHERE city IS NOT NULL AND city != ''
            GROUP BY city, zipcode
        """
        cursor.execute(city_query)
        city_results = cursor.fetchall()

        city_engaged_query = """
            SELECT up.city, up.zipcode, COUNT(DISTINCT up.email) as count
            FROM user_profiles up
            INNER JOIN campaign_interactions ci ON up.email = ci.email
            WHERE up.city IS NOT NULL AND up.city != ''
            AND ci.event_type = 'open'
            GROUP BY up.city, up.zipcode
        """
        cursor.execute(city_engaged_query)
        city_engaged_results = cursor.fetchall()

        city_audience = {}
        city_engaged = {}

        for row in city_results:
            city = row['city']
            normalized_zip = normalize_zipcode(row['zipcode'])
            state_abbrev = zipcode_to_state_abbrev(normalized_zip) if normalized_zip else None
            city_key = f"{city}, {state_abbrev}" if state_abbrev else city
            city_audience[city_key] = city_audience.get(city_key, 0) + row['count']

        for row in city_engaged_results:
            city = row['city']
            normalized_zip = normalize_zipcode(row['zipcode'])
            state_abbrev = zipcode_to_state_abbrev(normalized_zip) if normalized_zip else None
            city_key = f"{city}, {state_abbrev}" if state_abbrev else city
            city_engaged[city_key] = city_engaged.get(city_key, 0) + row['count']

        city_data = {}
        for city_key in city_audience:
            aud = city_audience[city_key]
            engaged = city_engaged.get(city_key, 0)
            city_data[city_key] = {
                'audience_count': aud,
                'engaged_count': engaged,
                'engagement_rate': round((engaged / aud * 100), 2) if aud > 0 else 0
            }

        city_data = dict(sorted(city_data.items(), key=lambda x: x[1]['audience_count'], reverse=True)[:100])

        print(f"[GEO-MAIN] Cities: {len(city_data)}")

        cursor.close()
        conn.close()

        print(f"[GEO-MAIN] Successfully processed: {total_states} states, {total_users} users, {len(npi_by_state)} NPI states")

        return jsonify({
            'full_map': {
                'audience_count': audience_count,
                'npi_count': npi_count
            },
            'state_heatmap': state_heatmap,
            'npi_by_state': npi_by_state,
            'penetration': penetration,
            'opportunity': opportunity,
            'metro_areas': metro_areas,
            'urban_rural': urban_rural,
            'zipcode_data': zipcode_data,
            'city_data': city_data,
            'breakdown': {
                'total_states': total_states,
                'total_users': total_users,
                'avg_engagement': avg_engagement,
                'top_state': top_state
            }
        }), 200

    except Exception as e:
        print(f"[GEO-MAIN] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'full_map': {},
            'state_heatmap': {},
            'npi_by_state': {},
            'penetration': {},
            'opportunity': {},
            'metro_areas': [],
            'urban_rural': {},
            'zipcode_data': {},
            'city_data': {},
            'breakdown': {}
        }), 500

@analytics_bp.route('/geographic-custom', methods=['POST'])
def geographic_custom():
    try:
        data = request.json or {}
        specialties = data.get('specialties', [])
        campaigns = data.get('campaigns', [])
        engagement_filter = data.get('engagement_filter', 'all')
        date_range = data.get('date_range', 'all')
        granularity = data.get('granularity', 'state')

        print(f"[GEO-CUSTOM] Request: granularity={granularity}, engagement={engagement_filter}, specialties={len(specialties)}, campaigns={len(campaigns)}")

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        specialty_filter = ""
        specialty_params = []
        if specialties:
            specialty_placeholders = ', '.join(['%s'] * len(specialties))
            specialty_filter = f"AND up.specialty IN ({specialty_placeholders})"
            specialty_params = specialties

        if engagement_filter == 'never_opened':
            base_query = f"""
                SELECT up.email, up.zipcode, up.city
                FROM user_profiles up
                WHERE up.zipcode IS NOT NULL AND up.zipcode != ''
                {specialty_filter}
            """
            cursor.execute(base_query, specialty_params)
            all_users = cursor.fetchall()

            opened_query = """
                SELECT DISTINCT email FROM campaign_interactions
                WHERE event_type = 'open'
            """
            cursor.execute(opened_query)
            opened_emails = set(row['email'] for row in cursor.fetchall())

            custom_results = [u for u in all_users if u['email'] not in opened_emails]
            print(f"[GEO-CUSTOM] Never opened: {len(custom_results)} of {len(all_users)} users")

        elif engagement_filter == 'opened':
            date_filter = ""
            if date_range == '3months':
                date_filter = "AND ci.timestamp >= NOW() - INTERVAL '3 months'"
            elif date_range == '6months':
                date_filter = "AND ci.timestamp >= NOW() - INTERVAL '6 months'"
            elif date_range == '1year':
                date_filter = "AND ci.timestamp >= NOW() - INTERVAL '1 year'"

            campaign_filter = ""
            campaign_params = []
            if campaigns:
                campaign_conditions = []
                for c in campaigns:
                    campaign_conditions.append("ci.campaign_name LIKE %s")
                    campaign_params.append(f"%{c}%")
                campaign_filter = f"AND ({' OR '.join(campaign_conditions)})"

            query = f"""
                SELECT DISTINCT up.email, up.zipcode, up.city
                FROM user_profiles up
                INNER JOIN campaign_interactions ci ON up.email = ci.email
                WHERE up.zipcode IS NOT NULL AND up.zipcode != ''
                AND ci.event_type = 'open'
                {date_filter}
                {specialty_filter}
                {campaign_filter}
            """
            cursor.execute(query, specialty_params + campaign_params)
            custom_results = cursor.fetchall()

        else:
            base_query = f"""
                SELECT up.email, up.zipcode, up.city
                FROM user_profiles up
                WHERE up.zipcode IS NOT NULL AND up.zipcode != ''
                {specialty_filter}
            """
            cursor.execute(base_query, specialty_params)
            custom_results = cursor.fetchall()

        print(f"[GEO-CUSTOM] Fetched {len(custom_results)} users")

        counts = {}

        for row in custom_results:
            zipcode = row['zipcode']
            city = row.get('city', '')

            if granularity == 'state':
                state_abbrev = zipcode_to_state_abbrev(zipcode)
                if state_abbrev:
                    key = state_abbrev_to_full_name(state_abbrev)
                    if key:
                        counts[key] = counts.get(key, 0) + 1

            elif granularity == 'zipcode':
                prefix = str(zipcode).strip()[:3]
                if len(prefix) == 3:
                    state_abbrev = zipcode_to_state_abbrev(zipcode)
                    key = prefix
                    if key not in counts:
                        counts[key] = {'count': 0, 'state': state_abbrev}
                    counts[key]['count'] += 1

            elif granularity == 'city':
                if city:
                    state_abbrev = zipcode_to_state_abbrev(zipcode)
                    key = f"{city}, {state_abbrev}" if state_abbrev else city
                    counts[key] = counts.get(key, 0) + 1

        if granularity == 'state':
            response_data = {}
            total_users = 0
            top_item = None
            top_count = 0

            for state, count in counts.items():
                response_data[state] = {'count': count}
                total_users += count
                if count > top_count:
                    top_item = state
                    top_count = count

            cursor.close()
            conn.close()

            return jsonify({
                'state_data': response_data,
                'granularity': granularity,
                'breakdown': {
                    'total_regions': len(counts),
                    'total_users': total_users,
                    'top_region': top_item
                }
            }), 200

        elif granularity == 'zipcode':
            response_data = {}
            total_users = 0
            top_item = None
            top_count = 0

            for prefix, data in counts.items():
                count = data['count']
                response_data[prefix] = {'count': count, 'state': data['state']}
                total_users += count
                if count > top_count:
                    top_item = f"{prefix}xx ({data['state']})"
                    top_count = count

            cursor.close()
            conn.close()

            return jsonify({
                'zipcode_data': response_data,
                'granularity': granularity,
                'breakdown': {
                    'total_regions': len(counts),
                    'total_users': total_users,
                    'top_region': top_item
                }
            }), 200

        else:
            response_data = {}
            total_users = 0
            top_item = None
            top_count = 0

            for city, count in sorted(counts.items(), key=lambda x: x[1], reverse=True):
                response_data[city] = {'count': count}
                total_users += count
                if count > top_count:
                    top_item = city
                    top_count = count

            cursor.close()
            conn.close()

            return jsonify({
                'city_data': response_data,
                'granularity': granularity,
                'breakdown': {
                    'total_regions': len(counts),
                    'total_users': total_users,
                    'top_region': top_item
                }
            }), 200

    except Exception as e:
        print(f"[GEO-CUSTOM] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'state_data': {},
            'breakdown': {}
        }), 500

@analytics_bp.route('/geographic-enhanced', methods=['GET'])
def geographic_enhanced():
    try:
        print(f"[GEO-ENHANCED] Fetching enhanced geographic data")

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        audience_query = """
            SELECT
                up.email,
                up.zipcode,
                up.specialty,
                CASE WHEN EXISTS (
                    SELECT 1 FROM campaign_interactions ci
                    WHERE ci.email = up.email AND ci.event_type = 'open'
                ) THEN 1 ELSE 0 END as has_opened,
                CASE WHEN EXISTS (
                    SELECT 1 FROM campaign_interactions ci
                    WHERE ci.email = up.email AND ci.event_type = 'click'
                ) THEN 1 ELSE 0 END as has_clicked
            FROM user_profiles up
            WHERE up.zipcode IS NOT NULL AND up.zipcode != ''
        """
        cursor.execute(audience_query)
        audience_results = cursor.fetchall()

        print(f"[GEO-ENHANCED] Fetched {len(audience_results)} audience records")

        state_data = {}
        urban_counts = {'Urban': 0, 'Suburban': 0, 'Rural': 0, 'Unknown': 0}
        urban_engaged = {'Urban': 0, 'Suburban': 0, 'Rural': 0, 'Unknown': 0}
        specialty_by_state = {}

        for row in audience_results:
            zipcode = row['zipcode']
            state_abbrev = zipcode_to_state_abbrev(zipcode)
            if not state_abbrev:
                continue

            state_full = state_abbrev_to_full_name(state_abbrev)
            if not state_full:
                continue

            if state_full not in state_data:
                state_data[state_full] = {
                    'audience_count': 0,
                    'engaged_count': 0,
                    'clicked_count': 0,
                    'npi_count': 0,
                    'urban': 0,
                    'suburban': 0,
                    'rural': 0,
                    'specialties': {}
                }

            state_data[state_full]['audience_count'] += 1

            if row['has_opened']:
                state_data[state_full]['engaged_count'] += 1
            if row['has_clicked']:
                state_data[state_full]['clicked_count'] += 1

            urban_class = classify_zipcode_urbanization(zipcode)
            urban_counts[urban_class] += 1
            if row['has_opened']:
                urban_engaged[urban_class] += 1

            if urban_class == 'Urban':
                state_data[state_full]['urban'] += 1
            elif urban_class == 'Suburban':
                state_data[state_full]['suburban'] += 1
            elif urban_class == 'Rural':
                state_data[state_full]['rural'] += 1

            specialty = row['specialty'] or 'Unknown'
            if specialty not in state_data[state_full]['specialties']:
                state_data[state_full]['specialties'][specialty] = 0
            state_data[state_full]['specialties'][specialty] += 1

        npi_query = """
            SELECT
                npi,
                practice_state,
                mailing_state,
                practice_zipcode,
                mailing_zipcode,
                primary_specialty
            FROM universal_profiles
            WHERE is_active = TRUE
        """
        cursor.execute(npi_query)
        npi_results = cursor.fetchall()

        print(f"[GEO-ENHANCED] Fetched {len(npi_results)} NPI records")

        npi_by_practice_state = {}
        npi_by_mailing_state = {}
        npi_practice_vs_mailing = {'same_state': 0, 'different_state': 0, 'missing_data': 0}
        npi_urban_counts = {'Urban': 0, 'Suburban': 0, 'Rural': 0, 'Unknown': 0}

        for row in npi_results:
            practice_state = row['practice_state']
            mailing_state = row['mailing_state']
            practice_zip = row['practice_zipcode']

            if practice_state:
                state_full = state_abbrev_to_full_name(practice_state)
                if state_full:
                    if state_full not in npi_by_practice_state:
                        npi_by_practice_state[state_full] = 0
                    npi_by_practice_state[state_full] += 1

                    if state_full in state_data:
                        state_data[state_full]['npi_count'] += 1

            if mailing_state:
                state_full = state_abbrev_to_full_name(mailing_state)
                if state_full:
                    if state_full not in npi_by_mailing_state:
                        npi_by_mailing_state[state_full] = 0
                    npi_by_mailing_state[state_full] += 1

            if practice_state and mailing_state:
                if practice_state == mailing_state:
                    npi_practice_vs_mailing['same_state'] += 1
                else:
                    npi_practice_vs_mailing['different_state'] += 1
            else:
                npi_practice_vs_mailing['missing_data'] += 1

            if practice_zip:
                urban_class = classify_zipcode_urbanization(practice_zip)
                npi_urban_counts[urban_class] += 1

        states_leaderboard = []
        for state, data in state_data.items():
            audience = data['audience_count']
            engaged = data['engaged_count']
            clicked = data['clicked_count']
            npi_count = data['npi_count'] or npi_by_practice_state.get(state, 0)

            engagement_rate = round((engaged / audience * 100), 2) if audience > 0 else 0
            click_rate = round((clicked / audience * 100), 2) if audience > 0 else 0
            penetration = round((audience / npi_count * 100), 2) if npi_count > 0 else 0

            top_specialties = sorted(
                data['specialties'].items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]

            states_leaderboard.append({
                'state': state,
                'state_abbrev': STATE_NAME_TO_ABBREV.get(state, ''),
                'audience_count': audience,
                'engaged_count': engaged,
                'clicked_count': clicked,
                'npi_count': npi_count,
                'engagement_rate': engagement_rate,
                'click_rate': click_rate,
                'penetration_rate': penetration,
                'urban': data['urban'],
                'suburban': data['suburban'],
                'rural': data['rural'],
                'top_specialties': [{'name': s[0], 'count': s[1]} for s in top_specialties]
            })

        states_leaderboard.sort(key=lambda x: x['audience_count'], reverse=True)

        urban_summary = []
        for category in ['Urban', 'Suburban', 'Rural']:
            count = urban_counts.get(category, 0)
            engaged = urban_engaged.get(category, 0)
            rate = round((engaged / count * 100), 2) if count > 0 else 0
            urban_summary.append({
                'category': category,
                'audience_count': count,
                'engaged_count': engaged,
                'engagement_rate': rate
            })

        total_npis = sum(npi_urban_counts.values())
        npi_urban_summary = []
        for category in ['Urban', 'Suburban', 'Rural']:
            count = npi_urban_counts.get(category, 0)
            pct = round((count / total_npis * 100), 2) if total_npis > 0 else 0
            npi_urban_summary.append({
                'category': category,
                'count': count,
                'percentage': pct
            })

        total_audience = sum(s['audience_count'] for s in states_leaderboard)
        total_engaged = sum(s['engaged_count'] for s in states_leaderboard)
        total_clicked = sum(s['clicked_count'] for s in states_leaderboard)
        total_states = len(states_leaderboard)

        overall_engagement = round((total_engaged / total_audience * 100), 2) if total_audience > 0 else 0
        overall_click_rate = round((total_clicked / total_audience * 100), 2) if total_audience > 0 else 0

        cursor.close()
        conn.close()

        print(f"[GEO-ENHANCED] Successfully processed {total_states} states")

        return jsonify({
            'states_leaderboard': states_leaderboard,
            'urban_rural_audience': urban_summary,
            'urban_rural_npis': npi_urban_summary,
            'npi_by_practice_state': npi_by_practice_state,
            'npi_by_mailing_state': npi_by_mailing_state,
            'practice_vs_mailing': npi_practice_vs_mailing,
            'summary': {
                'total_audience': total_audience,
                'total_engaged': total_engaged,
                'total_clicked': total_clicked,
                'total_states': total_states,
                'total_npis': total_npis,
                'overall_engagement_rate': overall_engagement,
                'overall_click_rate': overall_click_rate
            }
        }), 200

    except Exception as e:
        print(f"[GEO-ENHANCED] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'states_leaderboard': [],
            'urban_rural_audience': [],
            'urban_rural_npis': [],
            'npi_by_practice_state': {},
            'npi_by_mailing_state': {},
            'practice_vs_mailing': {},
            'summary': {}
        }), 500

@analytics_bp.route('/geographic-state-detail', methods=['POST'])
def geographic_state_detail():
    try:
        data = request.json or {}
        state_name = data.get('state')

        if not state_name:
            return jsonify({'error': 'State name required'}), 400

        print(f"[GEO-STATE] Fetching detail for: {state_name}")

        state_abbrev = STATE_NAME_TO_ABBREV.get(state_name)
        if not state_abbrev:
            return jsonify({'error': f'Unknown state: {state_name}'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        from state_mapper import ZIPCODE_TO_STATE
        state_zips = [z for z, s in ZIPCODE_TO_STATE.items() if s == state_abbrev]

        if not state_zips:
            return jsonify({'error': 'No zipcodes found for state'}), 400

        zip_conditions = ' OR '.join([f"up.zipcode LIKE '{z}%'" for z in state_zips])

        specialty_query = f"""
            SELECT
                up.specialty,
                COUNT(*) as count,
                SUM(CASE WHEN EXISTS (
                    SELECT 1 FROM campaign_interactions ci
                    WHERE ci.email = up.email AND ci.event_type = 'open'
                ) THEN 1 ELSE 0 END) as engaged_count
            FROM user_profiles up
            WHERE ({zip_conditions})
            AND up.specialty IS NOT NULL AND up.specialty != ''
            GROUP BY up.specialty
            ORDER BY count DESC
            LIMIT 20
        """
        cursor.execute(specialty_query)
        specialty_results = cursor.fetchall()

        specialties = []
        for row in specialty_results:
            count = row['count']
            engaged = row['engaged_count']
            rate = round((engaged / count * 100), 2) if count > 0 else 0
            specialties.append({
                'specialty': row['specialty'],
                'count': count,
                'engaged_count': engaged,
                'engagement_rate': rate
            })

        city_query = f"""
            SELECT
                up.city,
                COUNT(*) as count,
                SUM(CASE WHEN EXISTS (
                    SELECT 1 FROM campaign_interactions ci
                    WHERE ci.email = up.email AND ci.event_type = 'open'
                ) THEN 1 ELSE 0 END) as engaged_count
            FROM user_profiles up
            WHERE ({zip_conditions})
            AND up.city IS NOT NULL AND up.city != ''
            GROUP BY up.city
            ORDER BY count DESC
            LIMIT 15
        """
        cursor.execute(city_query)
        city_results = cursor.fetchall()

        cities = []
        for row in city_results:
            count = row['count']
            engaged = row['engaged_count']
            rate = round((engaged / count * 100), 2) if count > 0 else 0
            cities.append({
                'city': row['city'],
                'count': count,
                'engaged_count': engaged,
                'engagement_rate': rate
            })

        npi_query = """
            SELECT
                primary_specialty,
                COUNT(*) as count
            FROM universal_profiles
            WHERE practice_state = %s
            AND is_active = TRUE
            AND primary_specialty IS NOT NULL AND primary_specialty != ''
            GROUP BY primary_specialty
            ORDER BY count DESC
            LIMIT 15
        """
        cursor.execute(npi_query, (state_abbrev,))
        npi_specialty_results = cursor.fetchall()

        npi_specialties = [
            {'specialty': row['primary_specialty'], 'count': row['count']}
            for row in npi_specialty_results
        ]

        npi_count_query = """
            SELECT COUNT(*) as count
            FROM universal_profiles
            WHERE practice_state = %s AND is_active = TRUE
        """
        cursor.execute(npi_count_query, (state_abbrev,))
        total_npis = cursor.fetchone()['count']

        urban_query = f"""
            SELECT up.zipcode
            FROM user_profiles up
            WHERE ({zip_conditions})
        """
        cursor.execute(urban_query)
        zip_results = cursor.fetchall()

        urban_breakdown = {'Urban': 0, 'Suburban': 0, 'Rural': 0}
        for row in zip_results:
            category = classify_zipcode_urbanization(row['zipcode'])
            if category in urban_breakdown:
                urban_breakdown[category] += 1

        cursor.close()
        conn.close()

        print(f"[GEO-STATE] Successfully fetched data for {state_name}")

        return jsonify({
            'state': state_name,
            'state_abbrev': state_abbrev,
            'specialties': specialties,
            'cities': cities,
            'npi_specialties': npi_specialties,
            'total_npis': total_npis,
            'urban_breakdown': urban_breakdown
        }), 200

    except Exception as e:
        print(f"[GEO-STATE] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'state': '',
            'specialties': [],
            'cities': [],
            'npi_specialties': [],
            'total_npis': 0,
            'urban_breakdown': {}
        }), 500