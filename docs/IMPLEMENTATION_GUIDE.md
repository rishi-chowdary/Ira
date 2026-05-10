# Agora Platform - Implementation & Integration Guide

## Quick Start

### 1. Environment Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Required env vars:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

### 2. Backend API Routes (Express Setup)

```javascript
// app.js or server.js
const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Student APIs
const studentAPI = require('./api/students');
app.post('/api/student/register', studentAPI.handleStudentRegister);
app.post('/api/student/verify-otp', studentAPI.handleVerifyOTP);
app.post('/api/student/kyc', studentAPI.handleKYC);
app.post('/api/student/activate-batua', studentAPI.handleActivateBatua);
app.post('/api/student/college-verification', studentAPI.handleCollegeVerification);
app.get('/api/student/dashboard', studentAPI.handleStudentDashboard);
app.post('/api/student/login', studentAPI.handleStudentLogin);
app.post('/api/student/change-password', studentAPI.handleChangePassword);

// Loans APIs
const loansAPI = require('./api/loans');
app.post('/api/loans/request', loansAPI.handleLoanRequest);
app.get('/api/loans/:loanId', loansAPI.handleGetLoan);
app.post('/api/loans/:loanId/match', loansAPI.handleLoanMatching);
app.post('/api/loans/:loanId/disburse', loansAPI.handleLoanDisbursal);
app.get('/api/loans/borrower/:borrowerId', loansAPI.handleGetBorrowerLoans);
app.get('/api/loans/lender/:lenderId', loansAPI.handleGetLenderInvestments);

// Repayments APIs
const repaymentsAPI = require('./api/repayments');
app.get('/api/repayments/loan/:loanId', repaymentsAPI.handleGetRepaymentSchedule);
app.post('/api/repayments/:repaymentId/pay', repaymentsAPI.handleMakeRepayment);
app.get('/api/repayments/borrower/:borrowerId', repaymentsAPI.handleGetBorrowerRepayments);
app.post('/api/repayments/:loanId/mark-default', repaymentsAPI.handleMarkDefault);
app.get('/api/repayments/portfolio/:lenderId', repaymentsAPI.handleGetLenderPortfolio);

// Friends APIs
const friendsAPI = require('./api/friends-api');
app.post('/api/friends/add', friendsAPI.handleAddFriend);
app.get('/api/friends/:userId', friendsAPI.handleGetFriendsrends);
app.post('/api/friends/:friendshipId/accept', friendsAPI.handleAcceptFriend);
app.post('/api/friends/:friendshipId/reject', friendsAPI.handleRejectFriend);
app.post('/api/friends/endorse', friendsAPI.handleEndorseFriend);
app.get('/api/friends/:userId/endorsements', friendsAPI.handleGetEndorsements);
app.post('/api/friends/:userId/block', friendsAPI.handleBlockUser);

// College APIs
const collegeAPI = require('./api/college-api');
app.post('/api/college/register', collegeAPI.handleCollegeRegister);
app.post('/api/college/admin-register', collegeAPI.handleAdminRegister);
app.get('/api/college/:collegeId/pending-students', collegeAPI.handleGetPendingStudents);
app.post('/api/college/approve-student', collegeAPI.handleApproveStudent);
app.post('/api/college/reject-student', collegeAPI.handleRejectStudent);
app.get('/api/college/:collegeId/stats', collegeAPI.handleGetCollegeStats);
app.post('/api/college/:collegeId/settings', collegeAPI.handleUpdateCollegeSettings);

// Notifications APIs
const notificationsAPI = require('./api/notifications-api');
app.get('/api/notifications/:userId', notificationsAPI.handleGetNotifications);
app.post('/api/notifications/:notificationId/read', notificationsAPI.handleMarkAsRead);
app.post('/api/notifications/read-all', notificationsAPI.handleMarkAllAsRead);
app.delete('/api/notifications/:notificationId', notificationsAPI.handleDeleteNotification);
app.get('/api/notifications/:userId/preferences', notificationsAPI.handleGetPreferences);
app.post('/api/notifications/:userId/preferences', notificationsAPI.handleUpdatePreferences);

// Trust Score APIs
const trustScoreAPI = require('./api/trustScore');
app.get('/api/trust-score/:userId', (req, res) => {
  trustScoreAPI.calculateShriScore(req.params.userId)
    .then(score => res.json(score))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Start server
app.listen(3001, () => console.log('Server running on port 3001'));
```

---

## Frontend Integration

### 1. React Components Structure

```
src/
├── components/
│   ├── Auth/
│   │   ├── RegisterForm.tsx
│   │   ├── LoginForm.tsx
│   │   ├── OTPVerification.tsx
│   │   └── PasswordReset.tsx
│   ├── KYC/
│   │   ├── KYCForm.tsx
│   │   └── DocumentUpload.tsx
│   ├── Wallet/
│   │   ├── WalletDisplay.tsx
│   │   ├── ActivationFlow.tsx
│   │   └── TransactionHistory.tsx
│   ├── Loans/
│   │   ├── LoanRequest.tsx
│   │   ├── LoanList.tsx
│   │   ├── LoanDetail.tsx
│   │   └── LoanMatching.tsx
│   ├── Repayments/
│   │   ├── RepaymentSchedule.tsx
│   │   ├── RepaymentForm.tsx
│   │   └── RepaymentHistory.tsx
│   ├── Friends/
│   │   ├── FriendsList.tsx
│   │   ├── FriendRequests.tsx
│   │   └── Endorsements.tsx
│   ├── Dashboard/
│   │   ├── StudentDashboard.tsx
│   │   ├── LenderDashboard.tsx
│   │   └── CollegeDashboard.tsx
│   └── Notifications/
│       ├── NotificationCenter.tsx
│       ├── NotificationBell.tsx
│       └── NotificationPreferences.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useLoans.ts
│   ├── useRepayments.ts
│   ├── useFriends.ts
│   └── useNotifications.ts
└── services/
    ├── api.ts
    ├── studentService.ts
    ├── loansService.ts
    ├── repaymentsService.ts
    ├── friendsService.ts
    └── notificationsService.ts
```

### 2. API Service Layer Example

```typescript
// services/loansService.ts
import api from './api';

export const loansService = {
  requestLoan: async (borrowerId: number, loanData: LoanRequest) => {
    const response = await api.post('/api/loans/request', {
      borrower_id: borrowerId,
      ...loanData
    });
    return response.data;
  },

  getLoan: async (loanId: string) => {
    const response = await api.get(`/api/loans/${loanId}`);
    return response.data;
  },

  matchLoan: async (loanId: string) => {
    const response = await api.post(`/api/loans/${loanId}/match`);
    return response.data;
  },

  disburseLoan: async (loanId: string) => {
    const response = await api.post(`/api/loans/${loanId}/disburse`);
    return response.data;
  },

  getBorrowerLoans: async (borrowerId: number) => {
    const response = await api.get(`/api/loans/borrower/${borrowerId}`);
    return response.data;
  }
};
```

---

## Database Setup

### 1. Supabase Migration

```sql
-- Run this SQL in Supabase SQL Editor
-- Create all required tables (see DATABASE_SCHEMA.sql)

-- Then create indexes for performance
CREATE INDEX idx_loans_borrower_active ON loans(borrower_id, status);
CREATE INDEX idx_investments_loan_active ON investments(loan_id, status);
CREATE INDEX idx_repayments_due ON repayments(due_date, status);

-- Enable Row Level Security (RLS)
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE repayments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data" ON user_accounts
  FOR SELECT USING (auth.uid()::text = id);
```

### 2. Scheduled Jobs

```javascript
// jobs/shriScoreRecalculation.js
const schedule = require('node-schedule');
const trustScore = require('../api/trustScore');

// Recalculate all Shri Scores daily at 2 AM
schedule.scheduleJob('0 2 * * *', async () => {
  console.log('Starting daily Shri Score recalculation...');
  try {
    const result = await trustScore.recalculateAllScores();
    console.log(`Recalculation complete: ${result.successCount} success, ${result.errorCount} errors`);
  } catch (error) {
    console.error('Recalculation failed:', error);
  }
});

// Check for overdue repayments every hour
schedule.scheduleJob('0 * * * *', async () => {
  // TODO: Implement overdue checking
  console.log('Checking for overdue repayments...');
});
```

---

## Workflow Examples

### Complete Student Borrowing Flow

```typescript
// 1. Student registers
const registerResponse = await studentService.register({
  email: 'student@college.edu',
  phone: '9876543210',
  fullName: 'John Doe'
});

// 2. Verify OTP
const verifyResponse = await studentService.verifyOTP({
  userId: registerResponse.user_id,
  otp: '123456'
});

// 3. Submit KYC
const kycResponse = await studentService.submitKYC({
  userId: registerResponse.user_id,
  aadhaarNumber: '123456789012',
  panNumber: 'ABCDE1234F',
  // ... more fields
});

// 4. Activate wallet
const walletResponse = await studentService.activateBatua({
  userId: registerResponse.user_id,
  paymentMethod: 'upi',
  upiRefId: 'UPI123456'
});

// 5. Submit college verification
const collegeResponse = await studentService.collegeVerification({
  userId: registerResponse.user_id,
  collegeCode: 'MIT001',
  enrollmentNumber: 'MT20B001',
  feeReceiptUrl: 'https://...',
  feeAmount: 50000
});

// 6. Wait for college approval (admin approves)
// College admin calls: collegeAPI.handleApproveStudent()

// 7. Request a loan
const loanRequestResponse = await loansService.requestLoan(registerResponse.user_id, {
  principalAmount: 50000,
  tenureMonths: 12,
  interestRate: 15,
  purpose: 'semester_fees'
});

// 8. Loan gets matched (automatically via matchLoan or manual by system)
const matchResponse = await loansService.matchLoan(loanRequestResponse.loan.loan_id);

// 9. Disburse loan
const disburseResponse = await loansService.disburseLoan(loanRequestResponse.loan.loan_id);

// 10. Repay loan (monthly)
const repaymentResponse = await repaymentsService.makeRepayment(repaymentId, {
  amount: 4437.97,
  paymentMethod: 'wallet'
});

// 11. Check updated Shri Score
const score = await trustService.getShriScore(registerResponse.user_id);
```

---

## Testing

### API Testing with Postman

1. **Collection Setup**
   - Import: `POSTMAN_COLLECTION.json`
   - Set environment variables: `BASE_URL`, `USER_ID`, `AUTH_TOKEN`

2. **Test Scenarios**
   ```
   Student Registration Flow
   ├── Register
   ├── Verify OTP
   ├── Submit KYC
   ├── Activate Wallet
   └── College Verification
   
   Loan Flow
   ├── Request Loan
   ├── Match Loan
   ├── Disburse Loan
   └── Get Dashboard
   
   Repayment Flow
   ├── Get Schedule
   ├── Make Payment
   ├── Check Status
   └── View History
   ```

---

## Monitoring & Analytics

### 1. Key Metrics to Track

```javascript
// Metrics dashboard
const metrics = {
  // Adoption
  totalUsers: 0,
  activeStudents: 0,
  activeLenders: 0,
  collegesOnboarded: 0,
  
  // Lending Activity
  totalLoansRequested: 0,
  totalLoansMatched: 0,
  totalLoansDisbursed: 0,
  totalLoanAmount: 0,
  
  // Repayment
  totalRepaymentRequests: 0,
  onTimePaymentRate: 0,
  defaultRate: 0,
  
  // Platform Health
  averageShriScore: 0,
  averageLoanSize: 0,
  averageLoanDuration: 0
};
```

---

## Security Checklist

- [ ] Enable HTTPS in production
- [ ] Implement JWT authentication
- [ ] Add rate limiting
- [ ] Enable CORS properly
- [ ] Validate all inputs
- [ ] Hash passwords with bcrypt
- [ ] Enable SQL injection prevention
- [ ] Add logging and monitoring
- [ ] Implement audit trails
- [ ] Regular security audits

---

## Deployment Checklist

- [ ] Set up CI/CD pipeline
- [ ] Configure production database
- [ ] Set up email service
- [ ] Configure SMS service
- [ ] Set up payment gateway
- [ ] Configure backups
- [ ] Set up monitoring
- [ ] Document API endpoints
- [ ] Create runbooks for common issues
- [ ] Train support team

---

## Support & Resources

- **API Documentation**: See API_GUIDE.md
- **Database Schema**: See DATABASE_SCHEMA.sql
- **GitHub**: github.com/agora/platform
- **Issues**: github.com/agora/platform/issues
- **Email**: support@agora.edu
