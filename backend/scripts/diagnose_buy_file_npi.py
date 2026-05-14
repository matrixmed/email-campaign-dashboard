import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import openpyxl
from routes.campaigns import _find_npi_col_index, _normalize_npi, extract_npis_from_target_list

FILES = [
    r"C:\Users\AndrewDaly\Downloads\Nemluvio_BUY_1817_emp4f33f024cdb0786af43e4_20260227203937.xlsx",
    r"C:\Users\AndrewDaly\Downloads\mBC Medical Affairs_BUY_13955_emp484d08a300a5d21dbb1d7_20260320160216.xlsx",
    r"C:\Users\AndrewDaly\Downloads\Imfinzi GI HCP_BUY_13955_emp41d84b5c3a2c93b437fb5_20260318193508.xlsx",
]


def diagnose(path):
    print("=" * 80)
    print(path)
    print("=" * 80)
    if not os.path.exists(path):
        print("  FILE NOT FOUND")
        return

    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    sheet = wb.active
    rows = sheet.iter_rows(values_only=True)
    try:
        headers = list(next(rows))
    except StopIteration:
        print("  EMPTY FILE")
        wb.close()
        return

    print(f"  Total columns: {len(headers)}")
    print("  Headers:")
    for i, h in enumerate(headers):
        marker = ""
        if h:
            import re
            cleaned = re.sub(r'[\s_#\-]+', '', str(h)).lower()
            if cleaned in {'npi', 'npinumber', 'npi#', 'npiid', 'nationalproviderid', 'nationalprovideridentifier'}:
                marker = "  <-- MATCHES NPI"
        print(f"    [{i:>2}] {h!r}{marker}")

    npi_col = _find_npi_col_index(headers)
    print(f"\n  Detected NPI column index: {npi_col}")

    if npi_col is None:
        print("  RESULT: 0 NPIs (no matching column header)")
        wb.close()
        return

    sample_npis = []
    raw_sample = []
    for r_idx, row in enumerate(rows):
        if r_idx < 3:
            raw_sample.append(row[npi_col] if npi_col < len(row) else None)
        if npi_col < len(row):
            n = _normalize_npi(row[npi_col])
            if n:
                sample_npis.append(n)
        if r_idx > 50000:
            break
    wb.close()

    print(f"  Raw sample (first 3 NPI values from rows): {raw_sample}")
    print(f"  Total normalized NPIs extracted: {len(sample_npis)}")
    if sample_npis:
        print(f"  First 5 NPIs: {sample_npis[:5]}")


if __name__ == '__main__':
    for f in FILES:
        diagnose(f)
        print()

    print("=" * 80)
    print("Cross-check: also run extract_npis_from_target_list on file 1")
    print("=" * 80)
    if os.path.exists(FILES[0]):
        with open(FILES[0], 'rb') as fh:
            content = fh.read()
        result = extract_npis_from_target_list(content, os.path.basename(FILES[0]))
        print(f"  extract_npis_from_target_list returned {len(result)} NPIs")
        if result:
            print(f"  First 5: {result[:5]}")