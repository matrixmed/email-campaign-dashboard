from sqlalchemy import create_engine, Column, Integer, BigInteger, String, Boolean, DateTime, Text, Float, Numeric, Date, JSON, Index, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

Base = declarative_base()

class UserProfile(Base):
    __tablename__ = 'user_profiles'

    id = Column(Integer, primary_key=True)
    contact_id = Column(String(50))
    email = Column(String(255), unique=True, nullable=False, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    specialty = Column(String(100), index=True)
    degree = Column(String(50))
    address = Column(String(500))
    city = Column(String(100))
    state = Column(String(50))
    zipcode = Column(String(20))
    country = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    npi = Column(String(50), index=True)
    old_address = Column(String(500))
    old_city = Column(String(100))
    old_state = Column(String(50))
    old_zipcode = Column(String(20))
    address_history = Column(JSON, default=list)
    print_lists_subscribed = Column(JSON, default=list)
    print_lists_unsubscribed = Column(JSON, default=list)
    digital_lists_subscribed = Column(JSON, default=list)
    digital_lists_unsubscribed = Column(JSON, default=list)
    unsubscribe_reason = Column(Text)

    __table_args__ = (
        Index('idx_email_specialty', 'email', 'specialty'),
    )

class CampaignInteraction(Base):
    __tablename__ = 'campaign_interactions'

    id = Column(Integer, primary_key=True)
    email = Column(String(255), index=True)
    campaign_id = Column(String(100), index=True)
    campaign_name = Column(String(500))
    campaign_subject = Column(String(1000))
    timestamp = Column(DateTime)
    event_type = Column(String(50), index=True)
    url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_email_campaign', 'email', 'campaign_id'),
        Index('idx_campaign_event', 'campaign_id', 'event_type'),
    )

class DashboardSave(Base):
    __tablename__ = 'dashboard_saves'

    id = Column(Integer, primary_key=True)
    user_id = Column(String(100), index=True)
    title = Column(String(255), nullable=False)
    state_json = Column(Text, nullable=False)
    theme = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CampaignReportingMetadata(Base):
    __tablename__ = 'campaign_reporting_metadata'

    id = Column(Integer, primary_key=True)
    campaign_id = Column(String(500), unique=True, nullable=False, index=True)
    campaign_name = Column(String(500), nullable=False)
    send_date = Column(Date, index=True)

    client_id = Column(Boolean, default=False)
    cmi_placement_id = Column(String(100))
    client_placement_id = Column(String(100))
    placement_description = Column(Text)
    supplier = Column(String(255))
    brand_name = Column(String(255))
    vehicle_name = Column(String(255))
    target_list_id = Column(String(100))
    campaign_name_from_file = Column(String(255))

    creative_code = Column(String(100))
    gcm_placement_id = Column(Text)
    gcm_placement_id_array = Column(Text)
    gcm_placement_id_description = Column(Text)
    buy_component_type = Column(String(100))
    contract_number = Column(String(50))
    media_tactic_id = Column(String(100))
    ad_count = Column(Integer)

    raw_metadata = Column(JSON)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    uploaded_by = Column(String(100))

class CMIContractValue(Base):
    __tablename__ = 'cmi_contract_values'

    id = Column(Integer, primary_key=True)
    contract_number = Column(String(50))
    client = Column(String(255))
    brand = Column(String(255), index=True)
    vehicle = Column(String(255))
    placement_id = Column(String(100), unique=True, index=True)
    placement_description = Column(Text)
    buy_component_type = Column(String(100))
    media_tactic_id = Column(String(100))
    frequency = Column(String(50))
    metric = Column(String(100))
    data_type = Column(String(50))
    notes = Column(Text)
    year = Column(Integer, default=2025, index=True)
    gcm_placement_ids = Column(JSON)
    creative_code = Column(String(100))
    last_attached_campaign_name = Column(String(500))
    last_attached_campaign_brand = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CMIExpectedReport(Base):
    __tablename__ = 'cmi_expected_reports'

    id = Column(Integer, primary_key=True)

    cmi_placement_id = Column(String(100), index=True)
    client_placement_id = Column(String(100))
    contract_number = Column(String(100))

    client_name = Column(String(255))
    brand_name = Column(String(255), index=True)
    supplier = Column(String(255))
    vehicle_name = Column(String(255))
    placement_description = Column(Text)
    buy_type = Column(String(100))
    channel = Column(String(100))

    data_type = Column(String(50))
    expected_data_frequency = Column(String(50)) 
    reporting_week_start = Column(Date, index=True)
    reporting_week_end = Column(Date)
    date_data_expected = Column(Date)

    matched_campaign_id = Column(Integer) 
    matched_metadata_id = Column(Integer) 
    is_matched = Column(Boolean, default=False, index=True)
    match_type = Column(String(50)) 

    is_agg_only = Column(Boolean, default=False)
    attached_to_campaign_id = Column(Integer)
    is_standalone = Column(Boolean, default=False)

    assigned_campaign_name = Column(String(500)) 
    assigned_send_date = Column(Date)

    agg_metric = Column(String(100))
    agg_value = Column(Integer)

    status = Column(String(50), default='pending')
    is_submitted = Column(Boolean, default=False)
    submitted_at = Column(DateTime)
    submitted_for_week = Column(Date)
    notes = Column(Text)

    source_file = Column(String(255)) 
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_expected_week_placement', 'reporting_week_start', 'cmi_placement_id'),
        Index('idx_expected_matched', 'is_matched', 'reporting_week_start'),
    )

class BrandEditorAgency(Base):
    __tablename__ = 'brand_editor_agency'

    id = Column(Integer, primary_key=True)
    sales_member = Column(String(100), index=True)
    brand = Column(String(255), nullable=False, index=True)
    agency = Column(String(255))
    pharma_company = Column(String(255))
    industry = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_sales_brand', 'sales_member', 'brand'),
    )

class CampaignReportManager(Base):
    __tablename__ = 'campaign_report_manager'

    id = Column(Integer, primary_key=True)
    campaign_id = Column(String(100), index=True)
    campaign_name = Column(String(500), nullable=False, index=True)
    standardized_campaign_name = Column(String(500), index=True)
    send_date = Column(DateTime, index=True)
    reporting_week_start = Column(Date, index=True)
    reporting_week_end = Column(Date)

    report_category = Column(String(50), index=True)
    batch = Column(String(50), index=True)
    match_confidence = Column(Float)
    is_cmi_brand = Column(Boolean, default=True, index=True)
    agency = Column(String(255))

    cmi_placement_id = Column(String(100))
    client_id = Column(String(100))
    client_placement_id = Column(String(100))
    placement_description = Column(Text)
    supplier = Column(String(255))
    brand_name = Column(String(255), index=True)
    vehicle_name = Column(String(255))
    target_list_id = Column(String(100))
    creative_code = Column(String(100))
    gcm_placement_id = Column(String(100))
    gcm_placement_id2 = Column(String(100))

    contract_number = Column(String(100))
    data_type = Column(String(50))
    expected_data_frequency = Column(String(50))
    buy_component_type = Column(String(100))
    media_tactic_id = Column(String(100))

    is_reportable = Column(Boolean, default=True)
    notes = Column(Text)
    agency_metadata = Column(JSON)
    requires_manual_review = Column(Boolean, default=False)

    is_submitted = Column(Boolean, default=False, index=True)
    week_1_submitted = Column(Boolean, default=False)
    week_2_submitted = Column(Boolean, default=False)
    week_3_submitted = Column(Boolean, default=False)
    submitted_at = Column(DateTime)
    submitted_by = Column(String(100))
    is_not_needed = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_by = Column(String(100))

    __table_args__ = (
        Index('idx_campaign_week', 'campaign_name', 'reporting_week_start'),
        Index('idx_category_brand', 'report_category', 'brand_name'),
    )

class BasisCampaign(Base):
    __tablename__ = 'basis_campaigns'

    id = Column(Integer, primary_key=True)
    basis_campaign_id = Column(String(100), unique=True, nullable=False, index=True)
    campaign_name = Column(String(500), nullable=False, index=True)
    ugcid = Column(String(100))
    initiative_name = Column(String(500))

    client_id = Column(String(100), index=True)
    client_name = Column(String(255))
    brand_id = Column(String(100), index=True)
    brand_name = Column(String(255), index=True)

    status = Column(String(50), index=True)
    approved_budget = Column(Float)
    start_date = Column(Date, index=True)
    end_date = Column(Date, index=True)

    objectives = Column(JSON)
    account_team = Column(JSON)  
    raw_response = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_synced_at = Column(DateTime, index=True)

    __table_args__ = (
        Index('idx_status_dates', 'status', 'start_date', 'end_date'),
        Index('idx_brand_status', 'brand_name', 'status'),
    )

class BasisLineItem(Base):
    __tablename__ = 'basis_line_items'

    id = Column(Integer, primary_key=True)
    basis_line_item_id = Column(String(100), unique=True, nullable=False, index=True)
    basis_campaign_id = Column(String(100), nullable=False, index=True)
    line_item_name = Column(String(500), nullable=False, index=True)

    status = Column(String(50), index=True)
    start_date = Column(Date, index=True)
    end_date = Column(Date, index=True)
    budget = Column(Float)
    pacing_percentage = Column(Float, index=True) 
    delivery_goal = Column(String(100))

    vendor_id = Column(String(100), index=True)
    vendor_name = Column(String(255), index=True)
    property_id = Column(String(100), index=True)
    property_name = Column(String(255), index=True)

    targeting_criteria = Column(JSON)
    kpis = Column(JSON)
    raw_response = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_synced_at = Column(DateTime)

    __table_args__ = (
        Index('idx_lineitem_campaign_status', 'basis_campaign_id', 'status'),
        Index('idx_lineitem_vendor_property', 'vendor_name', 'property_name'),
        Index('idx_lineitem_pacing', 'pacing_percentage', 'status'),
    )

class BasisVendor(Base):
    __tablename__ = 'basis_vendors'

    id = Column(Integer, primary_key=True)
    basis_vendor_id = Column(String(100), unique=True, nullable=False, index=True)
    vendor_name = Column(String(255), nullable=False, index=True)
    vendor_type = Column(String(100))
    raw_response = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class BasisProperty(Base):
    __tablename__ = 'basis_properties'

    id = Column(Integer, primary_key=True)
    basis_property_id = Column(String(100), unique=True, nullable=False, index=True)
    property_name = Column(String(255), nullable=False, index=True)
    property_type = Column(String(100))
    property_url = Column(String(500))
    category = Column(String(255))
    verticals = Column(JSON)
    raw_response = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class BasisDailyStats(Base):
    __tablename__ = 'basis_daily_stats'

    id = Column(Integer, primary_key=True)
    report_date = Column(Date, nullable=False, index=True)

    basis_campaign_id = Column(String(100), nullable=False, index=True)
    basis_line_item_id = Column(String(100), nullable=False, index=True)

    campaign_name = Column(String(500), index=True)
    line_item_name = Column(String(500))
    vendor_id = Column(String(100), index=True)
    vendor_name = Column(String(255), index=True)
    property_id = Column(String(100), index=True)
    property_name = Column(String(255), index=True)

    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    viewable_impressions = Column(Integer, default=0)
    video_completions = Column(Integer, default=0)
    view_conversions = Column(Integer, default=0)
    click_conversions = Column(Integer, default=0)

    ecpm = Column(Float) 
    ecpc = Column(Float)
    ecpa = Column(Float)
    ctr = Column(Float, index=True) 
    viewability_rate = Column(Float) 
    conversion_rate = Column(Float) 

    spend = Column(Float)
    pacing_percentage = Column(Float)

    day_of_week = Column(String(10), index=True) 
    week_of_year = Column(Integer)
    month = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_date_campaign', 'report_date', 'basis_campaign_id'),
        Index('idx_date_line_item', 'report_date', 'basis_line_item_id'),
        Index('idx_date_vendor', 'report_date', 'vendor_name'),
        Index('idx_date_property', 'report_date', 'property_name'),
        Index('idx_performance', 'report_date', 'ctr', 'ecpc'),
        Index('idx_day_of_week', 'day_of_week', 'report_date'),
    )

class BasisRecommendation(Base):
    __tablename__ = 'basis_recommendations'

    id = Column(Integer, primary_key=True)
    recommendation_date = Column(Date, nullable=False, index=True)

    recommendation_type = Column(String(100), nullable=False, index=True)

    category = Column(String(100), index=True)
    priority = Column(String(50), index=True) 

    basis_campaign_id = Column(String(100), index=True)
    campaign_name = Column(String(500))
    basis_line_item_id = Column(String(100), index=True)
    line_item_name = Column(String(500))
    vendor_name = Column(String(255), index=True)
    property_name = Column(String(255), index=True)

    title = Column(String(500), nullable=False) 
    description = Column(Text, nullable=False)  
    rationale = Column(Text, nullable=False) 
    action_items = Column(JSON) 
    expected_impact = Column(String(500)) 

    baseline_metrics = Column(JSON) 
    benchmark_metrics = Column(JSON) 
    confidence_score = Column(Float)

    status = Column(String(50), nullable=False, default='pending', index=True)

    approved_at = Column(DateTime)
    approved_by = Column(String(100))

    implemented_at = Column(DateTime, index=True)
    implemented_by = Column(String(100))
    implementation_notes = Column(Text)

    dismissed_at = Column(DateTime)
    dismissed_by = Column(String(100))
    dismissed_reason = Column(Text)

    impact_measured = Column(Boolean, default=False, index=True)
    impact_measurement_date = Column(Date)
    impact_status = Column(String(50))
    impact_summary = Column(Text) 

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100), default='system') 

    __table_args__ = (
        Index('idx_rec_date_status', 'recommendation_date', 'status'),
        Index('idx_rec_type_priority', 'recommendation_type', 'priority'),
        Index('idx_rec_campaign_status', 'basis_campaign_id', 'status'),
        Index('idx_rec_impact_tracking', 'implemented_at', 'impact_measured'),
    )

class BasisRecommendationImpact(Base):
    __tablename__ = 'basis_recommendation_impacts'

    id = Column(Integer, primary_key=True)
    recommendation_id = Column(Integer, nullable=False, index=True) 
    measurement_date = Column(Date, nullable=False, index=True)
    measurement_period = Column(String(50)) 

    expected_outcome = Column(JSON) 
    actual_outcome = Column(JSON) 

    implementation_validated = Column(Boolean, default=False)
    validation_method = Column(String(100))
    validation_details = Column(Text)

    baseline_period_start = Column(Date)
    baseline_period_end = Column(Date)
    baseline_metrics = Column(JSON)

    post_implementation_period_start = Column(Date)
    post_implementation_period_end = Column(Date)
    post_implementation_metrics = Column(JSON) 

    metric_changes = Column(JSON) 
    impact_score = Column(Float) 
    impact_category = Column(String(50))  

    success_summary = Column(Text) 
    lessons_learned = Column(Text) 
    follow_up_recommendations = Column(JSON) 

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    analyzed_by = Column(String(100), default='system')

    __table_args__ = (
        Index('idx_rec_measurement', 'recommendation_id', 'measurement_date'),
        Index('idx_impact_category', 'impact_category', 'measurement_date'),
    )

class BasisSyncLog(Base):
    __tablename__ = 'basis_sync_logs'

    id = Column(Integer, primary_key=True)
    sync_started_at = Column(DateTime, nullable=False, index=True)
    sync_completed_at = Column(DateTime)
    sync_status = Column(String(50), index=True)

    endpoint = Column(String(255)) 
    sync_type = Column(String(100)) 

    records_processed = Column(Integer, default=0)
    records_inserted = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)

    date_range_start = Column(Date)
    date_range_end = Column(Date)

    errors = Column(Text)
    warnings = Column(Text)
    execution_time_seconds = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_sync_status_date', 'sync_status', 'sync_started_at'),
    )

class BasisExchangeStats(Base):
    __tablename__ = 'basis_exchange_stats'

    id = Column(Integer, primary_key=True)
    report_date = Column(Date, nullable=False, index=True)
    basis_campaign_id = Column(String(100), nullable=False, index=True)

    exchange_id = Column(Integer, index=True)
    exchange_name = Column(String(255), nullable=False, index=True)

    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    spend = Column(Float, default=0)
    bids = Column(Integer, default=0)

    ecpm = Column(Float)
    ecpc = Column(Float)
    ctr = Column(Float, index=True)
    win_rate = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_exchange_date', 'report_date', 'exchange_name'),
        Index('idx_exchange_campaign', 'basis_campaign_id', 'exchange_name'),
        Index('idx_exchange_performance', 'exchange_name', 'ctr', 'ecpc'),
    )

class UniversalProfile(Base):
    __tablename__ = 'universal_profiles'

    id = Column(Integer, primary_key=True)
    npi = Column(String(10), unique=True, nullable=False, index=True)
    entity_type = Column(String(1))

    first_name = Column(String(100))
    last_name = Column(String(100))
    middle_name = Column(String(100))
    organization_name = Column(String(255))
    credential = Column(String(50))

    mailing_address_1 = Column(String(255))
    mailing_address_2 = Column(String(255))
    mailing_city = Column(String(100))
    mailing_state = Column(String(50))
    mailing_zipcode = Column(String(20))
    mailing_country = Column(String(100))

    practice_address_1 = Column(String(255))
    practice_address_2 = Column(String(255))
    practice_city = Column(String(100))
    practice_state = Column(String(50))
    practice_zipcode = Column(String(20))
    practice_country = Column(String(100))

    primary_taxonomy_code = Column(String(50))
    primary_specialty = Column(String(255), index=True)

    enumeration_date = Column(Date)
    last_update_date = Column(Date)
    deactivation_date = Column(Date)
    is_active = Column(Boolean, default=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_synced_at = Column(DateTime, index=True)
    old_mailing_address_1 = Column(String(255))
    old_mailing_address_2 = Column(String(255))
    old_mailing_city = Column(String(100))
    old_mailing_state = Column(String(50))
    old_mailing_zipcode = Column(String(20))
    old_practice_address_1 = Column(String(255))
    old_practice_address_2 = Column(String(255))
    old_practice_city = Column(String(100))
    old_practice_state = Column(String(50))
    old_practice_zipcode = Column(String(20))
    address_history = Column(JSON, default=list)
    print_lists_subscribed = Column(JSON, default=list)
    print_lists_unsubscribed = Column(JSON, default=list)
    digital_lists_subscribed = Column(JSON, default=list)
    digital_lists_unsubscribed = Column(JSON, default=list)
    unsubscribe_reason = Column(Text)

    __table_args__ = (
        Index('idx_npi_active', 'npi', 'is_active'),
        Index('idx_state_specialty', 'practice_state', 'primary_specialty'),
        Index('idx_last_synced', 'last_synced_at'),
    )

class CampaignValidationFlag(Base):
    __tablename__ = 'campaign_validation_flags'

    id = Column(Integer, primary_key=True)
    campaign_id = Column(String(100), index=True)
    campaign_name = Column(String(500), nullable=False, index=True)

    category = Column(String(100), nullable=False, index=True) 
    severity = Column(String(20), nullable=False, index=True)  
    description = Column(Text, nullable=False)
    recommendation = Column(Text)

    issue_type = Column(String(50), index=True) 
    local_value = Column(Integer) 
    api_value = Column(Integer)  
    tolerance_pct = Column(Float)
    deviation_pct = Column(Float) 

    file_type = Column(String(50))
    send_date = Column(Date)
    days_old = Column(Integer)

    is_active = Column(Boolean, default=True, index=True)
    is_resolved = Column(Boolean, default=False, index=True)
    resolved_at = Column(DateTime)
    resolved_reason = Column(String(100))

    detected_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_flag_campaign_active', 'campaign_id', 'is_active'),
        Index('idx_flag_severity_active', 'severity', 'is_active'),
        Index('idx_flag_expires', 'expires_at', 'is_active'),
        Index('idx_flag_issue_type', 'issue_type', 'campaign_id'),
    )

class NPISyncProgress(Base):
    __tablename__ = 'npi_sync_progress'

    id = Column(Integer, primary_key=True)
    sync_id = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True) 

    file_url = Column(String(500))
    file_size_mb = Column(Float)
    csv_path = Column(String(500))

    total_rows = Column(Integer)
    rows_processed = Column(Integer, default=0)
    rows_inserted = Column(Integer, default=0)
    rows_updated = Column(Integer, default=0)

    current_chunk = Column(Integer, default=0)
    chunk_size = Column(Integer, default=50000)
    last_processed_line = Column(Integer, default=0)  

    started_at = Column(DateTime, default=datetime.utcnow)
    last_chunk_at = Column(DateTime)
    completed_at = Column(DateTime)

    error_message = Column(Text)
    retry_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_sync_status', 'sync_id', 'status'),
    )

class GCMPlacementLookup(Base):
    __tablename__ = 'gcm_placement_lookup'

    id = Column(Integer, primary_key=True)
    gcm_placement_id = Column(String(50), nullable=False, index=True)
    placement_name = Column(String(500))
    advertiser_id = Column(String(50))
    advertiser_name = Column(String(255))
    campaign_id = Column(String(50))
    campaign_name = Column(String(500), index=True)
    site = Column(String(255))
    start_date = Column(Date)
    end_date = Column(Date)

    brand = Column(String(100), index=True)
    source_file = Column(String(500))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_gcm_brand', 'brand', 'gcm_placement_id'),
        Index('idx_gcm_campaign', 'campaign_name', 'gcm_placement_id'),
    )

class Visitor(Base):
    __tablename__ = 'visitors'

    id = Column(Integer, primary_key=True)
    fingerprint = Column(String(64), unique=True, nullable=False, index=True)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    visit_count = Column(Integer, default=1)
    user_agent = Column(String(500))
    screen_resolution = Column(String(20))
    timezone = Column(String(100))
    language = Column(String(20))
    platform = Column(String(100))
    environment = Column(String(10), default='prod', index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PageView(Base):
    __tablename__ = 'page_views'

    id = Column(Integer, primary_key=True)
    fingerprint = Column(String(64), nullable=False, index=True)
    session_id = Column(String(64), nullable=False, index=True)
    page_path = Column(String(500), nullable=False, index=True)
    referrer = Column(String(500))
    environment = Column(String(10), default='prod', index=True)

    entered_at = Column(DateTime, default=datetime.utcnow, index=True)
    duration_seconds = Column(Integer)
    scroll_depth = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_pageview_fingerprint_date', 'fingerprint', 'entered_at'),
        Index('idx_pageview_session', 'session_id', 'entered_at'),
        Index('idx_pageview_env', 'environment', 'entered_at'),
    )

class UserAction(Base):
    __tablename__ = 'user_actions'

    id = Column(Integer, primary_key=True)
    fingerprint = Column(String(64), nullable=False, index=True)
    session_id = Column(String(64), nullable=False, index=True)
    page_path = Column(String(500))
    environment = Column(String(10), default='prod', index=True)

    action_type = Column(String(50), nullable=False, index=True)
    target_element = Column(String(255))
    target_text = Column(String(500))
    action_metadata = Column(JSON)

    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_action_fingerprint_type', 'fingerprint', 'action_type'),
        Index('idx_action_session', 'session_id', 'timestamp'),
        Index('idx_action_env', 'environment', 'timestamp'),
    )

class Program(Base):
    __tablename__ = 'programs'

    id = Column(Integer, primary_key=True)
    name = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(String(50), default='active')
    has_sub_programs = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SubProgram(Base):
    __tablename__ = 'sub_programs'

    id = Column(Integer, primary_key=True)
    program_id = Column(Integer, nullable=False, index=True)
    name = Column(String(500), nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_sub_program_program_order', 'program_id', 'sort_order'),
    )

class ProgramItem(Base):
    __tablename__ = 'program_items'

    id = Column(Integer, primary_key=True)
    program_id = Column(Integer, nullable=False, index=True)
    sub_program_id = Column(Integer, nullable=True, index=True)
    item_type = Column(String(50), nullable=False)
    item_identifier = Column(String(500), nullable=False)
    item_label = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_program_item_type', 'program_id', 'item_type'),
    )

class ABTest(Base):
    __tablename__ = 'ab_tests'

    id = Column(Integer, primary_key=True)
    base_campaign_name = Column(String(500), unique=True, nullable=False, index=True)
    description = Column(Text)
    category = Column(String(255), index=True)
    market = Column(String(255), index=True)
    notes = Column(Text)
    status = Column(String(50), default='active', index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
   
class ABTestGroup(Base):
    __tablename__ = 'ab_test_groups'

    id = Column(Integer, primary_key=True)
    ab_test_id = Column(Integer, nullable=False, index=True)
    group_label = Column(String(10), nullable=False)
    campaign_name_pattern = Column(String(500))
    subcategory = Column(String(255))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_ab_group_test', 'ab_test_id', 'group_label'),
    )

class UserEngagementSummary(Base):
    __tablename__ = 'user_engagement_summary'

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    npi = Column(String(50))
    first_name = Column(String(100))
    last_name = Column(String(100))
    specialty = Column(String(100), index=True)

    campaigns_received = Column(Integer, default=0)
    campaigns_opened = Column(Integer, default=0)
    campaigns_clicked = Column(Integer, default=0)
    unique_open_rate = Column(Float)
    unique_click_rate = Column(Float)

    first_campaign_date = Column(DateTime)
    last_campaign_date = Column(DateTime)

    early_open_rate = Column(Float)
    late_open_rate = Column(Float)

    recent_opens = Column(Integer, default=0)
    historical_open_rate = Column(Float)

    first_three_opens = Column(Integer, default=0)
    later_opens = Column(Integer, default=0)

    avg_open_minutes = Column(Float)
    fast_opens = Column(Integer, default=0)

    total_opens = Column(Integer, default=0)
    rapid_opens = Column(Integer, default=0)
    binge_sessions = Column(Integer, default=0)

    delayed_opens = Column(Integer, default=0)
    weekend_opens = Column(Integer, default=0)
    weekday_opens = Column(Integer, default=0)

    avg_open_hour = Column(Float)
    early_morning_opens = Column(Integer, default=0)
    night_opens = Column(Integer, default=0)

    computed_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_ues_specialty', 'specialty'),
        Index('idx_ues_open_rate', 'unique_open_rate'),
        Index('idx_ues_campaigns', 'campaigns_received'),
    )

class PrintListSubscriber(Base):
    __tablename__ = 'print_list_subscribers'

    id = Column(Integer, primary_key=True)
    npi = Column(String(50), unique=True, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    degree = Column(String(50))
    email = Column(String(255))
    specialty = Column(String(255))
    type_of_professional = Column(String(100))
    company = Column(String(255))
    title = Column(String(255))
    address_1 = Column(String(255))
    address_2 = Column(String(255))
    city = Column(String(100))
    state = Column(String(50))
    zipcode = Column(String(20))
    country = Column(String(100), default='US')
    old_address_1 = Column(String(255))
    old_address_2 = Column(String(255))
    old_city = Column(String(100))
    old_state = Column(String(50))
    old_zipcode = Column(String(20))
    address_history = Column(JSON, default=list)
    subscribed_lists = Column(Text)
    unsubscribed_lists = Column(Text)
    is_comp = Column(Boolean, default=False)
    is_subscribed = Column(Boolean, default=True, index=True)
    unsubscribe_reason = Column(Text)
    unsubscribe_date = Column(DateTime)
    subscribe_date = Column(DateTime)
    source = Column(String(100))
    is_address_blacklisted = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_print_npi', 'npi'),
        Index('idx_print_subscribed', 'is_subscribed'),
        Index('idx_print_subscribed_lists', 'subscribed_lists'),
    )

class BlacklistedAddress(Base):
    __tablename__ = 'blacklisted_addresses'

    id = Column(Integer, primary_key=True)
    address_1 = Column(String(255), index=True)
    city = Column(String(100))
    state = Column(String(50))
    zipcode = Column(String(20))
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class PrintListActivityLog(Base):
    __tablename__ = 'print_list_activity_log'

    id = Column(Integer, primary_key=True)
    npi = Column(String(50), index=True)
    action = Column(String(50))
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class ShadowEngager(Base):
    __tablename__ = 'shadow_engagers'

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    specialty = Column(String(100))
    confidence_pct = Column(Float, nullable=False)
    classification = Column(String(20), nullable=False)
    campaigns_clicked_no_open = Column(Integer, default=0)
    campaigns_with_opens = Column(Integer, default=0)
    total_campaigns_sent = Column(Integer, default=0)
    total_clean_clicks_no_open = Column(Integer, default=0)
    distinct_campaigns_clicked = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_shadow_confidence', 'confidence_pct'),
        Index('idx_shadow_classification', 'classification'),
    )

class ClinicalTrial(Base):
    __tablename__ = 'clinical_trials'

    nct_id = Column(String(20), primary_key=True)
    title = Column(Text)
    sponsor_name = Column(String(500), index=True)
    sponsor_class = Column(String(50))
    phase = Column(String(50))
    status = Column(String(100), index=True)
    conditions = Column(Text)
    interventions = Column(Text)
    enrollment_count = Column(Integer)
    start_date = Column(Date)
    primary_completion_date = Column(Date, index=True)
    completion_date = Column(Date)
    last_api_update = Column(Date)
    therapeutic_area = Column(String(100), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_ct_sponsor', 'sponsor_name'),
        Index('idx_ct_completion', 'primary_completion_date'),
    )

class PDUFADate(Base):
    __tablename__ = 'pdufa_dates'

    id = Column(Integer, primary_key=True)
    drug_name = Column(String(500))
    company_name = Column(String(500), index=True)
    application_type = Column(String(50))
    therapeutic_area = Column(String(200), index=True)
    target_date = Column(Date, index=True)
    status = Column(String(100))
    source_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_pdufa_unique', 'drug_name', 'company_name', 'target_date', unique=True),
    )

class OpenPayment(Base):
    __tablename__ = 'open_payments'

    record_id = Column(BigInteger, primary_key=True)
    npi = Column(String(20), index=True)
    physician_name = Column(String(500))
    physician_first_name = Column(String(200))
    physician_last_name = Column(String(200))
    specialty = Column(String(300), index=True)
    recipient_city = Column(String(200))
    recipient_state = Column(String(10))
    manufacturer_name = Column(String(500), index=True)
    drug_name = Column(String(500))
    therapeutic_area = Column(String(300), index=True)
    payment_amount = Column(Numeric(12, 2))
    payment_nature = Column(String(300))
    payment_date = Column(Date)
    program_year = Column(Integer, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_op_npi_manufacturer', 'npi', 'manufacturer_name'),
    )

class OpenPaymentSummary(Base):
    __tablename__ = 'open_payments_summary'

    id = Column(Integer, primary_key=True)
    npi = Column(String(20), index=True)
    physician_name = Column(String(500))
    specialty = Column(String(300))
    manufacturer_name = Column(String(500), index=True)
    therapeutic_area = Column(String(300), index=True)
    total_payments = Column(Numeric(14, 2))
    payment_count = Column(Integer)
    avg_payment = Column(Numeric(12, 2))
    max_payment = Column(Numeric(12, 2))
    latest_payment_date = Column(Date)
    program_year = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_ops_unique', 'npi', 'manufacturer_name', 'therapeutic_area', 'program_year', unique=True),
    )

class PubmedTrend(Base):
    __tablename__ = 'pubmed_trends'

    id = Column(Integer, primary_key=True)
    search_term = Column(String(500), index=True)
    therapeutic_area = Column(String(100), index=True)
    year = Column(Integer)
    month = Column(Integer)
    publication_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_pm_unique', 'search_term', 'year', 'month', unique=True),
        Index('idx_pm_year_month', 'year', 'month'),
    )

class PatentExpiration(Base):
    __tablename__ = 'patent_expirations'

    id = Column(Integer, primary_key=True)
    drug_name = Column(String(500))
    active_ingredient = Column(String(500), index=True)
    applicant = Column(String(500), index=True)
    application_number = Column(String(50))
    product_number = Column(String(50))
    patent_number = Column(String(50))
    patent_expiration_date = Column(Date, index=True)
    exclusivity_code = Column(String(20))
    exclusivity_date = Column(Date)
    dosage_form = Column(String(200))
    route = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_pe_unique', 'application_number', 'product_number', 'patent_number', unique=True),
    )

class RedditHCPPost(Base):
    __tablename__ = 'reddit_hcp_posts'

    post_id = Column(String(20), primary_key=True)
    subreddit = Column(String(100), index=True)
    title = Column(Text)
    body = Column(Text)
    score = Column(Integer, index=True)
    upvote_ratio = Column(Numeric(4, 2))
    num_comments = Column(Integer)
    author = Column(String(200))
    author_flair = Column(String(200))
    link_url = Column(Text)
    created_utc = Column(DateTime, index=True)
    retrieved_at = Column(DateTime, default=datetime.utcnow)

class RedditHCPComment(Base):
    __tablename__ = 'reddit_hcp_comments'

    comment_id = Column(String(20), primary_key=True)
    post_id = Column(String(20), ForeignKey('reddit_hcp_posts.post_id'), index=True)
    parent_comment_id = Column(String(20))
    body = Column(Text)
    score = Column(Integer, index=True)
    author = Column(String(200))
    author_flair = Column(String(200))
    created_utc = Column(DateTime, index=True)
    depth = Column(Integer)
    retrieved_at = Column(DateTime, default=datetime.utcnow)

class MarketBenchmark(Base):
    __tablename__ = 'market_benchmarks'

    id = Column(Integer, primary_key=True)
    source = Column(String(300))
    metric_name = Column(String(300))
    metric_value = Column(Numeric(14, 2))
    metric_unit = Column(String(50))
    channel = Column(String(100), index=True)
    therapeutic_area = Column(String(100))
    platform = Column(String(100))
    year = Column(Integer, index=True)
    quarter = Column(Integer)
    notes = Column(Text)
    source_url = Column(Text)
    category = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class FDAApproval(Base):
    __tablename__ = 'fda_approvals'

    id = Column(Integer, primary_key=True)
    application_number = Column(String(50))
    brand_name = Column(String(500))
    generic_name = Column(String(500))
    sponsor_name = Column(String(500), index=True)
    submission_type = Column(String(50), index=True)
    submission_status = Column(String(50))
    approval_date = Column(Date, index=True)
    therapeutic_area = Column(String(100), index=True)
    dosage_form = Column(String(200))
    route = Column(String(200))
    product_type = Column(String(100))
    is_new_indication = Column(Boolean, default=False)
    submission_description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_fda_unique', 'application_number', 'submission_type', 'approval_date', unique=True),
    )

class DrugSpending(Base):
    __tablename__ = 'drug_spending'

    id = Column(Integer, primary_key=True)
    brand_name = Column(String(500), index=True)
    generic_name = Column(String(500))
    manufacturer = Column(String(500), index=True)
    total_spending = Column(Numeric(16, 2))
    total_claims = Column(Integer)
    total_beneficiaries = Column(Integer)
    avg_spending_per_claim = Column(Numeric(12, 2))
    year = Column(Integer, index=True)
    program = Column(String(50))
    spending_change_pct = Column(Numeric(8, 2))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_ds_unique', 'brand_name', 'generic_name', 'year', 'program', unique=True),
    )

class HCPTopicProfile(Base):
    __tablename__ = 'hcp_topic_profiles'

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False)
    npi = Column(String(20))
    first_name = Column(String(100))
    last_name = Column(String(100))
    specialty = Column(String(200))
    therapeutic_area = Column(String(200), nullable=False)
    topic = Column(String(200))
    campaigns_sent = Column(Integer, default=0)
    campaigns_opened = Column(Integer, default=0)
    campaigns_clicked = Column(Integer, default=0)
    total_opens = Column(Integer, default=0)
    total_clicks = Column(Integer, default=0)
    open_rate = Column(Float, default=0.0)
    click_rate = Column(Float, default=0.0)
    affinity_score = Column(Float, default=0.0)
    recency_days = Column(Integer)
    last_engagement = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_htp_email', 'email'),
        Index('idx_htp_npi', 'npi'),
        Index('idx_htp_ta', 'therapeutic_area'),
        Index('idx_htp_affinity', 'therapeutic_area', 'affinity_score'),
        Index('idx_htp_email_ta', 'email', 'therapeutic_area', unique=True),
    )

class HCPCluster(Base):
    __tablename__ = 'hcp_clusters'

    id = Column(Integer, primary_key=True)
    cluster_id = Column(Integer, nullable=False, index=True)
    cluster_name = Column(String(200))
    cluster_description = Column(Text)
    top_therapeutic_areas = Column(JSON)
    top_topics = Column(JSON)
    hcp_count = Column(Integer, default=0)
    avg_affinity_score = Column(Float)
    top_specialties = Column(JSON)
    run_id = Column(String(50), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_hc_run_cluster', 'run_id', 'cluster_id', unique=True),
    )

class HCPClusterMembership(Base):
    __tablename__ = 'hcp_cluster_memberships'

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False)
    npi = Column(String(20))
    cluster_id = Column(Integer, nullable=False)
    run_id = Column(String(50), nullable=False)
    membership_score = Column(Float)
    updated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_hcm_email', 'email'),
        Index('idx_hcm_npi', 'npi'),
        Index('idx_hcm_cluster', 'cluster_id'),
        Index('idx_hcm_run', 'run_id'),
        Index('idx_hcm_run_email', 'run_id', 'email', unique=True),
    )

class GASessionMatch(Base):
    __tablename__ = 'ga_session_matches'

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False)
    npi = Column(String(20))
    ga_client_id = Column(String(100), nullable=False)
    match_timestamp = Column(DateTime)
    match_url = Column(Text)
    match_city = Column(String(200))
    match_device = Column(String(50))
    confidence_score = Column(Float, default=0.0)
    match_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_gsm_email', 'email'),
        Index('idx_gsm_client', 'ga_client_id'),
        Index('idx_gsm_confidence', 'confidence_score'),
        Index('idx_gsm_email_client', 'email', 'ga_client_id', unique=True),
    )

class GAAnonymousProfile(Base):
    __tablename__ = 'ga_anonymous_profiles'

    id = Column(Integer, primary_key=True)
    ga_client_id = Column(String(100), nullable=False, unique=True)
    total_sessions = Column(Integer, default=0)
    total_pageviews = Column(Integer, default=0)
    pages_visited = Column(JSON)
    topic_interests = Column(JSON)
    therapeutic_areas = Column(JSON)
    top_content = Column(JSON)
    first_seen = Column(DateTime)
    last_seen = Column(DateTime)
    primary_city = Column(String(200))
    primary_device = Column(String(50))
    video_views = Column(Integer, default=0)
    video_topics = Column(JSON)
    matched_email = Column(String(255))
    matched_npi = Column(String(20))
    match_confidence = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_gap_client', 'ga_client_id'),
        Index('idx_gap_matched', 'matched_email'),
        Index('idx_gap_confidence', 'match_confidence'),
    )

def init_db():
    DATABASE_URL = os.getenv('DATABASE_URL') or 'postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill'
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(engine)
    return engine

def get_session():
    DATABASE_URL = os.getenv('DATABASE_URL') or 'postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill'
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    return Session()