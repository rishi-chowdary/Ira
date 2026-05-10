import express from 'express';

import { ApiError, assert } from '../lib/errors.js';
import { mutateStore, readStore } from '../lib/store.js';
import { authenticate, requireUser } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireUser);

router.get('/', async (req, res, next) => {
  try {
    const store = await readStore();
    const yourGuarantors = store.guarantors
      .filter((entry) => entry.borrower_id === req.auth.user.id)
      .map((entry) => ({
        ...entry,
        guarantor: store.users.find((user) => user.id === entry.guarantor_id),
      }));
    const youAsGuarantor = store.guarantors
      .filter((entry) => entry.guarantor_id === req.auth.user.id)
      .map((entry) => ({
        ...entry,
        borrower: store.users.find((user) => user.id === entry.borrower_id),
      }));

    res.json({ yourGuarantors, youAsGuarantor });
  } catch (error) {
    next(error);
  }
});

router.post('/:borrowerId/:action', async (req, res, next) => {
  try {
    const { borrowerId, action } = req.params;
    assert(['approve', 'reject'].includes(action), 400, 'Unsupported action');

    const response = await mutateStore(async (store) => {
      const record = store.guarantors.find(
        (entry) => entry.borrower_id === Number(borrowerId) && entry.guarantor_id === req.auth.user.id,
      );
      assert(record, 404, 'Guarantor request not found');
      record.status = action === 'approve' ? 'approved' : 'rejected';
      record.approved_at = action === 'approve' ? new Date().toISOString() : null;
      return record;
    });

    res.json(response);
  } catch (error) {
    next(error instanceof ApiError ? error : error);
  }
});

export default router;
