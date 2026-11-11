# 🪙 IRA — Student P2P Lending Platform
## 09. College Portal & Institution Hierarchy

---

## 🏛️ Institutional Onboarding Architecture

To prevent predatory lending and ensure campus compliance, IRA partners directly with educational institutions. Students can only borrow once verified as bona fide students by their registered college.

---

## 🆔 Standardized Account ID Format

IRA implements a standardized, numeric/alphanumeric space-separated hierarchy conforming to Indian administrative codes:

### 1. College Program ID
```
Format:  IN / <State> / <District> / S<Sector> / <Course> / <StartYear> / <EndYear>
Example: IN / MH / PUN / S12 / BTECH / 2024 / 2028
```

### 2. Student Borrowing Account ID
```
Format:  IN / <State> / <District> / <Uni> / <College> / <Course> / <Sequence>
Example: IN / MH / PUN / PUNI / COEP / BTE / 00142
```

### 3. Student Lending Account ID
```
Format:  IN / <State> / <District> / S<Sector> / <Sequence>
Example: IN / MH / PUN / S12 / 00089
```

---

## 🔄 College Verification Workflow

1. **Institution Registration:**
   - College authority submits registration form via `CollegeRegistration.tsx`.
   - Collects AISHE code, accredited university, campus location, and authorized nodal officer email.
2. **Platform Admin Approval:**
   - Platform super-admin reviews registration in `AdminDashboard.tsx`.
   - On approval, the system generates unique **College Program IDs** for all registered degree tracks.
3. **Student Enrolment Verification:**
   - Student enters college code and uploads college ID card during onboarding.
   - Request appears in the college's dedicated **College Portal** (`CollegePortal.tsx`).
   - Nodal officer confirms student's active enrolment status with a single click.
   - Student receives an instant notification, unlocking their borrowing limits.
