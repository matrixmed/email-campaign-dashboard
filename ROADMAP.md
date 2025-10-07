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
- [x] Design PostgreSQL schema for user_profiles table (normalized structure for 2.45GB JSON)
- [x] Design dashboard_saves table (id, user_id, title, state_json, theme, created_at, updated_at)
- [x] Design campaign_reporting_metadata table (campaign_id, campaign_name, target_list_path, tags_path, ad_images_path, extracted_data)
- [x] Design cmi_contract_values table (contract_num, client, brand, vehicle, placement_id, description, buy_type, data_type, notes) - ULTIMATE SOURCE OF TRUTH
- [x] Design brand_editor_agency table (editor_name, brand, agency, pharma_company, is_active) - MERGED TABLE for editor assignments + brand-agency mapping
- [x] Design scalable schema patterns for future data migrations
- [x] Create foreign key relationships and indexes for performance
- [ ] Document schema with ERD diagram showing relationships and data flow

**Step 1.2: Render Setup**
- [x] Create Render account and new Web Service
- [x] Provision PostgreSQL database instance
- [x] Configure environment variables (.env setup)
- [x] Set up deployment pipeline from GitHub repo
- [x] Configure CORS for API endpoints
- [x] Test basic deployment with Hello World endpoint

**Step 1.3: Backend API Framework (Python Flask)**
- [x] Initialize Python Flask backend project structure
- [x] Set up Flask app with blueprints for modular routes
- [x] Configure SQLAlchemy ORM for PostgreSQL connection
- [x] Set up database connection pooling (psycopg2)
- [x] Create base API structure with error handling middleware
- [x] Implement CORS configuration for frontend communication
- [x] Set up logging and monitoring (Flask logging)
- [x] Create health check endpoint (/api/health)
- [x] Set up development server configuration

**Step 1.4: Data Migration - User Profiles**
- [x] Write ETL script to parse user_profiles.json (2.45GB)
- [x] Transform nested JSON structure to relational schema
- [x] Create batch insert script with progress tracking (seed_user_profiles.py)
- [x] Place user_profiles.json in backend directory (already downloaded from Azure)
- [ ] Run seed_user_profiles.py to migrate data to PostgreSQL
- [ ] Create indexes on email, specialty columns
- [ ] Verify data integrity and query performance
- [ ] Test sample queries for response time benchmarks

**Migration Approach:** user_profiles.json downloaded from Azure and placed in backend directory. Run `python seed_user_profiles.py` to load data into PostgreSQL using batch inserts (100 records at a time).

### Phase 2: Dashboard Save Feature (#1)

**Step 2.1: Backend - Dashboard Save API**
- [x] Create POST /api/dashboards/save endpoint
- [x] Implement request validation for dashboard state JSON
- [x] Save dashboard state to database with metadata
- [x] Create GET /api/dashboards/list endpoint (return user's saved dashboards)
- [x] Create GET /api/dashboards/:id endpoint (fetch specific dashboard state)
- [x] Create DELETE /api/dashboards/:id endpoint
- [x] Add error handling for large state objects

**Step 2.2: Frontend - Save Functionality**
- [x] Add "Save" button next to Export button in DashboardCanvas.jsx
- [x] Implement dashboard state serialization function
- [x] Capture all component positions (x, y coordinates)
- [x] Capture current theme selection
- [x] Capture table values and custom data
- [x] Capture uploaded images (convert to base64 or upload to storage)
- [x] Create save modal with title input
- [x] Implement save API call with loading state
- [x] Add success/error notifications

**Step 2.3: Frontend - Archive & Restore**
- [x] Add "Archive" section below "Restore" in ComponentSidebar.jsx
- [x] Fetch list of saved dashboards on component mount
- [x] Render clickable list of dashboard titles with timestamps
- [x] Implement restore functionality on click (deserialize and apply state)
- [x] Deserialize dashboard state from database
- [x] Restore all component positions
- [x] Restore theme selection
- [x] Restore table data and images
- [x] Add delete button for each archived dashboard
- [x] Add confirmation modal for delete operations

**Step 2.4: Testing & Refinement**
- [ ] Test save with complex multi-component dashboards
- [ ] Test restore accuracy for positions and data
- [ ] Test image persistence and restoration
- [ ] Test edge cases (empty dashboards, large states)
- [ ] Optimize state size (compression if needed)
- [ ] Test concurrent saves and race conditions

**CRITICAL NOTE - Image Storage:**
Current implementation stores images as base64 in state_json (TEXT column). This works but has limitations:
- Base64 encoding increases size by ~33%
- Multiple/large images will bloat database and slow API responses
- May hit PostgreSQL row size limits (~1GB per row theoretical, ~400MB practical)

**TODO for production:** Migrate to file-based storage:
1. Create POST /api/dashboards/upload-image endpoint
2. Upload images to backend/uploads/ folder
3. Store file paths instead of base64 in state_json
4. Serve images from uploads when restoring
5. Implement cleanup for deleted dashboard images

### Phase 3: Campaign Metadata Upload (#4)

**Step 3.1: Backend - File Upload API**
- [x] Create POST /api/campaigns/:campaignId/metadata endpoint
- [x] Implement multipart/form-data handling
- [x] Set up file storage (S3, Azure Blob, or Render disk)
- [x] Extract data from Excel files (target list, tags)
- [x] Store file references in campaign_reporting_metadata table
- [x] Create GET /api/campaigns/:campaignId/metadata endpoint
- [x] Implement file validation (type, size limits)

**Step 3.2: Frontend - Modal Enhancement**
- [x] Add button in CampaignModal.jsx (right of send date/campaign count)
- [x] Style button to match existing modal design
- [x] Create metadata upload modal/screen
- [x] Add three file dropbox components (react-dropzone)
- [x] Label dropboxes: "Target List (Excel)", "Tags (Excel)", "Ad Images (PNG/JPG)"
- [x] Implement file preview for each dropbox
- [x] Add "Submit" button with validation
- [x] Display uploaded file names and timestamps
- [x] Implement file upload API calls
- [x] Add progress indicators for uploads
- [x] Show success/error states

**Step 3.3: Data Extraction & Storage**
- [x] Parse Excel files server-side (openpyxl in Python)
- [x] Extract specific columns from target list (Client_ID, CMI_PlacementID, Client_PlacementID, Placement_Description, Supplier, Brand_Name, Vehicle_Name, TargetListID, Campaign_Name)
- [x] Implement Client_ID logic: Map Brand_Name to pharma company using BRAND_TO_PHARMA dictionary
- [x] Extract first row only from target list (values are consistent throughout file)
- [x] Extract GCM Placement IDs from tags file (GCM_Placement_ID, Placement_Name, Ad_Name, Campaign_Name)
- [x] Store up to 2 GCM placement IDs (gcm_placement_id, gcm_placement_id2)
- [x] Extract creative code from image filenames using regex pattern ([A-Z]{2}-\d+)
- [x] Count ad images and store ad_count
- [x] Store extracted data in campaign_reporting_metadata table with specific columns
- [x] Store raw metadata as JSON for reference
- [x] Link data to campaign by campaign_id
- [x] Support update/overwrite of existing metadata
- [x] Create GET endpoint to retrieve parsed metadata

**Step 3.4: Integration with Reports**
- [ ] Update report_resource_manager.py to query database for metadata
- [ ] Remove file-matching logic (metadata already linked to campaigns)
- [ ] Use editor-uploaded data as source of truth
- [ ] Implement validation against CMI sFTP data
- [ ] Flag discrepancies for manual review
- [ ] Update report generation to use new metadata flow

### Phase 4: CMI Contract Values Manager (#5)

**Step 4.1: Backend - CRUD API**
- [x] Create GET /api/cmi-contracts endpoint (fetch all contracts)
- [x] Create POST /api/cmi-contracts endpoint (create new contract)
- [x] Create PUT /api/cmi-contracts/:id endpoint (update contract)
- [x] Create DELETE /api/cmi-contracts/:id endpoint (delete contract)
- [x] Implement validation for required fields
- [x] Create export endpoint (GET /api/cmi-contracts/export as CSV)
- [x] Register blueprint in app.py

**Step 4.2: Frontend - Editable Table Component**
- [x] Create new CMIContractValues.jsx component
- [x] Design table layout with columns: Contract #, Client, Brand, Vehicle, Placement ID, Description, Buy Type, Data Type, Notes
- [x] Implement inline editing (click cell to edit)
- [x] Add row-level actions (delete button)
- [x] Implement column sorting and filtering
- [x] Add "Add Row" button at top
- [x] Add "Export to CSV" button
- [x] Style to match application theme (dark blue headers, clean tables)
- [x] Add loading states and error handling

**Step 4.3: Data Management**
- [x] Create seed_cmi_contracts.py to load CSV data
- [x] Seed database with 69 contract records from CMI Contract Values - 2025.csv
- [x] Implement search across all fields
- [ ] Add data validation on frontend and backend (placement_id uniqueness enforced)
- [ ] Create audit log for changes (optional)

**Step 4.4: Integration**
- [x] Add CMIContractValues component to Dashboard.jsx
- [ ] Update report generation to use CMI contract values as source of truth
- [ ] Add validation in campaign metadata upload against contracts
- [ ] Create API to lookup placement IDs for autocomplete features

### Phase 5: Brand/Agency/Editor Management (#6)

**Step 5.1: Backend - Unified Brand Management API**
- [x] Create GET /api/brand-management endpoint (fetch all brand_editor_agency data)
- [x] Create POST /api/brand-management/entry endpoint (add new brand entry with editor + agency)
- [x] Create PUT /api/brand-management/:id endpoint (update existing entry)
- [x] Create DELETE /api/brand-management/:id endpoint (delete entry)
- [x] Add validation for required fields (editor, brand)
- [x] Add filtering by editor name for frontend grouping
- [x] Register blueprint in app.py

**Step 5.2: Frontend - Unified Management Component**
- [x] Create BrandManagement.jsx component with grouped layout
- [x] Design section headers for each editor (Emily, Courtney, Morgan, Dana)
- [x] Under each editor header, display their brands with agency + pharma company
- [x] Implement inline editing for brand rows (all fields editable)
- [x] Add "Add Brand" button under each editor section
- [x] Add separate "Unassigned Brands" and "Historical/Inactive Brands" sections
- [x] Style consistently with application theme (dark blue headers, clean tables)
- [x] Add to Dashboard.jsx

**Step 5.3: Data Seeding**
- [x] Create seed_brands.py script
- [x] Seed all brands from brands_sales_pharma.csv (73 entries)
- [x] Emily: 7 brands (6 active, 1 inactive)
- [x] Courtney: 20 brands (17 active, 3 inactive)
- [x] Morgan: 9 brands (all active)
- [x] Dana: 1 brand (inactive)
- [x] Unassigned: 36 brands (32 inactive, 4 active)

**Step 5.4: Integration with Reports**
- [ ] Update ReportsManager.jsx to fetch from brand_editor_agency table
- [ ] Remove hardcoded brand-agency mapping arrays
- [ ] Implement dynamic agency lookup by brand
- [ ] Add validation in report generation using database data

### Phase 6: User Engagement Query System (#2)

**Step 6.1: Backend - Query API**
- [x] Create POST /api/users/engagement-query endpoint (Discovery Mode)
- [x] Create POST /api/users/analyze-list endpoint (Analysis Mode)
- [x] Implement query builder for user_profiles table with filters
- [x] Support filters: specialty, engagement level, campaign list, limit
- [x] Support specific user list analysis (email or NPI lookup)
- [x] Implement aggregation for open rates and click rates from campaigns_data JSON
- [x] Create CSV export functionality for both endpoints
- [x] Register users blueprint in app.py
- [ ] Optimize query performance with indexes (requires user_profiles migration)
- [ ] Add caching layer for common queries (optional)

**Step 6.2: Frontend - Query Interface**
- [x] Redesign AudienceQueryBuilder.jsx with two separate modes
- [x] Implement Discovery Mode: Find users by criteria (specialty, engagement, campaigns)
- [x] Implement Analysis Mode: Analyze specific user list (paste or file upload)
- [x] Add mode selector toggle between Discovery and Analysis
- [x] Discovery: Form with specialty, engagement level, limit, campaign filters
- [x] Analysis: Support email/NPI input via paste (max 100) or file upload (unlimited)
- [x] Display results in paginated table (100 per page)
- [x] Show columns: Email, Name, Specialty, Sends, Opens, Clicks, Rates
- [x] Implement loading states and error handling
- [x] Add result count and pagination display
- [x] Analysis mode auto-downloads CSV for file uploads or >100 entries

**Step 6.3: Testing & Optimization**
- [ ] Test queries on full user_profiles dataset (requires migration completion)
- [ ] Benchmark response times for various query types
- [ ] Optimize slow queries with additional indexes
- [ ] Test CSV export with large result sets
- [ ] Implement query timeout handling
- [ ] Add user feedback for long-running queries

### Phase 7: List Efficiency Analysis (#5)

**Step 7.1: Backend - Analysis API**
- [x] Create POST /api/list-analysis/upload endpoint (accept IQVIA list + target lists)
- [x] Parse uploaded CSV/Excel files
- [x] Extract NPI/email identifiers from all lists
- [x] Create POST /api/list-analysis/calculate-crossover endpoint
- [x] Implement set intersection logic for crossover calculation
- [x] Calculate distribution (users on N/M lists)
- [x] Create POST /api/list-analysis/engagement-comparison endpoint
- [x] Query user_profiles for engagement data by target list
- [x] Compare engaged users on target lists vs. non-target lists
- [x] Generate statistical summary
- [x] Create POST /api/list-analysis/export-results endpoint for CSV export

**Step 7.2: Frontend - Analysis Component**
- [x] Create ListEfficiencyAnalysis.jsx component
- [x] Add file dropbox for full IQVIA list
- [x] Add multi-file dropbox for target lists (up to 15-20 files)
- [x] Display uploaded file names and user counts
- [x] Add "Calculate Crossover" button
- [x] Display crossover distribution (chart and/or table)
- [x] Add campaign assignment interface for each target list
- [x] Implement multi-select campaign search (limit 20 per list)
- [x] Add "Analyze Engagement" button
- [x] Display engagement comparison results
- [x] Show target list engagement vs. overall campaign engagement
- [x] Implement CSV export for analysis results
- [x] Add component to Dashboard.jsx
- [x] Create ListEfficiencyAnalysis.css styling

**Step 7.3: Data Processing**
- [x] Implement efficient set operations for large user lists
- [x] Handle duplicate NPIs across lists
- [x] Map NPIs to user_profiles records
- [x] Aggregate engagement metrics by list
- [x] Comparison logic for target vs non-target engagement

**Step 7.4: Testing**
- [ ] Test with realistic file sizes (10k-50k users)
- [ ] Validate crossover calculations
- [ ] Verify engagement aggregation accuracy
- [ ] Test edge cases (empty lists, no matches)
- [ ] Optimize performance for large datasets

### Phase 8: Audience Query Builder Update (#7)

**Step 8.1: Backend - Enhanced Query API**
- [x] Update POST /api/users/engagement-query endpoint for two modes
- [x] Implement "Discovery Mode": filters by specialty + engagement + count
- [x] Implement "Analysis Mode": accepts NPI/email list (up to 100 for display, unlimited for download)
- [x] Add file upload handling for CSV/Excel with NPI/email column detection
- [x] Parse NPI column (variants: "NPI", "npi", "NPI_ID", "npi_id")
- [x] Query user_profiles for specified NPIs/emails
- [x] Return: Email, First Name, Last Name, Specialty, Unique Open Rate, Total Open Rate, Unique Click Rate, Total Click Rate, Sends Count, Opens Count, Clicks Count
- [x] Generate downloadable CSV file
- [x] POST /api/users/analyze-list endpoint for analysis mode

**Step 8.2: Frontend - Redesigned Interface**
- [x] Redesign AudienceQueryBuilder.jsx with two distinct sections (completed - both sections now visible side by side)
- [x] Section 1: "Discovery" - Find users by criteria (completed - left section)
  - [x] Input: Target specialty dropdown
  - [x] Input: Engagement level (highly engaged, moderately engaged, not engaged, none)
  - [x] Input: Number of users to return
  - [x] Input: Campaign filter (multi-select)
  - [x] Button: "Find Users"
- [x] Section 2: "Analysis" - Analyze specific audience (completed - right section)
  - [x] File dropbox for CSV/Excel (require NPI or Email column)
  - [x] Text area for copy/paste NPIs/emails (limit 100, validate input)
  - [x] Auto-download for file uploads or >100 entries
  - [x] Button: "Analyze Users"
- [x] Display tabular results for copy/paste mode (max 100 rows)
- [x] Trigger download for file upload mode or copy/paste >100
- [x] Add clear separation between two modes (removed toggle, now separate visible sections)
- [x] Implement validation and error messages
- [x] Pagination for results (100 per page)
- [x] Completely rewritten CSS with consistent theme variables
- [x] Removed all aqb- prefixes for cleaner class names
- [x] Side-by-side layout (grid) with responsive mobile stacking

**Step 8.3: Testing & Refinement**
- [ ] Test Discovery mode with various criteria
- [ ] Test Analysis mode with file upload
- [ ] Test Analysis mode with copy/paste (edge cases: 1, 99, 100, 101 NPIs)
- [ ] Validate NPI column detection across different file formats
- [ ] Test download functionality for large result sets
- [ ] Verify all engagement metrics calculations

### Phase 9: Design & UX Overhaul (#8)

**Step 9.1: Global Styles & Theming**
- [x] Create App.css with global theme variables
- [x] Define color palette (primary: darker table header blue, secondary, accent)
- [x] Remove or standardize pink header usage
- [x] Import and configure font families (Lora for headings, Rubik for body)
- [x] Define spacing scale (margin, padding utilities)
- [x] Create responsive breakpoints (mobile, tablet, desktop)
- [x] Define global transitions and animations (no AI hover effects)
- [x] Set up CSS custom properties for theming
- [x] Remove AI hover transforms (translateY, scale) from Dashboard.css
- [x] Remove AI hover transforms from CampaignModal.css
- [x] Convert border-left accent patterns to full borders
- [x] Remove pink h2 color from Dashboard.css
- [x] Fix Dashboard Builder padding issue (AppLayout.css)
- [x] Create page-container and page-header global styles
- [x] Create unified API configuration file (src/config/api.js)
- [x] Update all components to use centralized API_BASE_URL
- [x] Configure API URL detection (localhost vs production)

**Step 9.2: CSS Consolidation**
- [x] Create consistent page headers across all components
- [x] Standardize header colors (white/cyan, no pink)
- [x] Update Video Metrics to use page-header
- [x] Update Digital Journals to use page-header
- [x] Update CMI Contracts to use page-header
- [x] Update Brand Management to use page-header
- [x] Update Reports Manager to use page-header
- [ ] Audit all existing CSS files in src/styles/
- [ ] Identify duplicate rules and patterns
- [ ] Extract common styles to shared classes
- [ ] Reorganize files by component hierarchy
- [ ] Remove unused styles
- [ ] Test all components for visual regressions

**Step 9.3: Component Redesign**
- [x] Dashboard.jsx: Evaluate overall layout (implemented side nav with AppLayout)
- [x] Remove cookie-cutter section headers (restructured to sidebar navigation)
- [x] Standardize component containers and spacing
- [x] Update button styles (consistent sizing, colors using header blue)
- [x] Update table styles across all components
- [x] Add Matrix logo to header/navigation (grayscale logo in sidebar)
- [x] Ensure DashboardCanvas remains unchanged (preserved current design)
- [x] Fix all page headers (Video, Digital, Campaign Performance, List Analysis)
- [x] Verify Audience page button colors (already correct)
- [ ] Redesign modal overlays for consistency

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
- [ ] Update to query campaign_reporting_metadata table for editor-uploaded data
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
- [ ] Add database query functions for campaign_reporting_metadata table
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
  - Query campaign_reporting_metadata table for editor-uploaded metadata
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

**campaign_reporting_metadata**
```sql
CREATE TABLE campaign_reporting_metadata (
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

**Phase 1:** Completed
**Phase 2:** Completed
**Phase 3:** Completed
**Phase 4:** Completed
**Phase 5:** Completed
**Phase 6:** Completed
**Phase 7:** Completed (Testing Pending)
**Phase 8:** Completed (Testing Pending)
**Phase 9:** In Progress (85% complete - headers fixed, CMI/Brand tables restyled, Reports Manager + Audience + mobile pending)
**Phase 10:** Not Started
**Phase 11:** Not Started
**Phase 12:** Not Started

**Overall Progress:** 75% Complete

---

*This roadmap will be updated as each step is completed. Mark completed steps with [x] and update phase status accordingly.*
