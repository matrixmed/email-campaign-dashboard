from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from models import CampaignReportingMetadata, BrandEditorAgency, CMIContractValue, GCMPlacementLookup
from werkzeug.utils import secure_filename
import os
import json
import re
from datetime import datetime
import openpyxl

campaigns_bp = Blueprint('campaigns', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'png', 'jpg', 'jpeg'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_session():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()

def allowed_file(filename, file_type):
    if not filename or '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    if file_type == 'excel':
        return ext in {'xlsx', 'xls'}
    elif file_type == 'image':
        return ext in {'png', 'jpg', 'jpeg'}
    return ext in ALLOWED_EXTENSIONS

def get_pharma_company_for_brand(brand_name):
    try:
        session = get_session()
        brand_mapping = session.query(BrandEditorAgency).filter(
            BrandEditorAgency.brand.ilike(f'%{brand_name}%'),
            BrandEditorAgency.is_active == True
        ).first()
        session.close()

        if brand_mapping:
            return brand_mapping.pharma_company
        return None
    except Exception as e:
        print(f"Error getting pharma company: {e}")
        return None

def extract_target_list_data(file_path):
    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active
        headers = [cell.value for cell in sheet[1]]

        if sheet.max_row < 2:
            return {'error': 'No data rows found'}

        row_data = {}
        for idx, header in enumerate(headers):
            cell_value = sheet.cell(row=2, column=idx+1).value
            if header:
                row_data[header] = cell_value

        client_id_value = row_data.get('Client_ID')
        brand_name = row_data.get('Brand_Name', '')

        if client_id_value and brand_name:
            pharma_company = get_pharma_company_for_brand(brand_name)
            client_id = pharma_company if pharma_company else 'Unknown'
        else:
            client_id = None

        extracted = {
            'Client_ID': client_id,
            'CMI_PlacementID': str(row_data.get('CMI_PlacementID')) if row_data.get('CMI_PlacementID') else None,
            'Client_PlacementID': row_data.get('Client_PlacementID') or None,
            'Placement_Description': row_data.get('Placement_Description'),
            'Supplier': row_data.get('Supplier'),
            'Brand_Name': row_data.get('Brand_Name'),
            'Vehicle_Name': row_data.get('Vehicle_Name'),
            'TargetListID': row_data.get('TargetListID'),
            'Campaign_Name': row_data.get('Campaign_Name') or None
        }

        return extracted
    except Exception as e:
        return {'error': str(e)}

def extract_month_from_campaign_name(campaign_name):
    months = {
        'january': 'January', 'jan': 'January',
        'february': 'February', 'feb': 'February',
        'march': 'March', 'mar': 'March',
        'april': 'April', 'apr': 'April',
        'may': 'May',
        'june': 'June', 'jun': 'June',
        'july': 'July', 'jul': 'July',
        'august': 'August', 'aug': 'August',
        'september': 'September', 'sep': 'September', 'sept': 'September',
        'october': 'October', 'oct': 'October',
        'november': 'November', 'nov': 'November',
        'december': 'December', 'dec': 'December'
    }

    campaign_lower = campaign_name.lower()
    for abbr, full in months.items():
        if abbr in campaign_lower:
            return full
    return None

def extract_creative_code_from_placement_name(placement_name):
    """
    Extract creative code from placement name.
    Supports patterns like:
    - ABV-EMR-TT-1234 (standard format)
    - XX-XXX-XX-12345 (variable lengths)
    - ABV_EMR_TT_1234 (underscores)
    """
    patterns = [
        # Standard: XX-XXX-XXX-1234 or XX-XXX-XX-1234
        r'([A-Z]{2,4}[-_][A-Z]{2,4}[-_][A-Z]{2,4}[-_]\d+)',
        # With extra segment: XX-XXX-XX-XX-1234
        r'([A-Z]{2,4}[-_][A-Z]{2,4}[-_][A-Z]{2,4}[-_][A-Z]{2,4}[-_]\d+)',
        # Two segment: XX-XXX-1234
        r'([A-Z]{2,4}[-_][A-Z]{2,4}[-_]\d+)',
        # Fallback: Any sequence of letter groups with dashes ending in numbers
        r'([A-Z]{2,}(?:[-_][A-Z]{2,})+[-_]\d+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, placement_name, re.IGNORECASE)
        if match:
            result = match.group(1).upper().replace('_', '-')
            return result
    return None

def extract_ad_size_from_placement_name(placement_name):
    match = re.search(r'(\d+x\d+)', placement_name, re.IGNORECASE)
    if match:
        return match.group(1)
    return None

def extract_tags_data(file_path, campaign_name='', ad_images_count=0):
    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active

        headers = None
        header_row_idx = None

        for row_idx in range(1, min(sheet.max_row + 1, 20)):
            row_values = [sheet.cell(row=row_idx, column=col).value for col in range(1, sheet.max_column + 1)]
            if any('Placement ID' in str(cell) for cell in row_values if cell):
                headers = row_values
                header_row_idx = row_idx
                break

        if not headers or header_row_idx is None:
            return {'error': 'Could not find header row with "Placement ID"'}

        placement_id_col = None
        placement_name_col = None
        ad_name_col = None

        for idx, header in enumerate(headers):
            if header and 'Placement ID' in str(header):
                placement_id_col = idx + 1
            elif header and 'Placement Name' in str(header):
                placement_name_col = idx + 1
            elif header and 'Ad Name' in str(header):
                ad_name_col = idx + 1

        if not placement_id_col:
            return {'error': 'Could not find "Placement ID" column'}

        all_tags = []
        for row_idx in range(header_row_idx + 1, sheet.max_row + 1):
            placement_id = sheet.cell(row=row_idx, column=placement_id_col).value
            if placement_id:
                placement_name = sheet.cell(row=row_idx, column=placement_name_col).value if placement_name_col else ''
                ad_name = sheet.cell(row=row_idx, column=ad_name_col).value if ad_name_col else ''

                tag_data = {
                    'placement_id': str(placement_id),
                    'placement_name': str(placement_name) if placement_name else '',
                    'ad_name': str(ad_name) if ad_name else '',
                    'creative_code': extract_creative_code_from_placement_name(str(placement_name)) if placement_name else None,
                    'ad_size': extract_ad_size_from_placement_name(str(placement_name)) if placement_name else None
                }
                all_tags.append(tag_data)

        if not all_tags:
            return {'error': 'No placement IDs found'}

        target_month = extract_month_from_campaign_name(campaign_name) if campaign_name else None

        filtered_tags = all_tags
        if target_month:
            month_filtered = [tag for tag in all_tags if target_month[:3] in tag['placement_name']]
            if month_filtered:
                filtered_tags = month_filtered

        return {
            'all_tags': all_tags,
            'suggested_tags': filtered_tags[:ad_images_count] if ad_images_count > 0 else filtered_tags[:2],
            'target_month': target_month,
            'total_count': len(all_tags),
            'filtered_count': len(filtered_tags)
        }
    except Exception as e:
        return {'error': str(e)}

def extract_creative_code_from_image(filename):
    """
    Extract creative code from image filename.
    Supports patterns like:
    - ABV-EMR-TT-1234 (standard format)
    - XX-XXX-XX-12345 (variable lengths)
    - ABV_EMR_TT_1234 (underscores)
    - ABV-EMR-TT-1234-300x250 (with ad size suffix)
    """
    patterns = [
        # Standard: XX-XXX-XXX-1234 or XX-XXX-XX-1234
        r'([A-Z]{2,4}[-_][A-Z]{2,4}[-_][A-Z]{2,4}[-_]\d+)',
        # With extra segment: XX-XXX-XX-XX-1234
        r'([A-Z]{2,4}[-_][A-Z]{2,4}[-_][A-Z]{2,4}[-_][A-Z]{2,4}[-_]\d+)',
        # Two segment: XX-XXX-1234
        r'([A-Z]{2,4}[-_][A-Z]{2,4}[-_]\d+)',
        # Fallback: Any sequence of letter groups with dashes ending in numbers
        r'([A-Z]{2,}(?:[-_][A-Z]{2,})+[-_]\d+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, filename, re.IGNORECASE)
        if match:
            result = match.group(1).upper().replace('_', '-')
            return result
    return None

def normalize_client_id(client_id):
    if not client_id:
        return None

    client_id_str = str(client_id).lower().strip()

    normalizations = {
        'eli lilly': 'Lilly',
        'lilly': 'Lilly',
        'eli lilly & company': 'Lilly',
        'eli lilly and company': 'Lilly',
        'johnson & johnson': 'J&J',
        'johnson and johnson': 'J&J',
        'j&j': 'J&J',
        'jnj': 'J&J',
        'astrazeneca': 'AstraZeneca',
        'abbvie': 'Abbvie',
        'boehringer ingelheim': 'BI',
        'bi': 'BI',
        'dg': 'DG',
        'doctors group': 'DG',
        'dsi': 'DSI'
    }

    for key, normalized_value in normalizations.items():
        if key in client_id_str:
            return normalized_value

    return client_id

def validate_and_enrich_with_cmi_contracts(extracted_data):
    try:
        session = get_session()
        cmi_placement_id = extracted_data.get('CMI_PlacementID')

        if not cmi_placement_id:
            session.close()
            return extracted_data

        contract = session.query(CMIContractValue).filter(
            CMIContractValue.placement_id == str(cmi_placement_id)
        ).first()

        if contract:
            print(f"CMI Contract found for placement {cmi_placement_id} - using as source of truth")

            normalized_client_id = normalize_client_id(contract.client)

            extracted_data['CMI_PlacementID'] = contract.placement_id
            extracted_data['Placement_Description'] = contract.placement_description or extracted_data.get('Placement_Description')
            extracted_data['contract_number'] = contract.contract_number
            extracted_data['Brand_Name'] = contract.brand or extracted_data.get('Brand_Name')
            extracted_data['Vehicle_Name'] = contract.vehicle or extracted_data.get('Vehicle_Name')
            extracted_data['Buy_Component_Type'] = contract.buy_component_type or extracted_data.get('Buy_Component_Type')
            extracted_data['Client_ID'] = normalized_client_id or extracted_data.get('Client_ID')
            extracted_data['cmi_validated'] = True

            print(f"  Using CMI contract values:")
            print(f"    Client_ID: {extracted_data.get('Client_ID')}")
            print(f"    Brand: {extracted_data.get('Brand_Name')}")
            print(f"    Vehicle: {extracted_data.get('Vehicle_Name')}")
            print(f"    Contract #: {extracted_data.get('contract_number')}")
            print(f"    Buy Component: {extracted_data.get('Buy_Component_Type')}")
        else:
            print(f"WARNING: No CMI contract found for placement {cmi_placement_id}")
            extracted_data['contract_number'] = None
            extracted_data['cmi_validated'] = False

            if extracted_data.get('Client_ID'):
                extracted_data['Client_ID'] = normalize_client_id(extracted_data['Client_ID'])

        session.close()
        return extracted_data

    except Exception as e:
        print(f"Error validating with CMI contracts: {e}")
        extracted_data['cmi_validated'] = False
        return extracted_data

@campaigns_bp.route('/<campaign_id>/metadata', methods=['POST'])
def upload_campaign_metadata(campaign_id):
    try:
        has_files = 'target_list' in request.files or 'tags' in request.files or 'ad_images' in request.files
        manual_placement_id = request.form.get('cmi_placement_id', '').strip()

        if not has_files and not manual_placement_id:
            return jsonify({
                'status': 'error',
                'message': 'No files or placement ID provided'
            }), 400

        campaign_name = request.form.get('campaign_name', campaign_id)
        uploaded_by = request.form.get('uploaded_by', 'default_user')
        send_date_str = request.form.get('send_date')
        send_date = None
        if send_date_str:
            try:
                send_date = datetime.strptime(send_date_str, '%Y-%m-%d').date()
            except:
                pass

        target_list_path = None
        tags_path = None
        ad_images_paths = []
        extracted_data = {}

        if 'target_list' in request.files:
            file = request.files['target_list']
            if file and allowed_file(file.filename, 'excel'):
                filename = secure_filename(f"{campaign_id}_target_list_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx")
                target_list_path = os.path.join(UPLOAD_FOLDER, filename)
                file.save(target_list_path)
                extracted_data.update(extract_target_list_data(target_list_path))

        ad_count = 0
        creative_codes_from_images = []
        ad_sizes_from_images = []

        if 'ad_images' in request.files:
            files = request.files.getlist('ad_images')
            ad_count = len(files)
            for file in files:
                if file and allowed_file(file.filename, 'image'):
                    creative_code = extract_creative_code_from_image(file.filename)
                    if creative_code:
                        creative_codes_from_images.append(creative_code)

                    ad_size_match = re.search(r'(\d+x\d+)', file.filename, re.IGNORECASE)
                    if ad_size_match:
                        ad_sizes_from_images.append(ad_size_match.group(1))

                    filename = secure_filename(f"{campaign_id}_ad_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
                    file_path = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(file_path)
                    ad_images_paths.append(file_path)

        tags_data = None
        gcm_ids = []
        final_creative_code = None

        if 'tags' in request.files:
            file = request.files['tags']
            if file and allowed_file(file.filename, 'excel'):
                filename = secure_filename(f"{campaign_id}_tags_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx")
                tags_path = os.path.join(UPLOAD_FOLDER, filename)
                file.save(tags_path)
                tags_data = extract_tags_data(tags_path, campaign_name=campaign_name, ad_images_count=ad_count)

                if not isinstance(tags_data, dict) or 'error' not in tags_data:
                    extracted_data['tags'] = tags_data

                    suggested_tags = tags_data.get('suggested_tags', [])
                    if suggested_tags:
                        if ad_sizes_from_images:
                            for ad_size in ad_sizes_from_images:
                                matching_tag = next((tag for tag in suggested_tags if tag['ad_size'] == ad_size), None)
                                if matching_tag:
                                    gcm_ids.append(matching_tag['placement_id'])
                                    if not final_creative_code and matching_tag['creative_code']:
                                        final_creative_code = matching_tag['creative_code']

                        if len(gcm_ids) < ad_count:
                            for tag in suggested_tags[:ad_count]:
                                if tag['placement_id'] not in gcm_ids:
                                    gcm_ids.append(tag['placement_id'])
                                    if not final_creative_code and tag['creative_code']:
                                        final_creative_code = tag['creative_code']
                else:
                    extracted_data['tags'] = tags_data

        if not final_creative_code and creative_codes_from_images:
            final_creative_code = creative_codes_from_images[0]

        if manual_placement_id:
            extracted_data['CMI_PlacementID'] = manual_placement_id
            try:
                from models import CMIContractValue
                session_temp = get_session()
                contract = session_temp.query(CMIContractValue).filter_by(placement_id=manual_placement_id).first()
                if contract:
                    extracted_data['Brand_Name'] = extracted_data.get('Brand_Name') or contract.brand
                    extracted_data['Vehicle_Name'] = extracted_data.get('Vehicle_Name') or contract.vehicle
                    extracted_data['Placement_Description'] = extracted_data.get('Placement_Description') or contract.placement_description
                    extracted_data['contract_number'] = extracted_data.get('contract_number') or contract.contract_number
                    extracted_data['Buy_Component_Type'] = extracted_data.get('Buy_Component_Type') or contract.buy_component_type
                session_temp.close()
            except Exception as e:
                print(f"Error fetching contract for placement ID {manual_placement_id}: {e}")

        extracted_data = validate_and_enrich_with_cmi_contracts(extracted_data)

        session = get_session()
        existing = session.query(CampaignReportingMetadata).filter_by(campaign_id=campaign_id).first()

        if existing:
            existing.send_date = send_date or existing.send_date
            existing.client_id = extracted_data.get('Client_ID') or existing.client_id
            existing.cmi_placement_id = manual_placement_id or extracted_data.get('CMI_PlacementID') or existing.cmi_placement_id
            existing.client_placement_id = extracted_data.get('Client_PlacementID') or existing.client_placement_id
            existing.placement_description = extracted_data.get('Placement_Description') or existing.placement_description
            existing.supplier = extracted_data.get('Supplier') or existing.supplier
            existing.brand_name = extracted_data.get('Brand_Name') or existing.brand_name
            existing.vehicle_name = extracted_data.get('Vehicle_Name') or existing.vehicle_name
            existing.target_list_id = extracted_data.get('TargetListID') or existing.target_list_id
            existing.campaign_name_from_file = extracted_data.get('Campaign_Name') or existing.campaign_name_from_file
            existing.creative_code = final_creative_code or existing.creative_code
            existing.gcm_placement_id = gcm_ids[0] if len(gcm_ids) > 0 else existing.gcm_placement_id
            existing.gcm_placement_id2 = gcm_ids[1] if len(gcm_ids) > 1 else existing.gcm_placement_id2
            existing.buy_component_type = extracted_data.get('Buy_Component_Type') or existing.buy_component_type
            existing.contract_number = extracted_data.get('contract_number') or existing.contract_number
            existing.ad_count = ad_count or existing.ad_count
            existing.target_list_path = target_list_path or existing.target_list_path
            existing.tags_path = tags_path or existing.tags_path
            existing.ad_images_path = json.dumps(ad_images_paths) if ad_images_paths else existing.ad_images_path
            existing.raw_metadata = json.dumps(extracted_data, default=str)
            existing.uploaded_by = uploaded_by
            existing.updated_at = datetime.utcnow()
        else:
            metadata = CampaignReportingMetadata(
                campaign_id=campaign_id,
                campaign_name=campaign_name,
                send_date=send_date,
                client_id=extracted_data.get('Client_ID'),
                cmi_placement_id=manual_placement_id or extracted_data.get('CMI_PlacementID'),
                client_placement_id=extracted_data.get('Client_PlacementID'),
                placement_description=extracted_data.get('Placement_Description'),
                supplier=extracted_data.get('Supplier'),
                brand_name=extracted_data.get('Brand_Name'),
                vehicle_name=extracted_data.get('Vehicle_Name'),
                target_list_id=extracted_data.get('TargetListID'),
                campaign_name_from_file=extracted_data.get('Campaign_Name'),
                creative_code=final_creative_code,
                gcm_placement_id=gcm_ids[0] if len(gcm_ids) > 0 else None,
                gcm_placement_id2=gcm_ids[1] if len(gcm_ids) > 1 else None,
                buy_component_type=extracted_data.get('Buy_Component_Type'),
                contract_number=extracted_data.get('contract_number'),
                ad_count=ad_count,
                target_list_path=target_list_path,
                tags_path=tags_path,
                ad_images_path=json.dumps(ad_images_paths) if ad_images_paths else None,
                raw_metadata=json.dumps(extracted_data, default=str),
                uploaded_by=uploaded_by
            )
            session.add(metadata)

        session.commit()
        session.close()

        response_data = {
            'status': 'success',
            'message': 'Metadata uploaded and extracted successfully',
            'campaign_id': campaign_id,
            'cmi_validated': extracted_data.get('cmi_validated', False),
            'extracted': {
                'client_id': extracted_data.get('Client_ID'),
                'cmi_placement_id': extracted_data.get('CMI_PlacementID'),
                'brand_name': extracted_data.get('Brand_Name'),
                'vehicle_name': extracted_data.get('Vehicle_Name'),
                'supplier': extracted_data.get('Supplier'),
                'target_list_id': extracted_data.get('TargetListID'),
                'creative_code': final_creative_code,
                'contract_number': extracted_data.get('contract_number'),
                'ad_count': ad_count,
                'gcm_placement_ids': gcm_ids,
                'placement_description': extracted_data.get('Placement_Description')
            }
        }

        if tags_data and isinstance(tags_data, dict) and 'all_tags' in tags_data:
            response_data['tags_review'] = {
                'total_tags_found': tags_data.get('total_count', 0),
                'filtered_count': tags_data.get('filtered_count', 0),
                'target_month': tags_data.get('target_month'),
                'suggested_tags': tags_data.get('suggested_tags', []),
                'all_tags': tags_data.get('all_tags', [])
            }

        return jsonify(response_data), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@campaigns_bp.route('/<campaign_id>/metadata', methods=['GET'])
def get_campaign_metadata(campaign_id):
    try:
        session = get_session()
        metadata = session.query(CampaignReportingMetadata).filter_by(campaign_id=campaign_id).first()

        if not metadata:
            session.close()
            return jsonify({
                'status': 'error',
                'message': 'Metadata not found'
            }), 404

        result = {
            'campaign_id': metadata.campaign_id,
            'campaign_name': metadata.campaign_name,
            'client_id': metadata.client_id,
            'cmi_placement_id': metadata.cmi_placement_id,
            'client_placement_id': metadata.client_placement_id,
            'placement_description': metadata.placement_description,
            'supplier': metadata.supplier,
            'brand_name': metadata.brand_name,
            'vehicle_name': metadata.vehicle_name,
            'target_list_id': metadata.target_list_id,
            'campaign_name_from_file': metadata.campaign_name_from_file,
            'creative_code': metadata.creative_code,
            'gcm_placement_id': metadata.gcm_placement_id,
            'gcm_placement_id2': metadata.gcm_placement_id2,
            'ad_count': metadata.ad_count,
            'uploaded_at': metadata.uploaded_at.isoformat(),
            'uploaded_by': metadata.uploaded_by
        }

        session.close()

        return jsonify({
            'status': 'success',
            'metadata': result
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@campaigns_bp.route('/metadata/all', methods=['GET'])
def get_all_campaign_metadata():
    try:
        session = get_session()
        all_metadata = session.query(CampaignReportingMetadata).all()

        results = []
        for metadata in all_metadata:
            results.append({
                'campaign_id': metadata.campaign_id,
                'campaign_name': metadata.campaign_name,
                'send_date': metadata.send_date.isoformat() if metadata.send_date else None,
                'client_id': metadata.client_id,
                'cmi_placement_id': metadata.cmi_placement_id,
                'client_placement_id': metadata.client_placement_id,
                'placement_description': metadata.placement_description,
                'supplier': metadata.supplier,
                'brand_name': metadata.brand_name,
                'vehicle_name': metadata.vehicle_name,
                'target_list_id': metadata.target_list_id,
                'campaign_name_from_file': metadata.campaign_name_from_file,
                'creative_code': metadata.creative_code,
                'gcm_placement_id': metadata.gcm_placement_id,
                'gcm_placement_id2': metadata.gcm_placement_id2,
                'buy_component_type': metadata.buy_component_type,
                'contract_number': metadata.contract_number,
                'ad_count': metadata.ad_count,
                'uploaded_at': metadata.uploaded_at.isoformat() if metadata.uploaded_at else None,
                'uploaded_by': metadata.uploaded_by
            })

        session.close()

        return jsonify({
            'status': 'success',
            'metadata': results,
            'count': len(results)
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@campaigns_bp.route('/gcm/upload', methods=['POST'])
def upload_gcm_tags():
    try:
        if 'tags_file' not in request.files:
            return jsonify({'status': 'error', 'message': 'No tags file provided'}), 400

        file = request.files['tags_file']
        brand = request.form.get('brand', '').strip()

        if not file or not file.filename:
            return jsonify({'status': 'error', 'message': 'No file selected'}), 400

        filename = secure_filename(f"gcm_tags_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)

        ext = file.filename.rsplit('.', 1)[1].lower()

        placements = []

        if ext == 'xls':
            import xlrd
            wb = xlrd.open_workbook(file_path)
            sheet = wb.sheet_by_index(0)

            header_row_idx = None
            headers = []
            for row_idx in range(min(sheet.nrows, 20)):
                row_values = [sheet.cell_value(row_idx, col) for col in range(sheet.ncols)]
                if any('Placement ID' in str(cell) or 'Placement Id' in str(cell) for cell in row_values if cell):
                    headers = row_values
                    header_row_idx = row_idx
                    break

            if header_row_idx is None:
                os.remove(file_path)
                return jsonify({'status': 'error', 'message': 'Could not find header row with Placement ID'}), 400

            col_map = {}
            for idx, header in enumerate(headers):
                header_str = str(header).strip().lower()
                if 'placement id' in header_str and 'name' not in header_str:
                    col_map['placement_id'] = idx
                elif 'placement name' in header_str or 'placement' in header_str and 'name' in header_str:
                    col_map['placement_name'] = idx
                elif 'advertiser id' in header_str:
                    col_map['advertiser_id'] = idx
                elif 'advertiser name' in header_str or 'advertiser' in header_str and 'name' in header_str:
                    col_map['advertiser_name'] = idx
                elif 'campaign id' in header_str and 'name' not in header_str:
                    col_map['campaign_id'] = idx
                elif 'campaign name' in header_str or 'campaign' in header_str and 'name' in header_str:
                    col_map['campaign_name'] = idx
                elif 'site' in header_str:
                    col_map['site'] = idx
                elif 'start' in header_str and 'date' in header_str:
                    col_map['start_date'] = idx
                elif 'end' in header_str and 'date' in header_str:
                    col_map['end_date'] = idx

            for row_idx in range(header_row_idx + 1, sheet.nrows):
                placement_id = sheet.cell_value(row_idx, col_map.get('placement_id', 0)) if 'placement_id' in col_map else None
                if placement_id:
                    placements.append({
                        'gcm_placement_id': str(int(placement_id) if isinstance(placement_id, float) else placement_id),
                        'placement_name': str(sheet.cell_value(row_idx, col_map['placement_name'])) if 'placement_name' in col_map else None,
                        'advertiser_id': str(sheet.cell_value(row_idx, col_map['advertiser_id'])) if 'advertiser_id' in col_map else None,
                        'advertiser_name': str(sheet.cell_value(row_idx, col_map['advertiser_name'])) if 'advertiser_name' in col_map else None,
                        'campaign_id': str(sheet.cell_value(row_idx, col_map['campaign_id'])) if 'campaign_id' in col_map else None,
                        'campaign_name': str(sheet.cell_value(row_idx, col_map['campaign_name'])) if 'campaign_name' in col_map else None,
                        'site': str(sheet.cell_value(row_idx, col_map['site'])) if 'site' in col_map else None,
                        'brand': brand,
                        'source_file': file.filename
                    })

        elif ext == 'xlsx':
            wb = openpyxl.load_workbook(file_path, data_only=True)
            sheet = wb.active

            header_row_idx = None
            headers = []
            for row_idx in range(1, min(sheet.max_row + 1, 20)):
                row_values = [sheet.cell(row=row_idx, column=col).value for col in range(1, sheet.max_column + 1)]
                if any('Placement ID' in str(cell) or 'Placement Id' in str(cell) for cell in row_values if cell):
                    headers = row_values
                    header_row_idx = row_idx
                    break

            if header_row_idx is None:
                os.remove(file_path)
                return jsonify({'status': 'error', 'message': 'Could not find header row with Placement ID'}), 400

            col_map = {}
            for idx, header in enumerate(headers):
                if header:
                    header_str = str(header).strip().lower()
                    if 'placement id' in header_str and 'name' not in header_str:
                        col_map['placement_id'] = idx + 1
                    elif 'placement name' in header_str:
                        col_map['placement_name'] = idx + 1
                    elif 'advertiser id' in header_str:
                        col_map['advertiser_id'] = idx + 1
                    elif 'advertiser name' in header_str:
                        col_map['advertiser_name'] = idx + 1
                    elif 'campaign id' in header_str and 'name' not in header_str:
                        col_map['campaign_id'] = idx + 1
                    elif 'campaign name' in header_str:
                        col_map['campaign_name'] = idx + 1
                    elif 'site' in header_str:
                        col_map['site'] = idx + 1
                    elif 'start' in header_str and 'date' in header_str:
                        col_map['start_date'] = idx + 1
                    elif 'end' in header_str and 'date' in header_str:
                        col_map['end_date'] = idx + 1

            for row_idx in range(header_row_idx + 1, sheet.max_row + 1):
                placement_id = sheet.cell(row=row_idx, column=col_map.get('placement_id', 1)).value if 'placement_id' in col_map else None
                if placement_id:
                    placements.append({
                        'gcm_placement_id': str(int(placement_id) if isinstance(placement_id, float) else placement_id),
                        'placement_name': str(sheet.cell(row=row_idx, column=col_map['placement_name']).value) if 'placement_name' in col_map else None,
                        'advertiser_id': str(sheet.cell(row=row_idx, column=col_map['advertiser_id']).value) if 'advertiser_id' in col_map else None,
                        'advertiser_name': str(sheet.cell(row=row_idx, column=col_map['advertiser_name']).value) if 'advertiser_name' in col_map else None,
                        'campaign_id': str(sheet.cell(row=row_idx, column=col_map['campaign_id']).value) if 'campaign_id' in col_map else None,
                        'campaign_name': str(sheet.cell(row=row_idx, column=col_map['campaign_name']).value) if 'campaign_name' in col_map else None,
                        'site': str(sheet.cell(row=row_idx, column=col_map['site']).value) if 'site' in col_map else None,
                        'brand': brand,
                        'source_file': file.filename
                    })

        else:
            os.remove(file_path)
            return jsonify({'status': 'error', 'message': 'Unsupported file format. Use .xls or .xlsx'}), 400

        if not placements:
            os.remove(file_path)
            return jsonify({'status': 'error', 'message': 'No placements found in file'}), 400

        session = get_session()

        if brand:
            session.query(GCMPlacementLookup).filter(GCMPlacementLookup.brand == brand).delete()

        for p in placements:
            lookup = GCMPlacementLookup(
                gcm_placement_id=p['gcm_placement_id'],
                placement_name=p.get('placement_name'),
                advertiser_id=p.get('advertiser_id'),
                advertiser_name=p.get('advertiser_name'),
                campaign_id=p.get('campaign_id'),
                campaign_name=p.get('campaign_name'),
                site=p.get('site'),
                brand=p.get('brand'),
                source_file=p.get('source_file')
            )
            session.add(lookup)

        session.commit()
        session.close()

        os.remove(file_path)

        return jsonify({
            'status': 'success',
            'message': f'Uploaded {len(placements)} GCM placements',
            'count': len(placements),
            'brand': brand
        }), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@campaigns_bp.route('/gcm/placements', methods=['GET'])
def get_gcm_placements():
    try:
        brand = request.args.get('brand', '').strip()

        session = get_session()

        query = session.query(GCMPlacementLookup)
        if brand:
            query = query.filter(GCMPlacementLookup.brand.ilike(f'%{brand}%'))

        placements = query.all()

        results = []
        for p in placements:
            results.append({
                'id': p.id,
                'gcm_placement_id': p.gcm_placement_id,
                'placement_name': p.placement_name,
                'advertiser_id': p.advertiser_id,
                'advertiser_name': p.advertiser_name,
                'campaign_id': p.campaign_id,
                'campaign_name': p.campaign_name,
                'site': p.site,
                'brand': p.brand,
                'source_file': p.source_file
            })

        session.close()

        return jsonify({
            'status': 'success',
            'placements': results,
            'count': len(results)
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@campaigns_bp.route('/gcm/brands', methods=['GET'])
def get_gcm_brands():
    try:
        session = get_session()

        brands = session.query(GCMPlacementLookup.brand).distinct().all()
        brand_list = [b[0] for b in brands if b[0]]

        session.close()

        return jsonify({
            'status': 'success',
            'brands': sorted(brand_list)
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500