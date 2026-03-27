const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/database');
const { authMiddleware } = require('../middleware/auth');
const { calculateInterest } = require('../utils/interest');

const router = express.Router();

// GET /api/loans - List available loan requests (for lenders)
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { status, my } = req.query;

    let loans;
    if (my === 'borrowed') {
      loans = db.prepare(`
        SELECT l.*, u.full_name as borrower_name, u.college as borrower_college,
               u.trust_level, u.trust_stars
        FROM loans l
        JOIN users u ON l.borrower_id = u.id
        WHERE l.borrower_id = ?
        ORDER BY l.created_at DESC
      `).all(req.user.id);
    } else if (my === 'invested') {
      loans = db.prepare(`
        SELECT l.*, u.full_name as borrower_name, u.college as borrower_college,
               u.trust_level, u.trust_stars,
               i.amount as my_investment, i.expected_return, i.actual_return, i.status as investment_status
        FROM investments i
        JOIN loans l ON i.loan_id = l.id
        JOIN users u ON l.borrower_id = u.id
        WHERE i.lender_id = ?
        ORDER BY i.created_at DESC
      `).all(req.user.id);
    } else {
      // Available for funding
      loans = db.prepare(`
        SELECT l.*, u.full_name as borrower_name, u.college as borrower_college,
               u.trust_level, u.trust_stars
        FROM loans l
        JOIN users u ON l.borrower_id = u.id
        WHERE l.status IN ('pending', 'partially_funded')
        AND l.borrower_id != ?
        ORDER BY l.created_at DESC
      `).all(req.user.id);
    }

    res.json({ loans });
  } catch (err) {
    console.error('List loans error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/loans/:id - Get loan details
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const loan = db.prepare(`
      SELECT l.*, u.full_name as borrower_name, u.college as borrower_college,
             u.trust_level, u.trust_stars, u.on_time_repayments, u.early_repayments,
             u.late_repayments, u.total_defaults
      FROM loans l
      JOIN users u ON l.borrower_id = u.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found.' });
    }

    // Get investors for this loan
    const investments = db.prepare(`
      SELECT i.*, u.full_name as lender_name
      FROM investments i
      JOIN users u ON i.lender_id = u.id
      WHERE i.loan_id = ?
    `).all(req.params.id);

    res.json({ loan, investments });
  } catch (err) {
    console.error('Get loan error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/loans - Create a loan request
router.post('/', authMiddleware, (req, res) => {
  try {
    const { amount, purpose, tenure_days } = req.body;

    if (!amount || amount < 500 || amount > 50000) {
      return res.status(400).json({ error: 'Amount must be between ₹500 and ₹50,000.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    // Check DigiLocker verification for borrowers
    if (!user.digilocker_verified || !user.aadhaar_verified || !user.pan_verified) {
      return res.status(400).json({
        error: 'DigiLocker verification required before applying for loans. Please verify your identity documents.',
        verification_required: {
          digilocker: !user.digilocker_verified,
          aadhaar: !user.aadhaar_verified,
          pan: !user.pan_verified
        }
      });
    }

    if (amount > user.max_loan_amount) {
      return res.status(400).json({
        error: `Your trust level (${user.trust_level}) allows max ₹${user.max_loan_amount}.`
      });
    }

    // Check for active loans (max 2)
    const activeLoans = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_outstanding FROM loans
      WHERE borrower_id = ? AND status IN ('pending', 'funded', 'partially_funded', 'active')
    `).get(req.user.id);

    if (activeLoans.count >= 2) {
      return res.status(400).json({ error: 'You can have at most 2 active loans.' });
    }

    // Check remaining available limit (max_loan_amount - active outstanding)
    const remainingLimit = user.max_loan_amount - activeLoans.total_outstanding;
    if (amount > remainingLimit) {
      return res.status(400).json({
        error: `You already have ₹${activeLoans.total_outstanding.toLocaleString('en-IN')} in active loans. You can borrow up to ₹${remainingLimit.toLocaleString('en-IN')} more.`
      });
    }

    const tenure = tenure_days || 30;
    const { rate, interest } = calculateInterest(amount, tenure);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO loans (id, borrower_id, amount, purpose, tenure_days, interest_rate, interest_amount, total_due, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(id, req.user.id, amount, purpose || '', tenure, rate, interest, amount + interest);

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);

    res.status(201).json({ message: 'Loan request created!', loan });
  } catch (err) {
    console.error('Create loan error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/loans/:id/fund - Fund a loan (lender)
router.post('/:id/fund', authMiddleware, (req, res) => {
  try {
    const { amount } = req.body;
    const db = getDb();

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found.' });
    if (loan.borrower_id === req.user.id) return res.status(400).json({ error: 'Cannot fund your own loan.' });

    // Check lender verification
    const lender = db.prepare(`
      SELECT digilocker_verified, aadhaar_verified, pan_verified, income_verified
      FROM users WHERE id = ?
    `).get(req.user.id);

    if (!lender.digilocker_verified || !lender.aadhaar_verified || !lender.pan_verified || !lender.income_verified) {
      return res.status(400).json({
        error: 'Complete DigiLocker verification required before lending. Please verify your identity and income documents.',
        verification_required: {
          digilocker: !lender.digilocker_verified,
          aadhaar: !lender.aadhaar_verified,
          pan: !lender.pan_verified,
          income: !lender.income_verified
        }
      });
    }

    if (!['pending', 'partially_funded'].includes(loan.status)) {
      return res.status(400).json({ error: 'Loan is not available for funding.' });
    }

    const remaining = loan.amount - loan.amount_funded;
    const fundAmount = Math.min(amount || remaining, remaining);

    if (fundAmount <= 0) return res.status(400).json({ error: 'Loan is fully funded.' });

    const investmentId = uuidv4();
    const proportion = fundAmount / loan.amount;
    const expectedReturn = Math.round(loan.interest_amount * proportion * 0.85 * 100) / 100;

    db.prepare(`
      INSERT INTO investments (id, lender_id, loan_id, amount, expected_return, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(investmentId, req.user.id, loan.id, fundAmount, expectedReturn);

    const newFunded = loan.amount_funded + fundAmount;
    const newStatus = newFunded >= loan.amount ? 'funded' : 'partially_funded';

    const now = new Date().toISOString();
    let dueDate = loan.due_date;
    let fundedAt = loan.funded_at;

    if (newStatus === 'funded') {
      fundedAt = now;
      const due = new Date();
      due.setDate(due.getDate() + loan.tenure_days);
      dueDate = due.toISOString();
    }

    db.prepare(`
      UPDATE loans SET amount_funded = ?, status = ?, funded_at = ?, due_date = ?, updated_at = ?
      WHERE id = ?
    `).run(newFunded, newStatus, fundedAt, dueDate, now, loan.id);

    // Update lender stats
    db.prepare(`
      UPDATE users SET total_lent = total_lent + ?, updated_at = ? WHERE id = ?
    `).run(fundAmount, now, req.user.id);

    res.json({
      message: `Successfully funded ₹${fundAmount}!`,
      investment: db.prepare('SELECT * FROM investments WHERE id = ?').get(investmentId),
      loan: db.prepare('SELECT * FROM loans WHERE id = ?').get(loan.id),
    });
  } catch (err) {
    console.error('Fund loan error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
