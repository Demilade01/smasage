/**
 * Smasage Goal Projection Calculator
 * Projects future portfolio value based on compound interest and evaluates
 * if a user is on track to meet their financial goal by the target date.
 */

export interface GoalProjection {
  currentBalance: number;
  targetAmount: number;
  targetDate: Date;
  expectedAPY: number;
  projectedValue: number;
  monthsRemaining: number;
  requiredMonthlyContribution: number;
  status: 'On Track' | 'Ahead' | 'Falling Behind';
  shortfall: number;
  surplus: number;
}

/**
 * Calculate compound interest projection
 * Formula: A = P(1 + r/n)^(nt)
 * Where:
 * - A = future value
 * - P = principal (current balance)
 * - r = annual interest rate (APY)
 * - n = compounding periods per year (12 for monthly)
 * - t = time in years
 */
export function calculateCompoundInterest(
  principal: number,
  apy: number,
  years: number,
  monthlyContribution: number = 0
): number {
  const n = 12; // monthly compounding
  const r = apy / 100;
  
  // Compound interest on principal
  const compoundAmount = principal * Math.pow((1 + r / n), n * years);
  
  // Future value of monthly contributions (annuity)
  let contributionAmount = 0;
  if (monthlyContribution > 0) {
    contributionAmount = monthlyContribution * 
      (Math.pow((1 + r / n), n * years) - 1) / (r / n);
  }
  
  return compoundAmount + contributionAmount;
}

/**
 * Calculate months between two dates
 */
export function getMonthsRemaining(targetDate: Date): number {
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.floor(diffDays / 30.44)); // Average days per month
}

/**
 * Calculate required monthly contribution to reach goal
 */
export function calculateRequiredMonthlyContribution(
  currentBalance: number,
  targetAmount: number,
  apy: number,
  monthsRemaining: number
): number {
  const years = monthsRemaining / 12;
  const r = apy / 100;
  const n = 12;
  
  if (years <= 0) {
    return targetAmount - currentBalance;
  }
  
  // Future value factor for principal
  const principalFactor = Math.pow((1 + r / n), n * years);
  
  // Amount needed from contributions
  const neededFromContributions = targetAmount - (currentBalance * principalFactor);
  
  if (neededFromContributions <= 0) {
    return 0; // Already on track with current balance
  }
  
  // Annuity formula to find monthly payment
  const monthlyRate = r / n;
  const annuityFactor = (principalFactor - 1) / monthlyRate;
  
  return neededFromContributions / annuityFactor;
}

/**
 * Project whether a user will meet their goal
 */
export function projectGoalStatus(
  currentBalance: number,
  targetAmount: number,
  targetDate: Date,
  expectedAPY: number = 8.5, // Default conservative APY estimate
  monthlyContribution: number = 0
): GoalProjection {
  const monthsRemaining = getMonthsRemaining(targetDate);
  const years = monthsRemaining / 12;
  
  // Project future value with compound interest
  const projectedValue = calculateCompoundInterest(
    currentBalance,
    expectedAPY,
    years,
    monthlyContribution
  );
  
  // Calculate status
  let status: 'On Track' | 'Ahead' | 'Falling Behind';
  const threshold = 0.95; // Within 5% is considered "On Track"
  
  if (projectedValue >= targetAmount * 1.05) {
    status = 'Ahead';
  } else if (projectedValue >= targetAmount * threshold) {
    status = 'On Track';
  } else {
    status = 'Falling Behind';
  }
  
  // Calculate shortfall or surplus
  const difference = projectedValue - targetAmount;
  const shortfall = difference < 0 ? Math.abs(difference) : 0;
  const surplus = difference > 0 ? difference : 0;
  
  // Calculate required monthly contribution to reach goal
  const requiredMonthlyContribution = calculateRequiredMonthlyContribution(
    currentBalance,
    targetAmount,
    expectedAPY,
    monthsRemaining
  );
  
  return {
    currentBalance,
    targetAmount,
    targetDate,
    expectedAPY,
    projectedValue,
    monthsRemaining,
    requiredMonthlyContribution,
    status,
    shortfall,
    surplus,
  };
}

/**
 * Generate projection curve data for visualization
 */
export function generateProjectionCurve(
  currentBalance: number,
  apy: number,
  months: number,
  monthlyContribution: number = 0
): Array<{ month: number; value: number }> {
  const curve: Array<{ month: number; value: number }> = [];
  
  for (let m = 0; m <= months; m++) {
    const years = m / 12;
    const value = calculateCompoundInterest(currentBalance, apy, years, monthlyContribution);
    curve.push({
      month: m,
      value: Math.round(value * 100) / 100,
    });
  }
  
  return curve;
}

// Example usage and tests
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  console.log('🧮 Testing Goal Projection Calculator...\n');
  
  // Test Case 1: User on track
  const test1 = projectGoalStatus(
    12450, // current balance
    18000, // target amount
    new Date('2026-08-01'), // target date
    8.5, // expected APY
    500 // monthly contribution
  );
  
  console.log('Test 1 - European Vacation Goal:');
  console.log(`   Status: ${test1.status}`);
  console.log(`   Projected Value: $${test1.projectedValue.toFixed(2)}`);
  console.log(`   Target: $${test1.targetAmount.toFixed(2)}`);
  console.log(`   Months Remaining: ${test1.monthsRemaining}`);
  console.log(`   Required Monthly: $${test1.requiredMonthlyContribution.toFixed(2)}`);
  if (test1.shortfall > 0) {
    console.log(`   ⚠️  Shortfall: $${test1.shortfall.toFixed(2)}`);
  }
  if (test1.surplus > 0) {
    console.log(`   ✅ Surplus: $${test1.surplus.toFixed(2)}`);
  }
  console.log();
  
  // Test Case 2: User falling behind
  const test2 = projectGoalStatus(
    5000,
    50000,
    new Date('2028-01-01'),
    7.0,
    200
  );
  
  console.log('Test 2 - Emergency Fund Goal:');
  console.log(`   Status: ${test2.status}`);
  console.log(`   Projected Value: $${test2.projectedValue.toFixed(2)}`);
  console.log(`   Target: $${test2.targetAmount.toFixed(2)}`);
  console.log(`   Required Monthly: $${test2.requiredMonthlyContribution.toFixed(2)}`);
  if (test2.shortfall > 0) {
    console.log(`   ⚠️  Shortfall: $${test2.shortfall.toFixed(2)}`);
  }
  console.log();
  
  // Test Case 3: Generate projection curve
  const curve = generateProjectionCurve(10000, 8.5, 24, 300);
  console.log('Test 3 - 24 Month Projection Curve:');
  console.log('   Month 0:', curve[0].value);
  console.log('   Month 12:', curve[12].value);
  console.log('   Month 24:', curve[24].value);
}
