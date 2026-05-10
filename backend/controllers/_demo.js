const DEMO_ACCOUNT_LIST = [
  {
    id: 10001,
    password: 'ira@demo123',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@mit.pune.ac.in',
    college: 'MIT Pune',
    course: 'CSE',
    year: 3,
    university: 'SPPU',
    district: 'Pune',
    sector: '12',
    state: 'MH',
    trust_score: 4,
    trust_points: 720,
    total_lent: 18000,
    total_borrowed: 3500,
    total_earned: 980,
    phone: '9876543210',
    upi_id: 'aarav@okaxis',
  },
  {
    id: 10002,
    password: 'ira@demo123',
    name: 'Vihaan Mehta',
    email: 'vihaan.mehta@mit.pune.ac.in',
    college: 'MIT Pune',
    course: 'CSE',
    year: 4,
    university: 'SPPU',
    district: 'Pune',
    sector: '12',
    state: 'MH',
    trust_score: 4,
    trust_points: 690,
    total_lent: 14000,
    total_borrowed: 2200,
    total_earned: 760,
    phone: '9876543211',
    upi_id: 'vihaan@okaxis',
  },
  {
    id: 10003,
    password: 'ira@demo123',
    name: 'Diya Patil',
    email: 'diya.patil@mit.pune.ac.in',
    college: 'MIT Pune',
    course: 'Mechanical',
    year: 3,
    university: 'SPPU',
    district: 'Pune',
    sector: '12',
    state: 'MH',
    trust_score: 3,
    trust_points: 560,
    total_lent: 6000,
    total_borrowed: 4100,
    total_earned: 280,
    phone: '9876543212',
    upi_id: 'diya@okaxis',
  },
  {
    id: 10004,
    password: 'ira@demo123',
    name: 'Riya Menon',
    email: 'riya.menon@symbiosis.pune.ac.in',
    college: 'Symbiosis Pune',
    course: 'BBA',
    year: 2,
    university: 'Symbiosis',
    district: 'Pune',
    sector: '8',
    state: 'MH',
    trust_score: 3,
    trust_points: 620,
    total_lent: 2600,
    total_borrowed: 4000,
    total_earned: 420,
    phone: '9876543213',
    upi_id: 'riya@okaxis',
  },
  {
    id: 10005,
    password: 'ira@demo123',
    name: 'Karthik Iyer',
    email: 'karthik.iyer@rural.ac.in',
    college: 'Rural College',
    course: 'Arts',
    year: 1,
    university: 'Rural Univ',
    district: 'Rural',
    sector: '45',
    state: 'MH',
    trust_score: 2,
    trust_points: 280,
    total_lent: 900,
    total_borrowed: 1500,
    total_earned: 60,
    phone: '9876543214',
    upi_id: 'karthik@okaxis',
  },
];

const DEMO_ACCOUNTS = Object.fromEntries(
  DEMO_ACCOUNT_LIST.map((account) => [account.email, account])
);

const runtimeWallets = new Map();
const runtimeTransactions = new Map();
const runtimeNotifications = new Map();

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function daysAgo(days, minuteOffset = 0) {
  return new Date(Date.now() - (days * 24 * 60 * 60 * 1000) + (minuteOffset * 60 * 1000)).toISOString();
}

function getDemoEntryById(userId) {
  const id = Number(userId);
  return DEMO_ACCOUNT_LIST.find((account) => account.id === id) || null;
}

function getDemoEntryByEmail(email) {
  return DEMO_ACCOUNTS[normalizeEmail(email)] || null;
}

function buildLendingId(entry) {
  return `IN/${entry.state}/${entry.district.slice(0, 3).toUpperCase()}/S${entry.sector}/${String(entry.id).padStart(5, '0')}`;
}

function buildBorrowingId(entry) {
  return `IN/${entry.state}/${entry.district.slice(0, 3).toUpperCase()}/${entry.university.slice(0, 4).toUpperCase()}/${entry.college.slice(0, 3).toUpperCase()}/${entry.course.slice(0, 3).toUpperCase()}/${String(entry.id).padStart(5, '0')}`;
}

function buildDemoUser(entry) {
  return {
    id: entry.id,
    name: entry.name,
    email: entry.email,
    phone: entry.phone,
    college: entry.college,
    college_email: entry.email,
    role: 'both',
    trust_score: entry.trust_score,
    trust_points: entry.trust_points,
    total_lent: entry.total_lent,
    total_borrowed: entry.total_borrowed,
    total_earned: entry.total_earned,
    account_status: 'active',
    kyc_status: 'verified',
    semester_status: 'verified',
    guarantors_approved: true,
    avatar_seed: `demo-${entry.id}`,
    university: entry.university,
    course: entry.course,
    year: entry.year,
    district: entry.district,
    sector: entry.sector,
    lending_account_id: buildLendingId(entry),
    borrowing_account_id: buildBorrowingId(entry),
    created_at: daysAgo(90),
  };
}

function buildDemoProfile(entry) {
  return {
    user_id: entry.id,
    phone: entry.phone,
    upi_id: entry.upi_id,
    kyc_status: 'verified',
    account_status: 'active',
    semester_status: 'verified',
    guarantors_approved: true,
    onboarding_step: 5,
  };
}

function initialWallet(entry) {
  if (entry.email === 'riya.menon@symbiosis.pune.ac.in') {
    return {
      user_id: entry.id,
      batua_locked: 901,
      batua_unlocked: 651,
      tijori: 420,
      is_activated: true,
      activated_at: daysAgo(21),
    };
  }

  return {
    user_id: entry.id,
    batua_locked: 0,
    batua_unlocked: 0,
    tijori: 0,
    is_activated: false,
  };
}

function initialTransactions(entry) {
  if (entry.email !== 'riya.menon@symbiosis.pune.ac.in') return [];

  return [
    {
      id: 1,
      user_id: entry.id,
      type: 'seed',
      amount: 3,
      wallet: 'upi_debit',
      description: 'Batua activation - demo seed payment',
      reference: 'DEMO-RIYA-SEED',
      created_at: daysAgo(21),
    },
    {
      id: 2,
      user_id: entry.id,
      type: 'platform_fee',
      amount: 1,
      wallet: 'platform',
      description: 'Demo platform activation fee',
      reference: 'DEMO-RIYA-FEE',
      created_at: daysAgo(21, 1),
    },
    {
      id: 3,
      user_id: entry.id,
      type: 'seed_credit',
      amount: 1,
      wallet: 'batua_locked',
      description: 'Demo seed credit to Batua Locked',
      reference: 'DEMO-RIYA-LOCKED',
      created_at: daysAgo(21, 2),
    },
    {
      id: 4,
      user_id: entry.id,
      type: 'seed_credit',
      amount: 1,
      wallet: 'batua_unlocked',
      description: 'Demo seed credit to Batua Unlocked',
      reference: 'DEMO-RIYA-UNLOCKED',
      created_at: daysAgo(21, 3),
    },
    {
      id: 5,
      user_id: entry.id,
      type: 'upi_credit',
      amount: 1800,
      wallet: 'batua_locked',
      description: 'Demo UPI top-up to Batua Locked',
      reference: 'DEMO-RIYA-UPI',
      created_at: daysAgo(10),
    },
    {
      id: 6,
      user_id: entry.id,
      type: 'transfer',
      amount: 900,
      wallet: 'batua_locked->batua_unlocked',
      description: 'Demo transfer from Batua Locked to Batua Unlocked',
      reference: 'DEMO-RIYA-TRANSFER',
      created_at: daysAgo(7),
    },
    {
      id: 7,
      user_id: entry.id,
      type: 'repayment_received',
      amount: 420,
      wallet: 'tijori',
      description: 'Demo repayment credited to Tijori',
      reference: 'DEMO-RIYA-REPAY',
      created_at: daysAgo(2),
    },
  ];
}

function initialNotifications(entry) {
  if (entry.email !== 'riya.menon@symbiosis.pune.ac.in') return [];

  return [
    {
      id: 1,
      user_id: entry.id,
      type: 'wallet',
      title: 'Batua ready',
      message: 'Your demo Batua is already activated so you can explore the dashboard immediately.',
      is_read: false,
      created_at: daysAgo(1),
    },
  ];
}

function ensureDemoState(entry) {
  if (!entry) return null;

  if (!runtimeWallets.has(entry.id)) {
    runtimeWallets.set(entry.id, initialWallet(entry));
  }

  if (!runtimeTransactions.has(entry.id)) {
    runtimeTransactions.set(entry.id, initialTransactions(entry));
  }

  if (!runtimeNotifications.has(entry.id)) {
    runtimeNotifications.set(entry.id, initialNotifications(entry));
  }

  return entry;
}

function getNextTransactionId(userId) {
  const current = runtimeTransactions.get(Number(userId)) || [];
  return current.length ? Math.max(...current.map((item) => Number(item.id) || 0)) + 1 : 1;
}

function pushTransaction(userId, tx) {
  const id = Number(userId);
  const current = runtimeTransactions.get(id) || [];
  const next = {
    id: getNextTransactionId(id),
    user_id: id,
    created_at: new Date().toISOString(),
    reference: tx.reference || `DEMO-TX-${Date.now()}`,
    description: '',
    wallet: 'system',
    ...tx,
  };
  runtimeTransactions.set(id, [...current, next]);
  return clone(next);
}

export function isDemoEmail(email = '') {
  return Boolean(getDemoEntryByEmail(email));
}

export function isDemoUserId(userId) {
  return Boolean(getDemoEntryById(userId));
}

export function getDemoUserByEmail(email) {
  const entry = ensureDemoState(getDemoEntryByEmail(email));
  return entry ? clone(buildDemoUser(entry)) : null;
}

export function getDemoUserById(userId) {
  const entry = ensureDemoState(getDemoEntryById(userId));
  return entry ? clone(buildDemoUser(entry)) : null;
}

export function getDemoProfileByEmail(email) {
  const entry = ensureDemoState(getDemoEntryByEmail(email));
  return entry ? clone(buildDemoProfile(entry)) : null;
}

export function getDemoProfileById(userId) {
  const entry = ensureDemoState(getDemoEntryById(userId));
  return entry ? clone(buildDemoProfile(entry)) : null;
}

export function getDemoWalletByUserId(userId) {
  const entry = ensureDemoState(getDemoEntryById(userId));
  if (!entry) return null;
  return clone(runtimeWallets.get(entry.id));
}

export function activateDemoWallet(userId) {
  const entry = ensureDemoState(getDemoEntryById(userId));
  if (!entry) return null;

  const current = runtimeWallets.get(entry.id) || initialWallet(entry);
  if (current.is_activated) return clone(current);

  const next = {
    ...current,
    batua_locked: 1,
    batua_unlocked: 1,
    tijori: current.tijori || 0,
    is_activated: true,
    activated_at: new Date().toISOString(),
  };

  runtimeWallets.set(entry.id, next);

  pushTransaction(entry.id, {
    type: 'seed',
    amount: 3,
    wallet: 'upi_debit',
    description: 'Batua activation seed payment',
  });
  pushTransaction(entry.id, {
    type: 'platform_fee',
    amount: 1,
    wallet: 'platform',
    description: 'Platform activation fee',
  });
  pushTransaction(entry.id, {
    type: 'seed_credit',
    amount: 1,
    wallet: 'batua_locked',
    description: 'Seed credit to Batua Locked',
  });
  pushTransaction(entry.id, {
    type: 'seed_credit',
    amount: 1,
    wallet: 'batua_unlocked',
    description: 'Seed credit to Batua Unlocked',
  });

  return clone(next);
}

export function addMoneyToDemoWallet(userId, amount) {
  const entry = ensureDemoState(getDemoEntryById(userId));
  if (!entry) return null;

  const current = runtimeWallets.get(entry.id) || initialWallet(entry);
  if (!current.is_activated) {
    throw new Error('Activate wallet first');
  }

  const numericAmount = Number(amount);
  const next = {
    ...current,
    batua_locked: Number(current.batua_locked || 0) + numericAmount,
  };

  runtimeWallets.set(entry.id, next);
  pushTransaction(entry.id, {
    type: 'upi_credit',
    amount: numericAmount,
    wallet: 'batua_locked',
    description: `Added Rs ${numericAmount} to Batua Locked`,
  });

  return clone(next);
}

export function transferDemoWallet(userId, fromWallet, toWallet, amount) {
  const entry = ensureDemoState(getDemoEntryById(userId));
  if (!entry) return null;

  const current = runtimeWallets.get(entry.id) || initialWallet(entry);
  if (!current.is_activated) {
    throw new Error('Activate wallet first');
  }

  const numericAmount = Number(amount);
  const allowedTransfers = [
    'batua_locked->batua_unlocked',
    'tijori->batua_locked',
    'tijori->batua_unlocked',
  ];

  if (!allowedTransfers.includes(`${fromWallet}->${toWallet}`)) {
    throw new Error(`Transfer from ${fromWallet} to ${toWallet} is not allowed`);
  }

  if (Number(current[fromWallet] || 0) < numericAmount) {
    throw new Error('Insufficient balance');
  }

  const next = {
    ...current,
    [fromWallet]: Number(current[fromWallet] || 0) - numericAmount,
    [toWallet]: Number(current[toWallet] || 0) + numericAmount,
  };

  runtimeWallets.set(entry.id, next);
  pushTransaction(entry.id, {
    type: 'transfer',
    amount: numericAmount,
    wallet: `${fromWallet}->${toWallet}`,
    description: `Transferred Rs ${numericAmount} from ${fromWallet} to ${toWallet}`,
  });

  return clone(next);
}

export function getDemoTransactionsByUserId(userId) {
  const entry = ensureDemoState(getDemoEntryById(userId));
  if (!entry) return [];

  const transactions = runtimeTransactions.get(entry.id) || [];
  return clone(
    [...transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  );
}

export function createDemoTransaction(userId, tx) {
  const entry = ensureDemoState(getDemoEntryById(userId));
  if (!entry) return null;
  return pushTransaction(entry.id, tx);
}

export function getDemoNotificationsByUserId(userId) {
  const entry = ensureDemoState(getDemoEntryById(userId));
  if (!entry) return [];

  const notifications = runtimeNotifications.get(entry.id) || [];
  return clone(
    [...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  );
}

export function markDemoNotificationsRead(userId) {
  const entry = ensureDemoState(getDemoEntryById(userId));
  if (!entry) return [];

  const notifications = (runtimeNotifications.get(entry.id) || []).map((item) => ({
    ...item,
    is_read: true,
  }));
  runtimeNotifications.set(entry.id, notifications);
  return clone(notifications);
}

export { DEMO_ACCOUNTS, DEMO_ACCOUNT_LIST };
