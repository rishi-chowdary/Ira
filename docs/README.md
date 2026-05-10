# IRA Student P2P Lending Platform

IRA is a React + TypeScript + Vite application for a student-focused peer-to-peer lending platform, backed by Vercel-style serverless API routes and Supabase.

This repository is no longer a starter template. It contains a custom product implementation with:

- Separate `Sign Up` and `Sign In` flows
- Demo student accounts and a demo college portal
- KYC/onboarding, wallet compartments, and ID utilities
- Marketplace and loan request flows
- Final cumulative interest-policy helpers and repayment math
- Dashboard shells for borrower/lender workflows

## Documentation

- Full implementation status: [docs/implementation-phases.md](docs/implementation-phases.md)
- Policy engine reference: [`ira_ml_policy.py`](ira_ml_policy.py)

## Stack

- Frontend: React 19, TypeScript, Vite, TailwindCSS v4, Framer Motion
- Backend: Serverless API routes in `api/`
- Data layer: Supabase

## Key Routes

- `/` - landing page
- `/signup` - student sign-up
- `/signin` - student sign-in and demo login
- `/dashboard/*` - authenticated dashboard shell
- `/marketplace` - public lending marketplace
- `/loan/:id` - loan detail view
- `/repay/:id` - repayment flow
- `/onboarding` - KYC, wallet, and education verification
- `/college-portal` - demo college portal

## Project Status Snapshot

- Phase 1 - Complete
- Phase 2 - Mostly complete
- Phase 3 - Mostly complete
- Phase 4 - Partial
- Phase 5 - Partial
- Phase 6 - Partial

See [docs/implementation-phases.md](docs/implementation-phases.md) for the detailed breakdown, completed scope, key files, and remaining gaps.

## Local Development

Install dependencies and run the Vite app:

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build
npm run lint
npm run preview
```

## Important Source Files

- Shared policy helper: `src/lib/iraPolicy.ts`
- Auth context: `src/lib/auth.tsx`
- App routes: `src/App.tsx`
- Lending API: `api/loans.js`
- Repayments API: `api/repayments.js`
- Matching API: `api/matching.js`
- Wallet API: `api/wallets.js`
- Demo auth + demo accounts: `api/auth.js`

## Notes

- Some newer dashboard sections are fully implemented, while others are still placeholders.
- Some older endpoints remain in the repo and should be treated as migration targets rather than finished production paths.
- The canonical phase-by-phase status is maintained in [docs/implementation-phases.md](docs/implementation-phases.md).
