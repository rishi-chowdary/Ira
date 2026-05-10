import supabase from './_supabase.js';

// ── IRA Policy (mirrored for server-side) ──

const MINIMUM_24H_INTEREST_RATE = 1;
const MAX_TENURE_DAYS = 90;
const REGULAR_INTEREST_LENDER_SHARE = 0.85;
const REGULAR_INTEREST_PLATFORM_SHARE = 0.15;
const PENALTY_LENDER_SHARE = 0.60;
const PENALTY_PLATFORM_SHARE = 0.40;
const PENALTY_START_RATE = 0.0005;
const PENALTY_DAILY_STEP = 0.0002;
const PENALTY_CAP = 0.5;
const DEFAULT_AFTER_DAYS = 90;

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
  { name: 'Newbie',   minScore: 0,   maxScore: 300,  multiplier: 1.0 },
  { name: 'Bronze',   minScore: 301, maxScore: 500,  multiplier: 0.9 },
  { name: 'Silver',   minScore: 501, maxScore: 700,  multiplier: 0.8 },
  { name: 'Gold',     minScore: 701, maxScore: 850,  multiplier: 0.7 },
  { name: 'Platinum', minScore: 851, maxScore: 1000, multiplier: 0.6 },
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

function getTierStarsByScore(score) {
  return Math.min(5, Math.max(1, TIER_RULES.findIndex((tier) => score >= tier.minScore && score <= tier.maxScore) + 1));
}

function getDailyPenaltyRate(lateDay) {
  return PENALTY_START_RATE + ((lateDay - 1) * PENALTY_DAILY_STEP);
}

function calculatePenalty(unpaidPrincipal, overdueDays) {
  if (overdueDays <= 0 || unpaidPrincipal <= 0) return 0;

  let penalty = 0;
  for (let lateDay = 1; lateDay <= overdueDays; lateDay += 1) {
    penalty += unpaidPrincipal * getDailyPenaltyRate(lateDay);
  }

  return roundTo(Math.min(penalty, unpaidPrincipal * PENALTY_CAP));
}

// ── Repayment Calculation ──

function calculateRepayment(loan, borrowerShriScore) {
  const now = new Date();
  const created = new Date(loan.created_at);
  const due = new Date(loan.due_date);
  const actualDays = Math.max(1, Math.ceil((now - created) / (1000 * 60 * 60 * 24)));
  const overdueDays = Math.max(0, Math.ceil((now - due) / (1000 * 60 * 60 * 24)));

  // Use tier-based rate on actual days held
  const tier = getTierByScore(borrowerShriScore || 0);
  const baseRate = interpolateBaseCumulativeRate(actualDays);
  const minimumInterestApplied = actualDays <= 1;
  const effectiveRate = minimumInterestApplied ? MINIMUM_24H_INTEREST_RATE : roundTo(baseRate * tier.multiplier);
  const regularInterest = roundTo(loan.amount * (effectiveRate / 100));
  const unpaidPrincipal = roundTo(Math.max(0, loan.unpaid_principal ?? loan.amount));
  const penaltyAmount = calculatePenalty(unpaidPrincipal, overdueDays);

  const totalInterest = roundTo(regularInterest + penaltyAmount);
  const lenderRegularInterest = roundTo(regularInterest * REGULAR_INTEREST_LENDER_SHARE);
  const platformRegularInterest = roundTo(regularInterest * REGULAR_INTEREST_PLATFORM_SHARE);
  const lenderPenaltyShare = roundTo(penaltyAmount * PENALTY_LENDER_SHARE);
  const platformPenaltyShare = roundTo(penaltyAmount * PENALTY_PLATFORM_SHARE);
  const lenderEarnings = roundTo(lenderRegularInterest + lenderPenaltyShare);
  const platformFee = roundTo(platformRegularInterest + platformPenaltyShare);
  const totalRepayable = roundTo(loan.amount + totalInterest);

  return {
    principal: loan.amount,
    unpaidPrincipal,
    actualDays,
    overdueDays,
    interestRate: effectiveRate,
    effectiveRate,
    tierName: tier.name,
    tierMultiplier: tier.multiplier,
    baseRate,
    regularInterest,
    penaltyAmount,
    totalInterest,
    lenderRegularInterest,
    platformRegularInterest,
    lenderPenaltyShare,
    platformPenaltyShare,
    lenderEarnings,
    platformFee,
    totalRepayable,
    isEarly: now < due,
    isOnTime: overdueDays === 0,
    minimumInterestApplied,
  };
}

// ── Shri Score update system ──

function getShriScoreUpdate(repayInfo) {
  if (repayInfo.minimumInterestApplied) {
    return { points: 5, message: 'Repaid within 24 hours! +5 Shri Score points', resetToZero: false };
  }
  if (repayInfo.isEarly) {
    return { points: 15, message: 'Early repayment! +15 Shri Score points', resetToZero: false };
  }
  if (repayInfo.isOnTime) {
    return { points: 10, message: 'On-time repayment! +10 Shri Score points', resetToZero: false };
  }
  if (repayInfo.overdueDays <= 7) {
    return { points: -5, message: 'Late repayment (1-7 days). -5 Shri Score points', resetToZero: false };
  }
  if (repayInfo.overdueDays <= 30) {
    return { points: -15, message: 'Late repayment (8-30 days). -15 Shri Score points', resetToZero: false };
  }
  if (repayInfo.overdueDays >= DEFAULT_AFTER_DAYS) {
    return { points: -100, message: 'Default after 90 days. Shri Score reset to 0.', resetToZero: true };
  }
  return { points: -15, message: 'Late repayment. Shri Score reduced by 15 points.', resetToZero: false };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { loan_id, borrower_id } = req.query;
      let query = supabase.from('ira_repayments').select('*').order('created_at', { ascending: false });
      if (loan_id) query = query.eq('loan_id', loan_id);
      if (borrower_id) query = query.eq('borrower_id', borrower_id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { loan_id, borrower_id, preview } = req.body;

      const { data: loan, error: loanErr } = await supabase
        .from('ira_loans')
        .select('*')
        .eq('id', loan_id)
        .single();
      if (loanErr) throw loanErr;

      if (loan.status === 'repaid') {
        return res.status(400).json({ error: 'Loan already repaid' });
      }

      // Get borrower Shri Score
      const { data: borrower } = await supabase.from('ira_users').select('trust_points, trust_score').eq('id', borrower_id).single();
      const shriScore = borrower?.trust_points || 0;

      const repayInfo = calculateRepayment(loan, shriScore);

      if (preview) {
        return res.status(200).json(repayInfo);
      }

      // ── ACTUAL REPAYMENT ──

      // Step 1: Deduction priority (spec Point 12)
      // Borrower Batua Unlocked → Locked → UPI AutoPay → 4h manual window → Penalty
      // For demo: simulate immediate deduction

      const { data: repayment, error: repErr } = await supabase
        .from('ira_repayments')
        .insert({
          loan_id,
          borrower_id,
          principal: repayInfo.principal,
          regular_interest: repayInfo.regularInterest,
          penalty_amount: repayInfo.penaltyAmount,
          total_paid: repayInfo.totalRepayable,
          lender_earnings: repayInfo.lenderEarnings,
          platform_fee: repayInfo.platformFee,
          actual_days: repayInfo.actualDays,
          overdue_days: repayInfo.overdueDays,
          is_early: repayInfo.isEarly,
          is_on_time: repayInfo.isOnTime,
          tier_name: repayInfo.tierName,
          effective_rate: repayInfo.effectiveRate,
        })
        .select()
        .single();
      if (repErr) throw repErr;

      // Step 2: Mark loan as repaid
      await supabase.from('ira_loans').update({ status: 'repaid' }).eq('id', loan_id);

      // Step 3: Distribute earnings to lenders via Tijori
      const { data: investments } = await supabase.from('ira_investments').select('*').eq('loan_id', loan_id);
      if (investments) {
        for (const inv of investments) {
          const proportion = inv.amount / loan.amount;
          const earned = roundTo(repayInfo.lenderEarnings * proportion);
          const totalReturn = roundTo(inv.amount + earned);

          // Update investment status
          await supabase.from('ira_investments').update({
            status: 'completed',
            lender_interest: earned,
            lender_total: totalReturn,
          }).eq('id', inv.id);

          // Credit lender's Tijori wallet
          try {
            const { data: lenderWallet } = await supabase
              .from('ira_wallets')
              .select('tijori')
              .eq('user_id', inv.lender_id)
              .single();

            if (lenderWallet) {
              await supabase.from('ira_wallets')
                .update({ tijori: (lenderWallet.tijori || 0) + totalReturn })
                .eq('user_id', inv.lender_id);
            }
          } catch (e) {}

          // Update lender total_earned
          const { data: lender } = await supabase.from('ira_users').select('total_earned').eq('id', inv.lender_id).single();
          await supabase.from('ira_users').update({ total_earned: (lender?.total_earned || 0) + earned }).eq('id', inv.lender_id);

          // Notify lender
          try {
            await supabase.from('ira_notifications').insert({
              user_id: inv.lender_id,
              type: 'repayment_received',
              title: 'Repayment Received! 💰',
              message: `₹${totalReturn} credited to your Tijori (₹${inv.amount} principal + ₹${earned} interest).`,
              is_read: false,
            });
          } catch (e) {}
        }
      }

      // Step 4: Log transaction
      try {
        await supabase.from('ira_transactions').insert({
          user_id: borrower_id,
          type: 'repayment',
          amount: repayInfo.totalRepayable,
          wallet: 'batua_unlocked',
          description: `Loan #${loan_id} repaid — ₹${repayInfo.principal} principal + ₹${repayInfo.regularInterest} interest${repayInfo.penaltyAmount > 0 ? ` + ₹${repayInfo.penaltyAmount} penalty` : ''}`,
          reference: `REP-${Date.now()}`,
        });
      } catch (e) {}

      // Step 5: Update Shri Score
      const scoreUpdate = getShriScoreUpdate(repayInfo);
      const newPoints = scoreUpdate.resetToZero
        ? 0
        : Math.max(0, Math.min(1000, shriScore + scoreUpdate.points));
      const newStars = getTierStarsByScore(newPoints);
      await supabase.from('ira_users').update({ trust_points: newPoints, trust_score: newStars }).eq('id', borrower_id);

      // Step 6: Notify guarantors if late
      if (repayInfo.overdueDays > 0) {
        try {
          const { data: guarantors } = await supabase
            .from('ira_guarantors')
            .select('guarantor_id')
            .eq('user_id', borrower_id)
            .eq('status', 'approved');

          if (guarantors) {
            for (const g of guarantors) {
              await supabase.from('ira_notifications').insert({
                user_id: g.guarantor_id,
                type: 'guarantor_alert',
                title: '⚠️ Guaranteed User Late Repayment',
                message: `A user you guaranteed was ${repayInfo.overdueDays} day(s) late. Their Shri Score has been reduced.`,
                is_read: false,
              });
            }
          }
        } catch (e) {}
      }

      // Step 7: Notify borrower
      try {
        await supabase.from('ira_notifications').insert({
          user_id: borrower_id,
          type: 'repayment_complete',
          title: repayInfo.isEarly ? 'Early Repayment! 🌟' : repayInfo.isOnTime ? 'Repayment Complete! ✅' : 'Repayment Complete ⚠️',
          message: `${scoreUpdate.message} New Shri Score: ${newPoints}`,
          is_read: false,
        });
      } catch (e) {}

      return res.status(201).json({
        repayment,
        scoreUpdate: { ...scoreUpdate, newPoints, newStars },
        trustUpdate: { ...scoreUpdate, newPoints, newStars },
        repayInfo,
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
