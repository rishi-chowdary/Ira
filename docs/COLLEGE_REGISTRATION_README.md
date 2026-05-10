# IRA College Registration & Management System

Complete integration for college/university registration, admin approval workflow, and College Program ID generation.

## Overview

The IRA College Registration system allows educational institutions to register on the platform with a multi-step approval process:

1. **Institution Registration** → College submits registration form with details
2. **Duplicate Check** → System validates against existing entries
3. **ML Validation** → Optional ML model scores the application  
4. **Admin Review** → Admin dashboard displays pending applications
5. **Approval** → Generate College Program ID and activate institution
6. **Activation** → Institution can manage students and courses

## Features

✅ College/University registration form  
✅ Duplicate institution detection (case-insensitive, fuzzy matching)  
✅ Multi-level location data (State → District → Area Code)  
✅ Course & branch management  
✅ ML confidence scoring (mock implementation)  
✅ Admin dashboard for approvals  
✅ College Program ID auto-generation  
✅ Audit logging of all admin actions  
✅ Real-time pending registrations list  

## File Structure

```
src/pages/
├── CollegeRegistration.tsx          # Frontend registration form
└── AdminCollegesDashboard.tsx       # Admin approval interface

api/
└── colleges.js                      # Backend endpoints

data/
├── demo-colleges.json               # Sample college data
└── demo-college-ids.json           # Example program IDs (from earlier task)

database/
└── DATABASE_SCHEMA.sql             # Complete Postgres schema

scripts/
└── generate-college-ids.js         # CLI tool for ID generation
```

## API Endpoints

### Registration

**POST `/api/college/register`**

Submit a new college registration.

**Request:**
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
    "stateCode": "23",
    "district": "Pune",
    "districtCode": "045",
    "areaCode": "012",
    "pincode": "411001",
    "fullAddress": "..."
  },
  "courses": [
    {
      "name": "Computer Science",
      "duration": 4,
      "branches": ["AI", "Cyber Security"]
    }
  ],
  "contact": {
    "email": "college@mitpune.edu.in",
    "phone": "020-1234567"
  }
}
```

**Response (201 Created):**
```json
{
  "status": "pending_admin_review",
  "registrationId": "REG_1700000000_ABC123",
  "message": "Registration submitted. Awaiting approval."
}
```

---

### Admin Approval

**POST `/api/college/admin/approve`**

Approve a registration and generate College Program ID.

**Request:**
```json
{
  "registrationId": "REG_1700000000_ABC123"
}
```

**Response (200 OK):**
```json
{
  "message": "College approved successfully",
  "collegeProgramId": "IN/MH/PUN/S12/MIT/CSE/2025/2029",
  "collegeName": "MIT Pune"
}
```

---

### Admin Rejection

**POST `/api/college/admin/reject`**

Reject a registration.

**Request:**
```json
{
  "registrationId": "REG_1700000000_ABC123"
}
```

**Response (200 OK):**
```json
{
  "message": "Registration rejected"
}
```

---

### Fetch Pending Registrations

**GET `/api/college/registrations`** (Admin only)

Get all pending registrations for review.

**Response:**
```json
{
  "registrations": [
    {
      "id": 1,
      "registrationId": "REG_001",
      "universityName": "MIT Pune",
      "status": "pending_admin",
      "mlScore": 0.92,
      "submittedAt": "2025-03-28T10:30:00Z"
    }
  ]
}
```

## College Program ID Format

```
IN / StateCode / DistrictCode / S[AreaCode] / UnivCode / CollegeCode / StartYear / EndYear
```

**Example:** `IN/MH/PUN/S12/MIT/CSE/2025/2029`

- **IN** = Country (always India)
- **MH** = State code (Maharashtra = 23, but abbreviated)
- **PUN** = District code (Pune = 045, abbreviated to 3 chars)
- **S12** = Sector/Area code (always prefixed with 'S')
- **MIT** = College short code (3-4 chars)
- **CSE** = Course code (first 3 chars)
- **2025/2029** = Academic start/end years

## Database Schema

See `DATABASE_SCHEMA.sql` for complete schema. Key tables:

- **college_registrations** — Pending/approved/rejected registrations
- **universities** — Registered universities
- **colleges** — Registered colleges under universities
- **courses** — Course offerings with branches
- **college_program_ids** — Generated IDs for reference
- **states, districts, area_codes** — Lookup tables
- **admin_audit_log** — Admin action audit trail

### Duplicate Detection

System uses **Levenshtein distance** for fuzzy matching:

- Compares normalized names (lowercase, no spaces)
- Similarity threshold: **> 0.85** = duplicate
- Checks both full names and short names

Example:
- "MIT Pune" vs "M.I.T. Pune" → Detected as duplicate ✓
- "COEP" vs "College of Engineering Pune" → Detected as duplicate ✓

## ML Validation (Optional)

Mock ML scoring checks:

- Email domain is educational (.ac.in, .edu, .education) → +0.05 score
- Base score = 0.90
- Admin can review score before approval

TODO: Integrate with real ML model for:
- College name verification against known database
- Address plausibility checking
- Email domain legitimacy
- Phone number format validation

## Admin Dashboard

**Route:** `/admin/colleges`  
**Login:** admin@ira.co.in / admin123

Features:
- List all pending registrations with filters
- View full registration details (click to expand)
- Approve/Reject buttons
- Real-time list updates (polling every 5 sec, or WebSocket)
- Recent activity log
- Statistics: total registered, pending, approved, rejected

## Integration Checklist

- [ ] Run `DATABASE_SCHEMA.sql` on production database
- [ ] Deploy API endpoints in `api/colleges.js`
- [ ] Build College Registration page from `CollegeRegistration.tsx`
- [ ] Build Admin Dashboard from `AdminCollegesDashboard.tsx`
- [ ] Add routes to `App.tsx`
- [ ] Set up email notifications (approval/rejection)
- [ ] Configure WebSocket for real-time notifications (optional)
- [ ] Integrate with ML validation service
- [ ] Add user authentication/authorization for admin routes
- [ ] Deploy and test end-to-end flow

## Usage Examples

### Frontend - Register a College

```bash
# Navigate to: /college/register
# Fill form with institution details
# Submit → Shows confirmation with Registration ID
```

### CLI - Generate College Program ID

```bash
# Generate for custom inputs
node scripts/generate-college-ids.js borrowing \
  --state MH --district Pune --uni SPPU --college MIT --course CSE --seq 10001

# Output: IN/MH/PUN/SPPU/MIT/CSE/10001
```

### Admin - Approve Registration

1. Navigate to `/admin/colleges`
2. Login (admin@ira.co.in / admin123)
3. Click pending registration
4. Review details
5. Click "Approve" → College Program ID generated
6. Confirmation email sent to college

## Database Initialization

Run once on setup:

```sql
-- Connect to IRA database
psql -U postgres -d ira_db -f DATABASE_SCHEMA.sql
```

This creates:
- 8 main tables
- 6 indexes for performance
- 4 lookup tables
- Triggers for automatic timestamp updates
- Sample data for Indian states/districts

## Security Considerations

- [ ] Add CORS restrictions
- [ ] Implement rate limiting on registration endpoint
- [ ] Add CAPTCHA to prevent spam
- [ ] Validate email domain before approval
- [ ] Use HTTPS for all endpoints
- [ ] Add authentication to admin routes
- [ ] Log all admin actions with timestamps and IP
- [ ] Implement approval workflow with 2-factor confirmation

## Future Enhancements

1. **Real-time Notifications** - WebSocket integration for live updates
2. **Email Templates** - Approval/rejection email templates
3. **ML Integration** - Connect to college verification ML model
4. **Bulk Operations** - Batch approve/reject registrations
5. **Export** - Download registrations as PDF/CSV
6. **Webhooks** - Notify college when approved
7. **Multi-language** - Support regional languages
8. **Mobile App** - Native app for college registration

## Support

For issues or questions:
- Email: colleges@ira.co.in
- Admin: access `/admin/colleges` dashboard
