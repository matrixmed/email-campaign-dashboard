# CMI Reporting System Setup Guide

## Overview
This guide will help you set up the new CMI reporting system with SQL-based submission tracking.

## Prerequisites
- Backend server dependencies installed (`pip install -r requirements.txt`)
- PostgreSQL database connection configured in `.env`
- Frontend dependencies installed (`npm install`)

## Step 1: Run Database Migration

The new system requires a `cmi_report_results` table in your database.

```bash
cd backend
python migrations/add_cmi_report_result_table.py
```

Expected output:
```
============================================================
CMI Report Result Table Migration
============================================================
Connecting to database...
Creating cmi_report_results table...
✓ Table created successfully!
✓ Table verification successful!
============================================================
Migration completed successfully!
```

## Step 2: Verify Backend Routes

Test that the API endpoints are working:

```bash
cd backend
python test_cmi_api.py
```

This will check:
- Server is running
- API routes are accessible
- Database connection is working

## Step 3: Start the Backend Server

If not already running:

```bash
cd backend
python app.py
```

The server should start on `http://localhost:5000`

## Step 4: Start the Frontend

```bash
npm start
```

The frontend should start on `http://localhost:3000`

## How the New System Works

### Backend Components

1. **CMI Spec Updater** (`P2025/report/cmi_spec_updater.py`)
   - Downloads CMI spec files from SFTP
   - Now has fallback logic to get most recent file if today's date doesn't exist
   - Stores in Azure blob storage

2. **Report Resource Manager** (`P2025/report/report_resource_manager.py`)
   - Completely rewritten with SQL-based approach
   - Gets campaigns from JSON files
   - Matches with `CampaignReportingMetadata` table (your uploaded contract data)
   - Matches with CMI spec files (what they expect from us)
   - Categorizes into 3 buckets:
     * `confirmed_match`: Ready to report (100% confident)
     * `no_data`: Due but no data (submit no-data report)
     * `aggregate_investigation`: Needs manual work
   - Saves results to `cmi_report_results` SQL table

3. **CMI Reports API** (`backend/routes/cmi_reports.py`)
   - GET `/api/cmi/reports/week/<week_start>`: Get reports for a week
   - PUT `/api/cmi/reports/<report_id>/submit`: Update submission status
   - PUT `/api/cmi/reports/week/<week_start>/submit`: Submit entire week
   - GET `/api/cmi/reports/category/<category>`: Get reports by category
   - GET `/api/cmi/reports/stats`: Get submission statistics

### Frontend Changes

The Reports Manager now:
- Persists checkbox states to SQL database (not localStorage)
- Loads submission statuses from database on page load
- Shows "Submitted" in Archive tab when `is_submitted = true`
- Updates work across all users and persist after refresh

## Running the Report Processing

To process campaigns and categorize them for reporting:

```bash
cd ../P2025/report
python report_resource_manager.py --database-url "your_database_url" --days-back 21
```

This will:
1. Load campaigns from JSON files
2. Match with SQL database contract data
3. Match with CMI spec files
4. Categorize all reports
5. Save results to `cmi_report_results` table

## Troubleshooting

### CORS Errors
- Make sure the backend server is running
- Check that CORS is enabled in `backend/app.py`
- The new `cmi_reports.py` routes have `@cross_origin()` decorators

### 404 Errors on API Calls
- Verify backend is running on port 5000
- Check that `cmi_reports_bp` is registered in `backend/app.py`
- Run `python test_cmi_api.py` to verify routes

### Database Connection Issues
- Check `.env` file has correct `DATABASE_URL`
- Verify database is accessible
- Run migration script again if table is missing

### Reports Not Showing Submission Status
- Check browser console for API errors
- Verify `cmi_report_results` table has data
- Check that campaign IDs match between systems

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     CMI Reporting Pipeline                   │
└─────────────────────────────────────────────────────────────┘

1. SFTP Files (CMI Spec)
   ↓
   cmi_spec_updater.py
   ↓
   Azure Blob (cmi_spec.json)

2. User Uploads Contract Data
   ↓
   Campaign Modal "Upload Metadata"
   ↓
   SQL DB (campaign_reporting_metadata table)

3. Process Reports
   ↓
   report_resource_manager.py
   ├─ Reads: JSON files (campaigns)
   ├─ Matches: SQL DB (contract data)
   ├─ Matches: Azure Blob (CMI spec)
   └─ Writes: SQL DB (cmi_report_results table)

4. Frontend Display
   ↓
   Reports Manager Component
   ├─ Reads: cmi_report_results (submission status)
   ├─ Displays: Categorized reports
   └─ Updates: Checkbox states → SQL DB
```

## Next Steps

1. **Run the migration** to create the table
2. **Upload campaign contract data** via the Campaign Modal
3. **Process reports** using `report_resource_manager.py`
4. **View results** in the Reports Manager frontend
5. **Check/uncheck boxes** to track submissions

All submission tracking now persists across users and sessions!
