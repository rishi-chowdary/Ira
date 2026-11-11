# 🪙 IRA — Student P2P Lending Platform
## 05. System Architecture & Component Interaction

---

## 🏛️ High-Level Architectural Diagram

```mermaid
flowchart TD
    subgraph ClientLayer["🖥️ Frontend Client (React 18 + Vite)"]
        UI["React SPA Pages (Dashboard, Marketplace, College)"]
        State["AuthContext & API Client (Axios)"]
        UI --> State
    end

    subgraph APILayer["⚙️ API Gateway (Express.js / Node.js)"]
        MW["Middleware (JWT Auth, Helmet, Rate Limit, ErrorHandler)"]
        Routes["API Routes (Auth, Loans, College, Users, Admin)"]
        Lib["Core Services (Tokens, Passwords, Store, Notifications)"]
        MW --> Routes
        Routes --> Lib
    end

    subgraph DataLayer["💾 Data & ML Tier"]
        DB[(Live Database Engine - SQLite ira.db / PostgreSQL)]
        JSONStore[(Synchronized Atomic Store - store.json)]
        MasterTables[(Schema Tables: interest_slabs, comparison_rates, testimonials)]
        MLPolicy["Python ML Risk & Matching Engine (ira_ml_policy.py)"]
        DB <--> JSONStore
        DB --- MasterTables
    end

    State -- "REST JSON (Bearer JWT)" --> MW
    Lib <--> DB
    Routes -.-> MLPolicy
```

---

## 🔄 Core Data Flow: The Loan Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Borrower as 🎓 Student Borrower
    participant Web as 💻 IRA Frontend
    participant API as ⚙️ Express Backend
    participant ML as 🧠 ML Risk Engine
    actor Lender as 💰 Student Lender

    Borrower->>Web: Request Loan (₹1,000 for 14 Days)
    Web->>API: POST /api/loans (Bearer Token)
    API->>ML: Evaluate Shri Score & Tier Cap
    ML-->>API: Approved (Tier: Silver, Rate: 9% * 0.8x = 7.2%)
    API->>API: Create Loan in 'pending' status
    API-->>Web: Loan Listed in Marketplace

    Lender->>Web: Browse Marketplace & Select Loan
    Web->>API: POST /api/loans/:id/fund
    API->>API: Deduct ₹1,000 from Lender Wallet into Escrow
    API->>API: Disburse ₹1,000 to Borrower Wallet
    API-->>Lender: Confirmation & Repayment Due Date

    Borrower->>Web: Click 'Repay Loan'
    Web->>API: POST /api/loans/:id/repay
    API->>API: Deduct ₹1,000 + ₹72 Interest from Borrower
    API->>API: Credit ₹1,000 Principal + ₹61.20 (85%) to Lender
    API->>API: Retain ₹10.80 (15%) Platform Fee
    API->>API: Increment Borrower Shri Score (+15 pts)
    API-->>Borrower: Loan Closed Successfully
```

---

## 🧩 Architectural Component Responsibilities

| Component | Technology | Primary Responsibility |
|---|---|---|
| `frontend/src/App.tsx` | React 18, React Router v6 | Client routing, page hierarchy, route protection guards. |
| `frontend/src/services/api.ts` | Axios | Centralized HTTP interceptor with automatic token attachment. |
| `frontend/src/contexts/AuthContext.tsx` | React Context API | User session persistence, login/logout, and demo user switching. |
| `backend/server.js` | Express.js (ESM) | HTTP server bootstrapping, route mounting, and CORS configuration. |
| `backend/middleware/auth.js` | jsonwebtoken | JWT token verification, role enforcement (`user`, `college`, `admin`). |
| `backend/lib/store.js` | Node.js fs/promises | Thread-safe atomic JSON file operations for high-speed local persistence. |
| `backend/lib/passwords.js` | bcrypt | Salted password hashing, verification, and email normalisation. |
| `backend/lib/notifications.js` | Nodemailer / Twilio mock | Dispatching email OTPs, loan disbursement, and repayment notices. |
| `database/schema.sql` | PostgreSQL | 24 relational tables defining foreign keys, constraints, and audit logs. |
| `ml/ira_ml_policy.py` | Python 3 | High-precision Decimal loan matching, interest schedules, and Shri score adjustments. |
