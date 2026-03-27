const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/database');
const { authMiddleware } = require('../middleware/auth');
const { calculateRepayment } = require('../utils/interest');
const { updateTrustScore } = require('../utils/trustScore');

const router = express.Router();

// POST /api/repayments/:loanId - Repay a loan
router.post('/:loanId', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.loanId);

    if (!loan) return res.status(404).json({ error: 'Loan not found.' });
    if (loan.borrower_id !== req.user.id) return res.status(403).json({ error: 'Not your loan.' });
    if (loan.status === 'repaid') return res.status(400).json({ error: 'Loan already repaid.' });
    if (!['funded', 'active'].includes(loan.status)) {
      return res.status(400).json({ error: 'Loan is not in a repayable state.' });
    }

    // Calculate days since funded
    const fundedDate = new Date(loan.funded_at);
    const now = new Date();
    const daysSinceFunded = Math.max(1, Math.ceil((now - fundedDate) / (1000 * 60 * 60 * 24)));

    const repayment = calculateRepayment(loan.amount, loan.tenure_days, daysSinceFunded);

    // Create repayment record
    const repaymentId = uuidv4();
    db.prepare(`
      INSERT INTO repayments (id, loan_id, borrower_id, amount, principal_portion, interest_portion,
        penalty_portion, platform_fee, lender_earnings, repayment_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      repaymentId, loan.id, req.user.id, repayment.totalDue,
      repayment.principal, repayment.interest, repayment.penalty,
      repayment.platformFee, repayment.lenderEarnings, daysSinceFunded
    );

    // Update loan status
    const nowIso = now.toISOString();
    db.prepare(`
      UPDATE loans SET status = 'repaid', amount_repaid = ?, interest_amount = ?, 
        penalty_amount = ?, total_due = ?, repaid_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      repayment.totalDue, repayment.interest, repayment.penalty,
      repayment.totalDue, nowIso, nowIso, loan.id
    );

    // Distribute earnings to lenders
    const investments = db.prepare('SELECT * FROM investments WHERE loan_id = ?').all(loan.id);
    for (const inv of investments) {
      const proportion = inv.amount / loan.amount;
      const actualReturn = Math.round(repayment.lenderEarnings * proportion * 100) / 100;
      
      db.prepare(`
        UPDATE investments SET actual_return = ?, status = 'returned' WHERE id = ?
      `).run(actualReturn, inv.id);
      
      // Update lender earnings
      db.prepare(`
        UPDATE users SET total_earned = total_earned + ?, updated_at = ? WHERE id = ?
      `).run(actualReturn, nowIso, inv.lender_id);
    }

    // Update borrower stats and trust score
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    let eventType = 'on_time';
    if (daysSinceFunded < loan.tenure_days * 0.7) eventType = 'early';
    if (repayment.isOverdue) eventType = 'late';

    const { updates, pointsChange, newLevel } = updateTrustScore(user, eventType);

    db.prepare(`
      UPDATE users SET trust_points = ?, trust_level = ?, trust_stars = ?, max_loan_amount = ?,
        on_time_repayments = ?, early_repayments = ?, late_repayments = ?,
        total_borrowed = total_borrowed + ?, updated_at = ?
      WHERE id = ?
    `).run(
      updates.trust_points, updates.trust_level, updates.trust_stars, updates.max_loan_amount,
      updates.on_time_repayments || user.on_time_repayments,
      updates.early_repayments || user.early_repayments,
      updates.late_repayments || user.late_repayments,
      loan.amount, nowIso, req.user.id
    );

    // Record trust history
    db.prepare(`
      INSERT INTO trust_history (id, user_id, event_type, points_change, new_level, new_stars, loan_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user.id, eventType, pointsChange, newLevel.level, newLevel.stars, loan.id);

    res.json({
      message: 'Repayment successful! 🎉',
      repayment: {
        ...repayment,
        id: repaymentId,
        daysSinceFunded,
        eventType,
      },
      trustUpdate: { pointsChange, newLevel: newLevel.level, newStars: newLevel.stars },
    });
  } catch (err) {
    console.error('Repayment error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/repayments/preview/:loanId - Preview repayment amounts
router.get('/preview/:loanId', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.loanId);

    if (!loan) return res.status(404).json({ error: 'Loan not found.' });

    const fundedDate = new Date(loan.funded_at || loan.created_at);
    const now = new Date();
    const daysSinceFunded = Math.max(1, Math.ceil((now - fundedDate) / (1000 * 60 * 60 * 24)));

    const repayment = calculateRepayment(loan.amount, loan.tenure_days, daysSinceFunded);

    res.json({ preview: { ...repayment, daysSinceFunded } });
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
