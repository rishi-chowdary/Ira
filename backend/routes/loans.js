import express from 'express';
import Joi from 'joi';

import { BASE_INTEREST_SCHEDULE, SHRI_TIERS } from '../lib/constants.js';
import { ApiError, assert } from '../lib/errors.js';
import { mutateStore, readStore } from '../lib/store.js';
import { authenticate, requireUser } from '../middleware/auth.js';

const router = express.Router();

const requestSchema = Joi.object({
  amount: Joi.number().integer().min(500).max(5000).required(),
  tenure: Joi.number().integer().min(1).max(90).required(),
  purpose: Joi.string().trim().allow('').optional(),
});

const repaySchema = Joi.object({
  loanId: Joi.number().integer().required(),
});

function getTier(score) {
  return SHRI_TIERS.find((tier) => score >= tier.min && score <= tier.max) || SHRI_TIERS[0];
}

function getBaseInterestRate(days) {
  return BASE_INTEREST_SCHEDULE.find((step) => days <= step.maxDays)?.rate || BASE_INTEREST_SCHEDULE.at(-1).rate;
}

function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function getMatchRank(borrower, lender) {
  if (borrower.collegeId && lender.collegeId === borrower.collegeId && lender.course_code === borrower.course_code) {
    return 1;
  }
  if (lender.districtCode === borrower.districtCode) {
    return 2;
  }
  return 3;
}

function recordTransaction(store, userId, type, amount, balanceAfter, description) {
  store.transactions.push({
    id: store.meta.nextIds.transactions++,
    user_id: userId,
    type,
    amount,
    balance_after: balanceAfter,
    description,
    created_at: new Date().toISOString(),
  });
}

router.use(authenticate, requireUser);

router.get('/', async (req, res, next) => {
  try {
    const store = await readStore();
    if (req.auth.user.role === 'admin') {
      res.json(store.loans);
      return;
    }

    res.json({
      loans: store.loans.filter((loan) => loan.borrower_id === req.auth.user.id),
      investments: store.investments.filter((investment) => investment.lender_id === req.auth.user.id),
    });
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

      const tier = getTier(borrower.shri_score);
      const interestRate = roundMoney(getBaseInterestRate(payload.tenure) * tier.multiplier);
      const interestAmount = roundMoney((payload.amount * interestRate) / 100);
      const totalRepayable = roundMoney(payload.amount + interestAmount);
      const dueDate = new Date(Date.now() + payload.tenure * 24 * 60 * 60 * 1000).toISOString();

      const loan = {
        id: store.meta.nextIds.loans++,
        borrower_id: borrower.id,
        amount: payload.amount,
        tenure_days: payload.tenure,
        purpose: payload.purpose || '',
        status: 'pending',
        interest_rate: interestRate,
        interest_amount: interestAmount,
        total_repayable: totalRepayable,
        due_date: dueDate,
        funded_amount: 0,
        created_at: new Date().toISOString(),
      };
      store.loans.push(loan);

      const lenders = store.users
        .filter(
          (entry) =>
            entry.id !== borrower.id &&
            entry.can_lend &&
            entry.wallet_activated &&
            entry.batua_unlocked > 0,
        )
        .sort((left, right) => {
          const leftRank = getMatchRank(borrower, left);
          const rightRank = getMatchRank(borrower, right);
          if (leftRank !== rightRank) return leftRank - rightRank;
          return right.shri_score - left.shri_score;
        });

      const matches = [];
      let remaining = payload.amount;

      lenders.forEach((lender) => {
        if (remaining <= 0) return;
        const contribution = Math.min(remaining, lender.batua_unlocked);
        if (contribution <= 0) return;

        lender.batua_unlocked = roundMoney(lender.batua_unlocked - contribution);
        recordTransaction(
          store,
          lender.id,
          'loan_funded',
          contribution,
          lender.batua_unlocked,
          `Funded loan #${loan.id}`,
        );

        const interestShare = roundMoney((interestAmount * contribution) / payload.amount);
        const investment = {
          id: store.meta.nextIds.investments++,
          lender_id: lender.id,
          loan_id: loan.id,
          amount: contribution,
          expected_return: roundMoney(contribution + interestShare),
          status: 'active',
          created_at: new Date().toISOString(),
        };
        store.investments.push(investment);
        matches.push({
          lenderId: lender.id,
          lenderName: lender.full_name,
          amount: contribution,
          rank: getMatchRank(borrower, lender),
        });
        loan.funded_amount = roundMoney(loan.funded_amount + contribution);
        remaining = roundMoney(remaining - contribution);
      });

      if (remaining <= 0) {
        loan.status = 'active';
        borrower.batua_unlocked = roundMoney(borrower.batua_unlocked + loan.amount);
        recordTransaction(
          store,
          borrower.id,
          'loan_disbursed',
          loan.amount,
          borrower.batua_unlocked,
          `Loan #${loan.id} disbursed`,
        );
      }

      return {
        loan,
        matches,
      };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error instanceof ApiError ? error : error);
  }
});

router.post('/repay', async (req, res, next) => {
  try {
    const payload = await repaySchema.validateAsync(req.body, { abortEarly: false });

    const response = await mutateStore(async (store) => {
      const loan = store.loans.find((entry) => entry.id === payload.loanId);
      assert(loan, 404, 'Loan not found');

      const borrower = store.users.find((entry) => entry.id === loan.borrower_id);
      assert(borrower, 404, 'Borrower not found');
      assert(
        req.auth.user.id === borrower.id || req.auth.user.role === 'admin',
        403,
        'You cannot repay this loan',
      );
      assert(['active', 'pending'].includes(loan.status), 400, 'Loan cannot be repaid');

      const dueDate = new Date(loan.due_date).getTime();
      const overdueDays = Math.max(0, Math.floor((Date.now() - dueDate) / (24 * 60 * 60 * 1000)));
      const penaltyRate = Math.min(0.5, overdueDays * 0.02);
      const penaltyAmount = roundMoney(loan.amount * penaltyRate);
      const totalDue = roundMoney(loan.total_repayable + penaltyAmount);

      const deductionTrail = [];
      let remaining = totalDue;

      const deduct = (user, walletKey, amountNeeded, label) => {
        if (!user || amountNeeded <= 0) return amountNeeded;
        const available = walletKey === 'mock_upi_balance' ? user.mock_upi_balance || 0 : user[walletKey] || 0;
        if (available <= 0) return amountNeeded;
        const deducted = Math.min(available, amountNeeded);
        if (walletKey === 'mock_upi_balance') {
          user.mock_upi_balance = roundMoney(available - deducted);
        } else {
          user[walletKey] = roundMoney(available - deducted);
        }
        deductionTrail.push({ label, amount: deducted });
        return roundMoney(amountNeeded - deducted);
      };

      remaining = deduct(borrower, 'batua_unlocked', remaining, 'Borrower Batua Unlocked');
      remaining = deduct(borrower, 'mock_upi_balance', remaining, 'Borrower UPI AutoPay');
      remaining = deduct(borrower, 'batua_locked', remaining, 'Borrower Batua Locked');

      const guarantors = store.guarantors
        .filter((entry) => entry.borrower_id === borrower.id && entry.status === 'approved')
        .map((entry) => store.users.find((user) => user.id === entry.guarantor_id))
        .filter(Boolean)
        .slice(0, 2);

      guarantors.forEach((guarantor, index) => {
        remaining = deduct(guarantor, 'batua_unlocked', remaining, `Guarantor ${index + 1} Batua Unlocked`);
        remaining = deduct(guarantor, 'batua_locked', remaining, `Guarantor ${index + 1} Batua Locked`);
      });

      if (remaining > 0) {
        loan.status = 'defaulted';
        return {
          loan,
          totalDue,
          penaltyAmount,
          deductionTrail,
          remaining,
        };
      }

      loan.status = 'repaid';
      loan.repaid_at = new Date().toISOString();

      const totalInterest = loan.interest_amount;
      const platformInterest = roundMoney(totalInterest * 0.15);
      const platformPenalty = roundMoney(penaltyAmount * 0.4);

      const investments = store.investments.filter((entry) => entry.loan_id === loan.id);
      investments.forEach((investment) => {
        const lender = store.users.find((user) => user.id === investment.lender_id);
        if (!lender) return;
        const ratio = investment.amount / loan.amount;
        const lenderInterest = roundMoney(totalInterest * 0.85 * ratio);
        const lenderPenalty = roundMoney(penaltyAmount * 0.6 * ratio);
        const payout = roundMoney(investment.amount + lenderInterest + lenderPenalty);
        lender.tijori = roundMoney(lender.tijori + payout);
        recordTransaction(
          store,
          lender.id,
          'repayment_received',
          payout,
          lender.tijori,
          `Repayment received for loan #${loan.id}`,
        );
        investment.status = 'completed';
      });

      const admin = store.users.find((entry) => entry.role === 'admin');
      if (admin) {
        recordTransaction(
          store,
          admin.id,
          'platform_interest',
          platformInterest,
          admin.tijori,
          `Interest earned on loan #${loan.id}`,
        );
        if (platformPenalty > 0) {
          recordTransaction(
            store,
            admin.id,
            'platform_penalty',
            platformPenalty,
            admin.tijori,
            `Penalty earned on loan #${loan.id}`,
          );
        }
      }

      recordTransaction(
        store,
        borrower.id,
        'loan_repayment',
        totalDue,
        borrower.batua_unlocked,
        `Loan #${loan.id} repaid`,
      );

      return {
        loan,
        totalDue,
        penaltyAmount,
        deductionTrail,
        remaining: 0,
      };
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
