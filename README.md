# 🪙 Ira — Student P2P Lending Platform

A full-stack peer-to-peer lending platform for college students. Borrow small amounts for emergencies/entertainment, or earn 12–18% returns by lending to peers.

## ✨ Features

- **Vibrant Blue/Green/Red theme** with 15+ CSS @keyframes animations
- **Custom coin cursor** (₹) that glows green on lending pages, red on borrowing pages
- **Floating coins animation** on page load
- **Animated counters** that count up on scroll
- **Trust score system** (Newbie → Platinum, 5 levels)
- **Time-based interest slabs** (0% within 24hr, up to 12% at 30 days)
- **Complete loan lifecycle**: Request → Fund → Repay
- **85/15 revenue split** between lenders and platform
- **Penalty interest** for overdue loans

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### 1. Backend Server
```bash
cd server
npm install
npm run seed     # Create demo data
npm start        # Starts on http://localhost:5000
```

### 2. Frontend App
```bash
cd frontend
npm install
npm run dev      # Starts on http://localhost:3000
```

### 3. Open in Browser
Visit [http://localhost:3000](http://localhost:3000)

## 🔑 Demo Credentials

All accounts use password: **`demo123`**

| Email | Name | Trust Level |
|-------|------|-------------|
| `raj@college.edu` | Raj Sharma | ⭐⭐ Bronze |
| `priya@college.edu` | Priya Patel | ⭐⭐⭐⭐ Gold |
| `arjun@college.edu` | Arjun Kumar | ⭐⭐⭐ Silver |
| `sneha@college.edu` | Sneha Reddy | ⭐⭐⭐⭐⭐ Platinum |
| `demo@student.edu` | Demo Student | ⭐ Newbie |

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, Tailwind CSS, React |
| Backend | Express.js, Node.js |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (jsonwebtoken), bcryptjs |

## 📁 Structure

```
Ira/
├── server/              # Express.js backend
│   ├── db/              # Schema, seed, SQLite database
│   ├── routes/          # Auth, loans, repayments, users
│   ├── utils/           # Interest engine, trust scores
│   └── middleware/      # JWT auth
├── frontend/            # Next.js frontend
│   ├── app/             # Pages (landing, login, register, borrower, lender)
│   ├── components/      # Reusable UI (CoinCursor, FloatingCoins, etc.)
│   └── lib/             # API client
└── README.md
```

## 💡 Demo Flow

1. **Login** as `demo@student.edu` (Newbie) → Go to **Borrower Dashboard**
2. Create a loan request (e.g., ₹1,000 for 7 days)
3. **Logout** → Login as `sneha@college.edu` (Platinum) → Go to **Lender Dashboard**
4. Find the loan request → **Fund** it
5. **Logout** → Login as `demo@student.edu` → Go to **Borrower Dashboard**
6. Click **Repay** on the funded loan → See interest calculation + trust score update!
