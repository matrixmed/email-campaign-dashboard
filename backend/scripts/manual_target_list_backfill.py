import sys
import os
from dotenv import load_dotenv

load_dotenv()
if not os.getenv('DATABASE_URL'):
    os.environ['DATABASE_URL'] = 'postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill'

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from routes.campaigns import extract_npis_from_target_list, _attach_target_list_to_profiles

JOBS = [
    {
        'file': r"C:\Users\AndrewDaly\Downloads\Nemluvio_BUY_1817_emp4f33f024cdb0786af43e4_20260227203937.xlsx",
        'campaign_id': "JCADTV Expert Perspectives in Prurigo Nodularis - April 2026: Angela Lamb (Nemluvio) [SkinHealingMessage]",
        'campaign_name': "JCADTV Expert Perspectives in Prurigo Nodularis - April 2026: Angela Lamb (Nemluvio) [SkinHealingMessage]",
        'target_list_id': "d701cfbe",
    },
    {
        'file': r"C:\Users\AndrewDaly\Downloads\Nemluvio_BUY_1817_emp4f33f024cdb0786af43e4_20260227203937.xlsx",
        'campaign_id': "JCADTV Expert Perspectives in Prurigo Nodularis - April 2026: Angela Lamb (Nemluvio) [NowFDAApproved]",
        'campaign_name': "JCADTV Expert Perspectives in Prurigo Nodularis - April 2026: Angela Lamb (Nemluvio) [NowFDAApproved]",
        'target_list_id': "d701cfbe",
    },
    {
        'file': r"C:\Users\AndrewDaly\Downloads\Imfinzi GI HCP_BUY_13955_emp41d84b5c3a2c93b437fb5_20260318193508.xlsx",
        'campaign_id': "Imfinzi GI Webinar Enduring eNL #1 (Imfinzi GI)",
        'campaign_name': "Imfinzi GI Webinar Enduring eNL #1 (Imfinzi GI)",
        'target_list_id': "e205e10c",
    },
    {
        'file': r"C:\Users\AndrewDaly\Downloads\mBC Medical Affairs_BUY_13955_emp484d08a300a5d21dbb1d7_20260320160216.xlsx",
        'campaign_id': "mBC Webinar #1 Registration eNL #2 (Lilly mBC)",
        'campaign_name': "mBC Webinar #1 Registration eNL #2 (Lilly mBC)",
        'target_list_id': "dc116999",
    },
]


def main():
    for job in JOBS:
        print("=" * 80)
        print(f"Campaign: {job['campaign_id']}")
        print(f"File:     {os.path.basename(job['file'])}")
        if not os.path.exists(job['file']):
            print(f"  SKIP — file not found")
            print()
            continue
        with open(job['file'], 'rb') as fh:
            content = fh.read()
        npis = extract_npis_from_target_list(content, os.path.basename(job['file']))
        print(f"NPIs:     {len(npis)} extracted")
        print(f"Calling _attach_target_list_to_profiles...")
        _attach_target_list_to_profiles(npis, job['campaign_id'], job['campaign_name'], job['target_list_id'])
        print()


if __name__ == '__main__':
    main()