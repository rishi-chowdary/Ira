import express from 'express';

import { readStore, sanitiseUser } from '../lib/store.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireRole('admin'));

function getDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

router.get('/stats', async (_req, res, next) => {
  try {
    const store = await readStore();
    const now = Date.now();
    const todayKey = getDateKey(now);

    const platformTransactions = store.transactions.filter((entry) =>
      ['platform_interest', 'platform_penalty'].includes(entry.type),
    );

    const totals = platformTransactions.reduce(
      (accumulator, transaction) => {
        const transactionDate = new Date(transaction.created_at).getTime();
        if (getDateKey(transaction.created_at) === todayKey) {
          accumulator.today += transaction.amount;
        }
        if (transactionDate >= now - 7 * 24 * 60 * 60 * 1000) {
          accumulator.week += transaction.amount;
        }
        if (transactionDate >= now - 30 * 24 * 60 * 60 * 1000) {
          accumulator.month += transaction.amount;
        }
        return accumulator;
      },
      { today: 0, week: 0, month: 0 },
    );

    res.json({
      totalRegisteredColleges: store.pendingColleges.length + store.colleges.length,
      totalApprovedColleges: store.colleges.length,
      totalPendingRegistrations: store.pendingColleges.filter((entry) => entry.status === 'pending_admin').length,
      totalPlatformEarnings: totals,
      totalUsers: store.users.filter((user) => !['admin', 'college_admin'].includes(user.role)).length,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/pending-colleges', async (_req, res, next) => {
  try {
    const store = await readStore();
    res.json(store.pendingColleges.filter((entry) => entry.status === 'pending_admin'));
  } catch (error) {
    next(error);
  }
});

router.get('/earnings', async (_req, res, next) => {
  try {
    const store = await readStore();
    const days = Array.from({ length: 7 }, (_entry, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = getDateKey(date);
      const amount = store.transactions
        .filter((transaction) =>
          ['platform_interest', 'platform_penalty'].includes(transaction.type) &&
          getDateKey(transaction.created_at) === key,
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      return { date: key, amount };
    });

    res.json(days);
  } catch (error) {
    next(error);
  }
});

router.get('/users/:userId', async (req, res, next) => {
  try {
    const store = await readStore();
    const user = store.users.find((entry) => entry.id === Number(req.params.userId));
    res.json(sanitiseUser(user));
  } catch (error) {
    next(error);
  }
});

export default router;
