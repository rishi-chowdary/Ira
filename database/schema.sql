-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  college TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT DEFAULT 'both', -- 'borrower', 'lender', 'both'
  trust_level TEXT DEFAULT 'Newbie', -- Newbie, Bronze, Silver, Gold, Platinum
  trust_stars INTEGER DEFAULT 1,
  trust_points INTEGER DEFAULT 0,
  on_time_repayments INTEGER DEFAULT 0,
  early_repayments INTEGER DEFAULT 0,
  late_repayments INTEGER DEFAULT 0,
  total_defaults INTEGER DEFAULT 0,
  total_borrowed REAL DEFAULT 0,
  total_lent REAL DEFAULT 0,
  total_earned REAL DEFAULT 0,
  max_loan_amount REAL DEFAULT 5000,
  -- DigiLocker verification fields
  digilocker_verified BOOLEAN DEFAULT FALSE,
  digilocker_id TEXT,
  aadhaar_verified BOOLEAN DEFAULT FALSE,
  pan_verified BOOLEAN DEFAULT FALSE,
  education_verified BOOLEAN DEFAULT FALSE,
  income_verified BOOLEAN DEFAULT FALSE,
  verification_documents TEXT, -- JSON string of verified documents
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  borrower_id TEXT NOT NULL,
  amount REAL NOT NULL,
  purpose TEXT DEFAULT '',
  tenure_days INTEGER DEFAULT 30,
  status TEXT DEFAULT 'pending', -- pending, funded, partially_funded, active, repaid, overdue, defaulted
  interest_rate REAL DEFAULT 0,
  interest_amount REAL DEFAULT 0,
  penalty_amount REAL DEFAULT 0,
  total_due REAL DEFAULT 0,
  amount_funded REAL DEFAULT 0,
  amount_repaid REAL DEFAULT 0,
  funded_at TEXT,
  due_date TEXT,
  repaid_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (borrower_id) REFERENCES users(id)
);

-- Investments table (lender contributions to loans)
CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  lender_id TEXT NOT NULL,
  loan_id TEXT NOT NULL,
  amount REAL NOT NULL,
  expected_return REAL DEFAULT 0,
  actual_return REAL DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, returned, defaulted
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (lender_id) REFERENCES users(id),
  FOREIGN KEY (loan_id) REFERENCES loans(id)
);

-- Repayments table
CREATE TABLE IF NOT EXISTS repayments (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  borrower_id TEXT NOT NULL,
  amount REAL NOT NULL,
  principal_portion REAL DEFAULT 0,
  interest_portion REAL DEFAULT 0,
  penalty_portion REAL DEFAULT 0,
  platform_fee REAL DEFAULT 0,
  lender_earnings REAL DEFAULT 0,
  repayment_day INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (loan_id) REFERENCES loans(id),
  FOREIGN KEY (borrower_id) REFERENCES users(id)
);

-- Trust score history
CREATE TABLE IF NOT EXISTS trust_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'on_time', 'early', 'late', 'default'
  points_change INTEGER DEFAULT 0,
  new_level TEXT,
  new_stars INTEGER,
  loan_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
