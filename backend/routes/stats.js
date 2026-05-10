import express from 'express';

import { readStore } from '../lib/store.js';

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const store = await readStore();
    const totalLent = store.investments.reduce((sum, investment) => sum + investment.amount, 0);
    const totalEarned = store.transactions
      .filter((entry) => entry.type === 'repayment_received')
      .reduce((sum, entry) => sum + entry.amount, 0);
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

export default router;
