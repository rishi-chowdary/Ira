-- IRA College Registration Database Schema
-- Tables needed for college registration, admin approval workflow, and college management

-- ============================================================================
-- 1. Universities Table
-- ============================================================================
CREATE TABLE universities (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  short_name VARCHAR(10),
  code VARCHAR(3) DEFAULT '001',
  state VARCHAR(50),
  description TEXT,
  website TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_universities_name ON universities(name);
CREATE INDEX idx_universities_short_name ON universities(short_name);

-- ============================================================================
-- 2. Colleges Table
-- ============================================================================
CREATE TABLE colleges (
  id BIGSERIAL PRIMARY KEY,
  university_id BIGINT REFERENCES universities(id),
  name TEXT NOT NULL UNIQUE,
  short_name VARCHAR(10),
  code VARCHAR(3) DEFAULT '001',
  state VARCHAR(50),
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_colleges_university_id ON colleges(university_id);
CREATE INDEX idx_colleges_name ON colleges(name);

-- ============================================================================
-- 3. Courses Table
-- ============================================================================
CREATE TABLE courses (
  id BIGSERIAL PRIMARY KEY,
  university_id BIGINT REFERENCES universities(id),
  college_id BIGINT REFERENCES colleges(id),
  name TEXT NOT NULL,
  code VARCHAR(4),
  duration INT (years, typically 3-4),
  branches JSONB, -- Array of branch names: ["AI", "Cyber Security"]
  enrollment_capacity INT,
  start_year INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_courses_college_id ON courses(college_id);
CREATE INDEX idx_courses_university_id ON courses(university_id);

-- ============================================================================
-- 4. College Program IDs Table
-- ============================================================================
-- Stores generated College Program IDs for easy reference and lookup
CREATE TABLE college_program_ids (
  id BIGSERIAL PRIMARY KEY,
  college_id BIGINT REFERENCES colleges(id),
  course_id BIGINT REFERENCES courses(id),
  program_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., IN/MH/PUN/S12/MIT/CSE/2025/2029
  state_code VARCHAR(2),
  district_code VARCHAR(3),
  area_code VARCHAR(3),
  university_code VARCHAR(3),
  college_code VARCHAR(3),
  course_code VARCHAR(4),
  start_year INT,
  end_year INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_college_program_ids_program_id ON college_program_ids(program_id);
CREATE INDEX idx_college_program_ids_college_id ON college_program_ids(college_id);

-- ============================================================================
-- 5. College Registrations Table (Pending Approvals)
-- ============================================================================
-- Core table for tracking college registration submissions, validation, and approval
CREATE TABLE college_registrations (
  id BIGSERIAL PRIMARY KEY,
  registration_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., REG_1700000000_ABC123
  
  -- Institution Details
  university_name TEXT NOT NULL,
  university_short_name VARCHAR(10),
  college_name TEXT,
  college_short_name VARCHAR(10),
  
  -- Location Details
  state VARCHAR(50) NOT NULL,
  state_code VARCHAR(2),
  district VARCHAR(50) NOT NULL,
  district_code VARCHAR(3),
  area_code VARCHAR(3) NOT NULL,
  pincode VARCHAR(6) NOT NULL,
  full_address TEXT,
  coordinates GEOGRAPHY(POINT, 4326), -- Optional: lat/long for verification
  
  -- Courses (stored as JSON array)
  courses JSONB, -- [{name: "CSE", duration: 4, branches: ["AI", "Cyber"]}, ...]
  
  -- Contact Information
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  
  -- Validation & ML
  ml_score DECIMAL(3, 2), -- 0.00 to 1.00 confidence score
  ml_notes TEXT,
  duplicate_check_passed BOOLEAN DEFAULT TRUE,
  
  -- Approval Workflow
  status VARCHAR(20) DEFAULT 'pending_admin', -- pending_admin, approved, rejected
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Generated Codes
  college_program_id VARCHAR(50), -- Generated on approval
  
  -- Audit Trail
  submitted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_by VARCHAR(100), -- Admin email who approved
  
  CONSTRAINT status_values CHECK (status IN ('pending_admin', 'approved', 'rejected'))
);

CREATE INDEX idx_registrations_status ON college_registrations(status);
CREATE INDEX idx_registrations_registration_id ON college_registrations(registration_id);
CREATE INDEX idx_registrations_submitted_at ON college_registrations(submitted_at DESC);
CREATE INDEX idx_registrations_state ON college_registrations(state);

-- ============================================================================
-- 6. States & Districts Lookup Tables
-- ============================================================================
CREATE TABLE states (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  code VARCHAR(2) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE districts (
  id BIGSERIAL PRIMARY KEY,
  state_id BIGINT REFERENCES states(id),
  name VARCHAR(50) NOT NULL,
  code VARCHAR(3) NOT NULL,
  UNIQUE(state_id, name),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_districts_state_id ON districts(state_id);

-- ============================================================================
-- 7. Area Codes / Sectors Lookup Table
-- ============================================================================
CREATE TABLE area_codes (
  id BIGSERIAL PRIMARY KEY,
  district_id BIGINT REFERENCES districts(id),
  area_code VARCHAR(3) NOT NULL,
  area_name VARCHAR(100),
  pincode VARCHAR(6),
  UNIQUE(district_id, area_code),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_area_codes_district_id ON area_codes(district_id);
CREATE INDEX idx_area_codes_pincode ON area_codes(pincode);

-- ============================================================================
-- 8. Admin Audit Log
-- ============================================================================
CREATE TABLE admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_id VARCHAR(100),
  action VARCHAR(50), -- approve, reject, edit, view
  registration_id VARCHAR(50) REFERENCES college_registrations(registration_id),
  changes JSONB, -- What was changed
  ip_address INET,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_registration_id ON admin_audit_log(registration_id);
CREATE INDEX idx_audit_log_timestamp ON admin_audit_log(timestamp DESC);

-- ============================================================================
-- 9. Sample Data
-- ============================================================================

-- Insert States
INSERT INTO states (name, code) VALUES
  ('Maharashtra', '23'),
  ('Karnataka', '29'),
  ('Tamil Nadu', '33'),
  ('Delhi', '07'),
  ('Uttar Pradesh', '35');

-- Insert Districts for Maharashtra
INSERT INTO districts (state_id, name, code) 
SELECT id, name, code FROM (
  VALUES 
    ((SELECT id FROM states WHERE code = '23'), 'Pune', '045'),
    ((SELECT id FROM states WHERE code = '23'), 'Mumbai', '047'),
    ((SELECT id FROM states WHERE code = '23'), 'Nagpur', '053')
) AS t(state_id, name, code);

-- Insert Area Codes for Pune
INSERT INTO area_codes (district_id, area_code, area_name, pincode)
SELECT id, area_code, area_name, pincode FROM (
  VALUES
    ((SELECT id FROM districts WHERE name = 'Pune' LIMIT 1), '012', 'IT Park', '411001'),
    ((SELECT id FROM districts WHERE name = 'Pune' LIMIT 1), '008', 'Hinjewadi', '411057'),
    ((SELECT id FROM districts WHERE name = 'Pune' LIMIT 1), '045', 'Baner', '411045')
) AS t(district_id, area_code, area_name, pincode);

-- ============================================================================
-- 10. Triggers for Automated Timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_universities_updated_at 
  BEFORE UPDATE ON universities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_colleges_updated_at
  BEFORE UPDATE ON colleges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON college_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Notes:
-- - All numeric codes use zero-padding as needed (e.g., 001, 045)
-- - JSON fields store complex data (courses, branches, ML notes)
-- - Status field uses ENUM-like constraint for consistency
-- - Proper indexes on frequently queried columns for performance
-- - Audit logging tracks all admin actions for compliance
-- ============================================================================
