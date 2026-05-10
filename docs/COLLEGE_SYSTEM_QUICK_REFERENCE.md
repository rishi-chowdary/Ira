# College Registration System - Quick Reference

## Files Changed & Created

### 1. **Database Schema**
**File**: `database/schema.sql` (NEW - 400+ lines)
**Purpose**: PostgreSQL schema for entire college registration system
**Key Components**:
- 12 main tables (countries, states, districts, sectors, universities, colleges, courses, branches, students, pending_colleges, college_programs, admin_audit_log)
- Indexes and constraints for data integrity
- Triggers for auto-updated_at timestamps
- Foreign key relationships maintaining hierarchy
- State codes lookup table
- Helper views for pending registrations
- Sample data seed (state codes, India as country)

**Deployment**: 
```bash
psql -U postgres -d your_college_db -f database/schema.sql
```

---

### 2. **CSV Generation Utility**
**File**: `api/csvGenerator.js` (NEW - 350+ lines)
**Purpose**: Automatic CSV generation matching database hierarchy
**Key Functions**:
- `generateAllCSVs()` - Main function called during approval
- `appendToCSVFile()` - Adds rows with duplicate detection
- `ensureDir()` - Recursive directory creation
- `fileExists()` - Checks file existence

**Usage**:
```javascript
const csvGenerator = require('./csvGenerator');
await csvGenerator.generateAllCSVs({
  state: "Maharashtra",
  stateCode: "23",
  district: "Pune",
  // ... other data
});
```

**Output**: Creates `ira_data/` directory with hierarchical CSV structure

---

### 3. **College Registration API (COMPLETELY REWRITTEN)**
**File**: `api/colleges.js` (MODIFIED - ~600 lines)
**Purpose**: Complete API for registration, validation, approval, ID generation
**Key Endpoints**:
- `POST /api/college/register` - Submit college registration
- `POST /api/college/admin/approve` - Approve and generate IDs
- `POST /api/college/admin/reject` - Reject registration
- `GET /api/college/registrations` - Fetch pending registrations
- `GET /api/college/registrations/:id` - Get single registration

**Key Functions**:
- `normalize()` - Case-insensitive, space-agnostic string comparison
- `stringSimilarity()` - Levenshtein distance for fuzzy matching
- `generateNextCode()` - Sequential numeric code generation (padded)
- `getStateCode()` - Lookup state code from name
- `handleCollegeRegister()` - Validation and storage
- `handleApproveCollege()` - Full approval workflow with ID generation
- `handleRejectCollege()` - Rejection with audit logging

**Key Features**:
- ✅ Duplicate detection (409 Conflict on match)
- ✅ Hierarchical code generation (country→state→district→sector→univ→college→course)
- ✅ Auto-creation of missing parent entities
- ✅ College Program ID: `91 23 045 012 001 101 01 2025 2029`
- ✅ CSV file generation on approval
- ✅ Audit logging
- ✅ ML scoring (mock)

**Database Changes**:
- Stores registration in `pending_colleges` table (JSONB format)
- Inserts approval records into university, college, course, branch tables
- Maintains audit trail in admin_audit_log
- Stores program ID in college_programs table

---

### 4. **Frontend Registration Form (UPDATED)**
**File**: `src/pages/CollegeRegistration.tsx` (MODIFIED - Updated labels)
**Changes**:
- Updated form labels to match specification terminology
- "Course name" → "Degree Name" (BTech, MBA, etc.)
- "Branches" → "Specializations" (Computer Science, AI and ML, etc.)
- Added clarification text and placeholders
- Form structure unchanged (already compatible)

**Form Validates**:
- ✅ University name
- ✅ College name (if provided)
- ✅ State and district
- ✅ Area code (3-digit)
- ✅ Pincode (6-digit)
- ✅ At least one degree program
- ✅ Each degree has at least one specialization
- ✅ Contact email and phone

**Data Sent to API**:
```javascript
{
  "university": { "name", "shortName" },
  "college": { "name", "shortName" }, // optional
  "location": { "state", "stateCode", "district", "districtCode", "areaCode", "pincode", "fullAddress" },
  "courses": [
    { "name": "BTech", "duration": 4, "branches": ["CS", "AI and ML"] }
  ],
  "contact": { "email", "phone" }
}
```

---

## Core System Workflows

### Registration Flow
```
User fills form
    ↓
Frontend validates
    ↓
POST /api/college/register
    ↓
API validates duplicate institution
    ↓
ML scoring (email domain check)
    ↓
INSERT pending_colleges
    ↓
Return registrationId
    ↓
Frontend shows success
```

### Approval Flow
```
Admin views dashboard
    ↓
Admin clicks "Approve"
    ↓
POST /api/college/admin/approve
    ↓
Fetch pending_colleges record
    ↓
Extract submitted_data (JSONB)
    ↓
Create/Find: Country → State → District → Sector
    ↓
Create/Find: University → College
    ↓
Create courses and branches
    ↓
Generate College Program ID
    ↓
INSERT college_programs record
    ↓
UPDATE pending_colleges status = 'approved'
    ↓
Call csvGenerator.generateAllCSVs()
    ↓
INSERT admin_audit_log entry
    ↓
Return programId to admin
    ↓
(TODO) Send confirmation email
```

### CSV Generation Flow
```
generateAllCSVs() called
    ↓
For each entity level (state → district → univ → college → degree → branch):
    ├─ Ensure directory exists
    ├─ Read existing CSV file
    ├─ Check for duplicate rows
    ├─ Append new row if unique
    └─ Write updated CSV
```

---

## Database Relationships

```
countries (1)
    └─ states (n)
        └─ districts (n)
            └─ sectors (n)
            └─ universities (n)
                └─ colleges (n)
                    └─ courses (n)
                        └─ branches (n)
                            └─ students (n)

pending_colleges (Administrative)
college_programs (Reference/Audit)
admin_audit_log (Audit Trail)
state_codes (Lookup)
```

---

## ID Generation Logic

### College Program ID Breakdown
```
Country(2) State(2) District(3) Sector(3) University(3) College(3) Course(2) StartYear(4) EndYear(4)
```

**Codes are numeric with leading zeros:**
- Country: "91" (fixed for India)
- State: "23" (Maharashtra - from state_codes table)
- District: "045" (Pune - generated sequentially per state)
- Sector: "012" (Aadhaar area code - from form)
- University: "001" (SPPU - generated sequentially per district)
- College: "101" (MIT - generated sequentially per university)
- Course: "01" (BTech - generated sequentially per college)
- StartYear: current year (e.g., 2025)
- EndYear: current year + 4

**Examples**:
```
91 23 045 012 001 101 01 2025 2029  (BTech at MIT Pune)
91 23 045 012 001 101 02 2025 2026  (MBA at MIT Pune)
91 07 052 005 002 201 01 2025 2029  (BTech at Delhi university)
```

**Space-separated for readability in all exported formats.**

---

## API Response Examples

### Success: Register
```json
{
  "status": "pending_admin_review",
  "registrationId": 42,
  "message": "Registration submitted. Awaiting admin approval."
}
```

### Success: Approve
```json
{
  "message": "College approved successfully",
  "collegeProgramId": "91 23 045 012 001 101 01 2025 2029",
  "collegeName": "MIT Pune",
  "universityName": "Savitribai Phule Pune University"
}
```

### Error: Duplicate
```json
{
  "error": "Institution with similar name already exists. Please contact colleges@ira.co.in",
  "isDuplicate": true
}
```
**HTTP 409 Conflict**

### Error: Invalid Request
```json
{
  "error": "At least one course is required"
}
```
**HTTP 400 Bad Request**

---

## File System Output

After approving "MIT Pune" college registration:

```
ira_data/
├── states.csv
└── states/
    └── Maharashtra/
        ├── districts.csv
        └── districts/
            └── Pune/
                ├── universities.csv
                └── universities/
                    └── SPPU/
                        ├── colleges.csv
                        └── colleges/
                            └── MIT Pune/
                                ├── degrees.csv
                                └── degrees/
                                    ├── BTech/
                                    │   ├── branches.csv
                                    │   └── branches/
                                    │       ├── Computer Science/
                                    │       │   └── students.csv
                                    │       ├── AI and ML/
                                    │       │   └── students.csv
                                    │       └── Cyber Security/
                                    │           └── students.csv
                                    └── MBA/
                                        ├── branches.csv
                                        └── branches/
                                            ├── Finance/
                                            │   └── students.csv
                                            └── Marketing/
                                                └── students.csv
```

---

## Key Validations

### Duplicate Detection Algorithm
1. Normalize both strings: lowercase + remove spaces
2. Calculate Levenshtein distance between normalized strings
3. Compute similarity: (length - distance) / length
4. If similarity > 0.85 → DUPLICATE (return 409)

**Examples**:
- "MIT Pune" vs "mit pune" → duplicate ✓
- "MIT Pune" vs "M I T P u n e" → duplicate ✓
- "MIT Pune" vs "MIT Punee" → duplicate ✓ (85%+ similar)
- "MIT Pune" vs "COEP Pune" → unique ✓ (different strings)

### Course Validation
- Each course MUST have:
  - `name`: Degree type (string)
  - `duration`: Years (number, 1-6)
  - `branches`: Array of specializations (min 1)

### Location Validation
- state: Required (string)
- district: Required (string)
- areaCode: Required (3-digit numeric string)
- stateCode: Optional (looked up or generated)
- districtCode: Optional (generated if missing)
- pincode: Optional
- fullAddress: Optional

---

## Environment Setup

### Prerequisites
1. **PostgreSQL 12+**
2. **Node.js 14+**
3. **Supabase account** (or PostgreSQL connection details)

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Create database and run schema
psql -U postgres -f database/schema.sql

# 3. Update .env with database credentials
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=xxxxx

# 4. Start development server
npm run dev
```

### Config Files to Check
- `api/_supabase.js` - Supabase client initialization
- `.env` - Database credentials
- `vite.config.ts` - API proxy configuration

---

## Debugging

### Check Pending Registrations
```sql
SELECT id, status, ml_score, created_at FROM pending_colleges ORDER BY created_at DESC LIMIT 10;
```

### Check Approved Colleges
```sql
SELECT c.name, c.program_id, u.name FROM colleges c JOIN universities u ON c.university_id = u.id;
```

### Check Generated Codes
```sql
SELECT * FROM universities ORDER BY code DESC LIMIT 5;
SELECT * FROM colleges ORDER BY code DESC LIMIT 5;
```

### Test CSV Generation
```bash
ls -lah ira_data/
du -sh ira_data/
find ira_data -name "*.csv" | wc -l
```

---

## Next Steps for Integration

1. **✅ Schema Created** → Run `database/schema.sql`
2. **✅ API Implemented** → Deploy `api/colleges.js` and `api/csvGenerator.js`
3. **✅ Frontend Updated** → Deploy `src/pages/CollegeRegistration.tsx`
4. **⏳ Test End-to-End** → Register → Approve → Check CSVs
5. **⏳ Email Service** → Uncomment email TODOs and implement
6. **⏳ Authentication** → Add JWT/session for admin routes
7. **⏳ Monitoring** → Set up logs for approval workflow

---

## Support Resources

| Topic | Resource |
|-------|----------|
| Full Documentation | `COLLEGE_SYSTEM_DOCUMENTATION.md` |
| Database Structure | `database/schema.sql` (comments) |
| API Logic | `api/colleges.js` (inline comments) |
| CSV System | `api/csvGenerator.js` (inline comments) |
| Frontend | `src/pages/CollegeRegistration.tsx` |
| Admin UI | `src/pages/AdminCollegesDashboard.tsx` |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Mar 2025 | Initial implementation with numeric ID generation and CSV export |

---

**System Ready for Testing & Integration** ✓
