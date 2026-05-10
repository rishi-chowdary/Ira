import express from 'express';

import { readStore } from '../lib/store.js';
import { authenticate, requireUser } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireUser);

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const perPage = 10;
    const range = String(req.query.range || 'all');
    const from = req.query.from ? new Date(String(req.query.from)).getTime() : null;
    const to = req.query.to ? new Date(String(req.query.to)).getTime() : null;
    const now = Date.now();

    const store = await readStore();
    let transactions = store.transactions
      .filter((entry) => entry.user_id === req.auth.user.id)
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));

    transactions = transactions.filter((entry) => {
      const timestamp = new Date(entry.created_at).getTime();
      if (range === 'today') {
        return timestamp >= now - 24 * 60 * 60 * 1000;
      }
      if (range === 'week') {
        return timestamp >= now - 7 * 24 * 60 * 60 * 1000;
      }
      if (range === 'month') {
        return timestamp >= now - 30 * 24 * 60 * 60 * 1000;
      }
      if (range === 'custom') {
        return (!from || timestamp >= from) && (!to || timestamp <= to);
      }
      return true;
    });

    const total = transactions.length;
    const paginated = transactions.slice((page - 1) * perPage, page * perPage);

    res.json({
      items: paginated,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
