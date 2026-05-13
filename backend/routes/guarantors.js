import express from 'express';
import Joi from 'joi';

import { ApiError, assert } from '../lib/errors.js';
import { mutateStore, readStore } from '../lib/store.js';
import { authenticate, requireUser } from '../middleware/auth.js';
import { sendEmail, sendWhatsappMessage } from '../lib/notifications.js';

const router = express.Router();

const requestSchema = Joi.object({
  guarantorEmail: Joi.string().trim().email().required(),
});

router.use(authenticate, requireUser);

function addNotification(store, userId, title, message, metadata = {}) {
  store.notifications.push({
    id: store.meta.nextIds.notifications++,
    user_id: userId,
    title,
    message,
    metadata,
    is_read: false,
    created_at: new Date().toISOString(),
  });
}

async function dispatchUserMessage(user, title, message) {
  if (!user) return;
  if (user.email) {
    sendEmail({ to: user.email, subject: title, text: message }).catch(() => {});
  }
  if (user.whatsapp) {
    sendWhatsappMessage({ to: user.whatsapp, body: message }).catch(() => {});
  }
}

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

router.post('/request', async (req, res, next) => {
  try {
    const payload = await requestSchema.validateAsync(req.body, { abortEarly: false });

    const result = await mutateStore(async (store) => {
      const borrower = store.users.find((entry) => entry.id === req.auth.user.id);
      assert(borrower, 404, 'Borrower not found');
      assert(borrower.wallet_activated, 403, 'Activate your wallet before borrowing');
      assert(borrower.college_verified, 403, 'Your college must verify you before borrowing');
      assert(borrower.can_borrow, 403, 'Borrowing is currently disabled for your account');

      const guarantor = store.users.find(
        (entry) => entry.email.toLowerCase() === payload.guarantorEmail.toLowerCase(),
      );
      assert(guarantor, 404, 'Guarantor not found');
      assert(guarantor.id !== borrower.id, 400, 'Cannot nominate yourself as a guarantor');

      const existing = store.guarantors.find(
        (entry) => entry.borrower_id === borrower.id && entry.guarantor_id === guarantor.id,
      );
      assert(!existing, 400, 'You already have a request or relationship with this guarantor');

      const request = {
        borrower_id: borrower.id,
        guarantor_id: guarantor.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        approved_at: null,
      };
      store.guarantors.push(request);

      addNotification(
        store,
        guarantor.id,
        'Guarantor request received',
        `${borrower.full_name} has nominated you as a guarantor. Accept or reject within 7 days.`,
        { borrowerId: borrower.id, type: 'guarantor_request' },
      );

      void dispatchUserMessage(
        guarantor,
        'Guarantor request received',
        `${borrower.full_name} has nominated you as a guarantor. Accept or reject within 7 days.`,
      );

      return request;
    });

    res.status(201).json(result);
  } catch (error) {
    next(error instanceof ApiError ? error : error);
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

      const borrower = store.users.find((user) => user.id === record.borrower_id);
      const guarantor = store.users.find((user) => user.id === record.guarantor_id);
      if (borrower && guarantor) {
        addNotification(
          store,
          borrower.id,
          `Guarantor request ${action}ed`,
          `${guarantor.full_name} has ${action}ed your guarantor request.`,
          { borrowerId: borrower.id, type: 'guarantor_response' },
        );
        void dispatchUserMessage(
          borrower,
          `Guarantor request ${action}ed`,
          `${guarantor.full_name} has ${action}ed your guarantor request.`,
        );
      }

      return record;
    });

    res.json(response);
  } catch (error) {
    next(error instanceof ApiError ? error : error);
  }
});

export default router;
