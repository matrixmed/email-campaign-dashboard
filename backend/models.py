from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, Float, Date, JSON, Index
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
    campaigns_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    campaign_id = Column(String(100), unique=True, nullable=False, index=True)
    campaign_name = Column(String(255), nullable=False)

    client_id = Column(String(100))
    cmi_placement_id = Column(String(100))
    client_placement_id = Column(String(100))
    placement_description = Column(Text)
    supplier = Column(String(255))
    brand_name = Column(String(255))
    vehicle_name = Column(String(255))
    target_list_id = Column(String(100))
    campaign_name_from_file = Column(String(255))

    creative_code = Column(String(100))
    gcm_placement_id = Column(String(100))
    gcm_placement_id2 = Column(String(100))
    ad_count = Column(Integer)

    target_list_path = Column(String(500))
    tags_path = Column(String(500))
    ad_images_path = Column(String(500))
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
    data_type = Column(String(50))
    notes = Column(Text)
    year = Column(Integer, default=2025, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class BrandEditorAgency(Base):
    __tablename__ = 'brand_editor_agency'

    id = Column(Integer, primary_key=True)
    sales_member = Column(String(100), index=True)
    brand = Column(String(255), nullable=False, index=True)
    agency = Column(String(255))
    pharma_company = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_sales_brand', 'sales_member', 'brand'),
    )

class CMIReportResult(Base):
    __tablename__ = 'cmi_report_results'

    id = Column(Integer, primary_key=True)
    campaign_id = Column(String(100), index=True)
    campaign_name = Column(String(500), nullable=False, index=True)
    standardized_campaign_name = Column(String(500), index=True)
    send_date = Column(DateTime, index=True)
    reporting_week_start = Column(Date, index=True)
    reporting_week_end = Column(Date)

    # Report categorization
    report_category = Column(String(50), index=True)  # 'confirmed_match', 'no_data', 'aggregate_investigation', 'unexpected'
    batch = Column(String(50), index=True)  # 'validated', 'no_data', 'investigation', 'unexpected', 'non_cmi'
    match_confidence = Column(Float)
    is_cmi_brand = Column(Boolean, default=True, index=True)
    agency = Column(String(255))

    # CMI contract data (from SQL database)
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

    # CMI spec data (from SFTP files)
    contract_number = Column(String(100))
    data_type = Column(String(50))
    expected_data_frequency = Column(String(50))
    buy_component_type = Column(String(100))

    # Status and notes
    is_reportable = Column(Boolean, default=True)
    notes = Column(Text)
    requires_manual_review = Column(Boolean, default=False)

    # Submission tracking
    is_submitted = Column(Boolean, default=False, index=True)
    submitted_at = Column(DateTime)
    submitted_by = Column(String(100))

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_by = Column(String(100))  # 'automated' or user identifier

    __table_args__ = (
        Index('idx_campaign_week', 'campaign_name', 'reporting_week_start'),
        Index('idx_category_brand', 'report_category', 'brand_name'),
    )

# ============================================================================
# BASIS OPTIMIZATION MODELS
# ============================================================================

class BasisCampaign(Base):
    __tablename__ = 'basis_campaigns'

    id = Column(Integer, primary_key=True)
    basis_campaign_id = Column(String(100), unique=True, nullable=False, index=True)
    campaign_name = Column(String(500), nullable=False, index=True)
    ugcid = Column(String(100))
    initiative_name = Column(String(500))

    # Client/Brand references
    client_id = Column(String(100), index=True)
    client_name = Column(String(255))
    brand_id = Column(String(100), index=True)
    brand_name = Column(String(255), index=True)

    # Campaign details
    status = Column(String(50), index=True)  # live, approved, completed
    approved_budget = Column(Float)
    start_date = Column(Date, index=True)
    end_date = Column(Date, index=True)

    # Metadata
    objectives = Column(JSON)  # campaign objectives
    account_team = Column(JSON)  # team members
    raw_response = Column(JSON)  # full API response

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

    # Line item details
    status = Column(String(50), index=True)
    start_date = Column(Date, index=True)
    end_date = Column(Date, index=True)
    budget = Column(Float)
    pacing_percentage = Column(Float, index=True)  # for pacing alerts
    delivery_goal = Column(String(100))

    # Vendor/Property associations
    vendor_id = Column(String(100), index=True)
    vendor_name = Column(String(255), index=True)
    property_id = Column(String(100), index=True)
    property_name = Column(String(255), index=True)

    # Targeting and configuration
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
    """Main performance data table - this is where optimization analysis happens"""
    __tablename__ = 'basis_daily_stats'

    id = Column(Integer, primary_key=True)
    report_date = Column(Date, nullable=False, index=True)

    # Foreign keys
    basis_campaign_id = Column(String(100), nullable=False, index=True)
    basis_line_item_id = Column(String(100), nullable=False, index=True)

    # Dimensional attributes (denormalized for query performance)
    campaign_name = Column(String(500), index=True)
    line_item_name = Column(String(500))
    vendor_id = Column(String(100), index=True)
    vendor_name = Column(String(255), index=True)
    property_id = Column(String(100), index=True)
    property_name = Column(String(255), index=True)

    # Performance metrics (from Basis API)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    viewable_impressions = Column(Integer, default=0)
    video_completions = Column(Integer, default=0)
    view_conversions = Column(Integer, default=0)
    click_conversions = Column(Integer, default=0)

    # Calculated metrics
    ecpm = Column(Float)  # effective cost per thousand impressions
    ecpc = Column(Float)  # effective cost per click
    ecpa = Column(Float)  # effective cost per acquisition
    ctr = Column(Float, index=True)  # click-through rate
    viewability_rate = Column(Float)  # viewable_impressions / impressions
    conversion_rate = Column(Float)  # conversions / clicks

    # Cost data
    spend = Column(Float)
    pacing_percentage = Column(Float)

    # Time dimensions (for pattern analysis)
    day_of_week = Column(String(10), index=True)  # Monday, Tuesday, etc.
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
    """Optimization recommendations with implementation tracking and feedback loop"""
    __tablename__ = 'basis_recommendations'

    id = Column(Integer, primary_key=True)
    recommendation_date = Column(Date, nullable=False, index=True)

    # Recommendation classification
    recommendation_type = Column(String(100), nullable=False, index=True)
    # Types: 'bid_adjustment', 'budget_reallocation', 'vendor_exclusion',
    #        'property_optimization', 'time_targeting', 'pacing_alert',
    #        'creative_refresh', 'underperformance', 'high_performer'

    category = Column(String(100), index=True)  # cost_reduction, performance_improvement, budget_efficiency
    priority = Column(String(50), index=True)  # high, medium, low

    # Context - what this recommendation is about
    basis_campaign_id = Column(String(100), index=True)
    campaign_name = Column(String(500))
    basis_line_item_id = Column(String(100), index=True)
    line_item_name = Column(String(500))
    vendor_name = Column(String(255), index=True)
    property_name = Column(String(255), index=True)

    # Recommendation content
    title = Column(String(500), nullable=False)  # "Reduce bids in Territory X by 15%"
    description = Column(Text, nullable=False)  # detailed explanation
    rationale = Column(Text, nullable=False)  # "CPC is 40% above average with below-average CTR"
    action_items = Column(JSON)  # structured list of actions to take
    expected_impact = Column(String(500))  # "Could save $5,000/month"

    # Supporting data
    baseline_metrics = Column(JSON)  # metrics when recommendation was created
    benchmark_metrics = Column(JSON)  # average/comparison metrics
    confidence_score = Column(Float)  # 0-1, how confident we are in this recommendation

    # Implementation tracking
    status = Column(String(50), nullable=False, default='pending', index=True)
    # Status: 'pending', 'in_review', 'approved', 'implemented', 'dismissed', 'archived', 'failed'

    approved_at = Column(DateTime)
    approved_by = Column(String(100))

    implemented_at = Column(DateTime, index=True)
    implemented_by = Column(String(100))
    implementation_notes = Column(Text)  # user notes about implementation

    dismissed_at = Column(DateTime)
    dismissed_by = Column(String(100))
    dismissed_reason = Column(Text)

    # Impact tracking (for the feedback loop)
    impact_measured = Column(Boolean, default=False, index=True)
    impact_measurement_date = Column(Date)
    impact_status = Column(String(50))  # 'positive', 'negative', 'neutral', 'not_implemented', 'inconclusive'
    impact_summary = Column(Text)  # AI-generated summary of what happened

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100), default='system')  # 'system' or user_id

    __table_args__ = (
        Index('idx_rec_date_status', 'recommendation_date', 'status'),
        Index('idx_rec_type_priority', 'recommendation_type', 'priority'),
        Index('idx_rec_campaign_status', 'basis_campaign_id', 'status'),
        Index('idx_rec_impact_tracking', 'implemented_at', 'impact_measured'),
    )

class BasisRecommendationImpact(Base):
    """Track the actual impact of implemented recommendations (the feedback loop!)"""
    __tablename__ = 'basis_recommendation_impacts'

    id = Column(Integer, primary_key=True)
    recommendation_id = Column(Integer, nullable=False, index=True)  # FK to basis_recommendations
    measurement_date = Column(Date, nullable=False, index=True)
    measurement_period = Column(String(50))  # '7_days', '14_days', '30_days'

    # What we expected vs what actually happened
    expected_outcome = Column(JSON)  # what we predicted would happen
    actual_outcome = Column(JSON)  # what actually happened

    # Validation: did they actually implement it?
    implementation_validated = Column(Boolean, default=False)
    validation_method = Column(String(100))  # 'data_analysis', 'manual_confirmation'
    validation_details = Column(Text)

    # Performance comparison (before vs after implementation)
    baseline_period_start = Column(Date)
    baseline_period_end = Column(Date)
    baseline_metrics = Column(JSON)  # metrics before implementation

    post_implementation_period_start = Column(Date)
    post_implementation_period_end = Column(Date)
    post_implementation_metrics = Column(JSON)  # metrics after implementation

    # Impact analysis
    metric_changes = Column(JSON)  # {ecpc: {before: 2.5, after: 1.8, change_pct: -28}, ...}
    impact_score = Column(Float)  # -1 to 1 (negative to positive impact)
    impact_category = Column(String(50))  # 'highly_positive', 'positive', 'neutral', 'negative', 'highly_negative'

    # AI-generated insights
    success_summary = Column(Text)  # "Implementation successful - eCPC reduced by 28%..."
    lessons_learned = Column(Text)  # what we learned for future recommendations
    follow_up_recommendations = Column(JSON)  # suggested next steps

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    analyzed_by = Column(String(100), default='system')

    __table_args__ = (
        Index('idx_rec_measurement', 'recommendation_id', 'measurement_date'),
        Index('idx_impact_category', 'impact_category', 'measurement_date'),
    )

class BasisSyncLog(Base):
    """Track API sync history for debugging and monitoring"""
    __tablename__ = 'basis_sync_logs'

    id = Column(Integer, primary_key=True)
    sync_started_at = Column(DateTime, nullable=False, index=True)
    sync_completed_at = Column(DateTime)
    sync_status = Column(String(50), index=True)  # success, partial, failed

    endpoint = Column(String(255))  # which API endpoint was called
    sync_type = Column(String(100))  # 'full_sync', 'daily_update', 'metadata_refresh'

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

def init_db():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Base.metadata.create_all(engine)
    return engine

def get_session():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()
