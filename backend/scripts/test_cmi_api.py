import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000/api/cmi"

def test_health_check():
    try:
        response = requests.get("http://localhost:5000/api/health")
        print(f"Server is running: {response.json()}")
        return True
    except Exception as e:
        print(f"Server is not running: {str(e)}")
        return False

def test_get_reports_by_week():
    today = datetime.now()
    days_since_monday = today.weekday()
    last_monday = today - timedelta(days=days_since_monday + 7)
    week_start = last_monday.strftime('%Y-%m-%d')

    print(f"\nTesting GET /reports/week/{week_start}")
    try:
        response = requests.get(f"{BASE_URL}/reports/week/{week_start}")
        print(f"  Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"Found {data.get('count', 0)} reports for week {week_start}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Request failed: {str(e)}")
        return False

def test_get_stats():
    print(f"\nTesting GET /reports/stats")
    try:
        response = requests.get(f"{BASE_URL}/reports/stats")
        print(f"  Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            stats = data.get('stats', {})
            print(f" Statistics:")
            print(f"    - Total reports: {stats.get('by_submission', {}).get('total', 0)}")
            print(f"    - Submitted: {stats.get('by_submission', {}).get('submitted', 0)}")
            print(f"    - Pending: {stats.get('by_submission', {}).get('pending', 0)}")
            print(f"    - Confirmed matches: {stats.get('by_category', {}).get('confirmed_match', 0)}")
            print(f"    - No data: {stats.get('by_category', {}).get('no_data', 0)}")
            print(f"    - Aggregate investigation: {stats.get('by_category', {}).get('aggregate_investigation', 0)}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Request failed: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("CMI API Test Suite")
    print("=" * 60)

    if not test_health_check():
        print("\nServer is not running. Please start the backend server first:")
        print("  cd backend && python app.py")
        return

    test_get_reports_by_week()

    test_get_stats()

    print("\n" + "=" * 60)
    print("Test suite completed")
    print("=" * 60)

if __name__ == "__main__":
    main()