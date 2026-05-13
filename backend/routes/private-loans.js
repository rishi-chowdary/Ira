import express from 'express';
import Joi from 'joi';

import { assert } from '../lib/errors.js';
import { mutateStore, readStore, nextId } from '../lib/store.js';
import { authenticate, requireUser } from '../middleware/auth.js';

const router = express.Router();

function createNotification(store, userId, message) {
  const notification = {
    id: nextId(store, 'notifications'),
    user_id: userId,
    type: 'private_loan',
    message,
    is_read: false,
    created_at: new Date().toISOString(),
  };
  store.notifications.push(notification);
}

const requestSchema = Joi.object({
  to_borrowing_account_id: Joi.string().trim().required(),
  amount: Joi.number().integer().min(100).required(),
  interest_proposed: Joi.number().positive().required(),
  tenure_days: Joi.number().integer().min(1).max(90).required(),
  message: Joi.string().trim().allow('').optional(),
});

const respondSchema = Joi.object({
  requestId: Joi.number().integer().required(),
  action: Joi.string().valid('accept', 'reject', 'counter').required(),
  counter_interest: Joi.number().positive().optional(),
  counter_tenure: Joi.number().integer().min(1).max(90).optional(),
  message: Joi.string().trim().allow('').optional(),
});

router.use(authenticate, requireUser);

router.get('/', async (req, res, next) => {
  try {
    const store = await readStore();
    const requests = store.privateLoans.filter(
      (entry) => entry.from_user_id === req.auth.user.id || entry.to_user_id === req.auth.user.id,
    );
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

router.post('/request', async (req, res, next) => {
  try {
    const payload = await requestSchema.validateAsync(req.body, { abortEarly: false });
    const result = await mutateStore(async (store) => {
      const target = store.users.find(
        (user) => user.borrowing_account_id === payload.to_borrowing_account_id,
      );
      assert(target, 404, 'Target borrower not found');
      assert(target.id !== req.auth.user.id, 400, 'Cannot request a private loan from yourself');

      const record = {
        id: nextId(store, 'privateLoans'),
        from_user_id: req.auth.user.id,
        to_user_id: target.id,
        amount: payload.amount,
        interest_proposed: payload.interest_proposed,
        tenure_days: payload.tenure_days,
        status: 'pending',
        negotiation_log: [
          {
            action: 'requested',
            amount: payload.amount,
            interest_proposed: payload.interest_proposed,
            tenure_days: payload.tenure_days,
            message: payload.message || '',
            created_at: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.privateLoans.push(record);
      return record;
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/respond', async (req, res, next) => {
  try {
    const payload = await respondSchema.validateAsync(req.body, { abortEarly: false });
    const result = await mutateStore(async (store) => {
      const request = store.privateLoans.find((entry) => entry.id === payload.requestId);
      assert(request, 404, 'Private loan request not found');
      assert(request.to_user_id === req.auth.user.id, 403, 'You are not authorized to respond to this request');
      assert(request.status === 'pending' || request.status === 'countered', 400, 'Request cannot be responded to');

      if (payload.action === 'accept') {
        request.status = 'accepted';
      } else if (payload.action === 'reject') {
        request.status = 'rejected';
      } else if (payload.action === 'counter') {
        assert(payload.counter_interest, 400, 'Counter interest is required for counter offers');
        assert(payload.counter_tenure, 400, 'Counter tenure is required for counter offers');
        request.status = 'countered';
        request.interest_proposed = payload.counter_interest;
        request.tenure_days = payload.counter_tenure;
      }

      request.negotiation_log.push({
        action: payload.action,
        interest_proposed: payload.counter_interest || request.interest_proposed,
        tenure_days: payload.counter_tenure || request.tenure_days,
        message: payload.message || '',
        created_at: new Date().toISOString(),
      });
      request.updated_at = new Date().toISOString();
      if (payload.action !== 'counter') {
        createNotification(
          store,
          request.from_user_id,
          `Your private loan request for ₹${request.amount} was ${request.status}`,
        );
      } else {
        createNotification(
          store,
          request.from_user_id,
          `Your private loan request has a counter offer at ${request.interest_proposed}% for ${request.tenure_days} days`,
        );
      }
      return request;
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
