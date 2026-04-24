import { parseAllocationsFromMessage, getDefaultAllocations } from './allocationParser';

describe('allocationParser Utils', () => {
  describe('parseAllocationsFromMessage', () => {
    it('parses clear percentage allocations', () => {
      const message = "I recommend allocating 60% to Blend Protocol, 30% to Soroswap, and 10% to Gold.";
      const result = parseAllocationsFromMessage(message);
      
      expect(result).toHaveLength(3);
      expect(result).toContainEqual(expect.objectContaining({ name: 'Blend Protocol', percentage: 60 }));
      expect(result).toContainEqual(expect.objectContaining({ name: 'Soroswap', percentage: 30 }));
      expect(result).toContainEqual(expect.objectContaining({ name: 'Gold', percentage: 10 }));
    });

    it('handles different phrasing and capitalization', () => {
      const message = "Allocating 50% to BLEND, 50% to SOROSWAP LP.";
      const result = parseAllocationsFromMessage(message);
      
      expect(result).toHaveLength(2);
      expect(result?.[0].percentage).toBe(50);
      expect(result?.[1].percentage).toBe(50);
    });

    it('normalizes percentages that sum close to 100%', () => {
      const message = "40.5% to Blend, 60.5% to Soroswap"; // Sum = 101%
      const result = parseAllocationsFromMessage(message);
      
      expect(result).not.toBeNull();
      const total = result!.reduce((sum, a) => sum + a.percentage, 0);
      expect(total).toBeCloseTo(100, 1);
    });

    it('returns null if percentages are far from 100%', () => {
      const message = "20% to Blend, 20% to Soroswap"; // Sum = 40%
      const result = parseAllocationsFromMessage(message);
      expect(result).toBeNull();
    });

    it('returns null if no allocations are found', () => {
      const message = "The weather is nice today, and you should save money.";
      const result = parseAllocationsFromMessage(message);
      expect(result).toBeNull();
    });

    it('ignores very short asset names', () => {
      const message = "90% to A, 10% to B";
      const result = parseAllocationsFromMessage(message);
      expect(result).toBeNull();
    });
  });

  describe('getColorForAsset', () => {
    it('returns correct colors for known keywords', () => {
      const message = "50% to Blend, 50% to Soroswap";
      const result = parseAllocationsFromMessage(message);
      expect(result![0].color).toBe('#8b5cf6'); // Blend
      expect(result![1].color).toBe('#06b6d4'); // Soroswap
    });

    it('returns gold color for xaut', () => {
      const message = "100% to XAUT";
      const result = parseAllocationsFromMessage(message);
      expect(result![0].color).toBe('#f59e0b');
    });
  });

  describe('getDefaultAllocations', () => {
    it('returns the default trio', () => {
      const result = getDefaultAllocations();
      expect(result).toHaveLength(3);
      expect(result.reduce((sum, a) => sum + a.percentage, 0)).toBe(100);
    });
  });
});
