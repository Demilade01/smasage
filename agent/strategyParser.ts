// Strategy Parser Tool for Issue 1.3
// Converts conversational intent into a strict JSON payload for the agent

export interface StrategyPayload {
  monthlyContributionAmount: number;
  blendAllocationX: number;
  soroswapAllocationX: number;
  goldAllocationX: number;
}

/**
 * Validates and normalizes the strategy payload.
 * Ensures allocations sum to 100 and all fields are present.
 * Applies fallbacks for malformed input.
 */
export function parseStrategyIntent(input: any): StrategyPayload {
  // Fallbacks for missing or malformed fields
  let monthlyContributionAmount = Number(input.monthlyContributionAmount);
  if (isNaN(monthlyContributionAmount) || monthlyContributionAmount < 0) {
    monthlyContributionAmount = 0;
  }

  // Parse allocations, fallback to 0 if missing or invalid
  let blend = Number(input.blendAllocationX);
  let soroswap = Number(input.soroswapAllocationX);
  let gold = Number(input.goldAllocationX);
  if (isNaN(blend) || blend < 0) blend = 0;
  if (isNaN(soroswap) || soroswap < 0) soroswap = 0;
  if (isNaN(gold) || gold < 0) gold = 0;

  // Normalize allocations to sum to 100
  const total = blend + soroswap + gold;
  if (total === 0) {
    // All allocations are invalid or zero, fallback to 100/0/0
    blend = 100;
    soroswap = 0;
    gold = 0;
  } else if (total !== 100) {
    blend = Math.round((blend / total) * 100);
    soroswap = Math.round((soroswap / total) * 100);
    gold = 100 - blend - soroswap; // Ensure sum is exactly 100
  }

  return {
    monthlyContributionAmount,
    blendAllocationX: blend,
    soroswapAllocationX: soroswap,
    goldAllocationX: gold,
  };
}

/**
 * Validates that the payload matches the schema and allocations sum to 100.
 */
export function validateStrategyPayload(payload: any): boolean {
  if (
    typeof payload !== 'object' ||
    typeof payload.monthlyContributionAmount !== 'number' ||
    typeof payload.blendAllocationX !== 'number' ||
    typeof payload.soroswapAllocationX !== 'number' ||
    typeof payload.goldAllocationX !== 'number'
  ) {
    return false;
  }
  const sum = payload.blendAllocationX + payload.soroswapAllocationX + payload.goldAllocationX;
  return sum === 100;
}
