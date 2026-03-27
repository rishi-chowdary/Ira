/**
 * Trust Score Management
 * Levels: Newbie(1★) → Bronze(2★) → Silver(3★) → Gold(4★) → Platinum(5★)
 */

const TRUST_LEVELS = [
  { level: 'Newbie', stars: 1, minPoints: 0, maxLoan: 5000, interestRate: 0.18, color: '#2563EB' },
  { level: 'Bronze', stars: 2, minPoints: 100, maxLoan: 6000, interestRate: 0.17, color: '#38BDF8' },
  { level: 'Silver', stars: 3, minPoints: 250, maxLoan: 7000, interestRate: 0.16, color: '#10B981' },
  { level: 'Gold', stars: 4, minPoints: 500, maxLoan: 8000, interestRate: 0.15, color: '#F59E0B' },
  { level: 'Platinum', stars: 5, minPoints: 1000, maxLoan: 10000, interestRate: 0.14, color: '#EF4444' },
];

const POINT_REWARDS = {
  on_time: 50,    // Repaid on time
  early: 80,      // Repaid early
  late: -30,      // Repaid late (after due date)
  default: -200,  // Defaulted entirely
};

/**
 * Calculate new trust level based on points
 */
function getTrustLevel(points) {
  let current = TRUST_LEVELS[0];
  for (const level of TRUST_LEVELS) {
    if (points >= level.minPoints) {
      current = level;
    }
  }
  return current;
}

/**
 * Update trust score after a repayment event
 */
function updateTrustScore(user, eventType) {
  const pointsChange = POINT_REWARDS[eventType] || 0;
  let newPoints = Math.max(0, (user.trust_points || 0) + pointsChange);
  
  const newLevel = getTrustLevel(newPoints);

  // Update counters
  const updates = {
    trust_points: newPoints,
    trust_level: newLevel.level,
    trust_stars: newLevel.stars,
    max_loan_amount: newLevel.maxLoan,
  };

  if (eventType === 'on_time') updates.on_time_repayments = (user.on_time_repayments || 0) + 1;
  if (eventType === 'early') updates.early_repayments = (user.early_repayments || 0) + 1;
  if (eventType === 'late') updates.late_repayments = (user.late_repayments || 0) + 1;
  if (eventType === 'default') updates.total_defaults = (user.total_defaults || 0) + 1;

  return { updates, pointsChange, newLevel };
}

module.exports = { TRUST_LEVELS, POINT_REWARDS, getTrustLevel, updateTrustScore };
