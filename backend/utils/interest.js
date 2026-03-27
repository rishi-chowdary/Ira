/**
 * Interest calculation engine for the Student P2P Lending Platform
 * Time-based interest slabs for quick loans
 */

// Time-based interest slabs
const INTEREST_SLABS = [
  { minDays: 0, maxDays: 1, rate: 0.00, label: 'Within 24 hours' },
  { minDays: 2, maxDays: 3, rate: 0.03, label: '2-3 days' },
  { minDays: 4, maxDays: 7, rate: 0.05, label: '4-7 days' },
  { minDays: 8, maxDays: 14, rate: 0.07, label: '8-14 days' },
  { minDays: 15, maxDays: 21, rate: 0.09, label: '15-21 days' },
  { minDays: 22, maxDays: 30, rate: 0.12, label: '22-30 days' },
];

const PENALTY_DAILY_RATE = 0.0005; // 0.05% daily
const PLATFORM_FEE_RATE = 0.15;   // 15% of interest
const MAX_PENALTY_MULTIPLIER = 0.50; // Cap penalty at 50% of principal

/**
 * Get interest rate based on repayment day
 */
function getInterestRate(days) {
  if (days <= 0) return 0;
  for (const slab of INTEREST_SLABS) {
    if (days >= slab.minDays && days <= slab.maxDays) {
      return slab.rate;
    }
  }
  // Beyond 30 days — use 12% base + penalty
  return 0.12;
}

/**
 * Calculate interest for a given loan amount and days
 */
function calculateInterest(principal, days) {
  const rate = getInterestRate(days);
  const interest = principal * rate;
  return {
    principal,
    days,
    rate,
    interest: Math.round(interest * 100) / 100,
    total: Math.round((principal + interest) * 100) / 100,
  };
}

/**
 * Calculate penalty for overdue days
 */
function calculatePenalty(principal, interestAccrued, overdueDays) {
  if (overdueDays <= 0) return 0;
  
  let totalOutstanding = principal + interestAccrued;
  let totalPenalty = 0;
  
  for (let i = 0; i < overdueDays; i++) {
    const dailyPenalty = totalOutstanding * PENALTY_DAILY_RATE;
    totalPenalty += dailyPenalty;
    totalOutstanding += dailyPenalty;
  }
  
  // Cap at 50% of principal
  const maxPenalty = principal * MAX_PENALTY_MULTIPLIER;
  totalPenalty = Math.min(totalPenalty, maxPenalty);
  
  return Math.round(totalPenalty * 100) / 100;
}

/**
 * Calculate full repayment breakdown
 */
function calculateRepayment(principal, tenureDays, actualRepaymentDay) {
  const isOverdue = actualRepaymentDay > tenureDays;
  const effectiveDay = Math.min(actualRepaymentDay, tenureDays);
  
  const { rate, interest } = calculateInterest(principal, effectiveDay);
  
  let penalty = 0;
  if (isOverdue) {
    const overdueDays = actualRepaymentDay - tenureDays;
    penalty = calculatePenalty(principal, interest, overdueDays);
  }
  
  const totalInterestAndPenalty = interest + penalty;
  const platformFee = Math.round(totalInterestAndPenalty * PLATFORM_FEE_RATE * 100) / 100;
  const lenderEarnings = Math.round(totalInterestAndPenalty * (1 - PLATFORM_FEE_RATE) * 100) / 100;
  const totalDue = Math.round((principal + totalInterestAndPenalty) * 100) / 100;
  
  return {
    principal,
    tenureDays,
    actualRepaymentDay,
    isOverdue,
    interestRate: rate,
    interest,
    penalty,
    totalInterestAndPenalty,
    platformFee,
    lenderEarnings,
    totalDue,
  };
}

module.exports = {
  INTEREST_SLABS,
  PENALTY_DAILY_RATE,
  PLATFORM_FEE_RATE,
  getInterestRate,
  calculateInterest,
  calculatePenalty,
  calculateRepayment,
};
