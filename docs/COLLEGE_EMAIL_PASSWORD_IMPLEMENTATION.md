# College Email & Password System Implementation Guide

**Date:** 31 March 2026  
**Version:** 1.0  
**Status:** ✅ Complete

## Overview

This document describes the automated college approval email system with temporary password generation and password change functionality. When an admin approves a college, the system automatically:

1. **Generates a temporary password** using the approval timestamp (DDMMYYYYHHMMSS format)
2. **Hashes and stores** the password securely in the database
3. **Sends an approval email** with login credentials and instructions
4. **Provides a secure login portal** for colleges to access their dashboard
5. **Enforces password change** on first login if using temporary password

---

## System Architecture

### 1. Database Changes

**File:** `database/schema.sql`

The `colleges` table was updated to include:
- `email VARCHAR(255)` - College contact email address
- `password_hash VARCHAR(255)` - Bcrypt-hashed password
- `approval_timestamp TIMESTAMP` - When the college was approved
- `is_password_changed BOOLEAN DEFAULT FALSE` - Tracks if college changed from temporary password

**Example:**
```sql
CREATE TABLE colleges (
    id SERIAL PRIMARY KEY,
    code CHAR(3) NOT NULL,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    approval_timestamp TIMESTAMP,
    is_password_changed BOOLEAN DEFAULT FALSE,
    ...
);
```

**Migration Guide:**
```sql
-- Run these queries on your PostgreSQL database
ALTER TABLE colleges ADD COLUMN email VARCHAR(255);
ALTER TABLE colleges ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE colleges ADD COLUMN approval_timestamp TIMESTAMP;
ALTER TABLE colleges ADD COLUMN is_password_changed BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_colleges_email ON colleges(email);
```

---

### 2. API Modules

#### A. Password Utility Module 📚
**File:** `api/passwordUtil.js`

Provides password utilities:

**Functions:**

1. **`generateTemporaryPassword(timestamp)`**
   - Generates password in format: DDMMYYYYHHMMSS
   - Example: `31032026140507` (31st March 2026 at 14:05:07)
   - Parameter: `Date` object (defaults to current time)
   - Returns: String (14 characters)

   ```javascript
   const passwordUtil = require('./passwordUtil');
   const tempPass = passwordUtil.generateTemporaryPassword(new Date());
   // Result: "31032026140507"
   ```

2. **`hashPassword(password)`**
   - Hashes password using PBKDF2 (SHA-256)
   - 100,000 iterations for security
   - Generates random salt
   - Returns: String in format `pbkdf2_sha256$iterations$salt$hash`
   
   ```javascript
   const hash = passwordUtil.hashPassword('SecurePass123!');
   // Result: "pbkdf2_sha256$100000$a7f2c3d4e5f6..."
   ```

3. **`verifyPassword(password, hash)`**
   - Constant-time comparison to prevent timing attacks
   - Returns: Boolean
   
   ```javascript
   const isValid = passwordUtil.verifyPassword('SecurePass123!', storedHash);
   ```

4. **`isTemporaryPassword(password, approvalTimestamp)`**
   - Checks if password matches temporary format
   - Useful for forcing password change on first login
   - Returns: Boolean
   
   ```javascript
   const isTemp = passwordUtil.isTemporaryPassword('31032026140507', approvalDate);
   ```

5. **`validatePasswordStrength(password)`**
   - Validates against security requirements
   - Returns: `{ isValid: boolean, errors: string[] }`
   
   **Password Requirements:**
   - Minimum 8 characters
   - At least one uppercase letter (A-Z)
   - At least one lowercase letter (a-z)
   - At least one digit (0-9)
   - At least one special character (!@#$%^&*)

   ```javascript
   const validation = passwordUtil.validatePasswordStrength('SecurePass123!');
   // Result: { isValid: true, errors: [] }
   ```

---

#### B. Email Service Module 📧
**File:** `api/emailService.js`

Handles all transactional emails.

**Functions:**

1. **`sendApprovalEmail(recipientEmail, collegeName, universityName, programId, tempPassword, options)`**
   
   **Parameters:**
   - `recipientEmail` - College contact email
   - `collegeName` - College name
   - `universityName` - University name
   - `programId` - Generated College Program ID
   - `tempPassword` - Temporary password (DDMMYYYYHHMMSS format)
   - `options` - Optional configuration object
   
   **Options Object:**
   ```javascript
   {
     dashboardUrl: 'https://yourapp.com/college/login',
     appName: 'IRA College Registration System'
   }
   ```

   **Returns:** Promise resolving to:
   ```javascript
   {
     success: true,
     messageId: 'msg_...',
     timestamp: ISO timestamp,
     recipient: email,
     type: 'approval',
     status: 'queued'
   }
   ```

   **Example:**
   ```javascript
   const emailService = require('./emailService');
   
   await emailService.sendApprovalEmail(
     'principal@college.ac.in',
     'MIT College',
     'Savitribai Phule Pune University',
     '91 58 045 012 001 101 01 2025 2029',
     '31032026140507',
     {
       dashboardUrl: 'https://ira-system.com/college/login',
       appName: 'IRA College System'
     }
   );
   ```

   **Email Template Includes:**
   - ✓ College Program ID (for students)
   - ✓ College Code for login
   - ✓ Temporary password
   - ✓ Link to college dashboard
   - ✓ Instructions to change password
   - ✓ Security recommendations
   - ✓ Beautiful HTML template

2. **`sendRejectionEmail(recipientEmail, collegeName, universityName, reason, options)`**
   
   Sends rejection/status update email.

3. **`sendPasswordChangeEmail(recipientEmail, collegeName, options)`**
   
   Sends confirmation when password is changed.

---

#### C. API Endpoints
**File:** `api/colleges.js` (updated)

Added two new handler functions:

1. **`POST /api/college/login`**
   
   College login endpoint.
   
   **Request Body:**
   ```json
   {
     "collegeCode": "001",
     "password": "31032026140507"
   }
   ```
   
   **Success Response (200):**
   ```json
   {
     "success": true,
     "college": {
       "id": 1,
       "code": "001",
       "name": "MIT College",
       "email": "principal@college.ac.in"
     },
     "sessionToken": "base64encodedtoken",
     "isTemporaryPassword": true,
     "message": "Login successful. Please change your temporary password immediately."
   }
   ```
   
   **Error Response (401):**
   ```json
   {
     "error": "Invalid college code or password"
   }
   ```

2. **`POST /api/college/change-password`**
   
   Change password endpoint.
   
   **Request Body:**
   ```json
   {
     "collegeCode": "001",
     "currentPassword": "31032026140507",
     "newPassword": "SecurePass123!",
     "confirmPassword": "SecurePass123!"
   }
   ```
   
   **Success Response (200):**
   ```json
   {
     "success": true,
     "message": "Password changed successfully. You can now log in with your new password."
   }
   ```
   
   **Validation Errors (400):**
   ```json
   {
     "error": "Password does not meet requirements",
     "requirements": [
       "Password must be at least 8 characters long",
       "Password must contain at least one digit"
     ]
   }
   ```

---

#### D. API Routes File
**File:** `api/college-auth.js` (new)

Express router for college authentication endpoints.

```javascript
const express = require('express');
const colleges = require('./colleges');
const router = express.Router();

router.post('/login', colleges.handleCollegeLogin);
router.post('/change-password', colleges.handleChangePassword);

module.exports = router;
```

**Integration with Main App:**
```javascript
// In your main server file (e.g., server.js or index.js)
const collegeAuthRouter = require('./api/college-auth');
app.use('/api/college', collegeAuthRouter);
```

---

### 3. Frontend Pages

#### A. College Login Page 🔐
**File:** `src/pages/CollegeLoginPage.tsx`

Login page for colleges to access their portal.

**Features:**
- College Code input field (3 digits)
- Password field (temporary password in DDMMYYYYHHMMSS format)
- Validation and error handling
- Demo credentials button (for testing)
- Beautiful UI with gradient background
- Security tips and instructions
- Responsive design

**Route:** `/college/login`

**Session Storage:**
After login, stores in `localStorage`:
```javascript
{
  "collegeId": 1,
  "collegeName": "MIT College",
  "collegeCode": "001",
  "token": "sessionToken",
  "loginTime": "2026-03-31T14:05:07.000Z"
}
```

**Redirects:**
- If using temporary password → `/college/change-password`
- If using permanent password → `/college/dashboard`

---

#### B. Password Change Page 🔑
**File:** `src/pages/ChangePasswordPage.tsx`

Forces password change on first login with temporary password.

**Features:**
- Current password input
- New password input with strength meter
- Real-time password validation
- Visual password requirements checklist
- Confirm password field
- Error and success messages
- Security tips
- Mobile responsive

**Route:** `/college/change-password`

**Password Requirements Displayed:**
- ✓ Minimum 8 characters
- ✓ At least one uppercase letter
- ✓ At least one lowercase letter
- ✓ At least one digit
- ✓ At least one special character (!@#$%^&*)

**Strength Meter:**
- Weak (Red) - 1-2 requirements met
- Good (Orange) - 3-4 requirements met
- Strong (Green) - All 5 requirements met

---

#### C. College Dashboard 🏫
**File:** `src/pages/CollegeDashboard.tsx`

Main dashboard after successful login.

**Features:**
- College information display
- Navigation sidebar with menu options
- Tabs for:
  - Overview (college info, stats)
  - Student Registration (coming soon)
  - Enrollments (coming soon)
  - College Profile (coming soon)
  - Security & Settings (password change)
- Logout functionality
- Sticky navigation bar

**Route:** `/college/dashboard`

**Menu Options:**
1. 📊 Overview - Dashboard overview and quick stats
2. 👥 Student Registration - Register new students
3. 📝 Enrollments - Manage student enrollments
4. 🏫 College Profile - Update college information
5. 🔐 Security & Settings - Change password and account settings

---

## Integration Steps

### Step 1: Update Database
```sql
-- Run migrations to add new columns
ALTER TABLE colleges ADD COLUMN email VARCHAR(255);
ALTER TABLE colleges ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE colleges ADD COLUMN approval_timestamp TIMESTAMP;
ALTER TABLE colleges ADD COLUMN is_password_changed BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_colleges_email ON colleges(email);
```

### Step 2: Copy API Files
Copy the following files to your project:
- `api/passwordUtil.js` - Password utilities
- `api/emailService.js` - Email service
- `api/college-auth.js` - Route handler

### Step 3: Update App Files
The following files are already updated:
- `api/colleges.js` - Added login and password change handlers

### Step 4: Copy Frontend Pages
Copy the following React pages:
- `src/pages/CollegeLoginPage.tsx` - Login page
- `src/pages/ChangePasswordPage.tsx` - Password change page
- `src/pages/CollegeDashboard.tsx` - Main dashboard

### Step 5: Update Routing
Add routes to your main App/Router:
```jsx
import CollegeLoginPage from './pages/CollegeLoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import CollegeDashboard from './pages/CollegeDashboard';

// In your router
<Route path="/college/login" element={<CollegeLoginPage />} />
<Route path="/college/change-password" element={<ChangePasswordPage />} />
<Route path="/college/dashboard" element={<CollegeDashboard />} />
```

### Step 6: Setup Email Service
Currently, emails are logged to console for development. To integrate with a real email service:

**Option A: SendGrid**
```javascript
// In emailService.js
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(emailContent) {
  await sgMail.send({
    to: emailContent.to,
    from: 'noreply@yourapp.com',
    subject: emailContent.subject,
    html: emailContent.htmlContent
  });
}
```

**Option B: AWS SES**
```javascript
// In emailService.js
const AWS = require('aws-sdk');
const ses = new AWS.SES({region: 'us-east-1'});

async function sendEmail(emailContent) {
  await ses.sendEmail({
    Source: 'noreply@yourapp.com',
    Destination: { ToAddresses: [emailContent.to] },
    Message: {
      Subject: { Data: emailContent.subject },
      Body: { Html: { Data: emailContent.htmlContent } }
    }
  }).promise();
}
```

**Option C: Nodemailer**
```javascript
// In emailService.js
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail(emailContent) {
  await transporter.sendMail({
    from: 'noreply@yourapp.com',
    to: emailContent.to,
    subject: emailContent.subject,
    html: emailContent.htmlContent
  });
}
```

---

## Workflow & User Flow

### Admin Approval Workflow

```
1. Admin reviews pending registration
   ↓
2. Admin clicks "Approve" button
   ↓
3. System generates temporary password
   Password format: DDMMYYYYHHMMSS
   Example: 31032026140507 (if approved 31-Mar-2026 at 14:05:07)
   ↓
4. System creates college record with:
   - email: college_email@college.ac.in
   - password_hash: hashed temp password
   - approval_timestamp: 2026-03-31T14:05:07Z
   - is_password_changed: false
   ↓
5. System sends approval email with:
   - College Code (3-digit ID)
   - Temporary Password
   - College Program ID
   - Link to college portal
   - Instructions to change password
   ↓
6. College Principal receives email
   ↓
7. Admin sees confirmation with email sent status
```

### College Login Workflow

```
1. College Principal visits: /college/login
   ↓
2. Enters College Code (from approval email)
   ↓
3. Enters Temporary Password (DDMMYYYYHHMMSS format)
   ↓
4. System validates credentials
   ↓
5A. If temporary password:
   - Stores session
   - Redirects to /college/change-password
   - Shows "First Login" warning
   - Forces password change
   ↓
5B. If permanent password:
   - Stores session
   - Redirects to /college/dashboard
   ↓
6. College can now manage their account
```

### Password Change Workflow

```
1. College on /college/change-password page
   ↓
2. Enters current password (temporary)
   ↓
3. Enters new password
   ↓
4. Real-time validation shows:
   - Password strength meter
   - Requirements checklist
   - Strength indicator (Weak/Good/Strong)
   ↓
5. Confirms new password
   ↓
6. System validates:
   - Meets all requirements
   - Matches confirmation
   - Different from current password
   ↓
7. System hashes new password
   ↓
8. Updates database:
   - password_hash: new hashed password
   - is_password_changed: true
   ↓
9. Sends password change confirmation email
   ↓
10. Redirects to /college/dashboard
    College can now use permanent password for future logins
```

---

## Security Features

### 1. Password Hashing
- Algorithm: PBKDF2 with SHA-256
- Iterations: 100,000
- Random salt: 32 bytes
- Format: `pbkdf2_sha256$iterations$salt$hash`

### 2. Constant-Time Comparison
- Prevents timing attacks
- Uses Node.js `crypto.timingSafeEqual`

### 3. Password Strength Requirements
- Minimum 8 characters
- Mixed case (uppercase + lowercase)
- At least one digit
- At least one special character
- Prevents reusing old password

### 4. Temporary Password Expiry
- Designed to be changed immediately
- Format (DDMMYYYYHHMMSS) is not random
- Forces change on first login
- Email contains clear change instructions

### 5. Session Management
- Temporary session tokens
- localStorage for client-side storage
- Logout clears session

### 6. Email Verification
- Email address stored during approval
- Sent to registered college contact
- Contains link to secure college portal

---

## Testing

### Manual Testing Checklist

**1. Admin Approves College:**
```
☐ Admin navigates to pending registration
☐ Clicks Approve button
☐ System generates temporary password (DDMMYYYYHHMMSS format)
☐ Email is logged to console with full details
☐ Approval confirmation shown to admin
☐ College record created in database with email and password_hash
```

**2. College First Login:**
```
☐ College visits /college/login
☐ Enters college code (e.g., "001")
☐ Enters temporary password (e.g., "31032026140507")
☐ System validates and logs in
☐ Automatically redirects to /college/change-password
☐ Shows "First Login" warning
```

**3. Password Change:**
```
☐ College sees password requirements checklist
☐ Types new password, meter updates in real-time
☐ Strength indicator shows (Red/Orange/Green)
☐ Confirms password
☐ System validates all requirements
☐ Prevents matching old password
☐ Shows success message
☐ Sends confirmation email
☐ Redirects to /college/dashboard
```

**4. Permanent Login:**
```
☐ College visits /college/login
☐ Enters college code
☐ Enters new permanent password
☐ System allows login
☐ Goes directly to /college/dashboard (no password change)
```

**5. Error Scenarios:**
```
☐ Wrong college code → "Invalid college code or password"
☐ Wrong password → "Invalid college code or password"
☐ Password too short → Shows requirements
☐ Missing uppercase → Shows requirements
☐ Passwords don't match → "Passwords do not match"
☐ Reusing old password → "Cannot reuse old password"
```

### Test Cases

**Test College Approval:**
```bash
POST /api/college/admin/approve
{
  "registrationId": 1
}
```
Expected: Email logged, password created, college record updated

**Test College Login:**
```bash
POST /api/college/login
{
  "collegeCode": "001",
  "password": "31032026140507"
}
```
Expected: Success with sessionToken, isTemporaryPassword: true

**Test Password Change:**
```bash
POST /api/college/change-password
{
  "collegeCode": "001",
  "currentPassword": "31032026140507",
  "newPassword": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```
Expected: Success, password_hash updated, confirmation email sent

---

## Production Deployment Checklist

- [ ] Update database schema with migration
- [ ] Copy all API files (passwordUtil, emailService, college-auth)
- [ ] Update colleges.js with handlers
- [ ] Copy all frontend pages
- [ ] Update routing in main App
- [ ] Configure email service (SendGrid, AWS SES, or Nodemailer)
- [ ] Set environment variables (API keys, domain URLs)
- [ ] Update dashboard URL in email templates
- [ ] Test entire approval → login → password change workflow
- [ ] Review security settings and password policies
- [ ] Enable HTTPS for all college portal routes
- [ ] Setup error logging and monitoring
- [ ] Document password reset/recovery process
- [ ] Create college support page with help resources

---

## Future Enhancements

1. **Two-Factor Authentication**
   - OTP via email
   - Authenticator app support

2. **Password Recovery**
   - Forgot password flow
   - Email verification
   - Security questions

3. **Login History**
   - Track login attempts
   - IP address logging
   - Device management

4. **Admin Dashboard Updates**
   - View approval email status
   - Resend email if needed
   - Track password changes

5. **Additional Security**
   - Rate limiting on login
   - Account lockout after failed attempts
   - Session timeout

6. **Integration**
   - LDAP/Active Directory support
   - OAuth/SSO integration
   - API key authentication for programmatic access

---

## Support & Troubleshooting

### Common Issues

**1. Email not sending:**
- Check console logs (emails are logged there in development)
- Verify email service is configured
- Check email address in database

**2. Login fails with valid credentials:**
- Verify password_hash is stored in database
- Check college code formatting
- Clear browser cookies/cache

**3. Password change validation failing:**
- Verify password meets all requirements
- Check both passwords match
- Ensure not reusing old password

**4. Session not persisting:**
- Check localStorage is enabled
- Verify browser privacy settings
- Clear browser data and retry

---

## Files Summary

| File | Purpose |
|------|---------|
| `database/schema.sql` | Database schema with new columns |
| `api/passwordUtil.js` | Password hashing and generation |
| `api/emailService.js` | Email template and sending |
| `api/colleges.js` | Updated with login/password handlers |
| `api/college-auth.js` | Express routes for college auth |
| `src/pages/CollegeLoginPage.tsx` | College login UI |
| `src/pages/ChangePasswordPage.tsx` | Password change UI |
| `src/pages/CollegeDashboard.tsx` | College dashboard UI |

---

**Total Lines Added:** ~2,500  
**Functions Added:** 8  
**Endpoints Added:** 2  
**Frontend Components:** 3  
**Email Templates:** 3 (Approval, Rejection, Password Change)

---

*For questions or support, contact the development team.*
