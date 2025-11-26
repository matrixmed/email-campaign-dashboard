import json
import sys
import os
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import UserProfile, CampaignInteraction, Base

load_dotenv()

def parse_user_profiles_json(file_path):
    print(f"Loading JSON file: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def transform_to_relational(json_data, batch_size=1000):
    user_profiles = []
    campaign_interactions = []

    total_users = len(json_data.get('processed_campaign_ids', [])) if isinstance(json_data, dict) else len(json_data)

    if isinstance(json_data, dict):
        email_keys = [k for k in json_data.keys() if k != 'processed_campaign_ids']
    else:
        email_keys = list(json_data.keys())

    print(f"Processing {len(email_keys)} users...")

    for idx, email in enumerate(email_keys):
        user_data = json_data[email]

        user_profile = {
            'contact_id': user_data.get('contact_id', ''),
            'email': email,
            'first_name': user_data.get('first_name', ''),
            'last_name': user_data.get('last_name', ''),
            'specialty': user_data.get('specialty', ''),
            'degree': user_data.get('degree', ''),
            'address': user_data.get('address', ''),
            'city': user_data.get('city', ''),
            'state': user_data.get('state', ''),
            'zipcode': user_data.get('zipcode', ''),
            'country': user_data.get('country', 'United States'),
            'campaigns_data': user_data.get('campaigns', {})
        }
        user_profiles.append(user_profile)

        campaigns = user_data.get('campaigns', {})
        for campaign_id, campaign_data in campaigns.items():
            for interaction in campaign_data.get('interactions', []):
                campaign_interaction = {
                    'email': email,
                    'campaign_id': campaign_id,
                    'campaign_name': campaign_data.get('campaign_name', ''),
                    'campaign_subject': campaign_data.get('campaign_subject', ''),
                    'timestamp': datetime.fromisoformat(interaction['timestamp'].replace('Z', '+00:00')) if interaction.get('timestamp') else None,
                    'event_type': interaction.get('type', ''),
                    'url': interaction.get('url', '')
                }
                campaign_interactions.append(campaign_interaction)

        if (idx + 1) % batch_size == 0:
            print(f"Processed {idx + 1}/{len(email_keys)} users...")
            yield user_profiles, campaign_interactions
            user_profiles = []
            campaign_interactions = []

    if user_profiles:
        yield user_profiles, campaign_interactions

def migrate_data(json_file_path):
    engine = create_engine(os.getenv('DATABASE_URL'))
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        json_data = parse_user_profiles_json(json_file_path)

        total_users = 0
        total_interactions = 0

        for user_batch, interaction_batch in transform_to_relational(json_data):
            user_objects = [UserProfile(**u) for u in user_batch]
            session.bulk_save_objects(user_objects)
            session.commit()
            total_users += len(user_batch)

            interaction_objects = [CampaignInteraction(**i) for i in interaction_batch]
            session.bulk_save_objects(interaction_objects)
            session.commit()
            total_interactions += len(interaction_batch)

            print(f"Migrated {total_users} users and {total_interactions} interactions so far...")

        print(f"\nMigration complete!")
        print(f"Total users migrated: {total_users}")
        print(f"Total interactions migrated: {total_interactions}")

    except Exception as e:
        session.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        session.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python user_profiles_etl.py <path_to_user_profiles.json>")
        sys.exit(1)

    json_file = sys.argv[1]
    migrate_data(json_file)