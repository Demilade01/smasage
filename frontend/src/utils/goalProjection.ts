/**
 * Frontend Goal Projection Utilities
 * Client-side calculations for goal tracking and projections
 */

export interface GoalData {
  currentBalance: number;
  targetAmount: number;
  targetDate: string;
  monthlyContribution: number;
  expectedAPY: number;
}

export interface ProjectionResult {
  status: 'On Track' | 'Ahead' | 'Falling Behind';
  projectedValue: number;
  monthsRemaining: number;
  shortfall: number;
  surplus: number;
  progressPercentage: number;
}

/**
 * Calculate compound interest (client-side version)
 */
export function calculateProjection(
  principal: number,
  apy: number,
  years: number,
  monthlyContribution: number = 0
): number {
  const n = 12; // monthly compounding
  const r = apy / 100;
  
  const compoundAmount = principal * Math.pow((1 + r / n), n * years);
  
  let contributionAmount = 0;
  if (monthlyContribution > 0) {
    contributionAmount = monthlyContribution * 
      (Math.pow((1 + r / n), n * years) - 1) / (r / n);
  }
  
  return compoundAmount + contributionAmount;
}

/**
 * Get months between now and target date
 */
export function getMonthsUntil(targetDateStr: string): number {
  const target = new Date(targetDateStr);
  const now = new Date();
  
  if (isNaN(target.getTime())) return 0;
  
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  
  // Adjust if today's day of month is after target day of month (optional, but makes it "complete" months)
  // For simplicity in projections, we often just use the month difference.
  return Math.max(0, months);
}

/**
 * Evaluate goal status
 */
export function evaluateGoalStatus(goal: GoalData): ProjectionResult {
  const monthsRemaining = getMonthsUntil(goal.targetDate);
  const years = monthsRemaining / 12;
  
  const projectedValue = calculateProjection(
    goal.currentBalance,
    goal.expectedAPY,
    years,
    goal.monthlyContribution
  );
  
  const threshold = 0.95;
  let status: 'On Track' | 'Ahead' | 'Falling Behind';
  
  if (projectedValue >= goal.targetAmount * 1.05) {
    status = 'Ahead';
  } else if (projectedValue >= goal.targetAmount * threshold) {
    status = 'On Track';
  } else {
    status = 'Falling Behind';
  }
  
  const difference = projectedValue - goal.targetAmount;
  const shortfall = difference < 0 ? Math.abs(difference) : 0;
  const surplus = difference > 0 ? difference : 0;
  
  const progressPercentage = (goal.currentBalance / goal.targetAmount) * 100;
  
  return {
    status,
    projectedValue,
    monthsRemaining,
    shortfall,
    surplus,
    progressPercentage: Math.min(100, progressPercentage),
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'Ahead':
      return '#10b981'; // Green
    case 'On Track':
      return '#3b82f6'; // Blue
    case 'Falling Behind':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray
  }
}
