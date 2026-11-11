import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../database/ira.db');

let dbInstance = null;

function toSql(val, fallback = null) {
  if (val === undefined || val === null) return fallback;
  return val;
}

export function getDb() {
  if (!dbInstance) {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    dbInstance = new DatabaseSync(dbPath);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
}

export function initDatabaseTables() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS states (
      id INTEGER PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS districts (
      id INTEGER PRIMARY KEY,
      state_code TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS universities (
      id INTEGER PRIMARY KEY,
      state_code TEXT,
      district_code TEXT,
      code TEXT,
      name TEXT NOT NULL,
      short_name TEXT
    );

    CREATE TABLE IF NOT EXISTS colleges (
      id INTEGER PRIMARY KEY,
      university_id INTEGER,
      university_code TEXT,
      university_name TEXT,
      university_short_name TEXT,
      college_code TEXT,
      college_name TEXT,
      college_short_name TEXT,
      state TEXT,
      state_code TEXT,
      district TEXT,
      district_code TEXT,
      sector_code TEXT,
      pincode TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      student_email_domain TEXT,
      login_code TEXT UNIQUE,
      password_hash TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS college_programs (
      id INTEGER PRIMARY KEY,
      college_id INTEGER,
      program_id TEXT UNIQUE,
      start_year INTEGER,
      end_year INTEGER,
      course_code TEXT,
      course_name TEXT,
      branches TEXT
    );

    CREATE TABLE IF NOT EXISTS pending_colleges (
      id INTEGER PRIMARY KEY,
      submitted_data TEXT NOT NULL,
      status TEXT NOT NULL,
      ml_score REAL,
      created_at TEXT,
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      full_name TEXT,
      whatsapp TEXT,
      upi_id TEXT,
      college_email TEXT,
      shri_score INTEGER DEFAULT 500,
      batua_locked REAL DEFAULT 0,
      batua_unlocked REAL DEFAULT 0,
      tijori REAL DEFAULT 0,
      role TEXT DEFAULT 'student',
      kyc_status TEXT DEFAULT 'pending',
      college_verified INTEGER DEFAULT 0,
      wallet_activated INTEGER DEFAULT 0,
      mode TEXT DEFAULT 'borrower',
      can_borrow INTEGER DEFAULT 1,
      can_lend INTEGER DEFAULT 1,
      state_code TEXT,
      district_code TEXT,
      sector_code TEXT,
      university_code TEXT,
      college_code TEXT,
      course_code TEXT,
      course_name TEXT,
      branch_name TEXT,
      year INTEGER,
      enrollment_number TEXT,
      college_id INTEGER,
      lending_account_id TEXT,
      borrowing_account_id TEXT,
      mock_upi_balance REAL DEFAULT 1000,
      student_status TEXT DEFAULT 'pending',
      aadhaar_hash TEXT,
      pan_hash TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY,
      borrower_id INTEGER NOT NULL,
      borrower_name TEXT,
      borrower_email TEXT,
      amount REAL NOT NULL,
      principal_remaining REAL,
      tenure INTEGER,
      tenure_days INTEGER,
      interest_rate REAL,
      interest_amount REAL,
      total_interest REAL,
      total_repayable REAL,
      per_installment REAL,
      installments_count INTEGER,
      frequency TEXT DEFAULT 'daily',
      purpose TEXT,
      status TEXT DEFAULT 'pending',
      shri_multiplier REAL DEFAULT 1.0,
      funded_amount REAL,
      repaid_amount REAL DEFAULT 0,
      due_date TEXT,
      repaid_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY,
      loan_id INTEGER NOT NULL,
      lender_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      expected_return REAL NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL,
      description TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS guarantors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      borrower_id INTEGER NOT NULL,
      guarantor_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      approved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY,
      requester_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS private_loans (
      id INTEGER PRIMARY KEY,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      interest_proposed REAL NOT NULL,
      tenure_days INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      negotiation_log TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'general',
      is_read INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id INTEGER PRIMARY KEY,
      action TEXT NOT NULL,
      admin_id TEXT,
      changes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS interest_slabs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      max_days INTEGER NOT NULL,
      rate REAL NOT NULL,
      window_label TEXT NOT NULL,
      row_class TEXT NOT NULL,
      badge TEXT NOT NULL,
      penalty_info TEXT
    );

    CREATE TABLE IF NOT EXISTS comparison_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      label TEXT NOT NULL,
      rate REAL NOT NULL,
      color TEXT NOT NULL,
      note TEXT NOT NULL,
      order_idx INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      college TEXT NOT NULL,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      stars INTEGER DEFAULT 5,
      color TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS how_it_works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      step_number INTEGER NOT NULL,
      icon TEXT NOT NULL,
      title TEXT NOT NULL,
      desc TEXT NOT NULL,
      color TEXT NOT NULL,
      bg TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS loan_purposes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS shri_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tier_name TEXT NOT NULL,
      min_score INTEGER NOT NULL,
      max_score INTEGER NOT NULL,
      rate_multiplier REAL NOT NULL,
      borrowing_limit REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY,
      token_id TEXT NOT NULL UNIQUE,
      subject_type TEXT NOT NULL,
      subject_id INTEGER NOT NULL,
      revoked_at TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS meta_sync (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export function seedStaticMasterTables() {
  const db = getDb();

  // 1. Interest Slabs
  const slabCount = db.prepare('SELECT count(*) as count FROM interest_slabs').get().count;
  if (slabCount === 0) {
    const insertSlab = db.prepare(
      'INSERT INTO interest_slabs (max_days, rate, window_label, row_class, badge, penalty_info) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const slabs = [
      [1, 0, 'Within 24 hours', 'interest-row-green', '🟢 Free!', 'Zero interest on prompt returns'],
      [3, 3, '2–3 days', 'interest-row-blue', '🔵 Low', 'Micro rate for short cycle'],
      [7, 5, '4–7 days', 'interest-row-blue', '🔵 Low', 'Standard weekly rate'],
      [14, 7, '8–14 days', 'interest-row-blue', '🔵 Moderate', 'Fortnightly repayment window'],
      [21, 9, '15–21 days', 'interest-row-blue-red', '🟣 Medium', '3-week cycle'],
      [30, 12, '22–30 days', 'interest-row-red', '🔴 High', 'Monthly maximum limit'],
    ];
    for (const slab of slabs) {
      insertSlab.run(...slab);
    }
  }

  // 2. Comparison Rates
  const compCount = db.prepare('SELECT count(*) as count FROM comparison_rates').get().count;
  if (compCount === 0) {
    const insertComp = db.prepare(
      'INSERT INTO comparison_rates (category, label, rate, color, note, order_idx) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const comps = [
      ['borrower', 'IRA (24h)', 0, '#10B981', 'Zero interest!', 1],
      ['borrower', 'IRA (30d)', 12, '#2563EB', 'Student P2P', 2],
      ['borrower', 'Bank personal loan', 11.5, '#94a3b8', 'Salary proof required', 3],
      ['borrower', 'Payday app', 24, '#f97316', 'Fast cash, high cost', 4],
      ['borrower', 'Credit card', 36, '#dc2626', 'Revolving credit', 5],
      ['lender', 'Savings account', 3.5, '#94a3b8', 'Bank savings', 1],
      ['lender', 'Fixed deposit', 7.1, '#64748b', '1-year FD', 2],
      ['lender', 'Mutual funds', 11, '#f59e0b', 'Market-linked', 3],
      ['lender', 'IRA returns', 14.5, '#10B981', 'Student lending', 4],
    ];
    for (const comp of comps) {
      insertComp.run(...comp);
    }
  }

  // 3. Testimonials
  const testCount = db.prepare('SELECT count(*) as count FROM testimonials').get().count;
  if (testCount === 0) {
    const insertTestimonial = db.prepare(
      'INSERT INTO testimonials (name, college, role, text, stars, color, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const items = [
      ['Arjun S.', 'IIT Bombay', 'Borrower', "Got ₹2,000 for my friend's birthday dinner in 5 minutes. Repaid next day — zero interest! 🎉", 4, '#EF4444', 1],
      ['Priya M.', 'BITS Pilani', 'Lender', "Earned ₹1,800 in 3 months on ₹15,000. That's way better than my savings account!", 5, '#10B981', 1],
      ['Rohan K.', 'NIT Trichy', 'Borrower', 'Needed cash for a concert. IRA saved the night. Trust score went up too!', 5, '#2563EB', 1],
      ['Ananya V.', 'Symbiosis Pune', 'Dual', 'I lend my surplus allowance and borrow when fees are due. Seamless campus circle!', 5, '#8B5CF6', 1],
    ];
    for (const item of items) {
      insertTestimonial.run(...item);
    }
  }

  // 4. How It Works
  const stepsCount = db.prepare('SELECT count(*) as count FROM how_it_works').get().count;
  if (stepsCount === 0) {
    const insertStep = db.prepare(
      'INSERT INTO how_it_works (step_number, icon, title, desc, color, bg) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const steps = [
      [1, '📝', 'Request a Loan', 'Tell us how much you need and why. Takes 30 seconds.', '#2563EB', 'rgba(37,99,235,0.08)'],
      [2, '⚡', 'Get Funded Fast', 'Fellow students fund your loan. Usually within minutes.', '#10B981', 'rgba(16,185,129,0.08)'],
      [3, '💸', 'Repay & Grow', 'Repay on time, earn trust points, unlock better rates.', '#EF4444', 'rgba(239,68,68,0.08)'],
    ];
    for (const step of steps) {
      insertStep.run(...step);
    }
  }

  // 5. Loan Purposes
  const purposeCount = db.prepare('SELECT count(*) as count FROM loan_purposes').get().count;
  if (purposeCount === 0) {
    const insertPurpose = db.prepare('INSERT INTO loan_purposes (name, is_active) VALUES (?, ?)');
    const purposes = [
      'Books & Study Materials',
      'Exam & Lab Fees',
      'Hostel & Rent',
      'Mess & Food Expenses',
      'Project & Hardware Kit',
      'Medical / Emergency',
      'Travel / Commute',
      'Laptop & Tech Accessories',
    ];
    for (const p of purposes) {
      insertPurpose.run(p, 1);
    }
  }

  // 6. Shri Tiers
  const tierCount = db.prepare('SELECT count(*) as count FROM shri_tiers').get().count;
  if (tierCount === 0) {
    const insertTier = db.prepare(
      'INSERT INTO shri_tiers (tier_name, min_score, max_score, rate_multiplier, borrowing_limit) VALUES (?, ?, ?, ?, ?)'
    );
    const tiers = [
      ['Platinum', 900, 1000, 0.80, 25000],
      ['Gold', 750, 899, 0.85, 15000],
      ['Silver', 600, 749, 0.92, 10000],
      ['Bronze', 400, 599, 1.00, 5000],
      ['Entry', 0, 399, 1.15, 2000],
    ];
    for (const t of tiers) {
      insertTier.run(...t);
    }
  }
}

export function syncStoreToDb(store) {
  const db = getDb();
  initDatabaseTables();
  seedStaticMasterTables();

  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. States
    if (Array.isArray(store.states)) {
      const stmt = db.prepare('INSERT OR REPLACE INTO states (id, code, name) VALUES (?, ?, ?)');
      for (const item of store.states) {
        stmt.run(item.id, item.code, item.name);
      }
    }

    // 2. Districts
    if (Array.isArray(store.districts)) {
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO districts (id, state_code, code, name) VALUES (?, ?, ?, ?)'
      );
      for (const item of store.districts) {
        stmt.run(item.id, item.stateCode, item.code, item.name);
      }
    }

    // 3. Universities
    if (Array.isArray(store.universities)) {
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO universities (id, state_code, district_code, code, name, short_name) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const item of store.universities) {
        stmt.run(item.id, item.stateCode || null, item.districtCode || null, item.code || null, item.name, item.shortName || null);
      }
    }

    // 4. Colleges
    if (Array.isArray(store.colleges)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO colleges (
          id, university_id, university_code, university_name, university_short_name,
          college_code, college_name, college_short_name, state, state_code,
          district, district_code, sector_code, pincode, contact_email,
          contact_phone, student_email_domain, login_code, password_hash,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of store.colleges) {
        stmt.run(
          item.id,
          item.universityId || null,
          item.universityCode || null,
          item.universityName || null,
          item.universityShortName || null,
          item.collegeCode || null,
          item.collegeName || null,
          item.collegeShortName || null,
          item.state || null,
          item.stateCode || null,
          item.district || null,
          item.districtCode || null,
          item.sectorCode || null,
          item.pincode || null,
          item.contactEmail || null,
          item.contactPhone || null,
          item.studentEmailDomain || null,
          item.loginCode || null,
          item.passwordHash || null,
          item.status || 'pending',
          item.createdAt || new Date().toISOString(),
          item.updatedAt || new Date().toISOString()
        );
      }
    }

    // 5. College Programs
    if (Array.isArray(store.collegePrograms)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO college_programs (
          id, college_id, program_id, start_year, end_year, course_code, course_name, branches
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of store.collegePrograms) {
        stmt.run(
          toSql(item.id),
          toSql(item.collegeId, item.college_id),
          toSql(item.programId, item.program_id),
          toSql(item.startYear, item.start_year),
          toSql(item.endYear, item.end_year),
          toSql(item.courseCode, item.course_code),
          toSql(item.courseName, item.course_name),
          JSON.stringify(item.branches || [])
        );
      }
    }

    // 6. Users
    if (Array.isArray(store.users)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO users (
          id, email, password_hash, full_name, whatsapp, upi_id, college_email,
          shri_score, batua_locked, batua_unlocked, tijori, role, kyc_status,
          college_verified, wallet_activated, mode, can_borrow, can_lend,
          state_code, district_code, sector_code, university_code, college_code,
          course_code, course_name, branch_name, year, enrollment_number,
          college_id, lending_account_id, borrowing_account_id, mock_upi_balance,
          student_status, aadhaar_hash, pan_hash, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const u of store.users) {
        stmt.run(
          u.id,
          u.email,
          u.password_hash || null,
          u.full_name || null,
          u.whatsapp || null,
          u.upi_id || null,
          u.college_email || null,
          u.shri_score ?? 500,
          u.batua_locked ?? 0,
          u.batua_unlocked ?? 0,
          u.tijori ?? 0,
          u.role || 'student',
          u.kyc_status || 'pending',
          u.college_verified ? 1 : 0,
          u.wallet_activated ? 1 : 0,
          u.mode || 'borrower',
          u.can_borrow ? 1 : 0,
          u.can_lend ? 1 : 0,
          u.stateCode || null,
          u.districtCode || null,
          u.sectorCode || null,
          u.universityCode || null,
          u.collegeCode || null,
          u.course_code || null,
          u.course_name || null,
          u.branch_name || null,
          u.year ?? null,
          u.enrollment_number || null,
          u.collegeId ?? null,
          u.lending_account_id || null,
          u.borrowing_account_id || null,
          u.mock_upi_balance ?? 1000,
          u.student_status || 'pending',
          u.aadhaar_hash || null,
          u.pan_hash || null,
          u.created_at || new Date().toISOString(),
          u.updated_at || new Date().toISOString()
        );
      }
    }

    // 7. Loans
    if (Array.isArray(store.loans)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO loans (
          id, borrower_id, borrower_name, borrower_email, amount, principal_remaining,
          tenure, tenure_days, interest_rate, interest_amount, total_interest, total_repayable,
          per_installment, installments_count, frequency, purpose, status, shri_multiplier,
          funded_amount, repaid_amount, due_date, repaid_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const l of store.loans) {
        stmt.run(
          toSql(l.id),
          toSql(l.borrower_id),
          toSql(l.borrower_name),
          toSql(l.borrower_email),
          toSql(l.amount, 0),
          toSql(l.principal_remaining, l.amount || 0),
          toSql(l.tenure, l.tenure_days || 1),
          toSql(l.tenure_days, l.tenure || 1),
          toSql(l.interest_rate, 0),
          toSql(l.interest_amount, l.total_interest || 0),
          toSql(l.total_interest, l.interest_amount || 0),
          toSql(l.total_repayable, l.amount || 0),
          toSql(l.per_installment, 0),
          toSql(l.installments_count, 1),
          toSql(l.frequency, 'daily'),
          toSql(l.purpose),
          toSql(l.status, 'pending'),
          toSql(l.shri_multiplier, 1.0),
          toSql(l.funded_amount, 0),
          toSql(l.repaid_amount, 0),
          toSql(l.due_date),
          toSql(l.repaid_at),
          toSql(l.created_at, new Date().toISOString()),
          toSql(l.updated_at, new Date().toISOString())
        );
      }
    }

    // 8. Investments
    if (Array.isArray(store.investments)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO investments (
          id, loan_id, lender_id, amount, expected_return, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const inv of store.investments) {
        stmt.run(
          toSql(inv.id),
          toSql(inv.loan_id),
          toSql(inv.lender_id),
          toSql(inv.amount, 0),
          toSql(inv.expected_return, 0),
          toSql(inv.status, 'active'),
          toSql(inv.created_at, new Date().toISOString()),
          toSql(inv.updated_at, new Date().toISOString())
        );
      }
    }

    // 9. Transactions
    if (Array.isArray(store.transactions)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO transactions (
          id, user_id, type, amount, balance_after, description, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const t of store.transactions) {
        stmt.run(
          toSql(t.id),
          toSql(t.user_id),
          toSql(t.type, 'transaction'),
          toSql(t.amount, 0),
          toSql(t.balance_after),
          toSql(t.description),
          toSql(t.created_at, new Date().toISOString())
        );
      }
    }

    // 10. Guarantors
    if (Array.isArray(store.guarantors)) {
      db.exec('DELETE FROM guarantors;');
      const stmt = db.prepare(
        'INSERT INTO guarantors (borrower_id, guarantor_id, status, approved_at) VALUES (?, ?, ?, ?)'
      );
      for (const g of store.guarantors) {
        stmt.run(g.borrower_id, g.guarantor_id, g.status || 'approved', g.approved_at || null);
      }
    }

    // 11. Friends
    if (Array.isArray(store.friends)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO friends (
          id, requester_id, target_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const f of store.friends) {
        stmt.run(
          f.id,
          f.requester_id,
          f.target_id,
          f.status || 'pending',
          f.created_at || new Date().toISOString(),
          f.updated_at || new Date().toISOString()
        );
      }
    }

    // 12. Private Loans
    if (Array.isArray(store.privateLoans)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO private_loans (
          id, from_user_id, to_user_id, amount, interest_proposed, tenure_days,
          status, negotiation_log, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const pl of store.privateLoans) {
        stmt.run(
          pl.id,
          pl.from_user_id,
          pl.to_user_id,
          pl.amount,
          pl.interest_proposed,
          pl.tenure_days,
          pl.status || 'pending',
          JSON.stringify(pl.negotiation_log || []),
          pl.created_at || new Date().toISOString(),
          pl.updated_at || new Date().toISOString()
        );
      }
    }

    // 13. Notifications
    if (Array.isArray(store.notifications)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO notifications (
          id, user_id, title, message, type, is_read, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const n of store.notifications) {
        stmt.run(
          n.id,
          n.user_id,
          n.title || 'Platform Notification',
          n.message,
          n.type || 'general',
          n.is_read ? 1 : 0,
          n.created_at || new Date().toISOString()
        );
      }
    }

    // 14. Pending Colleges
    if (Array.isArray(store.pendingColleges)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO pending_colleges (
          id, submitted_data, status, ml_score, created_at, processed_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const pc of store.pendingColleges) {
        stmt.run(
          pc.id,
          JSON.stringify(pc.submitted_data || {}),
          pc.status,
          pc.ml_score ?? null,
          pc.created_at || new Date().toISOString(),
          pc.processed_at || null
        );
      }
    }

    // 15. Refresh Tokens
    if (Array.isArray(store.refreshTokens)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO refresh_tokens (
          id, token_id, subject_type, subject_id, revoked_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const rt of store.refreshTokens) {
        stmt.run(
          toSql(rt.id),
          toSql(rt.tokenId),
          toSql(rt.subjectType, 'user'),
          toSql(rt.subjectId, 0),
          toSql(rt.revokedAt),
          toSql(rt.createdAt, new Date().toISOString())
        );
      }
    }

    // Meta record
    const metaStmt = db.prepare('INSERT OR REPLACE INTO meta_sync (key, value, updated_at) VALUES (?, ?, ?)');
    metaStmt.run('nextIds', JSON.stringify(store.meta?.nextIds || {}), new Date().toISOString());
    metaStmt.run('lastSyncedAt', new Date().toISOString(), new Date().toISOString());

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function loadStoreFromDb() {
  const db = getDb();
  initDatabaseTables();
  seedStaticMasterTables();

  const states = db.prepare('SELECT id, code, name FROM states').all().map((s) => ({ ...s }));
  const districts = db.prepare('SELECT id, state_code as stateCode, code, name FROM districts').all().map((d) => ({ ...d }));
  const universities = db.prepare('SELECT id, state_code as stateCode, district_code as districtCode, code, name, short_name as shortName FROM universities').all().map((u) => ({ ...u }));

  const colleges = db.prepare('SELECT * FROM colleges').all().map((c) => ({
    id: c.id,
    universityId: c.university_id,
    universityCode: c.university_code,
    universityName: c.university_name,
    universityShortName: c.university_short_name,
    collegeCode: c.college_code,
    collegeName: c.college_name,
    collegeShortName: c.college_short_name,
    state: c.state,
    stateCode: c.state_code,
    district: c.district,
    districtCode: c.district_code,
    sectorCode: c.sector_code,
    pincode: c.pincode,
    contactEmail: c.contact_email,
    contactPhone: c.contact_phone,
    studentEmailDomain: c.student_email_domain,
    loginCode: c.login_code,
    passwordHash: c.password_hash,
    status: c.status,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));

  const collegePrograms = db.prepare('SELECT * FROM college_programs').all().map((cp) => ({
    id: cp.id,
    collegeId: cp.college_id,
    programId: cp.program_id,
    startYear: cp.start_year,
    endYear: cp.end_year,
    courseCode: cp.course_code,
    courseName: cp.course_name,
    branches: cp.branches ? JSON.parse(cp.branches) : [],
  }));

  const users = db.prepare('SELECT * FROM users').all().map((u) => ({
    id: u.id,
    email: u.email,
    password_hash: u.password_hash,
    full_name: u.full_name,
    whatsapp: u.whatsapp,
    upi_id: u.upi_id,
    college_email: u.college_email,
    shri_score: u.shri_score,
    batua_locked: u.batua_locked,
    batua_unlocked: u.batua_unlocked,
    tijori: u.tijori,
    role: u.role,
    kyc_status: u.kyc_status,
    college_verified: Boolean(u.college_verified),
    wallet_activated: Boolean(u.wallet_activated),
    mode: u.mode,
    can_borrow: Boolean(u.can_borrow),
    can_lend: Boolean(u.can_lend),
    stateCode: u.state_code,
    districtCode: u.district_code,
    sectorCode: u.sector_code,
    universityCode: u.university_code,
    collegeCode: u.college_code,
    course_code: u.course_code,
    course_name: u.course_name,
    branch_name: u.branch_name,
    year: u.year,
    enrollment_number: u.enrollment_number,
    collegeId: u.college_id,
    lending_account_id: u.lending_account_id,
    borrowing_account_id: u.borrowing_account_id,
    mock_upi_balance: u.mock_upi_balance,
    student_status: u.student_status,
    aadhaar_hash: u.aadhaar_hash,
    pan_hash: u.pan_hash,
    created_at: u.created_at,
    updated_at: u.updated_at,
  }));

  const loans = db.prepare('SELECT * FROM loans').all().map((l) => ({
    id: l.id,
    borrower_id: l.borrower_id,
    borrower_name: l.borrower_name,
    borrower_email: l.borrower_email,
    amount: l.amount,
    principal_remaining: l.principal_remaining ?? l.amount,
    tenure: l.tenure,
    tenure_days: l.tenure_days || l.tenure,
    interest_rate: l.interest_rate,
    interest_amount: l.interest_amount ?? l.total_interest,
    total_interest: l.total_interest ?? l.interest_amount,
    total_repayable: l.total_repayable,
    per_installment: l.per_installment,
    installments_count: l.installments_count,
    frequency: l.frequency,
    purpose: l.purpose,
    status: l.status,
    shri_multiplier: l.shri_multiplier,
    funded_amount: l.funded_amount,
    repaid_amount: l.repaid_amount,
    due_date: l.due_date,
    repaid_at: l.repaid_at,
    created_at: l.created_at,
    updated_at: l.updated_at,
  }));

  const investments = db.prepare('SELECT * FROM investments').all().map((inv) => ({
    id: inv.id,
    loan_id: inv.loan_id,
    lender_id: inv.lender_id,
    amount: inv.amount,
    expected_return: inv.expected_return,
    status: inv.status,
    created_at: inv.created_at,
    updated_at: inv.updated_at,
  }));

  const transactions = db.prepare('SELECT * FROM transactions').all().map((t) => ({
    id: t.id,
    user_id: t.user_id,
    type: t.type,
    amount: t.amount,
    balance_after: t.balance_after,
    description: t.description,
    created_at: t.created_at,
  }));

  const guarantors = db.prepare('SELECT * FROM guarantors').all().map((g) => ({
    borrower_id: g.borrower_id,
    guarantor_id: g.guarantor_id,
    status: g.status,
    approved_at: g.approved_at,
  }));

  const friends = db.prepare('SELECT * FROM friends').all().map((f) => ({
    id: f.id,
    requester_id: f.requester_id,
    target_id: f.target_id,
    status: f.status,
    created_at: f.created_at,
    updated_at: f.updated_at,
  }));

  const privateLoans = db.prepare('SELECT * FROM private_loans').all().map((pl) => ({
    id: pl.id,
    from_user_id: pl.from_user_id,
    to_user_id: pl.to_user_id,
    amount: pl.amount,
    interest_proposed: pl.interest_proposed,
    tenure_days: pl.tenure_days,
    status: pl.status,
    negotiation_log: pl.negotiation_log ? JSON.parse(pl.negotiation_log) : [],
    created_at: pl.created_at,
    updated_at: pl.updated_at,
  }));

  const notifications = db.prepare('SELECT * FROM notifications').all().map((n) => ({
    id: n.id,
    user_id: n.user_id,
    title: n.title,
    message: n.message,
    type: n.type,
    is_read: Boolean(n.is_read),
    created_at: n.created_at,
  }));

  const pendingColleges = db.prepare('SELECT * FROM pending_colleges').all().map((pc) => ({
    id: pc.id,
    submitted_data: pc.submitted_data ? JSON.parse(pc.submitted_data) : {},
    status: pc.status,
    ml_score: pc.ml_score,
    created_at: pc.created_at,
    processed_at: pc.processed_at,
  }));

  const refreshTokens = db.prepare('SELECT id, token_id as tokenId, subject_type as subjectType, subject_id as subjectId, revoked_at as revokedAt, created_at as createdAt FROM refresh_tokens').all().map((rt) => ({
    id: rt.id,
    tokenId: rt.tokenId,
    subjectType: rt.subjectType,
    subjectId: rt.subjectId,
    revokedAt: rt.revokedAt,
    createdAt: rt.createdAt,
  }));

  const metaRow = db.prepare("SELECT value FROM meta_sync WHERE key = 'nextIds'").get();
  const nextIds = metaRow?.value
    ? JSON.parse(metaRow.value)
    : {
        pendingColleges: 10,
        colleges: 10,
        collegePrograms: 10,
        users: 20,
        loans: 20,
        investments: 20,
        transactions: 50,
        adminAuditLog: 10,
        refreshTokens: 50,
        otpSessions: 20,
        friends: 20,
        privateLoans: 20,
        notifications: 50,
        messages: 20,
      };

  return {
    meta: {
      nextIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    states,
    districts,
    universities,
    colleges,
    collegePrograms,
    users,
    pendingColleges,
    guarantors,
    adminAuditLog: [],
    loans,
    investments,
    transactions,
    notifications,
    refreshTokens,
    otpSessions: [],
    friends,
    messages: [],
    privateLoans,
  };
}

export function getDatabaseStats() {
  const db = getDb();
  initDatabaseTables();
  seedStaticMasterTables();

  const tables = [
    'users',
    'colleges',
    'universities',
    'states',
    'districts',
    'college_programs',
    'loans',
    'investments',
    'transactions',
    'guarantors',
    'friends',
    'private_loans',
    'notifications',
    'pending_colleges',
    'refresh_tokens',
    'interest_slabs',
    'comparison_rates',
    'testimonials',
    'how_it_works',
    'loan_purposes',
    'shri_tiers',
  ];

  const tableStats = {};
  let totalRows = 0;
  for (const table of tables) {
    try {
      const row = db.prepare(`SELECT count(*) as count FROM ${table}`).get();
      const count = row ? row.count : 0;
      tableStats[table] = count;
      totalRows += count;
    } catch {
      tableStats[table] = 0;
    }
  }

  let fileSize = 0;
  try {
    const stat = fs.statSync(dbPath);
    fileSize = stat.size;
  } catch {
    fileSize = 0;
  }

  return {
    databasePath: dbPath,
    engine: 'SQLite (node:sqlite) + PostgreSQL Schema Spec',
    totalTables: tables.length,
    totalRecords: totalRows,
    fileSizeBytes: fileSize,
    syncedAt: new Date().toISOString(),
    tables: tableStats,
  };
}

export function getMasterData() {
  const db = getDb();
  initDatabaseTables();
  seedStaticMasterTables();

  const interestSlabs = db.prepare('SELECT * FROM interest_slabs ORDER BY max_days ASC').all().map((r) => ({ ...r }));
  const comparisonRates = db.prepare('SELECT * FROM comparison_rates ORDER BY order_idx ASC').all().map((r) => ({ ...r }));
  const testimonials = db.prepare('SELECT * FROM testimonials WHERE is_active = 1').all().map((r) => ({ ...r }));
  const howItWorks = db.prepare('SELECT * FROM how_it_works ORDER BY step_number ASC').all().map((r) => ({ ...r }));
  const loanPurposes = db.prepare('SELECT name FROM loan_purposes WHERE is_active = 1').all().map((r) => r.name);
  const shriTiers = db.prepare('SELECT * FROM shri_tiers ORDER BY min_score DESC').all().map((r) => ({ ...r }));

  return {
    interestSlabs,
    comparisonRates,
    testimonials,
    howItWorks,
    loanPurposes,
    shriTiers,
  };
}
