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

def init_db():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Base.metadata.create_all(engine)
    return engine

def get_session():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()
