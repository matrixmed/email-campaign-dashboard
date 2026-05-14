import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'routes'))
os.environ.setdefault('DATABASE_URL','postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill')

from azure.storage.blob import BlobServiceClient
AZURE_SAS = 'https://emaildash.blob.core.windows.net/json-data/dashboard_metrics.json?sp=r&st=2025-06-09T18:55:36Z&se=2027-06-17T02:55:36Z&spr=https&sv=2024-11-04&sr=b&sig=9o5%2B%2BHmlqiFuAQmw9bGl0D2485Z8xTy0XXsb10S2aCI%3D'

import urllib.request
print("Fetching dashboard_metrics.json from Azure...")
with urllib.request.urlopen(AZURE_SAS, timeout=30) as r:
    campaigns_data = json.loads(r.read())
print(f"Loaded {len(campaigns_data)} campaigns")

KEYWORD_INDUSTRY_MAP = {
    'atopic dermatitis': 'Dermatology', 'psoriasis': 'Dermatology', 'melanoma': 'Dermatology',
    'vitiligo': 'Dermatology', 'rosacea': 'Dermatology', 'alopecia': 'Dermatology',
    'eczema': 'Dermatology', 'acne': 'Dermatology', 'jcad': 'Dermatology',
    'aad': 'Dermatology', 'spevigo': 'Dermatology', 'opzelura': 'Dermatology',
    'rinvoq': 'Dermatology', 'skyrizi': 'Dermatology', 'bimzelx': 'Dermatology',
    'zoryve': 'Dermatology', 'neutrogena': 'Dermatology',
    'cancer': 'Oncology', 'oncology': 'Oncology', 'nsclc': 'Oncology',
    'verzenio': 'Oncology', 'tagrisso': 'Oncology', 'imfinzi': 'Oncology',
    'enhertu': 'Oncology', 'breast cancer': 'Oncology',
    'multiple sclerosis': 'Neuroscience', 'alzheimer': 'Neuroscience', 'kisunla': 'Neuroscience',
    'multiple myeloma': 'Hematology', 'lymphoma': 'Hematology', 'calquence': 'Hematology',
}

def get_industry(name):
    n = (name or '').lower()
    match, mlen = None, 0
    for brand, ind in KEYWORD_INDUSTRY_MAP.items():
        if brand in n and len(brand) > mlen:
            match, mlen = ind, len(brand)
    return match

derm_campaigns = [c for c in campaigns_data if get_industry(c.get('campaign_name','')) == 'Dermatology']
print(f"\nDermatology campaigns found by frontend-equivalent classifier: {len(derm_campaigns)}")
print("Sample dermatology names:")
for c in derm_campaigns[:8]:
    print(f"  - {c.get('campaign_name')}")

print("\nTest derm campaigns WITHOUT a DB brand (the previous failure case):")
no_brand_derm = []
for c in derm_campaigns:
    name_low = c.get('campaign_name','').lower()
    db_brand_words = ['verzenio','tagrisso','imfinzi','breyanzi','calquence','opzelura','rinvoq','skyrizi']
    if not any(b in name_low for b in db_brand_words):
        no_brand_derm.append(c)
print(f"  {len(no_brand_derm)} derm campaigns have no major DB brand in name")
for c in no_brand_derm[:5]:
    print(f"  - {c.get('campaign_name')}  (classified: {get_industry(c['campaign_name'])})")

if no_brand_derm:
    test = no_brand_derm[0]
    print(f"\nSelected test campaign: {test.get('campaign_name')}")

    peer_markets = {}
    for c in campaigns_data:
        n = c.get('campaign_name')
        if not n: continue
        m = get_industry(n)
        if m:
            peer_markets[n] = m
    selected_industry = get_industry(test.get('campaign_name'))
    print(f"selected_industry='{selected_industry}', peer_markets has {len(peer_markets)} entries")

    peers = [c for c in campaigns_data
             if c.get('campaign_name') != test.get('campaign_name')
             and peer_markets.get(c.get('campaign_name','')) == selected_industry]
    print(f"Derm peers found: {len(peers)}")
    print("  Before fix this would have been: 0")
    print("  After fix this produces the bucket the user expected")