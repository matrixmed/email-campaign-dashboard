# Local Development Setup for Audience Query Builder

## Prerequisites
- Python 3.8+ installed
- Node.js and npm installed
- Git bash or Command Prompt

## Setup Instructions

### 1. Navigate to the audience folder
```bash
cd src/components/audience
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Start the Flask Backend
```bash
python audience_api_server.py
```
The server will start on `http://localhost:5000`

### 4. Start the React Frontend (in a new terminal, from project root)
```bash
npm start
```
The frontend will be available on `http://localhost:3000`

### 5. Access the Audience Query Builder
- Open your browser to `http://localhost:3000`
- Navigate to the Audience section
- The new Query Builder interface will be loaded

## Available API Endpoints

- `GET /api/health` - Health check
- `GET /api/specialties` - Get available specialties
- `POST /api/audience/query` - Query audience data
- `GET /api/audience/user/<email>` - Get specific user details

## Usage

### Query Options
- **Target Specialty**: Filter by medical specialty
- **Engagement Level**:
  - All Users
  - Top Engaged Users
  - Users with No Engagement
  - Random Selection
- **Number of Users**: Limit results (optional)
- **Specific Emails**: Query specific email addresses
- **Download Option**: Download CSV or display on screen (≤10 users)

### File Downloads
Files are automatically downloaded when:
- Download CSV is checked, OR
- More than 10 users in results, OR
- More than 10 specific emails provided

### Display Mode
Results display on screen when:
- Download CSV is unchecked, AND
- ≤10 users in results, AND
- ≤10 specific emails provided

## Notes

- This is a **development-only** setup
- The Flask server processes your 2.3GB+ data lake locally
- Large queries may take time to process
- All Azure credentials are embedded (for dev only)
- Files are temporarily stored and auto-deleted after download