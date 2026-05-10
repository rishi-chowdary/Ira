# College Registration System - Implementation Guide

## Overview

This is a comprehensive college registration system that manages institutional onboarding, admin approval workflows, and automatic data export to a hierarchical CSV file structure. The system implements numeric, space-separated ID generation and ensures data consistency across database and file systems.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│          CollegeRegistration.tsx Form Component             │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              API Layer (Node.js/Express)                     │
│  - colleges.js (registration, approval, validation)         │
│  - csvGenerator.js (file generation and updates)           │
└────────────────────────────┬────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  PostgreSQL  │  │ File System  │  │  Email Svc   │
    │  Database    │  │   (ira_data) │  │  (TODO)      │
    └──────────────┘  └──────────────┘  └──────────────┘
```

### Data Flow

1. **Registration**: College submits form via `/api/college/register`
   - Frontend validates form data
   - API validates duplicate institution names (fuzzy matching)
   - Data stored in `pending_colleges` table in JSONB format
   - Awaits admin review

2. **Admin Approval**: Admin reviews via AdminCollegesDashboard
   - Admin calls `/api/college/admin/approve`
   - API extracts location data (state, district, sector)
   - Generates hierarchical numeric codes
   - Creates/updates all database records
   - Generates College Program ID
   - Creates/updates CSV file hierarchy
   - Updates registration status to 'approved'

3. **CSV Generation**: Automatic upon approval
   - Creates directory structure: `ira_data/states/{state}/districts/{district}/...`
   - Generates CSV files at each level
   - CSV files append new records without duplication
   - File locking prevents concurrent corruption

## Database Schema

### Key Tables

**countries**
- Fixed: India (code: 91)
- Countries table can support multi-country expansion

**states**
- Code: 2-digit numeric (e.g., 23 for Maharashtra)
- Pre-populated with state codes mapping (see section: State Codes)
- Unique per country

**districts**
- Code: 3-digit numeric (sequential per state, e.g., 045 for Pune)
- Auto-generated on admin approval if not exists
- Unique per state

**sectors** (Area codes from Aadhaar)
- Code: 3-digit numeric (provided in registration, e.g., 012)
- Sector name optional
- Unique per district

**universities**
- Code: 3-digit numeric (sequential per district)
- Linked to specific district (hierarchical)
- Unique per district

**colleges**
- Code: 3-digit numeric (sequential per university)
- Linked to specific university
- Stores generated `program_id`

**courses** (Degree programs)
- Code: 2-digit numeric (sequential per college)
- Examples: BTech, MBA, BBA, B.Sc, PhD
- Duration in years
- Can be college-specific or university-level

**branches** (Specializations)
- Associated with specific course
- Examples: Computer Science, AI and ML, Finance, Marketing
- Leaf node in hierarchy

**students** (For later phase)
- Stores student registration details
- Associates student with specific branch
- Student code: hierarchical numeric format

**pending_colleges**
- Stores entire submitted data as JSONB
- Status: pending_ml, pending_admin, approved, rejected
- ML score for validation confidence
- Audit trail with timestamp

**college_programs**
- Stores generated program IDs for reference
- Links program ID to college
- Tracks program year range

**admin_audit_log**
- Comprehensive audit trail
- Records approvals, rejections, changes
- Tracks which admin made the decision

## ID Formats (Numeric, Space-Separated)

All IDs are numeric with leading zeros for visual alignment.

### College Program ID (64 bits = 9 x 8 bits)
```
91 23 045 012 001 101 01 2025 2029
│  │  │   │   │   │   │  │    │
└──┴──┴───┴───┴───┴───┴──┴────┴─── Country | State | District | Sector | University | College | Degree | StartYear | EndYear

Example: "91 23 045 012 001 101 01 2025 2029"
- 91: India (country code)
- 23: Maharashtra (state code)
- 045: Pune (district code)
- 012: Sector/Area code
- 001: SPPU (university code)
- 101: MIT (college code)
- 01: BTech (degree/course code)
- 2025: Program start year
- 2029: Program end year
```

**Given to students upon registration. Students use this when creating accounts on the platform.**

### Lending Account ID (40 bits = 5 x 8 bits)
```
91 23 045 012 12345
│  │  │   │   │
└──┴──┴───┴───┴────── Country | State | District | Sector | 5-digit Sequential

Example: "91 23 045 012 12345"
- First 4 components link to sector
- Last 5 digits: auto-incremented when lenders register
```

**For internal use. Generated when lenders register (Phase 2).**

### Borrowing Account ID (48 bits = 6 x 8 bits)
```
91 23 045 001 101 01 12345
│  │  │   │   │   │  │
└──┴──┴───┴───┴───┴──┴────── Country | State | District | Univ | College | Degree | 5-digit Sequential

Example: "91 23 045 001 101 01 12345"
- First 6 components link to degree/course
- Last 5 digits: auto-incremented when borrowers register
```

**Given to borrowers. Shows implied college affiliation. Generated when students register (Phase 2).**

## API Endpoints

### POST /api/college/register
Register a new college institution.

**Request Body:**
```json
{
  "university": {
    "name": "Savitribai Phule Pune University",
    "shortName": "SPPU"
  },
  "college": {
    "name": "MIT Pune",
    "shortName": "MIT"
  },
  "location": {
    "state": "Maharashtra",
    "stateCode": "23",      // optional; looked up if missing
    "district": "Pune",
    "districtCode": "045",  // optional; generated if missing
    "areaCode": "012",      // sector code (required)
    "pincode": "411001",
    "fullAddress": "123 Main St, Pune"
  },
  "courses": [
    {
      "name": "BTech",
      "duration": 4,
      "branches": ["Computer Science", "AI and ML", "Cyber Security"]
    },
    {
      "name": "MBA",
      "duration": 2,
      "branches": ["Finance", "Marketing"]
    }
  ],
  "contact": {
    "email": "registrar@mitpune.edu.in",
    "phone": "+91-20-25503600"
  }
}
```

**Response (201 Created):**
```json
{
  "status": "pending_admin_review",
  "registrationId": 12345,
  "message": "Registration submitted. Awaiting admin approval."
}
```

**Error Cases:**
- 400: Missing required fields
- 409: Duplicate institution (similar name exists)
- 500: Internal server error

**Validation Rules:**
- University and college names checked case-insensitively
- Spaces ignored in duplicate detection
- Fuzzy matching with Levenshtein distance > 0.85 threshold
- At least one course required
- Each course must have at least one branch

### POST /api/college/admin/approve
Approve a pending registration and generate IDs.

**Request Body:**
```json
{
  "registrationId": 12345
}
```

**Response (200 OK):**
```json
{
  "message": "College approved successfully",
  "collegeProgramId": "91 23 045 012 001 101 01 2025 2029",
  "collegeName": "MIT Pune",
  "universityName": "Savitribai Phule Pune University"
}
```

**Side Effects:**
- Creates/updates state, district, sector records as needed
- Creates university and college records
- Creates course and branch records
- Generates College Program ID
- Updates pending_colleges status to 'approved'
- Logs action in admin_audit_log
- Generates/updates CSV file hierarchy
- Sends confirmation email (TODO)

**Response (404 Not Found):**
- Registration ID doesn't exist

**Response (500 Server Error):**
- Database operation failed
- CSV generation failed (non-blocking warning)

### POST /api/college/admin/reject
Reject a pending registration.

**Request Body:**
```json
{
  "registrationId": 12345,
  "reason": "Institution name is ambiguous"
}
```

**Response (200 OK):**
```json
{
  "message": "Registration rejected"
}
```

**Side Effects:**
- Updates pending_colleges status to 'rejected'
- Logs action in admin_audit_log
- Sends rejection email with reason (TODO)

### GET /api/college/registrations
Fetch pending college registrations (admin only).

**Query Parameters:**
- `status` (optional): Filter by status. Default: 'pending_admin'
  - Values: pending_ml, pending_admin, approved, rejected

**Response (200 OK):**
```json
{
  "registrations": [
    {
      "id": 12345,
      "status": "pending_admin",
      "ml_score": 0.95,
      "created_at": "2025-03-31T10:30:00Z",
      "processed_at": null,
      "university": { ... },
      "college": { ... },
      "location": { ... },
      "courses": [ ... ],
      "contact": { ... }
    }
  ]
}
```

**Notes:**
- Response flattens submitted_data for easier frontend consumption
- TODO: Add authentication check (JWT or session token)

### GET /api/college/registrations/:id
Fetch a single registration by ID.

**Response (200 OK):**
Returns single registration object (same structure as list).

**Response (404 Not Found):**
Registration not found.

## CSV File System

### Directory Structure

```
ira_data/
├── states.csv                                    (all states)
├── states/
│   ├── Maharashtra/
│   │   ├── districts.csv
│   │   ├── districts/
│   │   │   ├── Pune/
│   │   │   │   ├── universities.csv
│   │   │   │   ├── universities/
│   │   │   │   │   ├── SPPU/
│   │   │   │   │   │   ├── colleges.csv
│   │   │   │   │   │   ├── colleges/
│   │   │   │   │   │   │   ├── MIT Pune/
│   │   │   │   │   │   │   │   ├── degrees.csv
│   │   │   │   │   │   │   │   ├── degrees/
│   │   │   │   │   │   │   │   │   ├── BTech/
│   │   │   │   │   │   │   │   │   │   ├── branches.csv
│   │   │   │   │   │   │   │   │   │   ├── branches/
│   │   │   │   │   │   │   │   │   │   │   ├── Computer Science/
│   │   │   │   │   │   │   │   │   │   │   │   └── students.csv
│   │   │   │   │   │   │   │   │   │   │   ├── AI and ML/
│   │   │   │   │   │   │   │   │   │   │   │   └── students.csv
│   │   │   │   │   │   │   │   │   ├── MBA/
│   │   │   │   │   │   │   │   │   │   ├── branches.csv
```

### CSV File Headers

- **states.csv**: `code,name`
- **districts.csv**: `code,name`
- **universities.csv**: `code,name,short_name`
- **colleges.csv**: `code,name,short_name,program_id`
- **degrees.csv**: `code,name,duration_years`
- **branches.csv**: `name`
- **students.csv**: `student_unique_code,name,email,registration_timestamp`

### Generation Behavior

1. **Directory Creation**: Recursive directory creation on demand
2. **File Creation**: Headers written first, then data rows appended
3. **Duplicate Prevention**: Checks existing rows before appending
4. **File Locking**: (Node.js async/await handles concurrency)
5. **Naming Convention**: Folders use full entity names (e.g., "MIT Pune", "Computer Science")

### Example CSV Content

**states.csv:**
```
code,name
23,Maharashtra
07,Delhi
```

**states/Maharashtra/districts.csv:**
```
code,name
045,Pune
047,Mumbai
```

**states/Maharashtra/districts/Pune/universities.csv:**
```
code,name,short_name
001,Savitribai Phule Pune University,SPPU
002,Symbiosis International University,SIU
```

**states/Maharashtra/districts/Pune/universities/SPPU/colleges.csv:**
```
code,name,short_name,program_id
101,MIT Pune,MIT,91 23 045 012 001 101 01 2025 2029
102,College of Engineering Pune,COEP,91 23 045 013 001 102 01 2025 2029
```

## State Codes Reference

| State Name | Code |
|-----------|------|
| Maharashtra | 23 |
| Delhi | 07 |
| Karnataka | 29 |
| Tamil Nadu | 33 |
| Telangana | 36 |
| Gujarat | 24 |
| Uttar Pradesh | 09 |
| West Bengal | 19 |
| Punjab | 01 |
| Rajasthan | 08 |
| Haryana | 06 |
| Madhya Pradesh | 18 |
| Odisha | 21 |
| Jharkhand | 20 |
| Chhattisgarh | 22 |
| Assam | 02 |
| Bihar | 10 |
| Himachal Pradesh | 02 |
| Uttarakhand | 05 |
| Goa | 30 |
| Puducherry | 34 |
| Chandigarh | 04 |

## Implementation Checklist

### Database Setup
- [ ] Create PostgreSQL database
- [ ] Run `database/schema.sql` to initialize tables
- [ ] Verify state_codes table is populated
- [ ] Create Supabase project and copy credentials
- [ ] Update `api/_supabase.js` with Supabase client config

### Backend Implementation
- [ ] Verify `api/colleges.js` is deployed
  - [ ] POST /api/college/register endpoint working
  - [ ] POST /api/college/admin/approve endpoint working
  - [ ] POST /api/college/admin/reject endpoint working
  - [ ] GET /api/college/registrations endpoint working
- [ ] Verify `api/csvGenerator.js` is deployed
  - [ ] Test CSV generation with sample approval
  - [ ] Verify directory structure created
  - [ ] Check file permissions

### Frontend Implementation
- [ ] Verify `src/pages/CollegeRegistration.tsx` is updated
  - [ ] Form collects degree name (not specialization)
  - [ ] Form collects duration and branches
  - [ ] Form validates course data
  - [ ] Form submits to `/api/college/register`
  - [ ] Success screen shows registration ID
- [ ] Verify `src/pages/AdminCollegesDashboard.tsx` is working
  - [ ] Fetches pending registrations
  - [ ] Displays approval interface
  - [ ] Approve/reject buttons functional

### Testing
- [ ] Register test college (no duplicate)
- [ ] Verify pending_colleges record created
- [ ] Admin approves registration
- [ ] Verify IDs generated correctly
  - College Program ID format: `91 23 045 012 001 101 01 2025 2029`
- [ ] Verify CSV files created
  - [ ] Directory structure correct
  - [ ] All CSV files have headers
  - [ ] All CSV files have correct columns
- [ ] Test duplicate detection
  - [ ] Similar name (case-insensitive) rejected
  - [ ] Spaces ignored in matching
  - [ ] Returns HTTP 409

### Deployment
- [ ] Update production database connection
- [ ] Deploy API changes
- [ ] Deploy frontend changes
- [ ] Run database migrations on production
- [ ] Verify all endpoints accessible
- [ ] Test E2E workflow in production

### Optional Enhancements
- [ ] Email service integration
  - [ ] Approval confirmation emails
  - [ ] Rejection notification emails
- [ ] Authentication/Authorization
  - [ ] JWT tokens for admin routes
  - [ ] Role-based access control
- [ ] WebSocket for real-time notifications
  - [ ] Admin dashboard live updates
  - [ ] College registration status updates
- [ ] ML-based validation enhancement
  - [ ] Document verification scoring
  - [ ] Email domain validation
  - [ ] Name consistency checks

## Testing Guide

### Manual Registration Test

1. **Navigate to registration form**
   ```
   http://localhost:5173/college/register
   ```

2. **Fill form with sample data**
   - University: "New Test University"
   - College: "Test Engineering College"
   - State: Maharashtra
   - District: Pune
   - Area Code: 012
   - Pincode: 411001
   - Degree Programs:
     - BTech (4 years): Computer Science, AI and ML
     - MBA (2 years): Finance, Marketing

3. **Contact details**
   - Email: test@testuniversity.edu.in
   - Phone: 020-1234567

4. **Submit and note registration ID**

### Admin Approval Test

1. **View pending registrations**
   ```
   http://localhost:5173/admin/colleges
   ```

2. **Login** (demo credentials: admin@ira.co.in / admin123)

3. **Click pending registration**

4. **Review submitted data**

5. **Click "Approve"**

6. **Verify success response with College Program ID**

### CSV Verification

1. **Check ira_data directory exists**
   ```bash
   ls -la ira_data/
   ```

2. **Verify directory structure**
   ```bash
   find ira_data -type f -name "*.csv" | head -20
   ```

3. **Check CSV content**
   ```bash
   cat ira_data/states.csv
   cat ira_data/states/Maharashtra/districts.csv
   ```

4. **Verify program ID in colleges.csv**
   ```bash
   cat ira_data/states/Maharashtra/districts/Pune/universities/SPPU/colleges.csv
   ```

### Duplicate Detection Test

1. **Register first college successfully**

2. **Try to register same or very similar name**
   - Use same name
   - Use slightly different spelling
   - Use different cases
   - Add/remove spaces

3. **Verify HTTP 409 response**
   ```json
   {
     "error": "Institution with similar name already exists...",
     "isDuplicate": true
   }
   ```

### Performance Testing

- Register 5 colleges sequentially
- Time each registration: < 1 second
- Time each approval: < 2 seconds (includes CSV generation)
- Verify no file corruption with concurrent approvals

## Troubleshooting

### "Registration not found" error
**Cause**: Approval attempt on non-existent registration ID
**Solution**: Verify registration ID from initial submission response

### CSV files not created
**Cause 1**: File system permissions
- [ ] Check directory ownership
- [ ] Ensure write permissions on parent directory
**Cause 2**: Path issues
- [ ] Verify csvGenerator module path is correct
- [ ] Check NODE_ENV paths

**Solution**: 
```bash
chmod -R 755 ira_data/
```

### Duplicate detection not working
**Cause**: String comparison case sensitive or space-aware
**Solution**: Review normalize() and stringSimilarity() functions in colleges.js

### State code lookup failing
**Cause**: State name not in state_codes table
**Solution**: Add missing state to state_codes table or provide explicit stateCode in request

### Database constraint violations
**Cause**: Attempting to insert duplicate (code, parent_id) pair
**Solution**: Check UNIQUE constraints in schema.sql, increase code value

## API Request Examples

### cURL: Register College
```bash
curl -X POST http://localhost:5173/api/college/register \
  -H "Content-Type: application/json" \
  -d '{
    "university": {
      "name": "Test University",
      "shortName": "TU"
    },
    "college": {
      "name": "Test College of Engineering",
      "shortName": "TCE"
    },
    "location": {
      "state": "Maharashtra",
      "stateCode": "23",
      "district": "Pune",
      "districtCode": "045",
      "areaCode": "012",
      "pincode": "411001",
      "fullAddress": "Pune, India"
    },
    "courses": [
      {
        "name": "BTech",
        "duration": 4,
        "branches": ["Computer Science", "AI and ML"]
      }
    ],
    "contact": {
      "email": "registrar@test.edu.in",
      "phone": "020-1234567"
    }
  }'
```

### cURL: Approve Registration
```bash
curl -X POST http://localhost:5173/api/college/admin/approve \
  -H "Content-Type: application/json" \
  -d '{
    "registrationId": 12345
  }'
```

### cURL: Get Pending Registrations
```bash
curl -X GET "http://localhost:5173/api/college/registrations?status=pending_admin"
```

## Migration from Old System

If migrating from the previous college_registrations table schema:

1. **Export old data**
   ```sql
   SELECT * FROM college_registrations WHERE status = 'pending_admin';
   ```

2. **Transform and insert into pending_colleges**
   ```sql
   INSERT INTO pending_colleges (submitted_data, status, ml_score, created_at)
   SELECT jsonb_build_object(
     'university', jsonb_build_object('name', university_name, 'shortName', university_short_name),
     'college', CASE WHEN college_name IS NOT NULL THEN jsonb_build_object('name', college_name, 'shortName', college_short_name) ELSE NULL END,
     'location', jsonb_build_object('state', state, 'stateCode', state_code, 'district', district, 'districtCode', district_code, 'areaCode', area_code),
     'courses', courses::jsonb,
     'contact', jsonb_build_object('email', contact_email, 'phone', contact_phone)
   ), 'pending_admin', ml_score, submitted_at
   FROM college_registrations
   WHERE status = 'pending_admin';
   ```

3. **Drop old table** (after verification)
   ```sql
   DROP TABLE college_registrations;
   ```

## Future Enhancements

1. **Student Registration Flow** (Phase 2)
   - Student uses College Program ID to register
   - System generates Borrowing Account ID
   - Associates student with college/degree/branch

2. **Lender Registration Flow** (Phase 2)
   - Lender registers and selects investment sector
   - System generates Lending Account ID
   - Associates lender with geographic/sector preference

3. **Photo & Document Upload**
   - College certificate uploads
   - Accreditation document storage
   - Document verification workflow

4. **Multi-Campus Support**
   - Allow colleges to register multiple campuses
   - District-level college management
   - Course offering per campus

5. **Bulk Import**
   - CSV import of institutional data
   - Batch registration processing
   - Schedule-based imports

6. **Analytics Dashboard**
   - Registration volume by state/district
   - Approval rate and timing metrics
   - Student/Lender growth tracking
   - Geographic heatmaps

## Support & Questions

For questions about specific components:
- **Database**: See database/schema.sql comments
- **API Logic**: See api/colleges.js for validation and approval logic
- **CSV Generation**: See api/csvGenerator.js for file operations
- **Frontend**: See src/pages/CollegeRegistration.tsx for form implementation

---

**System Version**: 1.0  
**Last Updated**: March 2025  
**Specification**: College Registration with Numeric ID Generation and CSV Export
