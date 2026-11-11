# 🪙 IRA — Student P2P Lending Platform
## 03. System Implementation Roadmap

---

## 🗺️ Roadmap & Phase Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│                        IRA EVOLUTION PHASES                            │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────┤
│   PHASE 1    │   PHASE 2    │   PHASE 3    │   PHASE 4    │  PHASE 5+  │
│  Foundation  │  React 18 UI │  Colleges &  │  ML Scoring  │ Production │
│  & Auth API  │  & Dashboard │  Hierarchy   │ & Matching   │ UPI & App  │
│      ✅      │      ✅      │      ✅      │      ✅      │  Upcoming  │
└──────────────┴──────────────┴──────────────┴──────────────┴────────────┘
```

---

## ✅ Phase 1: Core Foundation & Ledger (Completed)
- [x] Initial Express.js REST API with rate limiting and Helmet headers.
- [x] JWT Dual-token authentication (Access + Refresh tokens).
- [x] Secure password hashing using bcrypt.
- [x] Relational 24-table database schema (`database/schema.sql`).
- [x] Atomic JSON persistence layer (`backend/lib/store.js`) for rapid prototyping.

---

## ✅ Phase 2: Modern React 18 Frontend Migration (Completed)
- [x] Transformed legacy static HTML/CSS into a high-performance React 18 + Vite SPA.
- [x] Client-side routing with React Router v6 and route-level protection (`ProtectedRoute.tsx`).
- [x] Dedicated UI modules for all primary user flows:
  - `LandingPage.tsx` — Marketing hero, live interest calculator, and social proof.
  - `LoginPage.tsx` & `SignUpPage.tsx` — Dual authentication with demo student shortcuts.
  - `StudentDashboard.tsx` — Central student hub for borrowing, lending, and portfolio tracking.
  - `OnboardingPage.tsx` — Step-by-step KYC wizard and ₹3 wallet activation.
  - `FriendsPage.tsx` & `GuarantorsPage.tsx` — Social trust network and peer endorsements.
  - `NotificationsPage.tsx` — Real-time transaction alerts and loan updates.
  - `TransactionHistoryPage.tsx` — Double-entry audit trail for all credits and debits.

---

## ✅ Phase 3: College Portal & Institutional Hierarchy (Completed)
- [x] Normalized Indian administrative geographic hierarchy (State → District → University → College → Degree → Branch).
- [x] Standardized Account ID generation algorithm:
  - College Program ID: `IN/<State>/<District>/S<Sector>/<Course>/<StartYear>/<EndYear>`
  - Student Borrowing Account ID: `IN/<State>/<District>/<Uni>/<College>/<Course>/<Seq>`
- [x] College Portal (`CollegePortal.tsx` & `backend/routes/college.js`) enabling college authorities to verify student enrollments.
- [x] Admin approval dashboard (`AdminDashboard.tsx`) with hierarchy CSV snapshot exporter.

---

## ✅ Phase 4: Financial Math & ML Policy Engine (Completed)
- [x] Time-based cumulative interest schedule (0% within 24hr up to 18% at 90 days).
- [x] 5-tier Shri Score system (Newbie, Bronze, Silver, Gold, Platinum) with tiered rate discounts and borrowing caps.
- [x] 85/15 lender/platform revenue split engine.
- [x] 60/40 late penalty split with 0.05% compounding daily rate.
- [x] Python ML matching policy (`ml/ira_ml_policy.py`) for automated lender-borrower pairing based on risk tier and geographic proximity.

---

## 🔮 Phase 5: Production Deployment & Scale (Upcoming)
- [ ] **Payment Gateway Integration:** Razorpay / Cashfree AutoPay (UPI e-Mandate) for recurring loan debits.
- [ ] **DigiLocker Production API:** Direct integration with UIDAI and Income Tax department APIs.
- [ ] **Mobile App:** Cross-platform React Native / Expo application for iOS and Android.
- [ ] **Credit Bureau Reporting:** Partnership with an NBFC sponsor to report repayment records to CRIF High Mark and Experian for student credit scoring.
