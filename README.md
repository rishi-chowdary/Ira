# 🪙 IRA — Student P2P Lending Platform

**India's First Campus-to-Campus Peer Lending Network**

A full-stack fintech platform enabling college students to borrow and lend money peer-to-peer, powered by an automated trust scoring system (**Shri Score**), ML-driven loan matching, and institutional verification.

---

## 📁 Clean, Modular Architecture

The repository is organized into distinct, intuitive top-level directories:

```
IRA_Project/
├── frontend/               # Complete React 18 + TypeScript + Vite SPA
│   ├── src/                # Pages, reusable UI components, and state
│   ├── public/             # Static web assets and icons
│   ├── index.html          # Frontend HTML entry point
│   ├── vite.config.ts      # Vite configuration
│   └── package.json        # Frontend dependencies & build scripts
│
├── backend/                # Complete Node.js + Express.js API Server
│   ├── server.js           # Express API entry point (Port 5001)
│   ├── routes/             # Dedicated API routes (Auth, Loans, College, etc.)
│   ├── middleware/         # JWT verification, security headers, error handling
│   ├── lib/                # Core utilities (Tokens, Passwords, Store, Notifications)
│   ├── scripts/            # Database migration and ID generator scripts
│   └── package.json        # Backend dependencies & scripts
│
├── database/               # Relational Database & Reference Data
│   ├── schema.sql          # Canonical 24-table PostgreSQL schema
│   ├── seeds/              # Institutional demo seeds
│   └── reference_data/     # State, district, and college CSV hierarchy
│
├── ml/                     # Risk Scoring & Matching Engine
│   └── ira_ml_policy.py    # Python policy engine & loan matching model
│
├── docx/                   # Comprehensive Project Documentation (Markdown)
│   ├── 01_OVERVIEW.md      # Executive summary, problem & solution (overview.md)
│   ├── 02_REQUIREMENTS.md  # System & business requirements (requirements.md)
│   ├── 03_ROADMAP.md       # Implementation milestones & roadmap (roadmap.md)
│   ├── 04_THEME_AND_UI.md  # Visual theme, colors, coin cursor & animations (theme.md)
│   ├── 05_ARCHITECTURE.md  # System architecture & sequence diagrams (architecture.md)
│   ├── 06_DATABASE_SCHEMA.md # Full 24-table database schema (database.md)
│   ├── 07_API_REFERENCE.md # Complete REST API reference (api.md)
│   ├── 08_ML_AND_SCORING.md# Shri Score tiers & interest formulas (ml_scoring.md)
│   └── 09_COLLEGE_SYSTEM.md# Institution verification flow & IDs (college_system.md)
│
├── scripts/                # Development runner
│   └── dev.js              # One-command unified launcher for frontend + backend
│
└── package.json            # Root workspace task runner
```

---

## 🚀 Quick Start (Single Command)

To start both the frontend and backend servers concurrently:

```bash
cd /Users/akshaysinghchauhan/Downloads/IRA_Project

# Start both servers together:
npm run dev
```

- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5001/api](http://localhost:5001/api)

---

## 🛠️ Individual Service Commands

### Frontend Only
```bash
cd frontend
npm run dev        # Starts Vite dev server
npm run build      # Builds production bundle
```

### Backend Only
```bash
cd backend
npm run dev        # Starts Express server with nodemon
npm run migrate    # Applies database schema to PostgreSQL
```

---

## 🔑 Demo Test Credentials

All demo accounts use password: **`demo123`** (Demo OTP: `123456`)

| Role | Email / Code | Notes |
|---|---|---|
| **Student (Bronze)** | `demo@symbiosis.edu` | Standard borrower profile |
| **Student (Platinum)** | `sneha@college.edu` | High-limit lender profile |
| **College Portal** | `91 58 101 450 001 001 01 2024 2028` | Institutional login (Pass: `college123`) |
| **Platform Admin** | `admin@ira.co.in` | Full override and approval access (Pass: `admin123`) |

---

## 📚 Documentation Index

For an in-depth understanding of any aspect of the project, open the markdown guides in [`docx/`](docx/):

1. [**Overview & Concept**](docx/01_OVERVIEW.md) — What IRA does, student credit problem, and solution.
2. [**Requirements**](docx/02_REQUIREMENTS.md) — Detailed functional and non-functional requirements.
3. [**Roadmap**](docx/03_ROADMAP.md) — Implementation phases from MVP to production UPI.
4. [**Theme & UI**](docx/04_THEME_AND_UI.md) — Brand colors, glowing ₹ coin cursor, and interactive components.
5. [**Architecture**](docx/05_ARCHITECTURE.md) — End-to-end component flow and sequence diagrams.
6. [**Database Schema**](docx/06_DATABASE_SCHEMA.md) — 24 tables across 7 architectural tiers.
7. [**API Reference**](docx/07_API_REFERENCE.md) — Complete REST endpoints and request specs.
8. [**ML & Scoring**](docx/08_ML_AND_SCORING.md) — Shri Score tiers, interest slabs, and matching math.
9. [**College System**](docx/09_COLLEGE_SYSTEM.md) — College verification and Program ID generation.
