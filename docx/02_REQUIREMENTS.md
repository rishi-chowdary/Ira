# 🪙 IRA — Student P2P Lending Platform
## 02. System & Business Requirements

---

## 📋 Functional Requirements

### 1. Student Onboarding & Identity Verification (KYC)
- **Email & Phone Verification:** OTP-based verification via SMS/WhatsApp and college domain email check.
- **Govt. ID Verification:** Aadhaar (masked 12-digit) and PAN card verification via DigiLocker mock/API.
- **Institution Linkage:** Linking student to their college code, degree, and admission year.
- **Batua Activation:** A nominal ₹3 activation fee unlocks the in-app digital wallet and generates a unique **Borrowing Account ID** and **Lending Account ID**.

### 2. Batua Wallet Architecture
- Three segregated compartments:
  1. **Available Balance:** Funds that can be withdrawn to bank or invested.
  2. **Locked Balance:** Funds currently allocated to an active, unfunded loan request.
  3. **Escrow Balance:** Funds held in escrow during active loan lifecycle until repayment.

### 3. Loan Lifecycle Management
- **Borrower Request:**
  - Amount: ₹500 to ₹10,000 (constrained by borrower's current Shri Score tier).
  - Tenure: 1 to 90 days.
  - Reason / Purpose tag (e.g., Exam Fee, Books, Emergency Medical, Hostel Mess).
- **Lender Funding:**
  - Lenders browse anonymized marketplace listings displaying borrower's Trust Tier, College, and Shri Score.
  - One-click funding with automatic deduction from Lender's Batua wallet into Escrow.
- **Disbursement:** Instant credit to Borrower's Batua or connected UPI VPA.

### 4. Repayment & Interest Engine
- **Time-Based Slabs:** Interest is calculated on the day of repayment according to cumulative rate points:
  - Day 1: 0% (free buffer, ₹0.01 minimum platform charge)
  - Day 2–3: 3%
  - Day 4–5: 5%
  - Day 6–10: 7%
  - Day 11–14: 9%
  - Day 15–21: 11%
  - Day 22–30: 14%
  - Day 31–90: 18%
- **Overdue Penalties:** Daily compounding late fee of 0.05% per day past maturity date (split 60% lender / 40% platform).
- **Payment Methods:** Batua Wallet balance or direct UPI payment link.

### 5. Social Trust & Guarantor System
- **Campus Friends Network:** Students can search and add verified campus friends.
- **Guarantor Backing:** High-value loans (₹5,000+) can require a peer guarantor endorsement, reducing interest rates by 10%.

### 6. Institutional & Admin Workflows
- **College Portal:** College administrators log in with their institutional credentials to verify pending student applicants.
- **Admin Super-Dashboard:** Global platform metrics, override authority on loan requests, approval queue for new college registrations, and CSV hierarchy export.

---

## 🛡️ Non-Functional Requirements

### 1. Security & Compliance
- **Authentication:** Dual-token JWT (short-lived Access Token + long-lived Refresh Token in httpOnly cookies).
- **Password Security:** Salted hashes using bcrypt with minimum cost factor 10.
- **HTTP Protection:** Express Helmet headers, strict CORS origin matching, and IP/user rate limiting on auth endpoints.
- **Data Privacy:** Sensitive IDs (Aadhaar, PAN) stored masked; student listings anonymized in public marketplace.

### 2. Performance & Scalability
- **Frontend:** Sub-second page loads using Vite pre-bundling and React code splitting.
- **API Response Time:** P95 response time < 150ms for transaction and loan queries.
- **Data Integrity:** ACID-compliant PostgreSQL relational transactions for ledger adjustments.

### 3. Usability & Accessibility
- **Mobile Responsive:** 100% responsive interface optimized for student smartphones (viewport width 360px to 1920px).
- **Intuitive Visual Feedback:** Dynamic coin counters, animated trust badges, and live interest calculation sliders.
