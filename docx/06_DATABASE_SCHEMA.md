# 🪙 IRA — Student P2P Lending Platform
## 06. Relational Database Schema (24 Tables)

---

## 🗄️ Relational Entity Model

The complete IRA relational database is defined in [`database/schema.sql`](file:///Users/akshaysinghchauhan/Downloads/IRA_Project/database/schema.sql). It consists of **24 normalized tables** grouped into 7 architectural tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE TIER TAXONOMY                   │
├─────────────────────────────────────────────────────────────┤
│ Tier 1: Geography & Educational Hierarchy (8 tables)        │
│ Tier 2: Institutional Approvals & Programs (2 tables)       │
│ Tier 3: Users, Authentication & Verification (4 tables)      │
│ Tier 4: Double-Entry Wallets & Ledgers (3 tables)           │
│ Tier 5: Loans, Marketplace & Repayments (3 tables)          │
│ Tier 6: Social Trust, Friends & Guarantors (2 tables)       │
│ Tier 7: Auditing, Logs & Notifications (2 tables)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Complete Table Inventory

### Tier 1: Geography & Educational Hierarchy
1. `countries`: Sovereign nation entities (`id`, `code`, `name`).
2. `states`: State / Union Territory codes (`id`, `code`, `name`, `country_id`).
3. `districts`: District administrative subdivisions (`id`, `code`, `name`, `state_id`).
4. `sectors`: Unique urban/campus sector zones (`id`, `code`, `district_id`).
5. `universities`: Affiliated universities granting accredited degrees (`id`, `name`, `code`, `state`).
6. `colleges`: Individual campus colleges under universities (`id`, `name`, `code`, `university_id`).
7. `courses`: Degree programs offered (B.Tech, B.Com, MBA, MBBS, B.Sc) (`id`, `code`, `name`, `duration_years`).
8. `branches`: Department specializations (Computer Science, Mechanical, Finance) (`id`, `code`, `name`, `course_id`).

### Tier 2: Institutional Approvals & Programs
9. `pending_colleges`: Registration submissions awaiting platform admin review (`id`, `name`, `email`, `submitted_data`, `status`).
10. `college_programs`: Approved active institution programs with generated Program IDs (`id`, `program_id`, `college_id`, `branch_id`, `start_year`, `end_year`).

### Tier 3: Users, Authentication & Verification
11. `users`: Core account identity (`id`, `email`, `phone`, `password_hash`, `role`, `status`).
12. `profiles`: Student biographical data (`id`, `user_id`, `name`, `dob`, `gender`, `college_id`, `shri_score`, `tier`).
13. `kyc_records`: Identity documents (`id`, `user_id`, `aadhaar_hash`, `pan_hash`, `digilocker_verified`, `status`).
14. `student_verifications`: Institutional verification records (`id`, `user_id`, `college_id`, `student_id_card_url`, `verified_by_college`).

### Tier 4: Double-Entry Wallets & Ledgers
15. `wallets`: User cash compartments (`id`, `user_id`, `available_balance`, `locked_balance`, `escrow_balance`).
16. `wallet_transactions`: Double-entry financial journal (`id`, `wallet_id`, `amount`, `type`, `status`, `reference_id`, `created_at`).
17. `batua_compartments`: Individual purpose-driven buckets within the student wallet (`id`, `wallet_id`, `compartment_type`, `allocated_amount`).

### Tier 5: Loans, Marketplace & Repayments
18. `loans`: Loan records (`id`, `borrower_id`, `amount`, `tenure_days`, `interest_rate`, `status`, `purpose`, `disbursed_at`, `due_at`).
19. `loan_offers`: Lender funding commitments (`id`, `loan_id`, `lender_id`, `funded_amount`, `expected_return`).
20. `repayments`: Repayment transactions (`id`, `loan_id`, `amount_paid`, `principal_portion`, `interest_portion`, `late_penalty`, `repaid_at`).

### Tier 6: Social Trust, Friends & Guarantors
21. `friends`: Verified student peer connections (`id`, `user_id`, `friend_id`, `status`, `connected_at`).
22. `guarantors`: Peer backing on specific loan requests (`id`, `loan_id`, `guarantor_id`, `status`, `liability_percentage`).

### Tier 7: Auditing, Logs & Notifications
23. `notifications`: User and system alerts (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`).
24. `audit_logs`: Immutable security and administrative event ledger (`id`, `actor_id`, `action`, `resource_type`, `resource_id`, `ip_address`, `timestamp`).

---

## ⚡ Applying Database Migrations

To apply this schema to a clean PostgreSQL database:

```bash
# Using PostgreSQL client
psql -U postgres -d ira -f database/schema.sql

# Or using the built-in migration script:
node backend/scripts/migrate.js
```
