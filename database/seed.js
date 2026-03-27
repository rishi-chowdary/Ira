const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./database');

async function seed() {
  const db = getDb();
  
  // Check if already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  console.log('🌱 Seeding database...');

  const password = await bcrypt.hash('demo123', 10);

  // Demo users
  const users = [
    { id: uuidv4(), email: 'raj@college.edu', full_name: 'Raj Sharma', college: 'IIT Delhi', trust_level: 'Bronze', trust_stars: 2, trust_points: 120, on_time_repayments: 2, max_loan_amount: 6000, digilocker_verified: 1, aadhaar_verified: 1, pan_verified: 1, education_verified: 1, income_verified: 0 },
    { id: uuidv4(), email: 'priya@college.edu', full_name: 'Priya Patel', college: 'NIT Trichy', trust_level: 'Gold', trust_stars: 4, trust_points: 550, on_time_repayments: 4, early_repayments: 2, max_loan_amount: 8000, digilocker_verified: 1, aadhaar_verified: 1, pan_verified: 1, education_verified: 1, income_verified: 1 },
    { id: uuidv4(), email: 'arjun@college.edu', full_name: 'Arjun Kumar', college: 'BITS Pilani', trust_level: 'Silver', trust_stars: 3, trust_points: 280, on_time_repayments: 3, early_repayments: 1, max_loan_amount: 7000, digilocker_verified: 1, aadhaar_verified: 1, pan_verified: 1, education_verified: 1, income_verified: 0 },
    { id: uuidv4(), email: 'sneha@college.edu', full_name: 'Sneha Reddy', college: 'IIT Bombay', trust_level: 'Platinum', trust_stars: 5, trust_points: 1200, on_time_repayments: 8, early_repayments: 5, max_loan_amount: 10000, digilocker_verified: 1, aadhaar_verified: 1, pan_verified: 1, education_verified: 1, income_verified: 1 },
    { id: uuidv4(), email: 'demo@student.edu', full_name: 'Demo Student', college: 'Demo College', trust_level: 'Newbie', trust_stars: 1, trust_points: 0, max_loan_amount: 5000, digilocker_verified: 0, aadhaar_verified: 0, pan_verified: 0, education_verified: 0, income_verified: 0 },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, college, trust_level, trust_stars, trust_points, on_time_repayments, early_repayments, max_loan_amount, digilocker_verified, aadhaar_verified, pan_verified, education_verified, income_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of users) {
    insertUser.run(u.id, u.email, password, u.full_name, u.college, u.trust_level, u.trust_stars, u.trust_points, u.on_time_repayments || 0, u.early_repayments || 0, u.max_loan_amount, u.digilocker_verified, u.aadhaar_verified, u.pan_verified, u.education_verified, u.income_verified);
  }

  // Create some sample loans
  const loans = [
    { id: uuidv4(), borrower_id: users[0].id, amount: 2000, purpose: 'Movie night with friends 🎬', tenure_days: 14, status: 'pending', interest_rate: 0.07, interest_amount: 140, total_due: 2140 },
    { id: uuidv4(), borrower_id: users[2].id, amount: 3500, purpose: 'Emergency laptop repair 💻', tenure_days: 21, status: 'pending', interest_rate: 0.09, interest_amount: 315, total_due: 3815 },
    { id: uuidv4(), borrower_id: users[4].id, amount: 1000, purpose: 'Concert tickets 🎵', tenure_days: 7, status: 'pending', interest_rate: 0.05, interest_amount: 50, total_due: 1050 },
  ];

  const insertLoan = db.prepare(`
    INSERT INTO loans (id, borrower_id, amount, purpose, tenure_days, status, interest_rate, interest_amount, total_due)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const l of loans) {
    insertLoan.run(l.id, l.borrower_id, l.amount, l.purpose, l.tenure_days, l.status, l.interest_rate, l.interest_amount, l.total_due);
  }

  console.log(`✅ Seeded ${users.length} users and ${loans.length} loans.`);
  console.log('\n📋 Demo Credentials:');
  console.log('  All accounts use password: demo123');
  for (const u of users) {
    console.log(`  ${u.email} (${u.full_name}) - ${u.trust_level} ⭐${u.trust_stars}`);
  }
}

seed().catch(console.error);
