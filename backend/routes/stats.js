import express from 'express';

import { readStore, getDatabaseStats, getMasterData } from '../lib/store.js';

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const store = await readStore();
    const totalLent = store.investments.reduce((sum, investment) => sum + (investment.amount || 0), 0);
    const totalEarned = store.transactions
      .filter((entry) => entry.type === 'repayment_received')
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const totalLoans = store.loans.length;
    const totalUsers = store.users.filter((entry) => !['admin', 'college_admin'].includes(entry.role)).length;

    res.json({
      totalLent,
      totalLoans,
      totalUsers,
      totalEarned,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/testimonials', async (_req, res, next) => {
  try {
    const master = getMasterData();
    res.json(master.testimonials);
  } catch (error) {
    next(error);
  }
});

router.get('/how-it-works', async (_req, res, next) => {
  try {
    const master = getMasterData();
    res.json(master.howItWorks);
  } catch (error) {
    next(error);
  }
});

router.get('/comparison-rates', async (_req, res, next) => {
  try {
    const master = getMasterData();
    const borrower = master.comparisonRates.filter((r) => r.category === 'borrower');
    const lender = master.comparisonRates.filter((r) => r.category === 'lender');
    res.json({ borrower, lender });
  } catch (error) {
    next(error);
  }
});

router.get('/database-status', async (_req, res, next) => {
  try {
    const stats = getDatabaseStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
