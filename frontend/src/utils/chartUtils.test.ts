import { 
  percentToRadians, 
  getPointOnCircle, 
  generatePiePath, 
  validateAllocations, 
  normalizeAllocations,
  calculatePieSlices,
  parseAllocations,
  AssetAllocation
} from './chartUtils';

describe('chartUtils', () => {
  describe('percentToRadians', () => {
    it('converts 25% to PI/2', () => {
      expect(percentToRadians(25)).toBe(Math.PI / 2);
    });

    it('converts 50% to PI', () => {
      expect(percentToRadians(50)).toBe(Math.PI);
    });

    it('converts 100% to 2*PI', () => {
      expect(percentToRadians(100)).toBe(2 * Math.PI);
    });
  });

  describe('getPointOnCircle', () => {
    const cx = 100;
    const cy = 100;
    const radius = 50;

    it('calculates top point (0 radians)', () => {
      const point = getPointOnCircle(cx, cy, radius, 0);
      expect(point.x).toBeCloseTo(100);
      expect(point.y).toBeCloseTo(50);
    });

    it('calculates right point (PI/2 radians)', () => {
      const point = getPointOnCircle(cx, cy, radius, Math.PI / 2);
      expect(point.x).toBeCloseTo(150);
      expect(point.y).toBeCloseTo(100);
    });
  });

  describe('generatePiePath', () => {
    it('returns a valid SVG path string', () => {
      const path = generatePiePath(100, 100, 50, 0, Math.PI / 2);
      expect(path).toMatch(/^M 100 100 L \d+(\.\d+)? \d+(\.\d+)? A 50 50 0 0 1 \d+(\.\d+)? \d+(\.\d+)? Z$/);
    });

    it('sets largeArc flag correctly', () => {
      const smallSlice = generatePiePath(100, 100, 50, 0, Math.PI * 0.5);
      const largeSlice = generatePiePath(100, 100, 50, 0, Math.PI * 1.5);
      
      expect(smallSlice).toContain(' 0 0 1 ');
      expect(largeSlice).toContain(' 0 1 1 ');
    });
  });

  describe('validateAllocations', () => {
    it('returns true if sum is 100', () => {
      const allocations: AssetAllocation[] = [
        { name: 'A', percentage: 70, color: 'red' },
        { name: 'B', percentage: 30, color: 'blue' }
      ];
      expect(validateAllocations(allocations)).toBe(true);
    });

    it('handles floating point precision', () => {
      const allocations: AssetAllocation[] = [
        { name: 'A', percentage: 33.33, color: 'red' },
        { name: 'B', percentage: 33.33, color: 'red' },
        { name: 'C', percentage: 33.34, color: 'red' }
      ];
      expect(validateAllocations(allocations)).toBe(true);
    });

    it('returns false if sum is not 100', () => {
      const allocations: AssetAllocation[] = [
        { name: 'A', percentage: 50, color: 'red' }
      ];
      expect(validateAllocations(allocations)).toBe(false);
    });
  });

  describe('normalizeAllocations', () => {
    it('normalizes to 100%', () => {
      const allocations: AssetAllocation[] = [
        { name: 'A', percentage: 50, color: 'red' },
        { name: 'B', percentage: 50, color: 'blue' },
        { name: 'C', percentage: 50, color: 'green' }
      ];
      const result = normalizeAllocations(allocations);
      const total = result[0].percentage + result[1].percentage + result[2].percentage;
      expect(total).toBeCloseTo(100, 1);
      expect(result[0].percentage).toBeCloseTo(33.33, 1);
    });

    it('returns same array if already 100%', () => {
      const allocations: AssetAllocation[] = [
        { name: 'A', percentage: 100, color: 'red' }
      ];
      expect(normalizeAllocations(allocations)).toBe(allocations);
    });
  });

  describe('calculatePieSlices', () => {
    it('calculates expected number of slices with correct geometry', () => {
      const allocations: AssetAllocation[] = [
        { name: 'A', percentage: 50, color: 'red' },
        { name: 'B', percentage: 50, color: 'blue' }
      ];
      const slices = calculatePieSlices(allocations, 100, 100, 50);
      expect(slices).toHaveLength(2);
      expect(slices[0].startAngle).toBe(0);
      expect(slices[0].endAngle).toBe(Math.PI);
      expect(slices[1].startAngle).toBe(Math.PI);
      expect(slices[1].endAngle).toBe(2 * Math.PI);
    });
  });

  describe('parseAllocations', () => {
    it('handles direct arrays', () => {
      const data = [{ name: 'A', percentage: 100, color: 'red' }];
      expect(parseAllocations(data)).toEqual(data);
    });

    it('handles object with allocations property', () => {
      const data = { allocations: [{ name: 'A', percentage: 100, color: 'red' }] };
      expect(parseAllocations(data)).toEqual(data.allocations);
    });

    it('returns empty array for invalid input', () => {
      expect(parseAllocations(null)).toEqual([]);
      expect(parseAllocations("string")).toEqual([]);
    });
  });
});
