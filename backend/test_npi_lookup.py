import psycopg2
import os

DATABASE_URL = os.getenv('DATABASE_URL') or 'postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill'

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

test_npis = ['1831626464', '1053307926', '1588651392', '1720040538', '1891891339', '1003857301', '1013002542']

print("=" * 60)
print("Testing NPI Quick Lookup Logic")
print("=" * 60)

results = []
found_npis = set()

print("\n1. Checking user_profiles (Audience)...")
placeholders = ','.join(['%s'] * len(test_npis))
cursor.execute(f"""
    SELECT npi, first_name, last_name, specialty, degree, address, city, state, zipcode
    FROM user_profiles
    WHERE npi IN ({placeholders})
""", test_npis)

user_results = cursor.fetchall()
print(f"   Found {len(user_results)} in user_profiles")

for row in user_results:
    npi = row[0]
    if npi and npi not in found_npis:
        found_npis.add(npi)
        results.append({
            'npi': npi,
            'name': f"{row[1]} {row[2]}",
            'specialty': row[3],
            'source': 'Audience'
        })
        print(f"   - {npi}: {row[1]} {row[2]}, Specialty: {row[3]}")

remaining_npis = [npi for npi in test_npis if npi not in found_npis]
print(f"\n2. Checking universal_profiles for {len(remaining_npis)} remaining NPIs...")

if remaining_npis:
    placeholders = ','.join(['%s'] * len(remaining_npis))
    cursor.execute(f"""
        SELECT npi, first_name, last_name, primary_specialty, primary_taxonomy_code, credential
        FROM universal_profiles
        WHERE npi IN ({placeholders})
    """, remaining_npis)

    universal_results = cursor.fetchall()
    print(f"   Found {len(universal_results)} in universal_profiles")

    for row in universal_results:
        npi = row[0]
        if npi not in found_npis:
            found_npis.add(npi)
            specialty = row[3] or row[4]
            results.append({
                'npi': npi,
                'name': f"{row[1]} {row[2]}",
                'specialty': specialty,
                'source': 'Market'
            })
            print(f"   - {npi}: {row[1]} {row[2]}, Specialty: {specialty}")

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
audience_count = sum(1 for r in results if r['source'] == 'Audience')
market_count = sum(1 for r in results if r['source'] == 'Market')
missing = [npi for npi in test_npis if npi not in found_npis]

print(f"Total found: {len(results)}")
print(f"  - Audience: {audience_count}")
print(f"  - Market: {market_count}")
print(f"Missing: {missing}")

print("\nAll Results:")
for r in results:
    print(f"  {r['npi']}: {r['name']} | {r['specialty']} | {r['source']}")

cursor.close()
conn.close()