import supabase, { isSupabaseConfigured } from './_supabase.js';

// ── IRA Policy (mirrored from src/lib/iraPolicy.ts for server-side) ──

const MIN_LOAN_AMOUNT = 500;
const MINIMUM_24H_INTEREST_RATE = 1;
const MAX_TENURE_DAYS = 90;

const BASE_CUMULATIVE_RATE_POINTS = [
  { day: 1, rate: 0 },
  { day: 3, rate: 3 },
  { day: 5, rate: 5 },
  { day: 10, rate: 7 },
  { day: 14, rate: 9 },
  { day: 21, rate: 11 },
  { day: 30, rate: 14 },
  { day: 90, rate: 18 },
];

const TIER_RULES = [
  { name: 'Newbie',   minScore: 0,   maxScore: 300,  multiplier: 1.0, maxLoanAmount: 5000  },
  { name: 'Bronze',   minScore: 301, maxScore: 500,  multiplier: 0.9, maxLoanAmount: 6000  },
  { name: 'Silver',   minScore: 501, maxScore: 700,  multiplier: 0.8, maxLoanAmount: 7000  },
  { name: 'Gold',     minScore: 701, maxScore: 850,  multiplier: 0.7, maxLoanAmount: 8500  },
  { name: 'Platinum', minScore: 851, maxScore: 1000, multiplier: 0.6, maxLoanAmount: 10000 },
];

function roundTo(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function getTierByScore(score) {
  for (let i = TIER_RULES.length - 1; i >= 0; i--) {
    if (score >= TIER_RULES[i].minScore) return TIER_RULES[i];
  }
  return TIER_RULES[0];
}

function interpolateBaseCumulativeRate(days) {
  const safeDays = Math.max(1, Math.min(MAX_TENURE_DAYS, days));
  if (safeDays <= BASE_CUMULATIVE_RATE_POINTS[0].day) return BASE_CUMULATIVE_RATE_POINTS[0].rate;
  const lastPt = BASE_CUMULATIVE_RATE_POINTS[BASE_CUMULATIVE_RATE_POINTS.length - 1];
  if (safeDays >= lastPt.day) return lastPt.rate;

  for (let i = 1; i < BASE_CUMULATIVE_RATE_POINTS.length; i++) {
    const left = BASE_CUMULATIVE_RATE_POINTS[i - 1];
    const right = BASE_CUMULATIVE_RATE_POINTS[i];
    if (safeDays <= right.day) {
      const progress = (safeDays - left.day) / (right.day - left.day);
      return roundTo(left.rate + (right.rate - left.rate) * progress);
    }
  }
  return lastPt.rate;
}

function calculatePolicyLoan(amount, days, shriScore) {
  const tier = getTierByScore(shriScore);
  const normalizedAmount = Math.max(MIN_LOAN_AMOUNT, Math.min(amount, tier.maxLoanAmount));
  const normalizedDays = Math.max(1, Math.min(MAX_TENURE_DAYS, days));
  const baseRate = interpolateBaseCumulativeRate(normalizedDays);
  const minimumInterestApplied = normalizedDays <= 1;
  const effectiveRate = minimumInterestApplied ? MINIMUM_24H_INTEREST_RATE : roundTo(baseRate * tier.multiplier);
  const interest = roundTo(normalizedAmount * (effectiveRate / 100));
  const totalRepayment = roundTo(normalizedAmount + interest);
  const platformFee = roundTo(interest * 0.15);
  const lenderEarnings = roundTo(interest * 0.85);

  return {
    tier,
    normalizedAmount,
    normalizedDays,
    baseRate,
    effectiveRate,
    interest,
    totalRepayment,
    platformFee,
    lenderEarnings,
    minimumInterestApplied,
  };
}

async function getWalletActivation(userId) {
  if (!isSupabaseConfigured || !supabase) return false;
  if (!userId) return false;
  const { data: wallet } = await supabase
    .from('ira_wallets')
    .select('is_activated')
    .eq('user_id', userId)
    .maybeSingle();

  return wallet?.is_activated === true;
}

// ── ML Matching Priority ──
// Returns 1-8, lower is higher priority
function getMatchPriority(borrower, lender) {
  // Scenario 1: Same university, same college, same course, same year
  if (borrower.university === lender.university && borrower.college === lender.college &&
      borrower.course === lender.course && borrower.year === lender.year) return 1;
  // Scenario 2: Same university, same college, same course, different year
  if (borrower.university === lender.university && borrower.college === lender.college &&
      borrower.course === lender.course) return 2;
  // Scenario 3: Same university, same college, different course, same year
  if (borrower.university === lender.university && borrower.college === lender.college &&
      borrower.year === lender.year) return 3;
  // Scenario 4: Same university, same college, different course, different year
  if (borrower.university === lender.university && borrower.college === lender.college) return 4;
  // Scenario 5: Same university, different college
  if (borrower.university === lender.university) return 5;
  // Scenario 6: Different university, same district
  if (borrower.district === lender.district) return 6;
  // Scenario 7: Different district, same sector
  if (borrower.sector === lender.sector) return 7;
  // Scenario 8: Completely different
  return 8;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (!isSupabaseConfigured || !supabase) {
      if (req.method === 'GET') {
        return res.status(200).json(req.query.id ? null : []);
      }

      return res.status(503).json({
        error: 'Loan creation needs Supabase. Local demo mode currently supports sign-in, wallet, transactions, and notifications.',
      });
    }

    if (req.method === 'GET') {
      const { borrower_id, status, id, type, summary } = req.query;

      if (id) {
        const { data, error } = await supabase
          .from('ira_loans')
          .select('*, ira_users!ira_loans_borrower_id_fkey(name, college, trust_score, avatar_seed)')
          .eq('id', id)
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (borrower_id) {
        const isWalletActivated = await getWalletActivation(borrower_id);
        if (!isWalletActivated) return res.status(200).json([]);
      }

      const selectFields = borrower_id && summary === '1'
        ? 'id, amount, purpose, tenure_days, interest_rate, status, due_date, created_at, funded_amount, tier_name, total_repayable'
        : '*, ira_users!ira_loans_borrower_id_fkey(name, college, trust_score, avatar_seed)';

      let query = supabase
        .from('ira_loans')
        .select(selectFields)
        .order('created_at', { ascending: false });

      if (borrower_id) query = query.eq('borrower_id', borrower_id);
      if (status) query = query.eq('status', status);
      if (type) query = query.eq('loan_type', type);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    // CREATE LOAN — uses iraPolicy tier-based rates
    if (req.method === 'POST') {
      const { action, borrower_id, amount, purpose, tenure_days, loan_type, friend_lender_id } = req.body;

      // PREVIEW — calculate without creating
      if (action === 'preview') {
        const isWalletActivated = await getWalletActivation(borrower_id);
        if (!isWalletActivated) {
          return res.status(403).json({ error: 'Activate Batua with the ₹3 seed before requesting a loan.' });
        }
        const { data: borrower } = await supabase.from('ira_users').select('trust_score, trust_points').eq('id', borrower_id).single();
        const shriScore = borrower?.trust_points || 0;
        const preview = calculatePolicyLoan(amount, tenure_days, shriScore);
        return res.status(200).json({ preview, shriScore, tierName: preview.tier.name });
      }

      // Full creation
      const isWalletActivated = await getWalletActivation(borrower_id);
      if (!isWalletActivated) {
        return res.status(403).json({ error: 'Activate Batua with the ₹3 seed before borrowing.' });
      }

      const { data: borrower } = await supabase.from('ira_users').select('trust_score, trust_points, college').eq('id', borrower_id).single();
      const shriScore = borrower?.trust_points || 0;
      const calc = calculatePolicyLoan(amount, tenure_days, shriScore);

      if (amount > calc.tier.maxLoanAmount) {
        return res.status(400).json({ error: `Max loan for ${calc.tier.name} tier is ₹${calc.tier.maxLoanAmount}` });
      }
      if (amount < MIN_LOAN_AMOUNT) {
        return res.status(400).json({ error: `Minimum loan amount is ₹${MIN_LOAN_AMOUNT}` });
      }

      const due_date = new Date(Date.now() + calc.normalizedDays * 24 * 60 * 60 * 1000).toISOString();
      const effectiveLoanType = loan_type || (friend_lender_id ? 'friend' : 'public');

      const { data, error } = await supabase
        .from('ira_loans')
        .insert({
          borrower_id,
          amount: calc.normalizedAmount,
          purpose,
          tenure_days: calc.normalizedDays,
          loan_type: effectiveLoanType,
          interest_rate: calc.effectiveRate,
          interest_amount: calc.interest,
          total_repayable: calc.totalRepayment,
          due_date,
          status: 'open',
          funded_amount: 0,
          platform_fee: calc.platformFee,
          lender_earnings: calc.lenderEarnings,
          tier_name: calc.tier.name,
          tier_multiplier: calc.tier.multiplier,
          friend_lender_id: friend_lender_id || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Update borrower total_borrowed
      await supabase.rpc('increment_user_borrowed', { user_id: borrower_id, amt: calc.normalizedAmount }).catch(() => {});

      // Notify matched lenders for public loans
      if (effectiveLoanType === 'public') {
        try {
          // TODO: Use ML matching to find and notify best-matched lenders
          await supabase.from('ira_notifications').insert({
            user_id: borrower_id,
            type: 'loan_created',
            title: 'Loan Request Created! 🚀',
            message: `Your ₹${calc.normalizedAmount} loan is now live on the marketplace.`,
            is_read: false,
          });
        } catch (e) {}
      }

      // Notify friend for friend loans
      if (friend_lender_id) {
        try {
          await supabase.from('ira_notifications').insert({
            user_id: friend_lender_id,
            type: 'private_loan',
            title: 'Friend Loan Request! 🤝',
            message: `Your friend needs ₹${calc.normalizedAmount}. Check your loans section.`,
            is_read: false,
          });
        } catch (e) {}
      }

      return res.status(201).json({ loan: data, calculation: calc });
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      const { data, error } = await supabase.from('ira_loans').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
