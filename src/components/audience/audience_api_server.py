"""
Flask API Server for Audience Processing
Provides endpoints for querying and analyzing audience data from the data lake
Uses the existing AudienceProfileBuilder class for data access
"""

import json
import logging
import pandas as pd
import re
from datetime import datetime, date
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from azure.storage.blob import BlobServiceClient
from azure.storage.filedatalake import DataLakeServiceClient
from collections import defaultdict
import traceback
import io
import tempfile
import os
from typing import Dict, List, Any, Optional

# Import the existing AudienceProfileBuilder class
from audience_profile_builder import AudienceProfileBuilder, STORAGE_ACCOUNT_NAME, STORAGE_ACCOUNT_KEY, BLOB_CONNECTION_STRING, FILE_SYSTEM_NAME, JSON_CONTAINER, AUDIENCE_JSON_FILE

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

class AudienceQueryProcessor(AudienceProfileBuilder):
    """Extended AudienceProfileBuilder with query capabilities"""

    def get_users_by_criteria(self, specialty=None, engagement_type=None, user_count=None, specific_emails=None):
        """Get users based on various criteria"""
        try:
            # Load audience data
            audience_data = self.load_json_file(AUDIENCE_JSON_FILE)
            if not audience_data:
                return []

            # Filter out metadata keys
            users = {k: v for k, v in audience_data.items()
                    if k not in ['processed_campaign_ids', 'last_updated', 'total_users']}

            results = []

            # Filter by specific emails if provided
            if specific_emails:
                email_list = [email.strip().lower() for email in specific_emails if email.strip()]
                for email in email_list:
                    if email in users:
                        user_data = users[email]
                        # Calculate engagement score
                        engagement_score = self.calculate_engagement_score(user_data)
                        user_data['engagement_score'] = engagement_score
                        results.append(user_data)
                return results

            # Filter by specialty
            if specialty and specialty.lower() != 'all':
                users = {k: v for k, v in users.items()
                        if v.get('specialty', '').lower() == specialty.lower()}

            # Calculate engagement scores for all users
            for email, user_data in users.items():
                engagement_score = self.calculate_engagement_score(user_data)
                user_data['engagement_score'] = engagement_score

            # Filter by engagement type
            if engagement_type == 'top_engaged':
                # Sort by engagement score and take top performers
                sorted_users = sorted(users.items(), key=lambda x: x[1]['engagement_score'], reverse=True)
                users = dict(sorted_users)
            elif engagement_type == 'no_engagement':
                # Users with 0 engagement score
                users = {k: v for k, v in users.items() if v['engagement_score'] == 0}
            elif engagement_type == 'random':
                # Random sampling
                import random
                user_items = list(users.items())
                random.shuffle(user_items)
                users = dict(user_items)

            # Apply user count limit
            if user_count and user_count > 0:
                users = dict(list(users.items())[:user_count])

            # Convert to list format
            for email, user_data in users.items():
                results.append(user_data)

            return results

        except Exception as e:
            logging.error(f"Error getting users by criteria: {str(e)}")
            return []

    def calculate_engagement_score(self, user_data):
        """Calculate engagement score for a user based on their campaign interactions"""
        if 'campaigns' not in user_data or not user_data['campaigns']:
            return 0

        total_score = 0
        total_campaigns = len(user_data['campaigns'])

        for campaign_id, campaign_data in user_data['campaigns'].items():
            interactions = campaign_data.get('interactions', [])

            campaign_score = 0
            for interaction in interactions:
                action = interaction.get('action', '')
                if action == 'sent':
                    campaign_score += 1
                elif action == 'open':
                    campaign_score += 3
                elif action == 'click':
                    campaign_score += 5

            total_score += campaign_score

        # Average score per campaign
        return round(total_score / total_campaigns, 2) if total_campaigns > 0 else 0

    def get_user_activity_details(self, user_data):
        """Get detailed activity breakdown for a user"""
        if 'campaigns' not in user_data:
            return {
                'total_campaigns': 0,
                'total_opens': 0,
                'total_clicks': 0,
                'recent_activity': []
            }

        total_opens = 0
        total_clicks = 0
        recent_activity = []

        for campaign_id, campaign_data in user_data['campaigns'].items():
            interactions = campaign_data.get('interactions', [])

            campaign_opens = 0
            campaign_clicks = 0

            for interaction in interactions:
                action = interaction.get('action', '')
                timestamp = interaction.get('timestamp', '')

                if action == 'open':
                    campaign_opens += 1
                    total_opens += 1
                elif action == 'click':
                    campaign_clicks += 1
                    total_clicks += 1

                # Add to recent activity
                recent_activity.append({
                    'campaign_name': campaign_data.get('campaign_name', ''),
                    'campaign_subject': campaign_data.get('campaign_subject', ''),
                    'action': action,
                    'timestamp': timestamp,
                    'link_url': interaction.get('link_url', '') if action == 'click' else ''
                })

        # Sort recent activity by timestamp (most recent first)
        recent_activity.sort(key=lambda x: x['timestamp'], reverse=True)

        return {
            'total_campaigns': len(user_data['campaigns']),
            'total_opens': total_opens,
            'total_clicks': total_clicks,
            'recent_activity': recent_activity[:50]  # Limit to 50 most recent
        }

    def get_available_specialties(self):
        """Get list of available specialties from the data lake"""
        try:
            file_system_client = self.data_lake_service_client.get_file_system_client(FILE_SYSTEM_NAME)
            file_client = file_system_client.get_file_client("full_list.csv")
            download = file_client.download_file().readall()

            # Read just a sample to get column names and unique specialties
            temp_df = pd.read_csv(io.BytesIO(download), nrows=1000)

            # Get unique specialties
            if 'Specialty' in temp_df.columns:
                specialties = temp_df['Specialty'].dropna().unique().tolist()
                specialties = [s for s in specialties if s and s.strip()]
                specialties.sort()
                return specialties
            else:
                # Fallback to known specialties
                return ['Dermatology', 'Neurology', 'Oncology', 'NPPA']

        except Exception as e:
            logging.error(f"Error getting specialties: {str(e)}")
            return ['Dermatology', 'Neurology', 'Oncology', 'NPPA']  # Fallback

# Initialize processor
processor = AudienceQueryProcessor()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/api/specialties', methods=['GET'])
def get_specialties():
    """Get list of available specialties"""
    try:
        specialties = processor.get_available_specialties()
        return jsonify({"specialties": specialties})

    except Exception as e:
        logging.error(f"Error getting specialties: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/audience/query', methods=['POST'])
def query_audience():
    """Main endpoint for querying audience data"""
    try:
        data = request.get_json()

        # Extract parameters
        specialty = data.get('specialty', 'all')
        engagement_type = data.get('engagement_type', 'all')
        user_count = data.get('user_count')
        specific_emails = data.get('specific_emails', [])
        download_file = data.get('download_file', True)

        logging.info(f"Processing audience query: specialty={specialty}, engagement={engagement_type}, count={user_count}")

        # Get users based on criteria
        users = processor.get_users_by_criteria(
            specialty=specialty,
            engagement_type=engagement_type,
            user_count=user_count,
            specific_emails=specific_emails
        )

        if not users:
            return jsonify({"error": "No users found matching criteria"}), 404

        # If requesting download or more than 10 users, create CSV
        if download_file or len(users) > 10:
            # Create CSV data
            csv_data = []
            for user in users:
                activity = processor.get_user_activity_details(user)

                csv_row = {
                    'email': user.get('email', ''),
                    'first_name': user.get('first_name', ''),
                    'last_name': user.get('last_name', ''),
                    'specialty': user.get('specialty', ''),
                    'city': user.get('city', ''),
                    'state': user.get('state', ''),
                    'country': user.get('country', ''),
                    'engagement_score': user.get('engagement_score', 0),
                    'total_campaigns': activity['total_campaigns'],
                    'total_opens': activity['total_opens'],
                    'total_clicks': activity['total_clicks']
                }
                csv_data.append(csv_row)

            # Create DataFrame and CSV
            df = pd.DataFrame(csv_data)

            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv', newline='')
            df.to_csv(temp_file.name, index=False)
            temp_file.close()

            # Return file for download
            return send_file(
                temp_file.name,
                as_attachment=True,
                download_name=f'audience_query_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
                mimetype='text/csv'
            )
        else:
            # Return JSON data for display (≤10 users)
            result_data = []
            for user in users:
                activity = processor.get_user_activity_details(user)
                user_summary = {
                    'email': user.get('email', ''),
                    'first_name': user.get('first_name', ''),
                    'last_name': user.get('last_name', ''),
                    'specialty': user.get('specialty', ''),
                    'city': user.get('city', ''),
                    'state': user.get('state', ''),
                    'engagement_score': user.get('engagement_score', 0),
                    'activity_summary': {
                        'total_campaigns': activity['total_campaigns'],
                        'total_opens': activity['total_opens'],
                        'total_clicks': activity['total_clicks']
                    },
                    'recent_activity': activity['recent_activity'][:10]  # Show 10 most recent
                }
                result_data.append(user_summary)

            return jsonify({
                "users": result_data,
                "total_count": len(users),
                "query_params": {
                    "specialty": specialty,
                    "engagement_type": engagement_type,
                    "user_count": user_count
                }
            })

    except Exception as e:
        logging.error(f"Error processing audience query: {str(e)}")
        logging.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/audience/user/<email>', methods=['GET'])
def get_user_details(email):
    """Get detailed information for a specific user"""
    try:
        # Load audience data
        audience_data = processor.load_json_file(AUDIENCE_JSON_FILE)

        if email not in audience_data:
            return jsonify({"error": "User not found"}), 404

        user_data = audience_data[email]

        # Calculate engagement score
        engagement_score = processor.calculate_engagement_score(user_data)
        user_data['engagement_score'] = engagement_score

        # Get detailed activity
        activity = processor.get_user_activity_details(user_data)

        result = {
            'user': user_data,
            'activity_details': activity
        }

        return jsonify(result)

    except Exception as e:
        logging.error(f"Error getting user details for {email}: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("AUDIENCE API SERVER - LOCAL DEVELOPMENT")
    print("=" * 60)
    print("Server starting on http://localhost:5000")
    print("Available endpoints:")
    print("  GET  /api/health              - Health check")
    print("  GET  /api/specialties         - Get available specialties")
    print("  POST /api/audience/query      - Query audience data")
    print("  GET  /api/audience/user/<email> - Get specific user details")
    print("=" * 60)

    app.run(debug=True, host='0.0.0.0', port=5000)