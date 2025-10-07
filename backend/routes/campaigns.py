from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from models import CampaignReportingMetadata
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

BRAND_TO_PHARMA = {
    'Calquence CLL HCP': 'AstraZeneca',
    'Calquence': 'AstraZeneca',
    'Imfinzi': 'AstraZeneca',
    'Tagrisso': 'AstraZeneca',
    'One Lung': 'AstraZeneca',
    'Verzenio': 'Eli Lilly',
    'Rinvoq': 'Abbvie',
    'Skyrizi': 'Abbvie'
}

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

def extract_target_list_data(file_path):
    try:
        wb = openpyxl.load_workbook(file_path)
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
            pharma_company = BRAND_TO_PHARMA.get(brand_name, 'Unknown')
            client_id = pharma_company
        else:
            client_id = None

        extracted = {
            'Client_ID': client_id,
            'CMI_PlacementID': row_data.get('CMI_PlacementID'),
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

def extract_tags_data(file_path):
    try:
        wb = openpyxl.load_workbook(file_path)
        sheet = wb.active

        tags = []
        headers = None

        for row_idx, row in enumerate(sheet.iter_rows(values_only=True), start=1):
            if row_idx == 1 or not any(row):
                continue

            if not headers:
                for idx, cell in enumerate(row):
                    if cell and 'Placement ID' in str(cell):
                        headers = row
                        break
                continue

            if headers:
                row_dict = dict(zip(headers, row))
                placement_id = row_dict.get('Placement ID')
                if placement_id:
                    tags.append({
                        'GCM_Placement_ID': str(placement_id),
                        'Placement_Name': row_dict.get('Placement Name', ''),
                        'Ad_Name': row_dict.get('Ad Name', ''),
                        'Campaign_Name': row_dict.get('Campaign Name', '')
                    })

        return tags if tags else {'error': 'No tags found'}
    except Exception as e:
        return {'error': str(e)}

def extract_creative_code_from_image(filename):
    match = re.match(r'([A-Z]{2}-\d+)', filename, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return None

@campaigns_bp.route('/<campaign_id>/metadata', methods=['POST'])
def upload_campaign_metadata(campaign_id):
    try:
        if 'target_list' not in request.files and 'tags' not in request.files and 'ad_images' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'No files provided'
            }), 400

        campaign_name = request.form.get('campaign_name', campaign_id)
        uploaded_by = request.form.get('uploaded_by', 'default_user')

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

        if 'tags' in request.files:
            file = request.files['tags']
            if file and allowed_file(file.filename, 'excel'):
                filename = secure_filename(f"{campaign_id}_tags_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx")
                tags_path = os.path.join(UPLOAD_FOLDER, filename)
                file.save(tags_path)
                tags_data = extract_tags_data(tags_path)
                extracted_data['tags'] = tags_data

        ad_count = 0
        creative_code = None
        gcm_ids = []

        if 'ad_images' in request.files:
            files = request.files.getlist('ad_images')
            ad_count = len(files)
            for file in files:
                if file and allowed_file(file.filename, 'image'):
                    filename = secure_filename(f"{campaign_id}_ad_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
                    file_path = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(file_path)
                    ad_images_paths.append(file_path)

                    if not creative_code:
                        creative_code = extract_creative_code_from_image(file.filename)

        if isinstance(extracted_data.get('tags'), list) and extracted_data['tags']:
            for i, tag in enumerate(extracted_data['tags'][:2]):
                gcm_ids.append(tag.get('GCM_Placement_ID'))

        session = get_session()
        existing = session.query(CampaignReportingMetadata).filter_by(campaign_id=campaign_id).first()

        if existing:
            existing.client_id = extracted_data.get('Client_ID') or existing.client_id
            existing.cmi_placement_id = extracted_data.get('CMI_PlacementID') or existing.cmi_placement_id
            existing.client_placement_id = extracted_data.get('Client_PlacementID') or existing.client_placement_id
            existing.placement_description = extracted_data.get('Placement_Description') or existing.placement_description
            existing.supplier = extracted_data.get('Supplier') or existing.supplier
            existing.brand_name = extracted_data.get('Brand_Name') or existing.brand_name
            existing.vehicle_name = extracted_data.get('Vehicle_Name') or existing.vehicle_name
            existing.target_list_id = extracted_data.get('TargetListID') or existing.target_list_id
            existing.campaign_name_from_file = extracted_data.get('Campaign_Name') or existing.campaign_name_from_file
            existing.creative_code = creative_code or existing.creative_code
            existing.gcm_placement_id = gcm_ids[0] if len(gcm_ids) > 0 else existing.gcm_placement_id
            existing.gcm_placement_id2 = gcm_ids[1] if len(gcm_ids) > 1 else existing.gcm_placement_id2
            existing.ad_count = ad_count or existing.ad_count
            existing.target_list_path = target_list_path or existing.target_list_path
            existing.tags_path = tags_path or existing.tags_path
            existing.ad_images_path = json.dumps(ad_images_paths) if ad_images_paths else existing.ad_images_path
            existing.raw_metadata = json.dumps(extracted_data)
            existing.uploaded_by = uploaded_by
            existing.updated_at = datetime.utcnow()
        else:
            metadata = CampaignReportingMetadata(
                campaign_id=campaign_id,
                campaign_name=campaign_name,
                client_id=extracted_data.get('Client_ID'),
                cmi_placement_id=extracted_data.get('CMI_PlacementID'),
                client_placement_id=extracted_data.get('Client_PlacementID'),
                placement_description=extracted_data.get('Placement_Description'),
                supplier=extracted_data.get('Supplier'),
                brand_name=extracted_data.get('Brand_Name'),
                vehicle_name=extracted_data.get('Vehicle_Name'),
                target_list_id=extracted_data.get('TargetListID'),
                campaign_name_from_file=extracted_data.get('Campaign_Name'),
                creative_code=creative_code,
                gcm_placement_id=gcm_ids[0] if len(gcm_ids) > 0 else None,
                gcm_placement_id2=gcm_ids[1] if len(gcm_ids) > 1 else None,
                ad_count=ad_count,
                target_list_path=target_list_path,
                tags_path=tags_path,
                ad_images_path=json.dumps(ad_images_paths) if ad_images_paths else None,
                raw_metadata=json.dumps(extracted_data),
                uploaded_by=uploaded_by
            )
            session.add(metadata)

        session.commit()
        session.close()

        return jsonify({
            'status': 'success',
            'message': 'Metadata uploaded and extracted successfully',
            'campaign_id': campaign_id,
            'extracted': {
                'client_id': extracted_data.get('Client_ID'),
                'cmi_placement_id': extracted_data.get('CMI_PlacementID'),
                'brand_name': extracted_data.get('Brand_Name'),
                'creative_code': creative_code,
                'ad_count': ad_count,
                'gcm_placement_ids': gcm_ids
            }
        }), 201

    except Exception as e:
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
