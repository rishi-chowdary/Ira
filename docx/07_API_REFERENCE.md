# 🪙 IRA — Student P2P Lending Platform
## 07. REST API Reference

---

## 🌐 Overview & Base URL

All requests use standard JSON payloads and return JSON responses.

```
Base URL: http://localhost:5001/api
```

### Authentication Header
Protected endpoints require a Bearer token:
```http
Authorization: Bearer <access_token>
```

---

## 🔐 Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new student with email/phone | No |
| `POST` | `/api/auth/login` | Email/password or student ID login | No |
| `POST` | `/api/auth/send-otp` | Request OTP via SMS/Email | No |
| `POST` | `/api/auth/verify-otp` | Validate OTP and return auth tokens | No |
| `POST` | `/api/auth/refresh-token` | Exchange refresh token for new access token | Cookie |
| `POST` | `/api/auth/logout` | Invalidate active session and clear cookies | Yes |

---

## 💰 Loan Endpoints (`/api/loans`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/loans` | List user's active/historical loans | Yes (Student) |
| `GET` | `/api/loans/marketplace` | List pending loan requests available for funding | Yes (Student) |
| `POST` | `/api/loans` | Submit new loan request (amount, tenure, purpose) | Yes (Student) |
| `GET` | `/api/loans/:id` | Get details and repayment breakdown for a loan | Yes (Student) |
| `POST` | `/api/loans/:id/fund` | Fund a loan from lender's Batua wallet | Yes (Student) |
| `POST` | `/api/loans/:id/repay` | Repay an active loan (principal + interest) | Yes (Student) |

---

## 🤝 Friends & Guarantors (`/api/friends` & `/api/guarantors`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/friends` | Retrieve user's confirmed campus friends | Yes (Student) |
| `POST` | `/api/friends/request` | Send friend request by email or student ID | Yes (Student) |
| `PUT` | `/api/friends/:id/accept`| Accept an incoming friend request | Yes (Student) |
| `GET` | `/api/guarantors` | List user's active guarantor commitments | Yes (Student) |
| `POST` | `/api/guarantors/request`| Nominate a friend to guarantee a loan request | Yes (Student) |

---

## 🏛️ College Management (`/api/college` & `/api/college-auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/college/register` | Submit new institution registration | No |
| `POST` | `/api/college-auth/login`| Login to institutional College Portal | No |
| `GET` | `/api/college/students` | Get students pending institutional verification | Yes (College) |
| `PUT` | `/api/college/students/:id/verify` | Approve or reject a student's bona fide status | Yes (College) |
| `GET` | `/api/college/programs` | Get all generated College Program IDs | Yes (College) |

---

## 🛡️ Admin Endpoints (`/api/admin`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Platform metrics (GMV, default rate, users) | Yes (Admin) |
| `GET` | `/api/admin/colleges/pending`| List college applications awaiting review | Yes (Admin) |
| `POST` | `/api/admin/colleges/:id/approve`| Approve college registration & generate IDs | Yes (Admin) |
| `POST` | `/api/admin/loans/:id/override`| Administrative override on any loan state | Yes (Admin) |
| `GET` | `/api/admin/export-hierarchy` | Trigger CSV hierarchy snapshot export | Yes (Admin) |
