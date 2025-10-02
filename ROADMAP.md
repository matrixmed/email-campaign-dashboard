# Email Campaign Dashboard Migration & Enhancement Project

## Section 1: Project Overview

### Executive Summary
Migration from Azure Blob Storage + GitHub Pages static hosting to Render server with PostgreSQL database backend. This transition enables dynamic functionality including user input processing, backend API integration, and real-time data manipulation. The project maintains existing Azure infrastructure for bulk data storage while moving critical, frequently-accessed data to SQL for performance optimization.

### Current State Analysis

**Infrastructure:**
- Frontend: React app deployed on GitHub Pages (static)
- Data Storage: Azure Blob Storage with 12 JSON files (total ~2.5GB)
- Data Pipeline: Python scripts in P2025 folder feed Azure Blob Storage
- No API layer or dynamic server capabilities

**Azure Blob Storage JSON Files:**
1. `campaign_specialty_analytics.json` (891.66 KiB)
2. `completed_campaign_metadata.json` (10.69 MiB)
3. `completed_campaign_metrics.json` (2.17 MiB)
4. `dashboard_metrics.json` (5.22 MiB)
5. `live_campaign_metrics.json` (31.67 KiB)
6. `report_resource.json` (37.97 KiB)
7. `url_data.json` (19.25 MiB)
8. `video_metrics.json` (360.7 KiB)
9. `user_profiles.json` (2.45 GiB - MIGRATION TARGET)
10. `campaign_file_index_live.json` (52.04 KiB)
11. `cmi_spec.json` (4.08 MiB)
12. `enrichment_tracking_index.json` (179.44 KiB)

**Existing Components:**
- Dashboard.jsx (main container)
- DashboardCanvas.jsx (visual dashboard builder)
- CampaignModal.jsx (campaign details)
- LiveCampaignMetrics.jsx
- MetricsTable.jsx
- ReportsManager.jsx (report generation interface)
- AudienceBreakdown.jsx + AudienceQueryBuilder.jsx
- SpecialtySection.jsx
- VideoMetrics.jsx
- DigitalJournals.jsx
- Various dashboard builder components (MetricCard, TableComponent, etc.)

**Data Pipeline Scripts (P2025 folder):**
- `audience_profile_builder.py` - Builds user engagement profiles by campaign
- `completed_campaign_metadata.py` - Campaign metadata compilation
- `data_enrichment_script.py` - Data enrichment operations
- `campaign-compiler-premium/` - Compiles sends with webhook data
- `get-sends-premium/` - Gets unopened sends from ActiveCampaign API
- `live-campaign-premium/` - Updates live campaign metrics
- `complete-campaign-premium/` - Updates completed campaign metrics
- `specialty-analytics-premium/` - Specialty-specific analytics
- `dashboard-metrics-premium/` - Dashboard metrics aggregation
- `youtube-pipeline-premium/` - YouTube video metrics
- `report/` - Report generation and CMI sFTP integration

**Note:** P2025 scripts are data pipeline components that feed Azure Blob Storage, not backend API layer. These scripts remain unchanged and continue their current workflow.

### Migration Strategy

**What Stays in Azure (FOR NOW):**
- ALL 12 existing JSON files remain in Azure Blob Storage
- All data pipeline scripts (P2025 folder) continue feeding Azure
- Components that only display existing data outputs remain unchanged
- Video metrics, journal data, specialty analytics stay in Azure
- Campaign metrics, dashboard metrics, URL data remain in Azure
- CMI spec data stays in Azure

**What Moves to Render SQL Database:**
- `user_profiles.json` (2.45 GiB) - PRIMARY MIGRATION (needed for complex queries)
- Dashboard save states (new feature #1 requirement)
- User-submitted campaign metadata (target lists, tags, ad images from feature #4)
- CMI contract values editable table (new feature #5 - ULTIMATE SOURCE OF TRUTH)
- Brand/agency/editor assignments (new feature #6)
- Future data as features expand

**Rationale:**
- Only migrate data needed for NEW dynamic features requiring backend
- User profiles: 2.45GB requires fast complex queries impossible with JSON fetch
- Dashboard saves: CRUD operations impossible in static environment
- Campaign metadata uploads: Relational linking to campaigns required
- CMI contract values: Source of truth for ALL metadata combinations, requires editing
- Scalable design: Schema designed to accommodate future migrations as needed
- P2025 pipeline scripts remain untouched - working system stays working

### New Features Requiring Backend

**#1 - Dashboard Save Functionality**
- Save button next to export in DashboardCanvas
- Captures: component positions (x,y), themes, table values, pasted images, all customizations
- Archive section in sidebar below "Restore"
- List of saved dashboards by title, clickable to restore
- **Database Need:** Store serialized dashboard state with metadata

**#2 - User Engagement Query System**
- Query interface for finding user engagement patterns
- Input: User criteria (specialty, engagement level, etc.)
- Output: Individual user open/click rates across all received emails
- **Database Need:** Fast queries on 2.45GB user_profiles data

**#3 - List Efficiency Analysis**
- Quarterly analysis of IQVIA list utilization
- Upload full IQVIA list + multiple target lists
- Calculate crossover distribution (users on 12/12, 11/12, etc. lists)
- Match campaigns to target lists, compare engagement
- **Database Need:** Set operations on large user datasets

**#4 - Campaign Metadata Upload (Campaign Modal)**
- Add button in campaign modal (right of send date/campaign count)
- Three dropboxes: Target List (Excel), Tags (Excel), Ad Images (PNG)
- Files attach to specific campaigns for report generation
- **Database Need:** Store file references and extracted metadata per campaign

**#5 - CMI Contract Values Manager**
- Editable table: Contract #, Client, Brand, Vehicle, Placement ID, Description, Type, Data Type, Notes
- Source of truth for all placement IDs and metadata
- CRUD operations on contract data
- **Database Need:** Relational table with full edit capabilities

**#6 - Brand/Agency/Editor Management**
- Three related datasets combined into single interface:
  - Editor assignments (Emily, Courtney, Morgan, Dana) by brand
  - Active/historical clients and brands by pharma company
  - Brand-to-agency mapping
- Editable tabular interface (Google Sheets/Excel clone)
- **Database Need:** Multiple related tables with referential integrity

**#7 - Updated Audience Query Builder**
- Two modes: Discovery (find users by criteria) vs. Analysis (analyze specific list)
- File upload: CSV/Excel with NPI column required
- Copy/paste mode: limit 100 NPIs
- Output: Email, name, NPI, specialty, engagement metrics (opens, clicks, sends)
- **Database Need:** User profile lookups with aggregation

### Report Generation Modernization

**Four Information Sources:**
1. ActiveCampaign API → Campaign names and send dates
2. Editor submissions → Target lists, tags, ad images (via Campaign Modal)
3. CMI sFTP → Expected reports and validation metadata
4. CMI Contract Values component → Source of truth for all metadata

**New Logic Flow:**
- CMI Contract Values component = ULTIMATE source of truth for ALL metadata combinations
- Editor-entered data (via Campaign Modal) = primary source for campaign-specific metadata
- CMI sFTP validates against our data (not vice versa)
- Reports marked "no data" only if AGG+PLD AND missing from our records
- Matching simplified: metadata already attached to campaigns via editor uploads
- `report_resource_manager.py` refactored to query database instead of file matching
- Hierarchy: CMI Contract Values > Editor Campaign Data > CMI sFTP validation

### Design & UX Overhaul

**Current Issues:**
- Cookie-cutter sectional layouts (repetitive headers, backgrounds)
- Poor mobile responsiveness
- Limited scalability for new features
- UX not optimized despite decent UI

**Design Goals:**
- Maintain existing color schemes (darker table header blue, not button blue)
- Remove pink headers or standardize header treatment
- Introduce professional fonts (Lora, Rubik candidates)
- Add Matrix logo branding
- Dashboard Canvas maintains current design (near-perfect)
- Responsive canvas: height stays consistent, width scales proportionally
- Mobile-first approach for all components
- Consider side navigation dashboard layout

**New Component - True Dashboard Section:**
- Purpose-driven charts/graphs only (no filler visualizations)
- Time series plots: Open rates by month (Jan-Dec), multi-year comparison lines
- Specialty dropdowns to filter graph data
- Expandable section for future analytics

**CSS Consolidation:**
- Create `App.css` with global theme styles and fonts
- Eliminate duplicate CSS rules across component files
- Reorganize styles folder with better component alignment
- Reuse styles via shared classes while maintaining component uniqueness

---

## Section 2: Implementation Steps

### Phase 1: Infrastructure & Database Setup

**Step 1.1: Database Schema Design**
- [ ] Design PostgreSQL schema for user_profiles table (normalized structure for 2.45GB JSON)
- [ ] Design dashboard_saves table (id, user_id, title, state_json, theme, created_at, updated_at)
- [ ] Design campaign_metadata table (campaign_id, campaign_name, target_list_path, tags_path, ad_images_path, extracted_data)
- [ ] Design cmi_contract_values table (contract_num, client, brand, vehicle, placement_id, description, buy_type, data_type, notes) - ULTIMATE SOURCE OF TRUTH
- [ ] Design brand_editor_agency table (editor_name, brand, agency, pharma_company, is_active) - MERGED TABLE for editor assignments + brand-agency mapping
- [ ] Design scalable schema patterns for future data migrations
- [ ] Create foreign key relationships and indexes for performance
- [ ] Document schema with ERD diagram showing relationships and data flow

**Step 1.2: Render Setup**
- [ ] Create Render account and new Web Service
- [ ] Provision PostgreSQL database instance
- [ ] Configure environment variables (.env setup)
- [ ] Set up deployment pipeline from GitHub repo
- [ ] Configure CORS for API endpoints
- [ ] Test basic deployment with Hello World endpoint

**Step 1.3: Backend API Framework (Python Flask)**
- [ ] Initialize Python Flask backend project structure
- [ ] Set up Flask app with blueprints for modular routes
- [ ] Configure SQLAlchemy ORM for PostgreSQL connection
- [ ] Set up database connection pooling (psycopg2)
- [ ] Create base API structure with error handling middleware
- [ ] Implement CORS configuration for frontend communication
- [ ] Set up logging and monitoring (Flask logging)
- [ ] Create health check endpoint (/api/health)
- [ ] Set up development server configuration

**Step 1.4: Data Migration - User Profiles**
- [ ] Write ETL script to parse user_profiles.json (2.45GB)
- [ ] Transform nested JSON structure to relational schema
- [ ] Create batch insert script with progress tracking
- [ ] Migrate data to PostgreSQL with validation
- [ ] Create indexes on NPI, email, specialty columns
- [ ] Verify data integrity and query performance
- [ ] Test sample queries for response time benchmarks

### Phase 2: Dashboard Save Feature (#1)

**Step 2.1: Backend - Dashboard Save API**
- [ ] Create POST /api/dashboards/save endpoint
- [ ] Implement request validation for dashboard state JSON
- [ ] Save dashboard state to database with metadata
- [ ] Create GET /api/dashboards/list endpoint (return user's saved dashboards)
- [ ] Create GET /api/dashboards/:id endpoint (fetch specific dashboard state)
- [ ] Create DELETE /api/dashboards/:id endpoint
- [ ] Add error handling for large state objects

**Step 2.2: Frontend - Save Functionality**
- [ ] Add "Save" button next to Export button in DashboardCanvas.jsx
- [ ] Implement dashboard state serialization function
- [ ] Capture all component positions (x, y coordinates)
- [ ] Capture current theme selection
- [ ] Capture table values and custom data
- [ ] Capture uploaded images (convert to base64 or upload to storage)
- [ ] Create save modal with title input
- [ ] Implement save API call with loading state
- [ ] Add success/error notifications

**Step 2.3: Frontend - Archive & Restore**
- [ ] Add "Archive" section below "Restore" in ComponentSidebar.jsx
- [ ] Fetch list of saved dashboards on component mount
- [ ] Render clickable list of dashboard titles with timestamps
- [ ] Implement restore functionality on click
- [ ] Deserialize dashboard state from database
- [ ] Restore all component positions
- [ ] Restore theme selection
- [ ] Restore table data and images
- [ ] Add delete button for each archived dashboard
- [ ] Add confirmation modal for delete operations

**Step 2.4: Testing & Refinement**
- [ ] Test save with complex multi-component dashboards
- [ ] Test restore accuracy for positions and data
- [ ] Test image persistence and restoration
- [ ] Test edge cases (empty dashboards, large states)
- [ ] Optimize state size (compression if needed)
- [ ] Test concurrent saves and race conditions

### Phase 3: Campaign Metadata Upload (#4)

**Step 3.1: Backend - File Upload API**
- [ ] Create POST /api/campaigns/:campaignId/metadata endpoint
- [ ] Implement multipart/form-data handling
- [ ] Set up file storage (S3, Azure Blob, or Render disk)
- [ ] Extract data from Excel files (target list, tags)
- [ ] Store file references in campaign_metadata table
- [ ] Create GET /api/campaigns/:campaignId/metadata endpoint
- [ ] Implement file validation (type, size limits)

**Step 3.2: Frontend - Modal Enhancement**
- [ ] Add button in CampaignModal.jsx (right of send date/campaign count)
- [ ] Style button to match existing modal design
- [ ] Create metadata upload modal/screen
- [ ] Add three file dropbox components (react-dropzone)
- [ ] Label dropboxes: "Target List (Excel)", "Tags (Excel)", "Ad Images (PNG/JPG)"
- [ ] Implement file preview for each dropbox
- [ ] Add "Submit" button with validation
- [ ] Display uploaded file names and timestamps
- [ ] Implement file upload API calls
- [ ] Add progress indicators for uploads
- [ ] Show success/error states

**Step 3.3: Data Extraction & Storage**
- [ ] Parse Excel files server-side (use openpyxl for Python or xlsx for Node)
- [ ] Extract placement IDs, descriptions, and metadata from target lists
- [ ] Extract tag information from tags file
- [ ] Store extracted data in structured format
- [ ] Link data to campaign by campaign name/ID
- [ ] Implement data validation against CMI contract values
- [ ] Create endpoint to retrieve parsed metadata

**Step 3.4: Integration with Reports**
- [ ] Update report_resource_manager.py to query database for metadata
- [ ] Remove file-matching logic (metadata already linked to campaigns)
- [ ] Use editor-uploaded data as source of truth
- [ ] Implement validation against CMI sFTP data
- [ ] Flag discrepancies for manual review
- [ ] Update report generation to use new metadata flow

### Phase 4: CMI Contract Values Manager (#5)

**Step 4.1: Backend - CRUD API**
- [ ] Create GET /api/cmi-contracts endpoint (fetch all contracts)
- [ ] Create POST /api/cmi-contracts endpoint (create new contract)
- [ ] Create PUT /api/cmi-contracts/:id endpoint (update contract)
- [ ] Create DELETE /api/cmi-contracts/:id endpoint (delete contract)
- [ ] Implement validation for required fields
- [ ] Add bulk operations endpoint for Excel import
- [ ] Create export endpoint (GET /api/cmi-contracts/export as CSV)

**Step 4.2: Frontend - Editable Table Component**
- [ ] Create new CMIContractValues.jsx component
- [ ] Design table layout with columns: Contract #, Client, Brand, Vehicle, Placement ID, Description, Buy Type, Data Type, Notes
- [ ] Implement inline editing (click cell to edit)
- [ ] Add row-level actions (delete, duplicate)
- [ ] Implement column sorting and filtering
- [ ] Add "Add Row" button at bottom
- [ ] Implement bulk import from Excel file
- [ ] Add "Export to Excel" button
- [ ] Style to match application theme
- [ ] Add loading states and error handling

**Step 4.3: Data Management**
- [ ] Seed database with existing contract data
- [ ] Implement optimistic UI updates
- [ ] Add undo/redo functionality
- [ ] Implement search across all fields
- [ ] Add data validation on frontend and backend
- [ ] Create audit log for changes (optional but recommended)

**Step 4.4: Integration**
- [ ] Update report generation to use CMI contract values as source of truth
- [ ] Add validation in campaign metadata upload against contracts
- [ ] Create API to lookup placement IDs for autocomplete features
- [ ] Add navigation link in main dashboard

### Phase 5: Brand/Agency/Editor Management (#6)

**Step 5.1: Backend - Unified Brand Management API**
- [ ] Create GET /api/brand-management endpoint (fetch all brand_editor_agency data)
- [ ] Create POST /api/brand-management/entry endpoint (add new brand entry with editor + agency)
- [ ] Create PUT /api/brand-management/:id endpoint (update existing entry)
- [ ] Create DELETE /api/brand-management/:id endpoint (delete entry)
- [ ] Implement bulk import endpoint for Excel data
- [ ] Add validation for required fields (editor, brand, agency, pharma_company)
- [ ] Create endpoint for historical client archiving (toggle is_active)
- [ ] Add filtering by editor name for frontend grouping

**Step 5.2: Frontend - Unified Management Component**
- [ ] Create BrandManagement.jsx component with grouped layout
- [ ] Design section headers for each editor (Emily, Courtney, Morgan, Dana)
- [ ] Under each editor header, display their brands with agency + pharma company
- [ ] Implement inline editing for brand rows (agency, pharma company editable)
- [ ] Add "Add Brand" button under each editor section
- [ ] Implement reassign brand to different editor functionality
- [ ] Add separate "Active Clients" and "Historical Clients" sections
- [ ] Implement "Move to Historical" toggle for clients
- [ ] Add bulk import from Excel functionality
- [ ] Style consistently with application theme

**Step 5.3: Data Seeding**
- [ ] Seed Emily's brands with agencies (BCMA→?, Carvykti→CMI, Castle→Castle, Imfinzi→CMI, One Lung→CMI, Tagrisso→CMI, Verzenio→CMI)
- [ ] Seed Courtney's brands with agencies (Adbry→Silverlight, Aquaphor→?, etc.)
- [ ] Seed Morgan's brands with agencies (Breyanzi→CMI, Cabometyx→CMI, Calquence→CMI)
- [ ] Seed Dana's brands with agencies (Imfinzi GI→CMI)
- [ ] Import active pharma companies and brands
- [ ] Import historical clients list
- [ ] Validate all data relationships and uniqueness

**Step 5.4: Integration with Reports**
- [ ] Update ReportsManager.jsx to fetch from brand_editor_agency table
- [ ] Remove hardcoded brand-agency mapping arrays
- [ ] Implement dynamic agency lookup by brand
- [ ] Add validation in report generation using database data
- [ ] Display editor assignments in reports interface if needed

### Phase 6: User Engagement Query System (#2)

**Step 6.1: Backend - Query API**
- [ ] Create POST /api/users/engagement-query endpoint
- [ ] Implement query builder for user_profiles table
- [ ] Support filters: specialty, engagement level, campaign list
- [ ] Implement aggregation for open rates and click rates
- [ ] Optimize query performance with indexes
- [ ] Add pagination for large result sets
- [ ] Create CSV export functionality for results
- [ ] Add caching layer for common queries (optional)

**Step 6.2: Frontend - Query Interface**
- [ ] Create UserEngagementQuery.jsx component
- [ ] Design form with filter inputs (specialty, engagement level, count)
- [ ] Add campaign multi-select dropdown
- [ ] Implement search/filter for campaigns
- [ ] Add "Search" button to trigger query
- [ ] Display results in paginated table
- [ ] Show columns: Email, NPI, Specialty, Unique Opens, Total Opens, Unique Clicks, Total Clicks, Sends
- [ ] Add "Download CSV" button
- [ ] Implement loading states and error handling
- [ ] Add result count and query time display

**Step 6.3: Testing & Optimization**
- [ ] Test queries on full user_profiles dataset
- [ ] Benchmark response times for various query types
- [ ] Optimize slow queries with additional indexes
- [ ] Test CSV export with large result sets
- [ ] Implement query timeout handling
- [ ] Add user feedback for long-running queries

### Phase 7: List Efficiency Analysis (#5)

**Step 7.1: Backend - Analysis API**
- [ ] Create POST /api/list-analysis/upload endpoint (accept IQVIA list + target lists)
- [ ] Parse uploaded CSV/Excel files
- [ ] Extract NPI/email identifiers from all lists
- [ ] Create POST /api/list-analysis/calculate-crossover endpoint
- [ ] Implement set intersection logic for crossover calculation
- [ ] Calculate distribution (users on N/M lists)
- [ ] Create POST /api/list-analysis/engagement-comparison endpoint
- [ ] Query user_profiles for engagement data by target list
- [ ] Compare engaged users on target lists vs. non-target lists
- [ ] Generate statistical summary

**Step 7.2: Frontend - Analysis Component**
- [ ] Create ListEfficiencyAnalysis.jsx component
- [ ] Add file dropbox for full IQVIA list
- [ ] Add multi-file dropbox for target lists (up to 15-20 files)
- [ ] Display uploaded file names and user counts
- [ ] Add "Calculate Crossover" button
- [ ] Display crossover distribution (chart and/or table)
- [ ] Add campaign assignment interface for each target list
- [ ] Implement multi-select campaign search (limit 20 per list)
- [ ] Add "Analyze Engagement" button
- [ ] Display engagement comparison results
- [ ] Show target list engagement vs. overall campaign engagement
- [ ] Add data visualization (charts for comparison)
- [ ] Implement CSV export for analysis results

**Step 7.3: Data Processing**
- [ ] Implement efficient set operations for large user lists
- [ ] Handle duplicate NPIs across lists
- [ ] Map NPIs to user_profiles records
- [ ] Aggregate engagement metrics by list
- [ ] Calculate statistical significance (optional)
- [ ] Generate executive summary report

**Step 7.4: Testing**
- [ ] Test with realistic file sizes (10k-50k users)
- [ ] Validate crossover calculations
- [ ] Verify engagement aggregation accuracy
- [ ] Test edge cases (empty lists, no matches)
- [ ] Optimize performance for large datasets

### Phase 8: Audience Query Builder Update (#7)

**Step 8.1: Backend - Enhanced Query API**
- [ ] Update POST /api/audience/query endpoint for two modes
- [ ] Implement "Discovery Mode": filters by specialty + engagement + count
- [ ] Implement "Analysis Mode": accepts NPI list (up to 100 for display, unlimited for download)
- [ ] Add file upload handling for CSV/Excel with NPI column detection
- [ ] Parse NPI column (variants: "NPI", "npi", "NPI_ID", "npi_id")
- [ ] Query user_profiles for specified NPIs
- [ ] Return: Email, First Name, Last Name, NPI, Specialty, Unique Open Rate, Total Open Rate, Unique Click Rate, Total Click Rate, Sends Count, Opens Count, Clicks Count
- [ ] Generate downloadable CSV/Excel file

**Step 8.2: Frontend - Redesigned Interface**
- [ ] Redesign AudienceQueryBuilder.jsx with two distinct sections
- [ ] Section 1: "Discovery" - Find users by criteria
  - [ ] Input: Target specialty dropdown
  - [ ] Input: Engagement level (highly engaged, moderately engaged, not engaged)
  - [ ] Input: Number of users to return
  - [ ] Button: "Find Users"
- [ ] Section 2: "Analysis" - Analyze specific audience
  - [ ] File dropbox for CSV/Excel (require NPI column)
  - [ ] Text area for copy/paste NPIs (limit 100, validate input)
  - [ ] Radio button: Display results or Download file
  - [ ] Button: "Analyze Audience"
- [ ] Display tabular results for copy/paste mode (max 100 rows)
- [ ] Trigger download for file upload mode or copy/paste >100
- [ ] Add clear separation between two modes (visual divider, headings)
- [ ] Implement validation and error messages

**Step 8.3: Testing & Refinement**
- [ ] Test Discovery mode with various criteria
- [ ] Test Analysis mode with file upload
- [ ] Test Analysis mode with copy/paste (edge cases: 1, 99, 100, 101 NPIs)
- [ ] Validate NPI column detection across different file formats
- [ ] Test download functionality for large result sets
- [ ] Verify all engagement metrics calculations

### Phase 9: Design & UX Overhaul (#8)

**Step 9.1: Global Styles & Theming**
- [ ] Create App.css with global theme variables
- [ ] Define color palette (primary: darker table header blue, secondary, accent)
- [ ] Remove or standardize pink header usage
- [ ] Import and configure font families (Lora for headings, Rubik for body)
- [ ] Define spacing scale (margin, padding utilities)
- [ ] Create responsive breakpoints (mobile, tablet, desktop)
- [ ] Define global transitions and animations (no AI hover effects)
- [ ] Set up CSS custom properties for theming

**Step 9.2: CSS Consolidation**
- [ ] Audit all existing CSS files in src/styles/
- [ ] Identify duplicate rules and patterns
- [ ] Extract common styles to shared classes
- [ ] Reorganize files by component hierarchy
- [ ] Remove unused styles
- [ ] Consolidate theme files (SpaceTheme, CyberpunkTheme, etc.)
- [ ] Update component imports to use consolidated styles
- [ ] Test all components for visual regressions

**Step 9.3: Component Redesign**
- [ ] Dashboard.jsx: Evaluate overall layout (consider side nav)
- [ ] Remove cookie-cutter section headers if appropriate
- [ ] Standardize component containers and spacing
- [ ] Update button styles (consistent sizing, colors, hover states)
- [ ] Redesign modal overlays for consistency
- [ ] Update table styles across all components
- [ ] Add Matrix logo to header/navigation
- [ ] Ensure DashboardCanvas remains unchanged (preserve current design)

**Step 9.4: Mobile Responsiveness**
- [ ] Implement mobile-first CSS for Dashboard.jsx
- [ ] Make MetricsTable.jsx responsive (horizontal scroll or stacked layout)
- [ ] Optimize CampaignModal.jsx for mobile
- [ ] Make DashboardCanvas responsive (proportional scaling)
- [ ] Test all forms and inputs on mobile devices
- [ ] Ensure dropdowns and selects are touch-friendly
- [ ] Test navigation on mobile (consider hamburger menu)
- [ ] Validate all components on various screen sizes (320px to 4K)

**Step 9.5: New Dashboard Section with Charts**
- [ ] Create DashboardCharts.jsx component
- [ ] Implement time series chart: Open rates by month (Jan-Dec)
- [ ] Add multi-year comparison (different colored lines per year)
- [ ] Add specialty filter dropdown
- [ ] Implement responsive chart sizing (use recharts or chart.js)
- [ ] Create additional purposeful charts (TBD based on data insights)
- [ ] Design expandable section for future analytics
- [ ] Add navigation link or section in main Dashboard
- [ ] Style charts to match application theme

**Step 9.6: Design Testing & Iteration**
- [ ] Conduct visual QA across all components
- [ ] Test theme switching (dark, light, space)
- [ ] Validate color contrast for accessibility
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on multiple devices (phones, tablets, desktops)
- [ ] Gather user feedback on new design
- [ ] Iterate based on feedback

### Phase 10: Report Generation Refactor

**Step 10.1: Backend - Report Data Integration**
- [ ] Read report_resource_manager.py in P2025/report/
- [ ] Map current logic to new data sources
- [ ] Update to query campaign_metadata table for editor-uploaded data
- [ ] Update to query cmi_contract_values table for metadata
- [ ] Implement validation logic against CMI sFTP data
- [ ] Set editor data as primary source of truth
- [ ] Flag discrepancies for manual review (not automatic overwrite)
- [ ] Identify "no data reports" (AGG+PLD missing from our records)

**Step 10.2: API Endpoints for Reports**
- [ ] Create GET /api/reports/current endpoint (current week reports)
- [ ] Create GET /api/reports/future endpoint (future reports)
- [ ] Create GET /api/reports/archive endpoint (past reports)
- [ ] Create GET /api/reports/:id/metadata endpoint
- [ ] Create POST /api/reports/validate endpoint (validate against CMI)
- [ ] Implement report status tracking (pending, submitted, validated)

**Step 10.3: Frontend - ReportsManager Update**
- [ ] Update ReportsManager.jsx to fetch from API instead of Azure Blob
- [ ] Add loading states during API calls
- [ ] Display CMI validation status per report
- [ ] Add visual indicators for discrepancies
- [ ] Implement manual review workflow for flagged reports
- [ ] Update report generation to use new metadata flow
- [ ] Test end-to-end report workflow

**Step 10.4: Python Script Updates**
- [ ] Update report_resource_manager.py to connect to PostgreSQL (psycopg2 or SQLAlchemy)
- [ ] Remove local file parsing for campaign metadata matching
- [ ] Add database query functions for campaign_metadata table
- [ ] Add database query functions for cmi_contract_values table (ULTIMATE source of truth)
- [ ] Update CMI sFTP integration (keep existing download logic)
- [ ] Implement new validation hierarchy: CMI Contract Values > Editor Data > CMI sFTP
- [ ] Flag discrepancies instead of auto-correcting
- [ ] Test script with database connection
- [ ] Validate report generation outputs match expected format
- [ ] Deploy script to Render scheduled job OR keep local execution (TBD)

### Phase 11: Testing & Quality Assurance

**Step 11.1: Unit Testing**
- [ ] Write backend API unit tests (Jest or Pytest)
- [ ] Test database models and relationships
- [ ] Test API endpoints with various inputs
- [ ] Write frontend component unit tests (React Testing Library)
- [ ] Test utility functions and helpers
- [ ] Achieve >80% code coverage

**Step 11.2: Integration Testing**
- [ ] Test end-to-end workflows for each new feature
- [ ] Test dashboard save and restore flow
- [ ] Test campaign metadata upload and retrieval
- [ ] Test user engagement query with various filters
- [ ] Test list efficiency analysis with sample data
- [ ] Test report generation with new data sources
- [ ] Validate data consistency across components

**Step 11.3: Performance Testing**
- [ ] Load test API endpoints (use k6 or Apache JMeter)
- [ ] Test database query performance under load
- [ ] Benchmark user_profiles queries
- [ ] Test file upload handling with large files
- [ ] Profile frontend rendering performance
- [ ] Optimize slow components and queries

**Step 11.4: User Acceptance Testing**
- [ ] Create test scenarios for each feature
- [ ] Conduct UAT with internal team
- [ ] Gather feedback on usability
- [ ] Document bugs and issues
- [ ] Prioritize and fix critical issues
- [ ] Conduct second round of UAT

**Step 11.5: Security & Compliance**
- [ ] Audit API for authentication/authorization
- [ ] Validate input sanitization (prevent SQL injection, XSS)
- [ ] Test file upload security (malicious files, size limits)
- [ ] Ensure HTTPS in production
- [ ] Review CORS configuration
- [ ] Conduct security scan (OWASP tools)

### Phase 12: Deployment & Migration

**Step 12.1: Staging Environment**
- [ ] Set up staging environment on Render
- [ ] Deploy backend API to staging
- [ ] Deploy frontend to staging
- [ ] Connect staging to test database
- [ ] Migrate sample data to staging database
- [ ] Test all features in staging environment

**Step 12.2: Production Deployment**
- [ ] Prepare production database (backups, scaling)
- [ ] Deploy backend API to production
- [ ] Update frontend to point to production API
- [ ] Deploy frontend to Render (or keep GitHub Pages as CDN for static assets)
- [ ] Configure custom domain if needed
- [ ] Set up SSL certificates
- [ ] Configure environment variables for production

**Step 12.3: Data Migration to Production**
- [ ] Run ETL script to migrate user_profiles.json to production database
- [ ] Migrate campaign metadata
- [ ] Migrate CMI contract values
- [ ] Migrate brand/agency/editor data
- [ ] Validate data integrity in production
- [ ] Set up automated backups

**Step 12.4: Cutover**
- [ ] Update GitHub Pages deployment to point to Render
- [ ] Monitor application performance post-launch
- [ ] Monitor error logs and fix critical issues
- [ ] Notify users of new features
- [ ] Provide training or documentation as needed

**Step 12.5: Post-Launch Monitoring**
- [ ] Set up application monitoring (Sentry, LogRocket, etc.)
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Monitor database performance
- [ ] Track API response times
- [ ] Collect user feedback
- [ ] Plan for iterative improvements

---

## Section 3: External Dependencies & Backend Scripts

### Python Scripts Requiring Updates

**P2025/report/report_resource_manager.py**
- **Current Function:** Matches CMI sFTP data to campaign names, generates reports
- **Changes Needed:**
  - Add PostgreSQL connection (psycopg2 or SQLAlchemy)
  - Query campaign_metadata table for editor-uploaded metadata
  - Query cmi_contract_values table (ULTIMATE SOURCE OF TRUTH) for placement IDs and all metadata
  - Implement validation hierarchy: CMI Contract Values > Editor Campaign Data > CMI sFTP
  - Use CMI Contract Values table for all metadata combinations (placement IDs, vehicles, descriptions)
  - Use editor campaign data for campaign-specific linking and file references
  - CMI sFTP validates against our data (not vice versa)
  - Flag discrepancies for manual review, do not auto-correct
  - Identify no-data reports (AGG+PLD campaigns missing from our records)
  - Update report generation logic to use database queries
- **Testing:** Test with sample campaigns and validate report accuracy

**P2025/audience_profile_builder.py**
- **Current Function:** Builds user engagement profiles by campaign
- **Changes Needed:**
  - Potentially integrate with database to write directly to user_profiles table
  - Update to handle incremental updates (not full rebuilds)
  - Ensure output format matches database schema
- **Testing:** Verify output matches current JSON structure, test with sample campaigns

**Other Scripts (No Changes Needed Immediately):**
- `completed_campaign_metadata.py` - Continue writing to Azure Blob
- `data_enrichment_script.py` - Continue writing to Azure Blob
- Campaign compiler scripts - Continue current workflow
- Live/completed metrics scripts - Continue current workflow
- Specialty analytics scripts - Continue current workflow
- Dashboard metrics scripts - Continue current workflow
- YouTube pipeline - Continue current workflow

### Database Schema Reference

**user_profiles**
```sql
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  npi VARCHAR(10) UNIQUE NOT NULL,
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  specialty VARCHAR(100),
  campaign_id INTEGER,
  campaign_name VARCHAR(255),
  send_date DATE,
  sent BOOLEAN,
  opened BOOLEAN,
  open_timestamp TIMESTAMP,
  clicked BOOLEAN,
  click_timestamp TIMESTAMP,
  unique_opens INTEGER,
  total_opens INTEGER,
  unique_clicks INTEGER,
  total_clicks INTEGER,
  INDEX idx_npi (npi),
  INDEX idx_email (email),
  INDEX idx_specialty (specialty),
  INDEX idx_campaign_name (campaign_name)
);
```

**dashboard_saves**
```sql
CREATE TABLE dashboard_saves (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  state_json TEXT NOT NULL,
  theme VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);
```

**campaign_metadata**
```sql
CREATE TABLE campaign_metadata (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(100) UNIQUE NOT NULL,
  campaign_name VARCHAR(255) NOT NULL,
  target_list_path VARCHAR(500),
  tags_path VARCHAR(500),
  ad_images_path VARCHAR(500),
  extracted_metadata JSON,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by VARCHAR(100),
  INDEX idx_campaign_name (campaign_name)
);
```

**cmi_contract_values**
```sql
CREATE TABLE cmi_contract_values (
  id SERIAL PRIMARY KEY,
  contract_number VARCHAR(50),
  client VARCHAR(255),
  brand VARCHAR(255),
  vehicle VARCHAR(255),
  placement_id VARCHAR(100) UNIQUE,
  placement_description TEXT,
  buy_component_type VARCHAR(100),
  data_type VARCHAR(50),
  notes TEXT,
  INDEX idx_placement_id (placement_id),
  INDEX idx_brand (brand)
);
```

**brand_editor_agency (MERGED TABLE)**
```sql
CREATE TABLE brand_editor_agency (
  id SERIAL PRIMARY KEY,
  editor_name VARCHAR(100) NOT NULL,
  brand VARCHAR(255) NOT NULL,
  agency VARCHAR(255),
  pharma_company VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(editor_name, brand),
  INDEX idx_editor_name (editor_name),
  INDEX idx_brand (brand),
  INDEX idx_agency (agency)
);
```

**Note:** This merged table combines editor assignments with brand-agency mapping. Each row represents a brand assigned to an editor with its associated agency and pharma company. Frontend will group by editor_name to display sections (Emily's brands, Courtney's brands, etc.).

### API Endpoint Reference

**Dashboard Saves**
- POST /api/dashboards/save
- GET /api/dashboards/list
- GET /api/dashboards/:id
- DELETE /api/dashboards/:id

**Campaign Metadata**
- POST /api/campaigns/:campaignId/metadata
- GET /api/campaigns/:campaignId/metadata

**CMI Contract Values**
- GET /api/cmi-contracts
- POST /api/cmi-contracts
- PUT /api/cmi-contracts/:id
- DELETE /api/cmi-contracts/:id
- GET /api/cmi-contracts/export

**Brand Management (Unified)**
- GET /api/brand-management (fetch all brand_editor_agency entries)
- GET /api/brand-management?editor=<name> (filter by editor)
- POST /api/brand-management/entry (create new brand entry)
- PUT /api/brand-management/:id (update existing entry)
- DELETE /api/brand-management/:id (delete entry)
- POST /api/brand-management/bulk-import (Excel import)

**User Queries**
- POST /api/users/engagement-query
- POST /api/audience/query

**List Analysis**
- POST /api/list-analysis/upload
- POST /api/list-analysis/calculate-crossover
- POST /api/list-analysis/engagement-comparison

**Reports**
- GET /api/reports/current
- GET /api/reports/future
- GET /api/reports/archive
- GET /api/reports/:id/metadata
- POST /api/reports/validate

### Migration Checklist

**Data to Migrate:**
- [ ] user_profiles.json (2.45 GiB) → user_profiles table
- [ ] Brand-agency mapping + editor assignments → brand_editor_agency table (merged)
- [ ] CMI contract values (from provided spreadsheet) → cmi_contract_values table

**Infrastructure:**
- [ ] Render account setup
- [ ] PostgreSQL database provisioned
- [ ] Environment variables configured
- [ ] Domain configured (if custom)
- [ ] SSL certificates installed
- [ ] Backup strategy implemented

**Deployment:**
- [ ] Backend deployed to Render
- [ ] Frontend deployed (Render or GitHub Pages with API calls)
- [ ] Database migrations run
- [ ] Environment-specific configs validated

**Monitoring:**
- [ ] Error tracking configured
- [ ] Uptime monitoring configured
- [ ] Performance monitoring configured
- [ ] Log aggregation configured

---

## Notes & Considerations

1. **Migration Strategy - FOR NOW:** Only migrate data needed for new dynamic features. ALL Azure Blob JSON files remain in place. P2025 pipeline scripts continue unchanged. Frontend fetches from Azure for existing data, API for new features.

2. **Backward Compatibility:** Existing Azure Blob JSON files remain primary data source for display components. Frontend gracefully handles API unavailability. No disruption to current working pipeline.

3. **Performance:** 2.45 GiB user_profiles migration requires careful indexing strategy. Monitor query performance and optimize as needed. Schema designed for scalability if future migrations needed.

4. **File Storage:** Campaign metadata files (Excel, images) need storage solution. Options: Render disk (limited), AWS S3, Azure Blob Storage (reuse existing infrastructure).

5. **Authentication:** Current app uses localStorage session. Evaluate if user authentication needed for API (API keys, JWT, session tokens) based on security requirements.

6. **Deployment Strategy:** Blue-green deployment recommended to minimize downtime during cutover. Test all features in staging before production.

7. **Testing Data:** Create realistic test datasets for each feature to enable thorough testing without production data dependencies.

8. **Code Style Enforcement:** Follow rules: no comments, no AI hover effects (transform, scale, etc.), no emojis/icons (except from packages/public folder), no border-left only patterns, DRY/KISS/SRP principles strictly enforced.

9. **Future Scalability:** Schema designed with extensibility in mind. Additional Azure data can migrate to SQL as features require. Database supports future additions: user permissions, audit logs, report scheduling, additional analytics.

10. **CMI Contract Values:** ULTIMATE source of truth for ALL metadata combinations. This table supersedes all other sources. Report generation must reference this first.

11. **Data Hierarchy:** CMI Contract Values > Editor Campaign Data > CMI sFTP validation. This hierarchy must be maintained in all report generation logic.

---

## Status Tracking

**Phase 1:** Not Started
**Phase 2:** Not Started
**Phase 3:** Not Started
**Phase 4:** Not Started
**Phase 5:** Not Started
**Phase 6:** Not Started
**Phase 7:** Not Started
**Phase 8:** Not Started
**Phase 9:** Not Started
**Phase 10:** Not Started
**Phase 11:** Not Started
**Phase 12:** Not Started

**Overall Progress:** 0% Complete

---

*This roadmap will be updated as each step is completed. Mark completed steps with [x] and update phase status accordingly.*
