# IRA College Loan System - Complete Implementation Roadmap
**Date:** 31 March 2026  
**Version:** 1.0

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ADMIN DASHBOARD                             │
│  - Approve colleges                                                   │
│  - View all scores, transactions, profiles                           │
│  - Override any request (loans, approvals)                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    ┌────────┐         ┌─────────┐         ┌──────────┐
    │ COLLEGE│         │   ML    │         │ SCORING  │
    │APPROVAL│────────▶│MATCHING │────────▶│ (SHRI)   │
    └────────┘         └────┬────┘         └──────────┘
        ▲                   │
        │          ┌────────┴────────┐
        │          │                 │
   ┌────┴──────┐  ▼        ▼         ▼
   │ College   │┌──────┐┌──────┐┌──────────┐
   │Dashboard  ││LOAN  ││FEE   ││LOAN      │
   │- Approve  ││REQ   ││DATA  ││MATCHING  │
   │- Verify   │└──────┘└──────┘└──────────┘
   │- Upload   │
   └──────────┘

┌──────────────────────────────────────────────────────┐
│         STUDENT ONBOARDING FLOW                       │
├──────────────────────────────────────────────────────┤
│1. Sign-up (email, phone, basic info)                 │
│2. Verify email & phone (OTP)                         │
│3. Complete KYC (Aadhaar + PAN)                       │
│4. Pay ₹3 activation fee → Batua wallet created       │
│5. Enter college code & upload fee receipt            │
│6. Wait for college approval                          │
│7. Get Borrowing Account ID → Can borrow & lend       │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│         LOAN LIFECYCLE                                │
├──────────────────────────────────────────────────────┤
│1. Borrower requests loan (amount, tenure)            │
│2. ML calculates interest (based on Shri Score)       │
│3. ML matches with lenders (by Score, location)       │
│4. Lender notified → funds auto-deducted              │
│5. Borrower receives disbursement                     │
│6. Monthly repayment schedule generated               │
│7. Borrower repays (Batua Unlocked → UPI)             │
│8. Lender receives transfer                           │
│9. Shri Score updates based on payment status         │
└──────────────────────────────────────────────────────┘
```

---

## Complete Database Schema (24 Tables)

### Tier 1: Location & Institution (Educational Hierarchy)
- `countries` - Countries (India)
- `states` - States/UTs (55-89 codes)
- `districts` - Districts within states
- `sectors` - Aadhaar zones
- `universities` - Universities
- `colleges` - Colleges with login credentials
- `courses` - Degree programs (BTech, MBA, etc.)
- `branches` - Specializations within courses

### Tier 2: College Management
- `pending_colleges` - College registrations awaiting admin approval
- `college_programs` - Generated Program IDs for colleges

### Tier 3: User & Authentication
- `user_accounts` - Student accounts (unified Borrower/Lender role)
- `kyc_data` - Know Your Customer data (Aadhaar, PAN)
- `batua_wallet` - Mobile wallet (locked + unlocked compartments)

### Tier 4: Financial Operations
- `loans` - Loan records (request, disbursement, repayment)
- `loan_repayment` - Monthly installment schedule
- `transactions` - All wallet movements
- `interest_rate_table` - Interest rates by Shri Score bracket

### Tier 5: Relationships & Trust
- `trust_score` - Shri Score (creditworthiness: 0-1000)
- `guarantors` - Co-signer relationships
- `friends` - Friend connections for direct lending
- `college_student_approval` - College's approval for students

### Tier 6: Audit & Logs
- `admin_audit_log` - College's approval audit trail
- `state_codes` - Master reference for state codes

---

## API Endpoints (37 Total)

### College Management (10 endpoints)
```
POST   /api/college/register              │ Submit college registration
GET    /api/college/registrations         │ List pending registrations (admin)
GET    /api/college/registrations/:id     │ Get registration details
POST   /api/college/admin/approve         │ Approve college
POST   /api/college/admin/reject          │ Reject college
POST   /api/college/login                 │ College portal login
POST   /api/college/change-password       │ Change college password
GET    /api/college/students              │ List college's students (with filters)
POST   /api/college/students/:id/approve  │ Approve student enrollment
POST   /api/college/fee-data/upload       │ Upload fee payment CSV
```

### Student Onboarding (8 endpoints)
```
POST   /api/student/register              │ Sign up with email & phone
POST   /api/student/verify-otp            │ Verify email/phone OTP
POST   /api/student/kyc                   │ Submit KYC (Aadhaar, PAN)
POST   /api/student/activate-batua        │ Pay ₹3 to activate wallet
POST   /api/student/college-verification  │ Submit college code + fee receipt
GET    /api/student/dashboard             │ Get user profile & balances
POST   /api/student/login                 │ Student login
POST   /api/student/change-password       │ Change password
```

### Loan System (10 endpoints)
```
POST   /api/loan/request                  │ Borrower requests loan
GET    /api/loan/matches                  │ Get matched lenders (internal ML)
POST   /api/loan/accept-match             │ Accept lender match
GET    /api/loan/repayment-schedule       │ Get installment schedule
POST   /api/loan/repay                    │ Make repayment
GET    /api/loan/history                  │ Get all loans (borrower/lender view)
GET    /api/loan/:id/status               │ Get loan status details
POST   /api/loan/:id/default              │ Mark as defaulted (admin)
POST   /api/loan/:id/close                │ Close completed loan
GET    /api/dashboard/balance             │ Get wallet balance
```

### Trust & Scoring (3 endpoints)
```
GET    /api/trust-score/:userId           │ Get Shri Score details
POST   /api/trust-score/update            │ Update score (internal, post-repayment)
GET    /api/trust-score/brackets          │ Get interest rate brackets
```

### Friends & Guarantors (4 endpoints)
```
POST   /api/friends/add                   │ Add friend by Borrowing ID
GET    /api/friends/list                  │ List connected friends
POST   /api/friends/loan-request          │ Send friend private loan request
POST   /api/friends/loan-respond          │ Accept/reject/negotiate friend loan
POST   /api/guarantor/nominate            │ Nominate guarantor
GET    /api/guarantor/nominations         │ View pending nominations
POST   /api/guarantor/approve             │ Approve nomination
```

### Admin Oversight (2 endpoints)
```
GET    /api/admin/dashboard/metrics       │ System metrics (loans, users, defaults)
GET    /api/admin/users/:id/overview      │ View any user's full profile & history
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2) ✅
- [x] Database schema (24 tables)
- [x] College registration & approval with email
- [x] College login & password management
- [ ] **NOW:** Student registration & KYC APIs
- [ ] **NOW:** Wallet activation system

### Phase 2: Core Loan System (Weeks 3-4)
- [ ] Student onboarding flow (email verification, college approval)
- [ ] Loan request API
- [ ] ML matching algorithm (location, score, availability)
- [ ] Disbursement system (auto wallet deduction)
- [ ] Shri Score calculation algorithm

### Phase 3: Repayment & Trust (Weeks 5-6)
- [ ] Repayment schedule generation
- [ ] Penalty calculation (escalating)
- [ ] Repayment collection (UPI auto-pay simulation)
- [ ] Score updates (on-time bonus, late penalty, default)
- [ ] Default handling

### Phase 4: Friends & Guarantors (Week 7)
- [ ] Friend connections (private lending)
- [ ] Locked wallet lending rules
- [ ] Guarantor nomination & approval
- [ ] Guarantor liability tracking

### Phase 5: Dashboards (Weeks 8-9)
- [ ] Student dashboard (loans, balance, schedule, repay)
- [ ] College dashboard (approve students, view stats, upload fees)
- [ ] Admin dashboard (all approvals, overrides, metrics)
- [ ] Lender view (notifications, loan status, repayments received)

### Phase 6: Testing & Deployment (Weeks 10-12)
- [ ] Integration testing (end-to-end flows)
- [ ] Email service integration (SendGrid/AWS SES)
- [ ] Security hardening (JWT, rate limits, input validation)
- [ ] Performance optimization
- [ ] Documentation & deployment

---

## Key Algorithms

### 1. Shri Score Calculation
```
Initial Score: 500

Updates:
- First successful repayment on time: +50
- Every subsequent on-time repayment: +5 (capped at 800)
- Single day late: -10
- 7 days late: -30
- 30+ days late: -100 (marked overdue)
- Loan default: -200
- Guarantor approval: +20
- Friend connection: +10 (max 8 friends)
- Guarantor default incident: -150 (on guarantor's score)

Score ranges:
- 0-300: High risk (24% interest)
- 301-400: Risky (22% interest)
- 401-500: Standard (18% interest)
- 501-600: Good (15% interest)
- 601-700: Excellent (12% interest)
- 701-800: Premium (9% interest)
- 801-1000: Elite (6% interest)
```

### 2. Interest Calculation
```
Monthly Interest = (Principal × Annual_Rate) / 1200

Example:
- Amount: ₹10,000
- Annual Rate: 18% (for Shri Score 401-500)
- Tenure: 12 months
- Monthly Payment: ₹905 (principal + interest)

Interest = 10,000 × 0.18 / 12 = ₹150/month
Extra interest on ₹10,000 over 12 months = ₹900 total
```

### 3. ML Lender Matching Algorithm
```
Match lenders to borrowers based on:
1. Shri Score similarity (within 100 points)
2. Location proximity (same state/district preferred)
3. College affiliation (same college/university preferred)
4. Availability (sufficient Batua Unlocked balance)
5. Loan history (preference for experienced lenders)

Algorithm:
- Sort lenders by score, location, experience
- Deduct from Batua Unlocked (locked funds never used for auto-matching)
- Create loan entry with matched lender
- Send notification to lender
- Disperse funds to borrower's Unlocked compartment
```

### 4. Repayment Split Logic
```
Repayment = Principal + Interest + Penalty

Default split (no penalty):
- 85% goes to lender
- 15% goes to platform (interest)

With late penalty (escalating):
- 1-7 days: 5% of monthly payment
- 8-14 days: 10%
- 15-30 days: 15%
- 30+ days: ₹100 flat + 0.5% daily of remaining balance

Penalty split:
- 60% to lender
- 40% to platform
```

### 5. Fee Payment Tracking
```
During student enrollment, upload CSV:
college_code, enrollment_number, full_name, email, fee_paid_date, amount

System:
- Marks students as fee_paid = TRUE
- Auto-approves borrowing for fee-paid students
- Prevents borrowing if fee not uploaded by college
```

---

## Password Generation & Temporary Passwords

```
Temporary Password Format: YYYYMMDDHHMMSS (based on approval/activation timestamp)
Example: 20260331140507 (31 March 2026 at 14:05:07)

Used for:
- College portal (after approval)
- Student portal (after activation/KYC approval)

First login:
- User must change to permanent password
- Password must meet strength requirements:
  * 8+ characters
  * Uppercase, lowercase, digit, special char
  * Not reusing old password
```

---

## Email Templates (5 Total)

1. **Student Sign-up Confirmation** → OTP for email verification
2. **KYC Approved** → College enrollment next steps
3. **Loan Disbursement** → Borrower receives funds
4. **Loan Matched** → Lender notified of funding opportunity
5. **Repayment Due Alert** → Automated reminder 5 days before due date
6. **Repayment Late Alert** → Escalating notifications
7. **Penalty Charged** → Borrower notified of late fee
8. **Default Notification** → Lender informed of default

---

## Security Considerations

1. **Password Storage** - PBKDF2 hashing (100K iterations)
2. **Session Management** - JWT tokens with expiry
3. **API Authentication** - Bearer token authentication
4. **Rate Limiting** - Login attempts (5 per minute), API calls (100 per minute)
5. **Input Validation** - All inputs sanitized & validated
6. **OTP Expiry** - 10 minutes for email/phone OTP
7. **Encryption** - HTTPS only, KYC data encrypted at rest
8. **Admin Oversight** - All admin actions logged to audit trail

---

## Testing Scenarios

### Scenario 1: Complete Student Journey (Happy Path)
```
1. Student signs up with email/phone
2. Verifies OTP
3. Completes KYC (Aadhaar + PAN)
4. Pays ₹3 activation
5. Enters college code + uploads fee receipt
6. College admin approves
7. Student gets Borrowing Account ID
8. Student adds friends
9. Student requests ₹5,000 loan (12 months)
10. ML matches with lender
11. Lender gets notification
12. Funds disbursed to borrower
13. Borrower repays ₹905/month for 12 months
14. On-time repayments → Shri Score increases by 5 each
15. Loan closed, friendship can lead to future lending
```

### Scenario 2: Late Payment & Penalty
```
1. Repayment due on 31st March
2. Borrower pays 2 days late (on 2nd April)
3. Penalty calculated: 5% of ₹905 = ₹45.25
4. Borrower charged: ₹905 + ₹45.25 = ₹950.25
5. Split: Lender gets ₹570.15 + ₹27.15 (penalty) = ₹597.30
6. Platform gets ₹90.50 + ₹18.10 (penalty) = ₹108.60
7. Shri Score -10 (1-7 days late)
8. Updated score triggers partial interest rate reduction next cycle
```

### Scenario 3: Friend Loan
```
1. Borrower has ₹500 in Locked wallet
2. Adds Friend with ID (verification exchange)
3. Sends ₹400 loan request with 5% interest
4. Friend approves (can only use from Locked wallet)
5. ₹400 deducted from Friend's Locked
6. ₹400 added to Borrower's Unlocked
7. Borrower repays ₹100/month + interest
8. Friend receives repayments
9. Loan closed after 6 months
```

---

## File Structure

```
api/
├── colleges.js                 (Existing - college registration & approval)
├── college-auth.js            (Existing - college login)
├── passwordUtil.js             (Existing - password utilities)
├── emailService.js             (Existing - email templates)
├── students.js                 NEW - student registration & KYC
├── wallet.js                   NEW - Batua wallet system
├── loans.js                    NEW - loan request, matching, repayment
├── trustScore.js               NEW - Shri Score calculation
├── friends.js                  NEW - friend lending
├── guarantors.js               NEW - guarantor system
├── admin.js                    NEW - admin oversight
└── ml-matching.js              NEW - intelligent lender matching

src/pages/
├── CollegeLoginPage.tsx        (Existing)
├── ChangePasswordPage.tsx      (Existing)
├── CollegeDashboard.tsx        (Existing)
├── StudentRegisterPage.tsx     NEW - student sign-up
├── StudentKYCPage.tsx          NEW - KYC form
├── StudentDashboard.tsx        NEW - main student portal
├── BorrowerDashboard.tsx       (Existing - enhance)
├── LenderDashboard.tsx         (Existing - enhance)
├── AdminDashboard.tsx          NEW - admin oversight
└── LoanDetailPage.tsx          (Existing - enhance)

database/
└── schema.sql                  (Updated with 24 tables)

lib/
├── auth.tsx                    (Existing - enhance with JWT)
└── trustScore.ts               NEW - score calculation helpers
```

---

## Next Immediate Steps

1. **Create Student APIs** (`api/students.js`)
   - POST /api/student/register
   - POST /api/student/verify-otp
   - POST /api/student/kyc
   - GET /api/student/dashboard
   - POST /api/student/change-password

2. **Create Wallet API** (`api/wallet.js`)
   - POST /api/student/activate-batua
   - GET /api/dashboard/balance
   - Internal: deduct/add to wallet during loans

3. **Create Shri Score System** (`api/trustScore.js`)
   - Algorithm for score calculation
   - Interest rate lookup
   - Score updates on events (payment, default, etc.)

4. **Create Loan System** (`api/loans.js`)
   - POST /api/loan/request
   - GET /api/loan/matches
   - POST /api/loan/repay
   - Score updates

5. **Update views for Student Dashboard, Lender Dashboard, Admin Dashboard**

---

## Success Metrics

- [ ] All 24 database tables created and verified
- [ ] 37 API endpoints implemented and tested
- [ ] Student onboarding flow complete (sign-up → college approval)
- [ ] Loan lifecycle working (request → match → disburse → repay)
- [ ] Shri Score updates automatically on key events
- [ ] All 5 dashboards functional (Admin, College, Student, Borrower, Lender)
- [ ] Email notifications sent on key events
- [ ] Security hardened (JWT, rate limits, input validation)
- [ ] Comprehensive test coverage
- [ ] Production-ready deployment

---

**Total Implementation Effort:** ~800-1000 hours  
**Team Size Recommended:** 4-6 developers  
**Timeline:** 12 weeks for MVP, 16 weeks for full feature set

This roadmap provides a complete blueprint for the entire system. Each section is modular and independent where possible to allow parallel development.
