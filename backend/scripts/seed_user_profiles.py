import json
import os
from dotenv import load_dotenv
from models import get_session, UserProfile, CampaignInteraction
from datetime import datetime
import math

load_dotenv()

def clean_nan(obj):
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan(item) for item in obj]
    elif isinstance(obj, float) and math.isnan(obj):
        return None
    else:
        return obj

def seed_user_profiles():
    print("Starting user_profiles data migration...")

    session = get_session()

    try:
        with open('user_profiles.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"Loaded {len(data)} user profiles from JSON")

        total_users = len(data)
        batch_size = 100
        batch = []
        processed = 0

        for email, user_data in data.items():
            if not isinstance(user_data, dict):
                continue

            campaigns_data = clean_nan(user_data.get('campaigns', {}))

            user_profile = UserProfile(
                contact_id=user_data.get('contact_id'),
                email=email,
                first_name=user_data.get('first_name') if not (isinstance(user_data.get('first_name'), float) and math.isnan(user_data.get('first_name'))) else None,
                last_name=user_data.get('last_name') if not (isinstance(user_data.get('last_name'), float) and math.isnan(user_data.get('last_name'))) else None,
                specialty=user_data.get('specialty') if not (isinstance(user_data.get('specialty'), float) and math.isnan(user_data.get('specialty'))) else None,
                degree=user_data.get('degree'),
                address=user_data.get('address'),
                city=user_data.get('city') if not (isinstance(user_data.get('city'), float) and math.isnan(user_data.get('city'))) else None,
                state=user_data.get('state'),
                zipcode=user_data.get('zipcode'),
                country=user_data.get('country') if not (isinstance(user_data.get('country'), float) and math.isnan(user_data.get('country'))) else None,
                campaigns_data=campaigns_data
            )

            batch.append(user_profile)
            processed += 1

            if len(batch) >= batch_size:
                session.bulk_save_objects(batch)
                session.commit()
                print(f"Processed {processed}/{total_users} users ({(processed/total_users*100):.1f}%)")
                batch = []

        if batch:
            session.bulk_save_objects(batch)
            session.commit()
            print(f"Processed {processed}/{total_users} users (100%)")

        print("User profiles migration completed successfully!")

        count = session.query(UserProfile).count()
        print(f"Total user profiles in database: {count}")

    except FileNotFoundError:
        print("ERROR: user_profiles.json not found in backend directory")
        print("Please ensure the file exists before running this script")
    except Exception as e:
        print(f"ERROR during migration: {str(e)}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == '__main__':
    seed_user_profiles()