import { parseStrategyIntent, validateStrategyPayload, StrategyPayload } from './strategyParser';

describe('Strategy Parser', () => {
  it('parses valid input and sums allocations to 100', () => {
    const input = {
      monthlyContributionAmount: 500,
      blendAllocationX: 40,
      soroswapAllocationX: 30,
      goldAllocationX: 30,
    };
    const result = parseStrategyIntent(input);
    expect(result).toEqual({
      monthlyContributionAmount: 500,
      blendAllocationX: 40,
      soroswapAllocationX: 30,
      goldAllocationX: 30,
    });
    expect(validateStrategyPayload(result)).toBe(true);
  });

  it('normalizes allocations if they do not sum to 100', () => {
    const input = {
      monthlyContributionAmount: 1000,
      blendAllocationX: 50,
      soroswapAllocationX: 30,
      goldAllocationX: 10,
    };
    const result = parseStrategyIntent(input);
    expect(result.blendAllocationX + result.soroswapAllocationX + result.goldAllocationX).toBe(100);
    expect(validateStrategyPayload(result)).toBe(true);
  });

  it('handles malformed input with fallbacks', () => {
    const input = {
      monthlyContributionAmount: 'not-a-number',
      blendAllocationX: null,
      soroswapAllocationX: undefined,
      goldAllocationX: -10,
    };
    const result = parseStrategyIntent(input);
    expect(result.monthlyContributionAmount).toBe(0);
    expect(result.blendAllocationX + result.soroswapAllocationX + result.goldAllocationX).toBe(100);
    expect(validateStrategyPayload(result)).toBe(true);
  });

  it('returns false for invalid schema', () => {
    const invalid = { foo: 1, bar: 2 };
    expect(validateStrategyPayload(invalid)).toBe(false);
  });
});
