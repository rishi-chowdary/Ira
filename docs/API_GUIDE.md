# Agora Platform - Complete API Reference Guide

## Overview
Agora is a peer-to-peer student lending platform built on monthly EMI-based loans with college verification and Shri Score-based borrowing limits.

---

## 1. STUDENT REGISTRATION & AUTHENTICATION

### 1.1 Register Student Account
**POST** `/api/student/register`

**Request:**
```json
{
  "email": "student@college.edu",
  "phone": "9876543210",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "user_id": 1,
  "email": "student@college.edu",
  "otp_sent": true,
  "next_step": "verify_otp"
}
```

### 1.2 Verify OTP
**POST** `/api/student/verify-otp`

**Request:**
```json
{
  "user_id": 1,
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "next_step": "kyc"
}
```

### 1.3 Student Login
**POST** `/api/student/login`

**Request:**
```json
{
  "email": "student@college.edu",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "student@college.edu",
    "full_name": "John Doe",
    "borrowing_account_id": "91_001_202401_00001"
  },
  "sessionToken": "MTotwLTA="
}
```

### 1.4 Change Password
**POST** `/api/student/change-password`

**Request:**
```json
{
  "user_id": 1,
  "currentPassword": "TempPassword123!",
  "newPassword": "NewSecured@1234",
  "confirmPassword": "NewSecured@1234"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 2. KYC (KNOW YOUR CUSTOMER)

### 2.1 Submit KYC Data
**POST** `/api/student/kyc`

**Request:**
```json
{
  "user_id": 1,
  "aadhaar_number": "123456789012",
  "aadhaar_name": "John Doe",
  "pan_number": "ABCDE1234F",
  "pan_name": "John Doe",
  "date_of_birth": "2004-01-15",
  "gender": "M",
  "address": {
    "street": "123 Main Street",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "KYC verified successfully",
  "kyc_id": 1,
  "next_step": "activate_batua"
}
```

---

## 3. WALLET ACTIVATION

### 3.1 Activate Batua Wallet (₹3 Fee)
**POST** `/api/student/activate-batua`

**Request:**
```json
{
  "user_id": 1,
  "payment_method": "upi",
  "upi_ref_id": "UPI123456789"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Batua wallet activated successfully",
  "wallet": {
    "wallet_id": "BATUA_1_1705316400000",
    "locked_balance": 1.00,
    "unlocked_balance": 1.00,
    "total_balance": 2.00
  },
  "activation_fee": 3.00,
  "next_step": "college_verification"
}
```

---

## 4. COLLEGE VERIFICATION

### 4.1 Submit College Verification
**POST** `/api/student/college-verification`

**Request:**
```json
{
  "user_id": 1,
  "college_code": "MIT001",
  "enrollment_number": "MT20B001",
  "fee_receipt_url": "https://example.com/receipt.pdf",
  "fee_amount": 50000
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "College verification submitted. Awaiting college admin approval.",
  "approval_id": 1,
  "status": "pending",
  "next_step": "wait_for_college_approval"
}
```

### 4.2 Get Student Dashboard
**GET** `/api/student/dashboard?user_id=1`

**Response (200):**
```json
{
  "user": {
    "full_name": "John Doe",
    "email": "student@college.edu",
    "borrowing_account_id": "91_001_202401_00001",
    "college_approval_status": "approved",
    "kyc_status": "verified",
    "batua_activated": true
  },
  "wallet": {
    "wallet_id": "BATUA_1_1705316400000",
    "locked_balance": 1.00,
    "unlocked_balance": 51.00,
    "total_balance": 52.00
  },
  "trust_score": {
    "shri_score": 500,
    "total_borrowed": 0.00,
    "total_repaid": 0.00,
    "on_time_payments": 0,
    "late_payments": 0
  },
  "active_loans": 0,
  "guarantors": 0
}
```

---

## 5. SHRI SCORE (TRUST SCORE)

### 5.1 Understand Shri Score

**Base Score: 500**
**Range: 0-1000**

#### Tiers:
```
Tier A (800-1000): Excellent  → Max Loan: ₹500,000
Tier B (600-799):  Good       → Max Loan: ₹250,000
Tier C (400-599):  Fair       → Max Loan: ₹100,000
Tier D (0-399):    Poor       → Max Loan: ₹25,000
```

#### Components:
1. **Borrowing (+)**: More borrowing history = higher score
   - First loan bonus: +50
   - Multiple loans: +20
   - Loan size: +0.0001 per rupee

2. **Repayment (+/−)**: Payment timeliness affects score
   - On-time payment: +10
   - Early payment: +25
   - Full loan completion: +50
   - Late payment: −20
   - Default: −100

3. **Risk (−)**: Risk factors reduce score
   - Loan default: −150
   - High default rate: −50
   - High utilization (>80%): −10

4. **Behavior (+)**: Good behavior increases score
   - College approval: +40
   - KYC verified: +20
   - Approver guarantor: +30
   - Friend endorsement: +5

---

## 6. FRIEND MANAGEMENT

### 6.1 Add Friend
**POST** `/api/friends/add`

**Request:**
```json
{
  "user_id": 1,
  "friend_id": 2
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Friend request sent",
  "request_id": 1,
  "status": "pending"
}
```

### 6.2 Get Friends List
**GET** `/api/friends/1?status=approved`

**Response (200):**
```json
{
  "user_id": 1,
  "friends": [
    {
      "id": 1,
      "friend_id": 2,
      "friend": {
        "id": 2,
        "full_name": "Jane Smith",
        "email": "jane@college.edu",
        "college_approval_status": "approved"
      },
      "status": "approved",
      "endorsed_count": 3
    }
  ],
  "count": 1
}
```

### 6.3 Accept Friend Request
**POST** `/api/friends/123/accept`

**Request:**
```json
{
  "user_id": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Friend request accepted",
  "friendship_id": 123
}
```

### 6.4 Endorse Friend
**POST** `/api/friends/endorse`

**Request:**
```json
{
  "endorser_id": 1,
  "friend_id": 2,
  "rating": 5,
  "comment": "Very trustworthy person"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Endorsement created successfully",
  "endorsement": {
    "endorser_id": 1,
    "friend_id": 2,
    "rating": 5
  }
}
```

---

## 7. LOANS

### 7.1 Request a Loan
**POST** `/api/loans/request`

**Request:**
```json
{
  "borrower_id": 1,
  "principal_amount": 50000,
  "tenure_months": 12,
  "interest_rate": 15,
  "purpose": "semester_fees",
  "description": "Need funds for 4th semester fees"
}
```

**Response (201):**
```json
{
  "success": true,
  "loan": {
    "loan_id": "LOAN_1_1705316400000",
    "borrower_id": 1,
    "principal_amount": 50000.00,
    "monthly_emi": "4,437.97",
    "tenure_months": 12,
    "interest_rate": 15.00,
    "status": "requested"
  },
  "borrower_score": 500,
  "max_limit": 100000,
  "next_step": "invite_guarantors"
}
```

### 7.2 Match Loan (Peer-to-Peer)
**POST** `/api/loans/LOAN_1_1705316400000/match`

**Response (200):**
```json
{
  "success": true,
  "loan_id": "LOAN_1_1705316400000",
  "matched_amount": 50000.00,
  "principal_amount": 50000.00,
  "remaining_amount": 0.00,
  "status": "matched",
  "matches": [
    {
      "lender_id": 2,
      "amount": 30000.00,
      "type": "friend"
    },
    {
      "lender_id": "DAO_POOL",
      "amount": 20000.00,
      "type": "dao"
    }
  ],
  "next_step": "sign_loan_agreement"
}
```

### 7.3 Disburse Loan
**POST** `/api/loans/LOAN_1_1705316400000/disburse`

**Response (200):**
```json
{
  "success": true,
  "message": "Loan disbursed successfully",
  "loan_id": "LOAN_1_1705316400000",
  "disbursed_amount": 50000.00,
  "borrower_wallet": {
    "unlocked_balance": 51000.00,
    "locked_balance": 1.00,
    "total_balance": 51001.00
  },
  "transaction_id": "TXN_DISBURSE_1_1705316400000"
}
```

---

## 8. REPAYMENTS

### 8.1 Get Repayment Schedule
**GET** `/api/repayments/loan/LOAN_1_1705316400000`

**Response (200):**
```json
{
  "loan": {
    "loan_id": "LOAN_1_1705316400000",
    "principal_amount": 50000.00,
    "monthly_emi": 4437.97,
    "tenure_months": 12,
    "status": "active"
  },
  "schedule": [
    {
      "repayment_id": "REP_LOAN_1_1",
      "month_number": 1,
      "amount": 4437.97,
      "due_date": "2024-02-15",
      "status": "pending"
    },
    // ... more repayments
  ],
  "statistics": {
    "total_repayments": 12,
    "completed": 0,
    "pending": 12,
    "total_amount": 53255.64
  }
}
```

### 8.2 Make a Repayment
**POST** `/api/repayments/REP_LOAN_1_1/pay`

**Request:**
```json
{
  "amount": 4437.97,
  "payment_method": "wallet",
  "borrower_id": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Repayment completed successfully",
  "repayment": {
    "repayment_id": "REP_LOAN_1_1",
    "amount_due": 4437.97,
    "amount_paid": 4437.97,
    "status": "paid",
    "is_early": true,
    "is_late": false
  },
  "transaction_id": "TXN_REPAY_1_1705316400000",
  "score_updated": true
}
```

---

## 9. COLLEGE ADMIN

### 9.1 Register College
**POST** `/api/college/register`

**Request:**
```json
{
  "college_name": "MIT Pondicherry",
  "college_code": "MITY001",
  "city": "Pondicherry",
  "state": "Puducherry",
  "university_code": "PU001",
  "university_name": "Pondicherry University",
  "principal_email": "principal@college.edu",
  "principal_name": "Dr. Ramesh Kumar"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "College registered awaiting admin verification",
  "college": {
    "id": 1,
    "name": "MIT Pondicherry",
    "code": "MITY001",
    "status": "pending"
  }
}
```

### 9.2 Register College Admin
**POST** `/api/college/admin-register`

**Request:**
```json
{
  "college_id": 1,
  "full_name": "Dr. Ramesh Kumar",
  "email": "admin@college.edu",
  "phone": "9876543210",
  "designation": "Dean of Academics"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "College admin registered",
  "admin": {
    "id": 5,
    "email": "admin@college.edu",
    "full_name": "Dr. Ramesh Kumar",
    "role": "college_admin"
  },
  "temporary_password": "TMP20240115A7k9"
}
```

### 9.3 Get Pending Student Approvals
**GET** `/api/college/1/pending-students`

**Response (200):**
```json
{
  "college_id": 1,
  "pending_students": [
    {
      "id": 1,
      "student_id": 10,
      "student": {
        "full_name": "John Doe",
        "email": "john@college.edu"
      },
      "fee_amount": 50000.00,
      "status": "pending",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

### 9.4 Approve Student
**POST** `/api/college/approve-student`

**Request:**
```json
{
  "approval_id": 1,
  "college_id": 1,
  "student_id": 10,
  "notes": "Approved - valid documents"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Student approved successfully",
  "approval_id": 1,
  "student_id": 10
}
```

---

## 10. NOTIFICATIONS

### 10.1 Get Notifications
**GET** `/api/notifications/1?page=1&limit=20&unread_only=true`

**Response (200):**
```json
{
  "user_id": 1,
  "notifications": [
    {
      "id": 1,
      "type": "loan_matched",
      "title": "Loan Matched!",
      "message": "Your ₹50,000 loan has been matched with lenders",
      "is_read": false,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  },
  "unread_count": 5
}
```

### 10.2 Mark Notification as Read
**POST** `/api/notifications/1/read`

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "notification_id": 1
}
```

### 10.3 Get Notification Preferences
**GET** `/api/notifications/1/preferences`

**Response (200):**
```json
{
  "user_id": 1,
  "preferences": {
    "email_notifications": true,
    "push_notifications": true,
    "sms_notifications": false,
    "loan_updates": true,
    "repayment_reminders": true,
    "marketing_emails": false
  }
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400  | Bad Request (validation error) |
| 401  | Unauthorized (authentication failed) |
| 403  | Forbidden (insufficient permissions) |
| 404  | Not Found |
| 409  | Conflict (resource already exists) |
| 500  | Internal Server Error |
| 503  | Service Unavailable |

---

## Rate Limiting

- 100 requests per minute per user
- 1000 requests per minute per API key

---

## Authentication

Most endpoints require Bearer token authentication:

```
Authorization: Bearer <sessionToken>
```

Or use `user_id` in query parameters for simpler endpoints.

---

## Support

For API support, contact: api-support@agora.edu
