const express = require('express');
const { getDb } = require('../../database/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me - Get current user profile
router.get('/me', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { password_hash, ...safeUser } = user;

    // Get dashboard stats
    const borrowedLoans = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
      FROM loans WHERE borrower_id = ? AND status = 'repaid'
    `).get(req.user.id);

    const activeLoans = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
      FROM loans WHERE borrower_id = ? AND status IN ('pending', 'funded', 'partially_funded', 'active')
    `).get(req.user.id);

    const investments = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total, COALESCE(SUM(actual_return), 0) as earned
      FROM investments WHERE lender_id = ?
    `).get(req.user.id);

    res.json({
      user: safeUser,
      stats: {
        loansBorrowed: borrowedLoans.count,
        totalBorrowed: borrowedLoans.total,
        activeLoans: activeLoans.count,
        activeAmount: activeLoans.total,
        remainingLimit: Math.max(0, safeUser.max_loan_amount - activeLoans.total),
        investmentsMade: investments.count,
        totalInvested: investments.total,
        totalEarned: investments.earned,
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/users/stats - Platform stats (public)
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalLoans = db.prepare('SELECT COUNT(*) as count FROM loans').get().count;
    const totalLent = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM investments').get().total;
    const totalRepaid = db.prepare('SELECT COUNT(*) as count FROM loans WHERE status = ?').get('repaid').count;
    const avgTrust = db.prepare('SELECT COALESCE(AVG(trust_stars), 1) as avg FROM users').get().avg;

    res.json({
      stats: {
        totalUsers,
        totalLoans,
        totalLent,
        totalRepaid,
        avgTrust: Math.round(avgTrust * 10) / 10,
        successRate: totalLoans > 0 ? Math.round((totalRepaid / totalLoans) * 100) : 95,
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
