import { describe, it, expect } from 'vitest';
import {
  calculateDetailedTotal,
  decomposeSimplifiedScore,
  rebalanceComponentsToTotal,
  COMPONENT_PRIORITY,
  type GradeComponents
} from '../../src/grades/conversion.js';
import { GradeValidationError } from '../../src/grades/errors.js';

describe('conversion.ts - 100% Lossless Bidirectional Grade Conversion', () => {
  describe('calculateDetailedTotal', () => {
    it('should sum valid components accurately', () => {
      const components: GradeComponents = {
        oral: 15,
        written: 18,
        homework: 14,
        behavior: 16,
        participation: 17
      };
      expect(calculateDetailedTotal(components)).toBe(80);
    });

    it('should handle minimum and maximum limits', () => {
      expect(calculateDetailedTotal({ oral: 0, written: 0, homework: 0, behavior: 0, participation: 0 })).toBe(0);
      expect(calculateDetailedTotal({ oral: 20, written: 20, homework: 20, behavior: 20, participation: 20 })).toBe(100);
    });

    it('should throw GradeValidationError on missing or invalid object', () => {
      expect(() => calculateDetailedTotal(null as unknown as GradeComponents)).toThrow(GradeValidationError);
      expect(() => calculateDetailedTotal(undefined as unknown as GradeComponents)).toThrow(GradeValidationError);
      expect(() => calculateDetailedTotal('not-an-object' as unknown as GradeComponents)).toThrow(GradeValidationError);
    });

    it('should throw GradeValidationError when any component is out of [0, 20] range or non-finite', () => {
      const base: GradeComponents = { oral: 10, written: 10, homework: 10, behavior: 10, participation: 10 };
      expect(() => calculateDetailedTotal({ ...base, oral: -1 })).toThrow(GradeValidationError);
      expect(() => calculateDetailedTotal({ ...base, written: 21 })).toThrow(GradeValidationError);
      expect(() => calculateDetailedTotal({ ...base, homework: NaN })).toThrow(GradeValidationError);
      expect(() => calculateDetailedTotal({ ...base, behavior: Infinity })).toThrow(GradeValidationError);
    });
  });

  describe('decomposeSimplifiedScore', () => {
    it('should satisfy zero drift invariant for ALL integer scores [0, 100]', () => {
      for (let s = 0; s <= 100; s++) {
        const decomposed = decomposeSimplifiedScore(s);
        const total = calculateDetailedTotal(decomposed);

        expect(total).toBe(s);

        const values = Object.values(decomposed);
        for (const val of values) {
          expect(Number.isInteger(val)).toBe(true);
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(20);
        }

        const maxVal = Math.max(...values);
        const minVal = Math.min(...values);
        expect(maxVal - minVal).toBeLessThanOrEqual(1);
      }
    });

    it('should distribute remainders according to Iraqi pedagogical priority', () => {
      // 73: 73 = 5 * 14 + 3. Remainder 3 goes to written, oral, participation
      const c73 = decomposeSimplifiedScore(73);
      expect(c73).toEqual({
        written: 15,
        oral: 15,
        participation: 15,
        homework: 14,
        behavior: 14
      });

      // 71: remainder 1 goes to written
      const c71 = decomposeSimplifiedScore(71);
      expect(c71.written).toBe(15);
      expect(c71.oral).toBe(14);
      expect(c71.participation).toBe(14);
      expect(c71.homework).toBe(14);
      expect(c71.behavior).toBe(14);
    });

    it('should reject invalid scores', () => {
      expect(() => decomposeSimplifiedScore(-1)).toThrow(GradeValidationError);
      expect(() => decomposeSimplifiedScore(101)).toThrow(GradeValidationError);
      expect(() => decomposeSimplifiedScore(NaN)).toThrow(GradeValidationError);
    });
  });

  describe('rebalanceComponentsToTotal', () => {
    it('should maintain 100% lossless identity when target equals current total', () => {
      const original: GradeComponents = {
        oral: 18,
        written: 12,
        homework: 19,
        behavior: 11,
        participation: 13
      }; // sum = 73
      const rebalanced = rebalanceComponentsToTotal(original, 73);
      expect(rebalanced).toEqual(original);
    });

    it('should decompose from scratch when current total is 0', () => {
      const zeroComp: GradeComponents = { oral: 0, written: 0, homework: 0, behavior: 0, participation: 0 };
      const rebalanced = rebalanceComponentsToTotal(zeroComp, 73);
      expect(calculateDetailedTotal(rebalanced)).toBe(73);
      expect(rebalanced).toEqual(decomposeSimplifiedScore(73));
    });

    it('should return all 0s when target is 0', () => {
      const comp: GradeComponents = { oral: 15, written: 15, homework: 15, behavior: 15, participation: 15 };
      expect(rebalanceComponentsToTotal(comp, 0)).toEqual({
        oral: 0, written: 0, homework: 0, behavior: 0, participation: 0
      });
    });

    it('should return all 20s when target is 100', () => {
      const comp: GradeComponents = { oral: 10, written: 10, homework: 10, behavior: 10, participation: 10 };
      expect(rebalanceComponentsToTotal(comp, 100)).toEqual({
        oral: 20, written: 20, homework: 20, behavior: 20, participation: 20
      });
    });

    it('should respect the 20 mark upper bound when increasing', () => {
      const comp: GradeComponents = {
        written: 20,
        oral: 20,
        participation: 20,
        homework: 10,
        behavior: 10
      }; // sum = 80
      const increased = rebalanceComponentsToTotal(comp, 85);
      expect(calculateDetailedTotal(increased)).toBe(85);
      expect(increased.written).toBe(20);
      expect(increased.oral).toBe(20);
      expect(increased.participation).toBe(20);
      expect(increased.homework + increased.behavior).toBe(25);
      expect(increased.homework).toBeLessThanOrEqual(20);
      expect(increased.behavior).toBeLessThanOrEqual(20);
    });

    it('should respect the 0 mark lower bound when decreasing', () => {
      const comp: GradeComponents = {
        written: 5,
        oral: 0,
        participation: 0,
        homework: 0,
        behavior: 0
      }; // sum = 5
      const decreased = rebalanceComponentsToTotal(comp, 2);
      expect(calculateDetailedTotal(decreased)).toBe(2);
      expect(decreased.written).toBe(2);
      expect(decreased.oral).toBe(0);
    });

    it('should pass 500 randomized property tests without drift or bound violation', () => {
      for (let i = 0; i < 500; i++) {
        // Generate random valid components
        const currentScore = Math.floor(Math.random() * 101);
        const current = decomposeSimplifiedScore(currentScore);
        const target = Math.floor(Math.random() * 101);

        const result = rebalanceComponentsToTotal(current, target);
        expect(calculateDetailedTotal(result)).toBe(target);

        for (const key of COMPONENT_PRIORITY) {
          expect(result[key]).toBeGreaterThanOrEqual(0);
          expect(result[key]).toBeLessThanOrEqual(20);
          expect(Number.isInteger(result[key])).toBe(true);
        }
      }
    });

    it('should reject invalid target scores', () => {
      const comp: GradeComponents = { oral: 10, written: 10, homework: 10, behavior: 10, participation: 10 };
      expect(() => rebalanceComponentsToTotal(comp, -5)).toThrow(GradeValidationError);
      expect(() => rebalanceComponentsToTotal(comp, 105)).toThrow(GradeValidationError);
      expect(() => rebalanceComponentsToTotal(comp, NaN)).toThrow(GradeValidationError);
    });
  });
});
