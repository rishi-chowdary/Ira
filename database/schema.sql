-- College Registration System Database Schema
-- PostgreSQL

-- 1. COUNTRIES TABLE
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    code CHAR(2) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. STATES TABLE
CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    code CHAR(2) NOT NULL,
    name VARCHAR(100) NOT NULL,
    country_id INT NOT NULL REFERENCES countries(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, country_id),
    UNIQUE(name, country_id)
);

CREATE INDEX idx_states_country_id ON states(country_id);
CREATE INDEX idx_states_code ON states(code);

-- 3. DISTRICTS TABLE
CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    code CHAR(3) NOT NULL,
    name VARCHAR(100) NOT NULL,
    state_id INT NOT NULL REFERENCES states(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, state_id),
    UNIQUE(name, state_id)
);

CREATE INDEX idx_districts_state_id ON districts(state_id);
CREATE INDEX idx_districts_code ON districts(code);

-- 4. SECTORS TABLE (Area codes from Aadhaar)
CREATE TABLE IF NOT EXISTS sectors (
    id SERIAL PRIMARY KEY,
    code CHAR(3) NOT NULL,
    name VARCHAR(100),
    district_id INT NOT NULL REFERENCES districts(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, district_id)
);

CREATE INDEX idx_sectors_district_id ON sectors(district_id);
CREATE INDEX idx_sectors_code ON sectors(code);

-- 5. UNIVERSITIES TABLE
CREATE TABLE IF NOT EXISTS universities (
    id SERIAL PRIMARY KEY,
    code CHAR(3) NOT NULL,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(20),
    district_id INT NOT NULL REFERENCES districts(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, district_id),
    UNIQUE(name, district_id),
    UNIQUE(short_name, district_id)
);

CREATE INDEX idx_universities_district_id ON universities(district_id);
CREATE INDEX idx_universities_code ON universities(code);

-- 6. COLLEGES TABLE
CREATE TABLE IF NOT EXISTS colleges (
    id SERIAL PRIMARY KEY,
    code CHAR(3) NOT NULL,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(20),
    university_id INT NOT NULL REFERENCES universities(id),
    program_id VARCHAR(50),
    email VARCHAR(255),
    password_hash VARCHAR(255),
    approval_timestamp TIMESTAMP,
    is_password_changed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, university_id),
    UNIQUE(name, university_id),
    INDEX idx_colleges_university_id (university_id),
    INDEX idx_colleges_code (code)
);

CREATE INDEX idx_colleges_university_id ON colleges(university_id);
CREATE INDEX idx_colleges_code ON colleges(code);
CREATE INDEX idx_colleges_email ON colleges(email);

-- 7. COURSES TABLE (Degree programs like BTech, MBA, etc.)
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    code CHAR(2) NOT NULL,
    name VARCHAR(100) NOT NULL,
    duration_years INT NOT NULL,
    college_id INT REFERENCES colleges(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, college_id),
    UNIQUE(name, college_id)
);

CREATE INDEX idx_courses_college_id ON courses(college_id);
CREATE INDEX idx_courses_code ON courses(code);

-- 8. BRANCHES TABLE (Specializations under a degree)
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    course_id INT NOT NULL REFERENCES courses(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(name, course_id)
);

CREATE INDEX idx_branches_course_id ON branches(course_id);

-- 9. STUDENTS TABLE (For later phase)
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_unique_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    branch_id INT REFERENCES branches(id),
    registration_timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_branch_id ON students(branch_id);
CREATE INDEX idx_students_student_code ON students(student_unique_code);

-- 10. PENDING_COLLEGES TABLE (For registrations awaiting approval)
CREATE TABLE IF NOT EXISTS pending_colleges (
    id SERIAL PRIMARY KEY,
    submitted_data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending_ml', 'pending_admin', 'approved', 'rejected')),
    ml_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    processed_by_admin VARCHAR(100)
);

CREATE INDEX idx_pending_colleges_status ON pending_colleges(status);
CREATE INDEX idx_pending_colleges_created_at ON pending_colleges(created_at);

-- 11. COLLEGE_PROGRAMS TABLE (Optional - for storing generated program IDs)
CREATE TABLE IF NOT EXISTS college_programs (
    id SERIAL PRIMARY KEY,
    college_id INT NOT NULL REFERENCES colleges(id),
    program_id VARCHAR(50) UNIQUE NOT NULL,
    start_year INT NOT NULL,
    end_year INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_college_programs_college_id ON college_programs(college_id);
CREATE INDEX idx_college_programs_program_id ON college_programs(program_id);

-- 12. ADMIN_AUDIT_LOG TABLE (For audit trail)
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    admin_id VARCHAR(100),
    registration_id INT REFERENCES pending_colleges(id),
    changes JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_registration_id ON admin_audit_log(registration_id);
CREATE INDEX idx_audit_log_created_at ON admin_audit_log(created_at);

-- 13. STATE_CODES TABLE (Lookup table for state codes)
CREATE TABLE IF NOT EXISTS state_codes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code CHAR(2) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SEED DATA
-- Insert India as a country
INSERT INTO countries (code, name) VALUES ('91', 'India') ON CONFLICT DO NOTHING;

-- Insert state codes (Master reference list, updated 31-Mar-2026)
-- Code range: 55-89 for all Indian states and union territories
INSERT INTO state_codes (name, code) VALUES 
    ('Madhya Pradesh', '55'),
    ('Uttar Pradesh', '56'),
    ('Chhattisgarh', '57'),
    ('Maharashtra', '58'),
    ('Rajasthan', '59'),
    ('Uttarakhand', '60'),
    ('Bihar', '61'),
    ('Karnataka', '62'),
    ('Gujarat', '63'),
    ('Himachal Pradesh', '64'),
    ('West Bengal', '65'),
    ('Telangana', '66'),
    ('Punjab', '67'),
    ('Jammu & Kashmir', '68'),
    ('Odisha', '69'),
    ('Andhra Pradesh', '70'),
    ('Haryana', '71'),
    ('Ladakh', '72'),
    ('Assam', '73'),
    ('Tamil Nadu', '74'),
    ('Delhi', '75'),
    ('Chandigarh', '76'),
    ('Arunachal Pradesh', '77'),
    ('Kerala', '78'),
    ('Goa', '79'),
    ('Sikkim', '80'),
    ('Meghalaya', '81'),
    ('Puducherry', '82'),
    ('Dadra & Nagar Haveli and Daman & Diu', '83'),
    ('Nagaland', '84'),
    ('Manipur', '85'),
    ('Mizoram', '86'),
    ('Lakshadweep', '87'),
    ('Tripura', '88'),
    ('Andaman & Nicobar Islands', '89')
ON CONFLICT (code) DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables that need it
CREATE TRIGGER update_universities_updated_at BEFORE UPDATE ON universities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_colleges_updated_at BEFORE UPDATE ON colleges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Additional helper views
CREATE OR REPLACE VIEW v_pending_registrations AS
SELECT 
    pc.id,
    pc.submitted_data ->> 'university' ->> 'name' as university_name,
    pc.submitted_data ->> 'university' ->> 'shortName' as university_short_name,
    pc.submitted_data ->> 'college' ->> 'name' as college_name,
    pc.submitted_data ->> 'college' ->> 'shortName' as college_short_name,
    pc.submitted_data ->> 'location' ->> 'state' as state,
    pc.submitted_data ->> 'location' ->> 'district' as district,
    pc.submitted_data ->> 'location' ->> 'areaCode' as area_code,
    pc.submitted_data ->> 'contact' ->> 'email' as contact_email,
    pc.submitted_data ->> 'contact' ->> 'phone' as contact_phone,
    pc.status,
    pc.ml_score,
    pc.created_at,
    pc.processed_at
FROM pending_colleges pc
WHERE pc.status IN ('pending_ml', 'pending_admin');

-- 14. USER_ACCOUNTS TABLE (Student/Borrower/Lender accounts)
CREATE TABLE IF NOT EXISTS user_accounts (
    id SERIAL PRIMARY KEY,
    borrowing_account_id VARCHAR(50) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    full_name VARCHAR(200),
    password_hash VARCHAR(255),
    college_id INT REFERENCES colleges(id),
    course_id INT REFERENCES courses(id),
    branch_id INT REFERENCES branches(id),
    enrollment_number VARCHAR(50),
    role VARCHAR(20) CHECK (role IN ('student', 'borrower', 'lender')),
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    college_approval_status VARCHAR(20) DEFAULT 'pending' CHECK (college_approval_status IN ('pending', 'approved', 'rejected')),
    fee_paid BOOLEAN DEFAULT FALSE,
    batua_activated BOOLEAN DEFAULT FALSE,
    activation_timestamp TIMESTAMP,
    is_password_changed BOOLEAN DEFAULT FALSE,
    approval_timestamp TIMESTAMP,
    graduation_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_accounts_email ON user_accounts(email);
CREATE INDEX idx_user_accounts_borrowing_id ON user_accounts(borrowing_account_id);
CREATE INDEX idx_user_accounts_college_id ON user_accounts(college_id);
CREATE INDEX idx_user_accounts_role ON user_accounts(role);

-- 15. KYC_DATA TABLE (Know Your Customer - Aadhaar, PAN, etc.)
CREATE TABLE IF NOT EXISTS kyc_data (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES user_accounts(id),
    aadhaar_number VARCHAR(50),
    aadhaar_name VARCHAR(200),
    pan_number VARCHAR(20),
    pan_name VARCHAR(200),
    date_of_birth DATE,
    gender VARCHAR(10),
    address JSONB,
    verified_by VARCHAR(100),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kyc_data_user_id ON kyc_data(user_id);
CREATE INDEX idx_kyc_data_aadhaar ON kyc_data(aadhaar_number);

-- 16. BATUA_WALLET TABLE (Mobile wallet - locked and unlocked compartments)
CREATE TABLE IF NOT EXISTS batua_wallet (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES user_accounts(id),
    wallet_id VARCHAR(50) UNIQUE NOT NULL,
    locked_balance DECIMAL(10, 2) DEFAULT 0,
    unlocked_balance DECIMAL(10, 2) DEFAULT 0,
    total_balance DECIMAL(10, 2) GENERATED ALWAYS AS (locked_balance + unlocked_balance) STORED,
    upi_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_batua_wallet_user_id ON batua_wallet(user_id);
CREATE INDEX idx_batua_wallet_id ON batua_wallet(wallet_id);

-- 17. LOANS TABLE (Loan requests and lifecycle)
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    loan_id VARCHAR(50) UNIQUE NOT NULL,
    borrower_id INT NOT NULL REFERENCES user_accounts(id),
    lender_id INT REFERENCES user_accounts(id),
    amount DECIMAL(10, 2) NOT NULL,
    principal_remaining DECIMAL(10, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    tenure_months INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'active', 'repaying', 'closed', 'defaulted')),
    loan_type VARCHAR(20) DEFAULT 'friend' CHECK (loan_type IN ('friend', 'matched', 'emergency')),
    is_friend_loan BOOLEAN DEFAULT FALSE,
    requested_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    disbursed_at TIMESTAMP,
    repayment_start_date DATE,
    expected_close_date DATE,
    actual_close_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_loans_borrower_id ON loans(borrower_id);
CREATE INDEX idx_loans_lender_id ON loans(lender_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_loan_id ON loans(loan_id);

-- 18. LOAN_REPAYMENT TABLE (Repayment schedule and history)
CREATE TABLE IF NOT EXISTS loan_repayment (
    id SERIAL PRIMARY KEY,
    loan_id INT NOT NULL REFERENCES loans(id),
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    principal_due DECIMAL(10, 2) NOT NULL,
    interest_due DECIMAL(10, 2) NOT NULL,
    total_due DECIMAL(10, 2) GENERATED ALWAYS AS (principal_due + interest_due) STORED,
    principal_paid DECIMAL(10, 2) DEFAULT 0,
    interest_paid DECIMAL(10, 2) DEFAULT 0,
    penalty_paid DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
    paid_date DATE,
    days_overdue INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_loan_repayment_loan_id ON loan_repayment(loan_id);
CREATE INDEX idx_loan_repayment_status ON loan_repayment(status);
CREATE INDEX idx_loan_repayment_due_date ON loan_repayment(due_date);

-- 19. TRUST_SCORE TABLE (Shri Score - trust and creditworthiness)
CREATE TABLE IF NOT EXISTS trust_score (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES user_accounts(id),
    shri_score INT DEFAULT 500,
    total_borrowed DECIMAL(15, 2) DEFAULT 0,
    total_repaid DECIMAL(15, 2) DEFAULT 0,
    on_time_payments INT DEFAULT 0,
    late_payments INT DEFAULT 0,
    defaulted_loans INT DEFAULT 0,
    guarantor_count INT DEFAULT 0,
    friend_count INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trust_score_user_id ON trust_score(user_id);
CREATE INDEX idx_trust_score_shri_score ON trust_score(shri_score);

-- 20. GUARANTORS TABLE (Co-signers for loans)
CREATE TABLE IF NOT EXISTS guarantors (
    id SERIAL PRIMARY KEY,
    borrower_id INT NOT NULL REFERENCES user_accounts(id),
    guarantor_id INT NOT NULL REFERENCES user_accounts(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
    nomination_date TIMESTAMP DEFAULT NOW(),
    approval_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(borrower_id, guarantor_id)
);

CREATE INDEX idx_guarantors_borrower_id ON guarantors(borrower_id);
CREATE INDEX idx_guarantors_guarantor_id ON guarantors(guarantor_id);
CREATE INDEX idx_guarantors_status ON guarantors(status);

-- 21. FRIENDS TABLE (Friend connections for direct lending)
CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    user_id_1 INT NOT NULL REFERENCES user_accounts(id),
    user_id_2 INT NOT NULL REFERENCES user_accounts(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'blocked')),
    connection_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id_1, user_id_2)
);

CREATE INDEX idx_friends_user_id_1 ON friends(user_id_1);
CREATE INDEX idx_friends_user_id_2 ON friends(user_id_2);
CREATE INDEX idx_friends_status ON friends(status);

-- 22. COLLEGE_STUDENT_APPROVAL TABLE (Track college approvals for students)
CREATE TABLE IF NOT EXISTS college_student_approval (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES user_accounts(id),
    college_id INT NOT NULL REFERENCES colleges(id),
    fee_receipt_url VARCHAR(500),
    fee_amount DECIMAL(10, 2),
    fee_paid_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approval_notes TEXT,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_college_student_approval_student_id ON college_student_approval(student_id);
CREATE INDEX idx_college_student_approval_college_id ON college_student_approval(college_id);
CREATE INDEX idx_college_student_approval_status ON college_student_approval(status);

-- 23. TRANSACTIONS TABLE (All wallet transactions - deposits, withdrawals, loan disbursement, repayments)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL REFERENCES user_accounts(id),
    wallet_id INT NOT NULL REFERENCES batua_wallet(id),
    transaction_type VARCHAR(30) CHECK (transaction_type IN ('deposit', 'withdrawal', 'loan_disbursement', 'loan_repayment', 'penalty_payment', 'transfer', 'activation_fee')),
    amount DECIMAL(10, 2) NOT NULL,
    wallet_compartment VARCHAR(20) CHECK (wallet_compartment IN ('locked', 'unlocked')),
    related_loan_id INT REFERENCES loans(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    upi_ref_id VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_status ON transactions(status);

-- 24. INTEREST_RATE_TABLE (Cumulative interest based on Shri Score)
CREATE TABLE IF NOT EXISTS interest_rate_table (
    id SERIAL PRIMARY KEY,
    shri_score_min INT NOT NULL,
    shri_score_max INT NOT NULL,
    base_interest_rate DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(shri_score_min, shri_score_max)
);

-- Insert interest rate brackets
INSERT INTO interest_rate_table (shri_score_min, shri_score_max, base_interest_rate) VALUES
    (0, 300, 24.00),
    (301, 400, 22.00),
    (401, 500, 18.00),
    (501, 600, 15.00),
    (601, 700, 12.00),
    (701, 800, 9.00),
    (801, 1000, 6.00)
ON CONFLICT DO NOTHING;

CREATE INDEX idx_interest_rate_table_shri_score ON interest_rate_table(shri_score_min, shri_score_max);

-- Add trigger for user_accounts updated_at
CREATE TRIGGER update_user_accounts_updated_at BEFORE UPDATE ON user_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batua_wallet_updated_at BEFORE UPDATE ON batua_wallet
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loan_repayment_updated_at BEFORE UPDATE ON loan_repayment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_college_student_approval_updated_at BEFORE UPDATE ON college_student_approval
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
