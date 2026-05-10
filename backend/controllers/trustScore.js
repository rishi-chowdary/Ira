/**
 * Shri Score Calculation Engine
 * 
 * Shri Score = Base(500) + Borrowing(+) + Repayment(+/−) + Risk(−) + Behavior(+/−)
 * 
 * Tier Structure:
 * 800-1000: Tier A (Excellent) - Max loan ₹500K
 * 600-799:  Tier B (Good)      - Max loan ₹250K
 * 400-599:  Tier C (Fair)      - Max loan ₹100K
 * 0-399:    Tier D (Poor)      - Max loan ₹25K
 */

const supabase = require('./_supabase');

const SHRI_CONFIG = {
  BASE_SCORE: 500,
  MAX_SCORE: 1000,
  MIN_SCORE: 0,
  
  // Tier thresholds
  TIER_A: { min: 800, max: 1000, label: 'Excellent', max_loan: 500000 },
  TIER_B: { min: 600, max: 799, label: 'Good', max_loan: 250000 },
  TIER_C: { min: 400, max: 599, label: 'Fair', max_loan: 100000 },
  TIER_D: { min: 0, max: 399, label: 'Poor', max_loan: 25000 },
  
  // Scoring components
  BORROWING_FACTORS: {
    first_loan_bonus: 50,      // New borrowers
    loan_size_multiplier: 0.0001, // For loan amounts
    multiple_loans_bonus: 20   // Max ₹100K across loans
  },
  
  REPAYMENT_FACTORS: {
    on_time_payment: 10,        // Per payment
    early_payment_bonus: 25,    // If paid early
    full_emi_completion: 50,    // Loan fully repaid
    late_payment_penalty: -20,  // Per late payment
    default_penalty: -100,      // Loan default
    partial_repayment_penalty: -15 // Less than required
  },
  
  RISK_FACTORS: {
    high_default_rate: -50,     // If >20% of loans default
    loan_in_default: -150,      // Current default
    high_utilization: -10,      // >80% of max borrowing
    short_profile_age: -20      // <3 months active
  },
  
  BEHAVIOR_FACTORS: {
    guarantor_nomination: 30,   // Per approved guarantor
    friend_endorsement: 5,      // Per approved friend endorsing
    college_approval: 40,       // College verified
    kyc_verified: 20            // KYC completed
  }
};

/**
 * Calculate Shri Score for a student
 * Returns detailed breakdown and tier information
 */
async function calculateShriScore(userId) {
  try {
    // Get or create score record
    let { data: scoreRecord, error: scoreError } = await supabase
      .from('trust_score')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (scoreError && scoreError.code !== 'PGRST116') throw scoreError;

    if (!scoreRecord) {
      const { data: newScore, error: createError } = await supabase
        .from('trust_score')
        .insert([{
          user_id: userId,
          shri_score: SHRI_CONFIG.BASE_SCORE
        }])
        .select()
        .single();

      if (createError) throw createError;
      scoreRecord = newScore;
    }

    // Calculate components
    const components = {
      base: SHRI_CONFIG.BASE_SCORE,
      borrowing: 0,
      repayment: 0,
      risk: 0,
      behavior: 0
    };

    // 1. BORROWING SCORE
    components.borrowing = await calculateBorrowingScore(userId);

    // 2. REPAYMENT SCORE
    components.repayment = await calculateRepaymentScore(userId);

    // 3. RISK SCORE
    components.risk = await calculateRiskScore(userId);

    // 4. BEHAVIOR SCORE
    components.behavior = await calculateBehaviorScore(userId);

    // Final score
    let finalScore = components.base + 
                     components.borrowing + 
                     components.repayment + 
                     components.risk + 
                     components.behavior;

    // Clamp to min/max
    finalScore = Math.max(SHRI_CONFIG.MIN_SCORE, 
                         Math.min(SHRI_CONFIG.MAX_SCORE, finalScore));

    // Get tier
    const tier = getTierInfo(finalScore);

    // Update database
    const { data: updatedScore, error: updateError } = await supabase
      .from('trust_score')
      .update({
        shri_score: finalScore,
        tier: tier.label,
        max_borrowing_limit: tier.max_loan,
        last_calculated_at: new Date().toISOString(),
        score_breakdown: {
          base: components.base,
          borrowing: components.borrowing,
          repayment: components.repayment,
          risk: components.risk,
          behavior: components.behavior
        }
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      user_id: userId,
      score: finalScore,
      tier: tier,
      components,
      breakdown: {
        base: `Base score starting point`,
        borrowing: `+${components.borrowing} from borrowing history`,
        repayment: `${components.repayment > 0 ? '+' : ''}${components.repayment} from repayment behavior`,
        risk: `${components.risk > 0 ? '+' : ''}${components.risk} from risk assessment`,
        behavior: `+${components.behavior} from good behavior`
      }
    };
  } catch (error) {
    console.error('Shri Score calculation error:', error);
    throw error;
  }
}

/**
 * Calculate borrowing component of Shri Score
 */
async function calculateBorrowingScore(userId) {
  let score = 0;

  // Get all loans
  const { data: loans } = await supabase
    .from('loans')
    .select('*')
    .eq('borrower_id', userId);

  if (!loans || loans.length === 0) {
    return SHRI_CONFIG.BORROWING_FACTORS.first_loan_bonus; // New borrower bonus
  }

  // Bonus for multiple loans
  if (loans.length > 1) {
    score += SHRI_CONFIG.BORROWING_FACTORS.multiple_loans_bonus;
  }

  // Score based on total borrowed
  const totalBorrowed = loans.reduce((sum, loan) => sum + (loan.principal_amount || 0), 0);
  score += Math.floor(totalBorrowed * SHRI_CONFIG.BORROWING_FACTORS.loan_size_multiplier);

  return score;
}

/**
 * Calculate repayment component of Shri Score
 */
async function calculateRepaymentScore(userId) {
  let score = 0;

  // Get all repayments
  const { data: repayments } = await supabase
    .from('repayments')
    .select('*')
    .eq('borrower_id', userId);

  if (!repayments || repayments.length === 0) {
    return 0; // No history
  }

  let onTimeCount = 0;
  let lateCount = 0;
  let earlyCount = 0;

  repayments.forEach(repayment => {
    if (repayment.status === 'paid') {
      const dueDate = new Date(repayment.due_date);
      const paidDate = new Date(repayment.paid_date);

      if (paidDate <= dueDate) {
        onTimeCount++;
        score += SHRI_CONFIG.REPAYMENT_FACTORS.on_time_payment;

        // Early payment bonus
        const daysDifference = Math.floor((dueDate - paidDate) / (1000 * 60 * 60 * 24));
        if (daysDifference > 0) {
          earlyCount++;
          score += SHRI_CONFIG.REPAYMENT_FACTORS.early_payment_bonus;
        }
      } else {
        lateCount++;
        score += SHRI_CONFIG.REPAYMENT_FACTORS.late_payment_penalty;
      }
    } else if (repayment.status === 'default') {
      score += SHRI_CONFIG.REPAYMENT_FACTORS.default_penalty;
    } else if (repayment.status === 'partial') {
      score += SHRI_CONFIG.REPAYMENT_FACTORS.partial_repayment_penalty;
    }
  });

  // Bonus for completing full EMI
  const { data: completedLoans } = await supabase
    .from('loans')
    .select('*')
    .eq('borrower_id', userId)
    .eq('status', 'completed');

  if (completedLoans && completedLoans.length > 0) {
    score += completedLoans.length * SHRI_CONFIG.REPAYMENT_FACTORS.full_emi_completion;
  }

  return score;
}

/**
 * Calculate risk component of Shri Score
 */
async function calculateRiskScore(userId) {
  let score = 0;

  // Check for current defaults
  const { data: defaultedLoans } = await supabase
    .from('loans')
    .select('*')
    .eq('borrower_id', userId)
    .eq('status', 'default');

  if (defaultedLoans && defaultedLoans.length > 0) {
    score += SHRI_CONFIG.RISK_FACTORS.loan_in_default;
  }

  // Calculate default rate
  const { data: allLoans } = await supabase
    .from('loans')
    .select('*')
    .eq('borrower_id', userId);

  if (allLoans && allLoans.length > 0) {
    const defaultRate = (defaultedLoans?.length || 0) / allLoans.length;
    if (defaultRate > 0.2) {
      score += SHRI_CONFIG.RISK_FACTORS.high_default_rate;
    }
  }

  // Check profile age (new users = risk)
  const { data: user } = await supabase
    .from('user_accounts')
    .select('created_at')
    .eq('id', userId)
    .single();

  if (user && user.created_at) {
    const profileAgeMonths = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (profileAgeMonths < 3) {
      score += SHRI_CONFIG.RISK_FACTORS.short_profile_age;
    }
  }

  // Check utilization rate
  const totalBorrowed = (allLoans || []).reduce((sum, loan) => sum + (loan.principal_amount || 0), 0);
  const { data: score_record } = await supabase
    .from('trust_score')
    .select('max_borrowing_limit')
    .eq('user_id', userId)
    .single();

  if (score_record && score_record.max_borrowing_limit) {
    const utilization = totalBorrowed / score_record.max_borrowing_limit;
    if (utilization > 0.8) {
      score += SHRI_CONFIG.RISK_FACTORS.high_utilization;
    }
  }

  return score;
}

/**
 * Calculate behavior component of Shri Score
 */
async function calculateBehaviorScore(userId) {
  let score = 0;

  // Check college approval
  const { data: user } = await supabase
    .from('user_accounts')
    .select('college_approval_status, kyc_status')
    .eq('id', userId)
    .single();

  if (user?.college_approval_status === 'approved') {
    score += SHRI_CONFIG.BEHAVIOR_FACTORS.college_approval;
  }

  if (user?.kyc_status === 'verified') {
    score += SHRI_CONFIG.BEHAVIOR_FACTORS.kyc_verified;
  }

  // Check guarantor nominations
  const { data: guarantors } = await supabase
    .from('guarantors')
    .select('*')
    .eq('borrower_id', userId)
    .eq('status', 'approved');

  if (guarantors) {
    score += guarantors.length * SHRI_CONFIG.BEHAVIOR_FACTORS.guarantor_nomination;
  }

  // Check friend endorsements
  const { data: endorsements } = await supabase
    .from('friend_endorsements')
    .select('*')
    .eq('borrower_id', userId)
    .eq('status', 'approved');

  if (endorsements) {
    score += endorsements.length * SHRI_CONFIG.BEHAVIOR_FACTORS.friend_endorsement;
  }

  return score;
}

/**
 * Get tier information based on score
 */
function getTierInfo(score) {
  if (score >= SHRI_CONFIG.TIER_A.min) {
    return SHRI_CONFIG.TIER_A;
  } else if (score >= SHRI_CONFIG.TIER_B.min) {
    return SHRI_CONFIG.TIER_B;
  } else if (score >= SHRI_CONFIG.TIER_C.min) {
    return SHRI_CONFIG.TIER_C;
  } else {
    return SHRI_CONFIG.TIER_D;
  }
}

/**
 * Get max borrowing limit based on score
 */
function getMaxBorrowingLimit(score) {
  return getTierInfo(score).max_loan;
}

/**
 * Recalculate all users' Shri Scores (batch operation)
 * Call this periodically (e.g., daily)
 */
async function recalculateAllScores() {
  try {
    console.log('Starting batch Shri Score recalculation...');

    const { data: users, error } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('role', 'student');

    if (error) throw error;

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        await calculateShriScore(user.id);
        successCount++;
      } catch (err) {
        console.error(`Error calculating score for user ${user.id}:`, err);
        errorCount++;
      }
    }

    console.log(`Batch recalculation complete. Success: ${successCount}, Errors: ${errorCount}`);
    return { successCount, errorCount };
  } catch (error) {
    console.error('Batch recalculation error:', error);
    throw error;
  }
}

module.exports = {
  calculateShriScore,
  getTierInfo,
  getMaxBorrowingLimit,
  recalculateAllScores,
  SHRI_CONFIG
};
