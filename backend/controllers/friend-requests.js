import supabase from './_supabase.js';

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
    effectiveRate,
    interest,
    totalRepayment,
    lenderEarnings,
    platformFee,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      // Get all requests involving this user (sent or received)
      const [sent, received] = await Promise.all([
        supabase.from('ira_friend_requests')
          .select('*, to_user:ira_users!ira_friend_requests_to_user_id_fkey(id,name,college,trust_score,avatar_seed)')
          .eq('from_user_id', user_id)
          .order('created_at', { ascending: false }),
        supabase.from('ira_friend_requests')
          .select('*, from_user:ira_users!ira_friend_requests_from_user_id_fkey(id,name,college,trust_score,avatar_seed)')
          .eq('to_user_id', user_id)
          .order('created_at', { ascending: false }),
      ]);
      return res.status(200).json({
        sent: sent.data || [],
        received: received.data || [],
      });
    }

    if (req.method === 'POST') {
      const { from_user_id, to_user_id, loan_amount, purpose, tenure_days, repay_frequency, message } = req.body;
      if (!from_user_id || !to_user_id || !loan_amount || !purpose)
        return res.status(400).json({ error: 'Missing required fields' });

      const { data, error } = await supabase
        .from('ira_friend_requests')
        .insert({ from_user_id, to_user_id, loan_amount, purpose, tenure_days, repay_frequency: repay_frequency || 'lump_sum', message, status: 'pending' })
        .select().single();
      if (error) throw error;

      // Notify recipient
      const { data: sender } = await supabase.from('ira_users').select('name').eq('id', from_user_id).single();
      await supabase.from('ira_notifications').insert({
        user_id: to_user_id,
        type: 'friend_request',
        title: `${sender?.name} wants to borrow ₹${Number(loan_amount).toLocaleString()}`,
        message: message || `Private loan request for ${purpose}`,
        is_read: false,
      });

      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, status, counter_amount, counter_tenure, counter_message, responder_id } = req.body;

      const updates = { status, updated_at: new Date().toISOString() };
      if (counter_amount) updates.counter_amount = counter_amount;
      if (counter_tenure) updates.counter_tenure = counter_tenure;
      if (counter_message) updates.counter_message = counter_message;

      const { data: fr } = await supabase.from('ira_friend_requests').select('*').eq('id', id).single();
      let acceptedLoanTerms = null;
      let acceptedAmount = 0;
      let acceptedTenure = 0;

      if (status === 'accepted' && fr) {
        acceptedAmount = Number(counter_amount || fr.loan_amount);
        acceptedTenure = Number(counter_tenure || fr.tenure_days);

        const { data: borrower } = await supabase
          .from('ira_users')
          .select('trust_points')
          .eq('id', fr.from_user_id)
          .single();

        acceptedLoanTerms = calculatePolicyLoan(acceptedAmount, acceptedTenure, borrower?.trust_points || 0);

        if (acceptedAmount < MIN_LOAN_AMOUNT) {
          return res.status(400).json({ error: `Minimum loan amount is ₹${MIN_LOAN_AMOUNT}` });
        }

        if (acceptedAmount > acceptedLoanTerms.tier.maxLoanAmount) {
          return res.status(400).json({ error: `Max loan for ${acceptedLoanTerms.tier.name} tier is ₹${acceptedLoanTerms.tier.maxLoanAmount}` });
        }
      }

      const { data, error } = await supabase.from('ira_friend_requests').update(updates).eq('id', id).select().single();
      if (error) throw error;

      // If accepted, create a real loan
      if (status === 'accepted' && fr && acceptedLoanTerms) {
        const { data: loan } = await supabase.from('ira_loans').insert({
          borrower_id: fr.from_user_id,
          amount: acceptedLoanTerms.normalizedAmount,
          purpose: fr.purpose,
          tenure_days: acceptedLoanTerms.normalizedDays,
          interest_rate: acceptedLoanTerms.effectiveRate,
          interest_amount: acceptedLoanTerms.interest,
          total_repayable: acceptedLoanTerms.totalRepayment,
          funded_amount: acceptedLoanTerms.normalizedAmount,
          lender_earnings: acceptedLoanTerms.lenderEarnings,
          platform_fee: acceptedLoanTerms.platformFee,
          status: 'funded',
          due_date: new Date(Date.now() + acceptedLoanTerms.normalizedDays * 86400000).toISOString(),
          loan_type: 'friend',
          tier_name: acceptedLoanTerms.tier.name,
          tier_multiplier: acceptedLoanTerms.tier.multiplier,
          friend_lender_id: fr.to_user_id,
        }).select().single();

        if (loan) {
          await supabase.from('ira_friend_requests').update({ loan_id: loan.id }).eq('id', id);
          // Create investment for lender (to_user)
          await supabase.from('ira_investments').insert({
            lender_id: fr.to_user_id,
            loan_id: loan.id,
            amount: acceptedLoanTerms.normalizedAmount,
            lender_interest: acceptedLoanTerms.lenderEarnings,
            lender_total: acceptedLoanTerms.normalizedAmount + acceptedLoanTerms.lenderEarnings,
            status: 'active',
          });
        }

        // Notify borrower
        const { data: lender } = await supabase.from('ira_users').select('name').eq('id', fr.to_user_id).single();
        await supabase.from('ira_notifications').insert({
          user_id: fr.from_user_id,
          type: 'loan_funded',
          title: `${lender?.name} accepted your request!`,
          message: `Your ₹${acceptedLoanTerms.normalizedAmount.toLocaleString()} loan for ${fr.purpose} is funded!`,
          is_read: false,
        });
      }

      if (status === 'negotiating') {
        const { data: responder } = await supabase.from('ira_users').select('name').eq('id', responder_id).single();
        await supabase.from('ira_notifications').insert({
          user_id: fr.from_user_id,
          type: 'negotiation',
          title: `${responder?.name} wants to negotiate`,
          message: counter_message || 'Check the updated terms for your loan request.',
          is_read: false,
        });
      }

      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Friend requests error:', err);
    res.status(500).json({ error: err.message });
  }
}
