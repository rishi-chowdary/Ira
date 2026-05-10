# IRA Platform Implementation Phases Summary

Last updated: March 30, 2026

This document is the project-level status summary for the IRA Student P2P Lending Platform. It tracks what has been delivered, what is partially implemented, and what still needs to be completed across all planned phases.

## Project Overview

- Product: student-focused P2P lending platform
- Frontend: React + TypeScript + Vite + TailwindCSS v4
- Backend: serverless API routes in `api/`
- Data layer: Supabase
- Policy source of truth:
  - `src/lib/iraPolicy.ts`
  - `api/loans.js`
  - `api/friend-requests.js`
  - `api/repayments.js`
  - `ira_ml_policy.py`

## Status Legend

- `Complete`: implemented and currently wired into the main product flow
- `Mostly Complete`: main path works, but some persistence, cleanup, or edge-case coverage is still pending
- `Partial`: some working pieces exist, but the full scope is not done
- `Planned`: not yet implemented in a meaningful way

## Phase Status Board

| Phase | Name | Status | Summary |
| --- | --- | --- | --- |
| 1 | Foundation & Authentication Rewrite | Complete | Main auth, demo access, navigation, and route structure are in place |
| 2 | KYC, Wallets & IDs | Mostly Complete | Core onboarding and wallet flows work; some persistence is still simplified |
| 3 | Lending Engine & ML Matching | Mostly Complete | Policy math, loan creation, partial funding, and matching APIs exist and are wired |
| 4 | Guarantor, Friend & Chat | Partial | Guarantor rules and private friend-loan flow exist; friends dashboard and chat are not complete |
| 5 | Dashboard, Shri Score & College | Partial | Dashboard shell, wallet view, college portal, and transaction API exist; several sections remain placeholders |
| 6 | Polish & Final Integration | Partial | Visual polish and UX refinements exist, but final cleanup and full QA are not done |

## Phase 1 - Foundation & Authentication Rewrite

Status: `Complete`

### Delivered

- Separate sign-up and sign-in pages are implemented
- OTP login exists for regular users
- Password login exists for demo accounts
- Unified auth context is in place
- App routes were rewritten around the new auth flow
- Borrower/Lender mode toggle component exists and is used in dashboard navigation
- Close button component exists
- Copy-protection styles were added to landing and auth pages
- Hidden college portal access is wired through repeated IRA-logo taps on auth/landing pages
- Demo student accounts A-E are present in both frontend demo cards and backend auth logic

### Key Files

- `src/pages/SignUpPage.tsx`
- `src/pages/SignInPage.tsx`
- `src/lib/auth.tsx`
- `src/components/ModeToggle.tsx`
- `src/components/CloseButton.tsx`
- `src/components/DashboardNav.tsx`
- `src/App.tsx`
- `api/auth.js`

### Notes

- The old `/auth` path now redirects to `/signin`
- One dashboard guard still navigates to `/auth`, but the redirect keeps the flow working

## Phase 2 - KYC, Wallets & IDs

Status: `Mostly Complete`

### Delivered

- Onboarding flow follows the intended progression:
  - Aadhaar
  - PAN
  - UPI
  - Batua activation
  - Education verification
- DigiLocker-style Aadhaar/PAN verification is simulated
- Wallet system exists with:
  - Batua Locked
  - Batua Unlocked
  - Tijori
- Batua activation with the `Rs 3` seed flow is implemented
- UPI add-money flow credits Batua Locked
- Allowed internal wallet transfers are implemented
- Numeric account-ID utility functions exist
- Education verification captures university, college, course, and year inputs

### Key Files

- `src/pages/Onboarding.tsx`
- `src/components/WalletPanel.tsx`
- `src/lib/idGenerator.ts`
- `api/kyc.js`
- `api/wallets.js`

### Remaining Work

- KYC persistence is simplified and currently promotes the profile aggressively to active status
- Lending/Borrowing account IDs are generated in UI/demo flows, but full end-to-end persistence is still lightweight
- Educational approval is still demo-grade rather than fully connected to college-admin decisions in Supabase

## Phase 3 - Lending Engine & ML Matching

Status: `Mostly Complete`

### Delivered

- Final cumulative interest policy is implemented in shared and server-side logic
- The policy now reflects:
  - milestone-based cumulative simple interest
  - 24-hour minimum `1%` interest
  - Shri Score tier multipliers
  - final max loan caps:
    - Newbie `Rs 5000`
    - Bronze `Rs 6000`
    - Silver `Rs 7000`
    - Gold `Rs 8500`
    - Platinum `Rs 10000`
- Loan preview and loan creation are aligned to the same policy
- Repayments now use:
  - actual days held
  - simple escalating late penalty
  - `85/15` split for regular interest
  - `60/40` split for penalty
  - final Shri Score updates
- Marketplace and investment flows exist
- Partial funding logic exists
- Friend-request acceptance now creates real loans with the same policy logic
- Matching API exists with the 8-priority scenario approach
- Transaction logging API exists

### Key Files

- `src/lib/iraPolicy.ts`
- `src/components/LiveCalculator.tsx`
- `src/components/InterestTable.tsx`
- `src/pages/dashboard/BorrowTab.tsx`
- `api/loans.js`
- `api/investments.js`
- `api/matching.js`
- `api/repayments.js`
- `api/transactions.js`
- `api/friend-requests.js`
- `ira_ml_policy.py`

### Remaining Work

- Matching notifications are still simplified and not fully risk-weighted beyond the current ranking logic
- Partial-payment handling is only partially modeled server-side and does not yet have a dedicated product flow
- Some older pages still present legacy display assumptions and should continue being normalized

## Phase 4 - Guarantor, Friend & Chat

Status: `Partial`

### Delivered

- Guarantor API includes strong validation rules:
  - exactly 2 guarantors
  - no self-guarantee
  - no mutual guarantorship
  - guarantor KYC required
  - maximum guaranteed-user count
  - removal blocked for active-loan cases
- Friend/private loan request modal exists
- Friend-loan requests can be sent and negotiated at a basic level
- Accepted friend requests can create real funded loans

### Key Files

- `api/guarantors.js`
- `src/components/FriendRequestModal.tsx`
- `api/friend-requests.js`
- `src/pages/NewDashboard.tsx`

### Remaining Work

- No in-app chat/messages system is implemented yet
- No `ChatPanel` or `api/messages.js` currently exists
- `src/pages/dashboard/FriendsTab.tsx` is still a placeholder
- The dedicated friend system is not fully aligned yet
- `api/friends.js` appears stale and still references older table/column shapes
- The full repayment chain from borrower to guarantors is not implemented yet

## Phase 5 - Dashboard, Shri Score & College

Status: `Partial`

### Delivered

- Dashboard shell and routing exist
- Dashboard navigation supports borrower/lender mode switching
- Dashboard home view exists and is connected to wallet/loan/investment data
- Wallet panel is integrated into the authenticated dashboard
- Shri Score UI now reflects the real `0-1000` policy bands
- Profile page exists and now displays final tier ranges and rate-card values
- Demo college portal exists with:
  - college name
  - college ID
  - password
  - demo credential cards
- Transactions API supports filtering and intentionally blocks deletion

### Key Files

- `src/pages/DashboardPage.tsx`
- `src/pages/dashboard/DashboardHome.tsx`
- `src/components/DashboardNav.tsx`
- `src/components/TrustScore.tsx`
- `src/pages/ProfilePage.tsx`
- `src/pages/CollegePortal.tsx`
- `data/demo-colleges.json`
- `api/transactions.js`

### Remaining Work

- `src/pages/dashboard/LendTab.tsx` is still a placeholder
- `src/pages/dashboard/FriendsTab.tsx` is still a placeholder
- `src/pages/dashboard/ProfileTab.tsx` is still a placeholder
- There is no dedicated transaction-history page yet
- Account closure flow is not implemented
- College portal is still demo-data driven rather than fully connected to live verification records
- Some UI copy still says `Trust Score` instead of `Shri Score`

## Phase 6 - Polish & Final Integration

Status: `Partial`

### Delivered

- Page transitions are present
- Custom cursor modes exist for default, borrower, lender, and college contexts
- Landing/auth copy protection exists
- Right-click is blocked on the landing page
- Hidden college-portal shortcut exists on landing/sign-in/sign-up
- Landing page behavior adapts for logged-in users
- Contact email section was added to the landing page
- Calculator/table displays are aligned to the final policy

### Key Files

- `src/index.css`
- `src/components/CoinCursor.tsx`
- `src/pages/LandingPage.tsx`
- `src/pages/SignInPage.tsx`
- `src/pages/SignUpPage.tsx`
- `src/components/Navbar.tsx`

### Remaining Work

- Full end-to-end QA and route cleanup are still needed
- Some legacy pages and endpoints remain in the codebase as migration leftovers
- Final dashboard completion is required before Phase 6 can be marked complete
- Production hardening for messaging, collections, and admin flows is still pending

## Demo Access Summary

### Demo Student Accounts

The sign-in page exposes 5 password-login demo users:

- A: Aarav Sharma
- B: Vihaan Mehta
- C: Diya Patil
- D: Riya Menon
- E: Karthik Iyer

Reference files:

- `src/pages/SignInPage.tsx`
- `api/auth.js`

### Demo College Access

The college portal currently reads from demo JSON data and requires:

- college name
- college ID
- password

Reference files:

- `src/pages/CollegePortal.tsx`
- `data/demo-colleges.json`

## Current Risks and Cleanup Targets

- `api/friends.js` still references older table names and should be rewritten before treating the friend system as complete
- `api/accounts.js` still targets `ira_accounts`, which does not match the newer `ira_users` direction used elsewhere
- Several dashboard tabs are placeholders and make the dashboard look more complete than it really is
- The repayment engine is now policy-aligned, but the product still needs a true partial-payment flow
- KYC and college verification are functional in demo form, but not yet production-grade approval pipelines

## Recommended Next Steps

1. Finish Phase 4 by replacing placeholder friend/dashboard pieces and adding chat
2. Complete Phase 5 dashboard tabs and transaction-history UI
3. Replace stale endpoints such as `api/friends.js` and `api/accounts.js`
4. Add a real partial-payment flow to match the repayment policy fully
5. Do a final naming pass to move remaining `Trust Score` UI copy to `Shri Score`
