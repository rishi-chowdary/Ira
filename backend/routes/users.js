import express from 'express';
import Joi from 'joi';

import { ApiError, assert } from '../lib/errors.js';
import { hashSensitiveValue } from '../lib/passwords.js';
import { mutateStore, readStore, sanitiseCollege, sanitiseUser } from '../lib/store.js';
import { authenticate, requireUser } from '../middleware/auth.js';

const router = express.Router();

const modeSchema = Joi.object({
  mode: Joi.string().valid('borrower', 'lender').required(),
});

const kycSchema = Joi.object({
  aadhaar_number: Joi.string().min(12).max(14).required(),
  pan_number: Joi.string().length(10).required(),
  upi_id: Joi.string().trim().required(),
});

router.use(authenticate);

router.get('/me', requireUser, async (req, res, next) => {
  try {
    const store = await readStore();
    const user = store.users.find((entry) => entry.id === req.auth.user.id);
    assert(user, 404, 'User not found');
    res.json({
      user: sanitiseUser(user),
      college: user.collegeId
        ? sanitiseCollege(store.colleges.find((entry) => entry.id === user.collegeId) || null)
        : null,
      loans: store.loans.filter((loan) => loan.borrower_id === user.id),
      investments: store.investments.filter((investment) => investment.lender_id === user.id),
    });
  } catch (error) {
    next(error instanceof ApiError ? error : error);
  }
});

router.patch('/mode', requireUser, async (req, res, next) => {
  try {
    const payload = await modeSchema.validateAsync(req.body, { abortEarly: false });
    const user = await mutateStore(async (store) => {
      const currentUser = store.users.find((entry) => entry.id === req.auth.user.id);
      assert(currentUser, 404, 'User not found');
      currentUser.mode = payload.mode;
      currentUser.updated_at = new Date().toISOString();
      return sanitiseUser(currentUser);
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post('/onboarding/kyc', requireUser, async (req, res, next) => {
  try {
    const payload = await kycSchema.validateAsync(req.body, { abortEarly: false });
    const user = await mutateStore(async (store) => {
      const currentUser = store.users.find((entry) => entry.id === req.auth.user.id);
      assert(currentUser, 404, 'User not found');
      currentUser.aadhaar_hash = hashSensitiveValue(payload.aadhaar_number);
      currentUser.pan_hash = hashSensitiveValue(payload.pan_number);
      currentUser.upi_id = payload.upi_id;
      currentUser.kyc_status = 'verified';
      currentUser.updated_at = new Date().toISOString();
      return sanitiseUser(currentUser);
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post('/onboarding/activate-wallet', requireUser, async (_req, res, next) => {
  try {
    const user = await mutateStore(async (store) => {
      const currentUser = store.users.find((entry) => entry.id === req.auth.user.id);
      assert(currentUser, 404, 'User not found');
      assert(currentUser.kyc_status === 'verified', 400, 'Complete KYC before wallet activation');
      currentUser.wallet_activated = true;
      currentUser.batua_locked += 1;
      currentUser.batua_unlocked += 1;
      currentUser.mock_upi_balance = Math.max(0, (currentUser.mock_upi_balance || 0) - 3);
      currentUser.updated_at = new Date().toISOString();
      store.transactions.push({
        id: store.meta.nextIds.transactions++,
        user_id: currentUser.id,
        type: 'wallet_activation',
        amount: 3,
        balance_after: currentUser.mock_upi_balance,
        description: 'Wallet activation via mock UPI payment',
        created_at: new Date().toISOString(),
      });
      store.transactions.push({
        id: store.meta.nextIds.transactions++,
        user_id: currentUser.id,
        type: 'wallet_credit_locked',
        amount: 1,
        balance_after: currentUser.batua_locked,
        description: 'Seed credit to Batua Locked',
        created_at: new Date().toISOString(),
      });
      store.transactions.push({
        id: store.meta.nextIds.transactions++,
        user_id: currentUser.id,
        type: 'wallet_credit_unlocked',
        amount: 1,
        balance_after: currentUser.batua_unlocked,
        description: 'Seed credit to Batua Unlocked',
        created_at: new Date().toISOString(),
      });
      return sanitiseUser(currentUser);
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
