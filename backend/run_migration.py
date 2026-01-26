import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv('DATABASE_URL',
    "postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill"
)

engine = create_engine(DATABASE_URL, connect_args={'sslmode': 'require'})

migration_sql = """
-- 1. Create the new campaign_report_manager table
CREATE TABLE IF NOT EXISTS campaign_report_manager (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(100),
    campaign_name VARCHAR(500) NOT NULL,
    standardized_campaign_name VARCHAR(500),
    send_date TIMESTAMP,
    reporting_week_start DATE,
    reporting_week_end DATE,
    report_category VARCHAR(50),
    batch VARCHAR(50),
    match_confidence FLOAT,
    is_cmi_brand BOOLEAN DEFAULT TRUE,
    agency VARCHAR(255),
    cmi_placement_id VARCHAR(100),
    client_id VARCHAR(100),
    client_placement_id VARCHAR(100),
    placement_description TEXT,
    supplier VARCHAR(255),
    brand_name VARCHAR(255),
    vehicle_name VARCHAR(255),
    target_list_id VARCHAR(100),
    creative_code VARCHAR(100),
    gcm_placement_id VARCHAR(100),
    gcm_placement_id2 VARCHAR(100),
    contract_number VARCHAR(100),
    data_type VARCHAR(50),
    expected_data_frequency VARCHAR(50),
    buy_component_type VARCHAR(100),
    is_reportable BOOLEAN DEFAULT TRUE,
    notes TEXT,
    requires_manual_review BOOLEAN DEFAULT FALSE,
    is_submitted BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP,
    submitted_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    processed_by VARCHAR(100)
);
"""

index_sql = """
CREATE INDEX IF NOT EXISTS idx_crm_campaign_id ON campaign_report_manager(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_name ON campaign_report_manager(campaign_name);
CREATE INDEX IF NOT EXISTS idx_crm_standardized_name ON campaign_report_manager(standardized_campaign_name);
CREATE INDEX IF NOT EXISTS idx_crm_send_date ON campaign_report_manager(send_date);
CREATE INDEX IF NOT EXISTS idx_crm_reporting_week_start ON campaign_report_manager(reporting_week_start);
CREATE INDEX IF NOT EXISTS idx_crm_report_category ON campaign_report_manager(report_category);
CREATE INDEX IF NOT EXISTS idx_crm_batch ON campaign_report_manager(batch);
CREATE INDEX IF NOT EXISTS idx_crm_is_cmi_brand ON campaign_report_manager(is_cmi_brand);
CREATE INDEX IF NOT EXISTS idx_crm_brand_name ON campaign_report_manager(brand_name);
CREATE INDEX IF NOT EXISTS idx_crm_is_submitted ON campaign_report_manager(is_submitted);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_week ON campaign_report_manager(campaign_name, reporting_week_start);
CREATE INDEX IF NOT EXISTS idx_crm_category_brand ON campaign_report_manager(report_category, brand_name);
"""

migrate_data_sql = """
INSERT INTO campaign_report_manager (
    id, campaign_id, campaign_name, standardized_campaign_name, send_date,
    reporting_week_start, reporting_week_end, report_category, batch,
    match_confidence, is_cmi_brand, agency, cmi_placement_id, client_id,
    client_placement_id, placement_description, supplier, brand_name,
    vehicle_name, target_list_id, creative_code, gcm_placement_id,
    gcm_placement_id2, contract_number, data_type, expected_data_frequency,
    buy_component_type, is_reportable, notes, requires_manual_review,
    is_submitted, submitted_at, submitted_by, created_at, updated_at, processed_by
)
SELECT
    id, campaign_id, campaign_name, standardized_campaign_name, send_date,
    reporting_week_start, reporting_week_end, report_category, batch,
    match_confidence, is_cmi_brand, agency, cmi_placement_id, client_id,
    client_placement_id, placement_description, supplier, brand_name,
    vehicle_name, target_list_id, creative_code, gcm_placement_id,
    gcm_placement_id2, contract_number, data_type, expected_data_frequency,
    buy_component_type, is_reportable, notes, requires_manual_review,
    is_submitted, submitted_at, submitted_by, created_at, updated_at, processed_by
FROM cmi_report_results
ON CONFLICT (id) DO NOTHING;
"""

cmi_contracts_columns_sql = """
ALTER TABLE cmi_contract_values ADD COLUMN IF NOT EXISTS frequency VARCHAR(50);
ALTER TABLE cmi_contract_values ADD COLUMN IF NOT EXISTS metric VARCHAR(100);
"""

campaign_metadata_column_resize_sql = """
ALTER TABLE campaign_reporting_metadata ALTER COLUMN campaign_id TYPE VARCHAR(500);
ALTER TABLE campaign_reporting_metadata ALTER COLUMN campaign_name TYPE VARCHAR(500);
"""

def run_migration():
    print("=" * 60)
    print("DATABASE MIGRATION")
    print("=" * 60)

    with engine.begin() as conn:
        print("\n[1/5] Creating campaign_report_manager table...")
        conn.execute(text(migration_sql))
        print("      Done!")

        print("\n[2/5] Creating indexes...")
        for idx_stmt in index_sql.strip().split(';'):
            if idx_stmt.strip():
                conn.execute(text(idx_stmt))
        print("      Done!")

        print("\n[3/5] Checking for existing data to migrate...")
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'cmi_report_results'
            );
        """))
        old_table_exists = result.scalar()

        if old_table_exists:
            old_count = conn.execute(text("SELECT COUNT(*) FROM cmi_report_results")).scalar()
            print(f"      Found {old_count} rows in cmi_report_results")

            if old_count > 0:
                print("      Migrating data...")
                conn.execute(text(migrate_data_sql))

                conn.execute(text("""
                    SELECT setval('campaign_report_manager_id_seq',
                        (SELECT COALESCE(MAX(id), 0) + 1 FROM campaign_report_manager), false);
                """))

                new_count = conn.execute(text("SELECT COUNT(*) FROM campaign_report_manager")).scalar()
                print(f"      Migrated {new_count} rows to campaign_report_manager")
        else:
            print("      No old table found, skipping migration")

        print("\n[4/6] Adding frequency and metric columns to cmi_contract_values...")
        conn.execute(text(cmi_contracts_columns_sql))
        print("      Done!")

        print("\n[5/6] Resizing campaign_reporting_metadata columns...")
        for stmt in campaign_metadata_column_resize_sql.strip().split(';'):
            if stmt.strip():
                try:
                    conn.execute(text(stmt))
                except Exception as e:
                    print(f"      Note: {e}")
        print("      Done!")

        print("\n[6/6] Verifying...")
        new_count = conn.execute(text("SELECT COUNT(*) FROM campaign_report_manager")).scalar()
        print(f"      campaign_report_manager has {new_count} rows")

    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE!")
    print("=" * 60)
    print("\nYou can now restart your Flask server.")
    print("\nTo drop the old table (optional), run:")
    print("  DROP TABLE IF EXISTS cmi_report_results;")

if __name__ == "__main__":
    run_migration()