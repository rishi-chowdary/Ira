import express from 'express';

import { ApiError } from '../lib/errors.js';
import { mutateStore, nextId, readStore } from '../lib/store.js';
import { authenticate, requireUser } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireUser);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowIso() {
  return new Date().toISOString();
}

/** Validate that amount is a positive integer (or positive number for loose mode). */
function validateAmount(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'amount must be a positive number');
  }
}

const WALLET_FIELDS = ['batua_locked', 'batua_unlocked', 'tijori'];

/** Allowed internal transfer pairs: { from: to[] } */
const ALLOWED_TRANSFERS = {
  batua_locked: ['batua_unlocked'],
  batua_unlocked: ['batua_locked'],
  tijori: ['batua_locked', 'batua_unlocked'],
};

// ---------------------------------------------------------------------------
// GET /api/wallet/balance
// ---------------------------------------------------------------------------
router.get('/balance', async (req, res, next) => {
  try {
    // Fetch raw user so we get mock_upi_balance (sanitiseUser strips it)
    const rawUser = await readStore((s) => s.users.find((u) => u.id === req.auth.user.id));
    if (!rawUser) throw new ApiError(404, 'User not found');

    const batua_locked = rawUser.batua_locked ?? 0;
    const batua_unlocked = rawUser.batua_unlocked ?? 0;
    const tijori = rawUser.tijori ?? 0;

    res.json({
      batua_locked,
      batua_unlocked,
      tijori,
      total: batua_locked + batua_unlocked + tijori,
      mock_upi_balance: rawUser.mock_upi_balance ?? 0,
      is_activated: rawUser.wallet_activated ?? false,
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /api/wallet/add-money  { amount, upi_id }
// ---------------------------------------------------------------------------
router.post('/add-money', async (req, res, next) => {
  try {
    const { amount, upi_id } = req.body ?? {};
    validateAmount(amount);

    const userId = req.auth.user.id;

    const result = await mutateStore((store) => {
      const user = store.users.find((u) => u.id === userId);
      if (!user) throw new ApiError(404, 'User not found');
      if (!user.wallet_activated) throw new ApiError(403, 'Wallet is not activated');

      const mockBalance = user.mock_upi_balance ?? 0;
      if (mockBalance < amount) {
        throw new ApiError(400, `Insufficient UPI balance (available ₹${mockBalance})`);
      }

      user.mock_upi_balance = mockBalance - amount;
      user.batua_locked = (user.batua_locked ?? 0) + amount;
      user.updated_at = nowIso();

      const txId = nextId(store, 'transactions');
      const tx = {
        id: txId,
        user_id: userId,
        type: 'upi_deposit',
        wallet: 'batua_locked',
        amount,
        balance_after: user.batua_locked,
        description: `Added ₹${amount} from UPI (${upi_id ?? user.upi_id}) to Batua Locked`,
        created_at: nowIso(),
      };
      store.transactions.push(tx);

      return { user, tx };
    });

    res.json({
      message: 'Money added successfully',
      batua_locked: result.user.batua_locked,
      mock_upi_balance: result.user.mock_upi_balance,
      transaction: result.tx,
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /api/wallet/transfer  { from_wallet, to_wallet, amount }
// ---------------------------------------------------------------------------
router.post('/transfer', async (req, res, next) => {
  try {
    const { from_wallet, to_wallet, amount } = req.body ?? {};
    validateAmount(amount);

    if (!WALLET_FIELDS.includes(from_wallet)) {
      throw new ApiError(400, `Invalid from_wallet: ${from_wallet}`);
    }
    if (!WALLET_FIELDS.includes(to_wallet)) {
      throw new ApiError(400, `Invalid to_wallet: ${to_wallet}`);
    }
    if (from_wallet === to_wallet) {
      throw new ApiError(400, 'from_wallet and to_wallet must be different');
    }
    if (!ALLOWED_TRANSFERS[from_wallet]?.includes(to_wallet)) {
      throw new ApiError(
        400,
        `Transfer from ${from_wallet} to ${to_wallet} is not allowed`,
      );
    }

    const userId = req.auth.user.id;

    const result = await mutateStore((store) => {
      const user = store.users.find((u) => u.id === userId);
      if (!user) throw new ApiError(404, 'User not found');

      const fromBalance = user[from_wallet] ?? 0;
      if (fromBalance < amount) {
        throw new ApiError(400, `Insufficient balance in ${from_wallet} (available ₹${fromBalance})`);
      }

      user[from_wallet] = fromBalance - amount;
      user[to_wallet] = (user[to_wallet] ?? 0) + amount;
      user.updated_at = nowIso();

      const now = nowIso();

      const debitId = nextId(store, 'transactions');
      const debitTx = {
        id: debitId,
        user_id: userId,
        type: 'internal_transfer_out',
        wallet: from_wallet,
        amount,
        balance_after: user[from_wallet],
        description: `Transferred ₹${amount} from ${from_wallet} to ${to_wallet}`,
        created_at: now,
      };
      store.transactions.push(debitTx);

      const creditId = nextId(store, 'transactions');
      const creditTx = {
        id: creditId,
        user_id: userId,
        type: 'internal_transfer_in',
        wallet: to_wallet,
        amount,
        balance_after: user[to_wallet],
        description: `Received ₹${amount} in ${to_wallet} from ${from_wallet}`,
        created_at: now,
      };
      store.transactions.push(creditTx);

      return { user, debitTx, creditTx };
    });

    res.json({
      message: 'Transfer successful',
      [from_wallet]: result.user[from_wallet],
      [to_wallet]: result.user[to_wallet],
      transactions: [result.debitTx, result.creditTx],
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /api/wallet/withdraw  { amount, from_wallet, upi_id }
// ---------------------------------------------------------------------------
router.post('/withdraw', async (req, res, next) => {
  try {
    const { amount, from_wallet, upi_id } = req.body ?? {};
    validateAmount(amount);

    if (!WALLET_FIELDS.includes(from_wallet)) {
      throw new ApiError(400, `Invalid from_wallet: ${from_wallet}`);
    }

    const userId = req.auth.user.id;

    const result = await mutateStore((store) => {
      const user = store.users.find((u) => u.id === userId);
      if (!user) throw new ApiError(404, 'User not found');

      const walletBalance = user[from_wallet] ?? 0;
      if (walletBalance < amount) {
        throw new ApiError(400, `Insufficient balance in ${from_wallet} (available ₹${walletBalance})`);
      }

      user[from_wallet] = walletBalance - amount;
      user.mock_upi_balance = (user.mock_upi_balance ?? 0) + amount;
      user.updated_at = nowIso();

      const txId = nextId(store, 'transactions');
      const tx = {
        id: txId,
        user_id: userId,
        type: 'upi_withdrawal',
        wallet: from_wallet,
        amount,
        balance_after: user[from_wallet],
        description: `Withdrew ₹${amount} from ${from_wallet} to UPI (${upi_id ?? user.upi_id})`,
        created_at: nowIso(),
      };
      store.transactions.push(tx);

      return { user, tx };
    });

    res.json({
      message: 'Withdrawal successful',
      [from_wallet]: result.user[from_wallet],
      mock_upi_balance: result.user.mock_upi_balance,
      transaction: result.tx,
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /api/wallet/upi-autopay  { amount }
// ---------------------------------------------------------------------------
router.post('/upi-autopay', async (req, res, next) => {
  try {
    const { amount } = req.body ?? {};
    validateAmount(amount);

    const userId = req.auth.user.id;

    const result = await mutateStore((store) => {
      const user = store.users.find((u) => u.id === userId);
      if (!user) throw new ApiError(404, 'User not found');

      const mockBalance = user.mock_upi_balance ?? 0;
      if (mockBalance < amount) {
        throw new ApiError(400, `Insufficient UPI balance for AutoPay (available ₹${mockBalance})`);
      }

      user.mock_upi_balance = mockBalance - amount;
      user.batua_unlocked = (user.batua_unlocked ?? 0) + amount;
      user.updated_at = nowIso();

      const txId = nextId(store, 'transactions');
      const tx = {
        id: txId,
        user_id: userId,
        type: 'autopay_debit',
        wallet: 'batua_unlocked',
        amount,
        balance_after: user.batua_unlocked,
        description: `UPI AutoPay mandate deduction of ₹${amount} for loan repayment`,
        created_at: nowIso(),
      };
      store.transactions.push(tx);

      return { user, tx };
    });

    res.json({
      message: 'UPI AutoPay processed successfully',
      batua_unlocked: result.user.batua_unlocked,
      mock_upi_balance: result.user.mock_upi_balance,
      transaction: result.tx,
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /api/wallet/transactions  ?wallet=&type=&range=
// ---------------------------------------------------------------------------
router.get('/transactions', async (req, res, next) => {
  try {
    const userId = req.auth.user.id;
    const { wallet, type, range } = req.query;
    const now = Date.now();

    const transactions = await readStore((store) => {
      let txs = store.transactions
        .filter((tx) => tx.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Filter by wallet
      if (wallet) {
        txs = txs.filter((tx) => tx.wallet === wallet);
      }

      // Filter by type
      if (type) {
        txs = txs.filter((tx) => tx.type === type);
      }

      // Filter by date range
      if (range) {
        txs = txs.filter((tx) => {
          const timestamp = new Date(tx.created_at).getTime();
          if (range === 'today') return timestamp >= now - 24 * 60 * 60 * 1000;
          if (range === 'week') return timestamp >= now - 7 * 24 * 60 * 60 * 1000;
          if (range === 'month') return timestamp >= now - 30 * 24 * 60 * 60 * 1000;
          return true;
        });
      }

      return txs;
    });

    res.json({ transactions, total: transactions.length });
  } catch (error) {
    next(error);
  }
});

export default router;
