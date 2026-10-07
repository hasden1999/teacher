import { describe, it, expect } from 'vitest';
import {
  roundHalfUp,
  calculateSemesterGrade,
  calculateAnnualEffort,
  calculateFinalResult,
  calculateRound2Result,
  isPassingGrade,
  GradeValidationError
} from '../../src/grades/formulas.js';

describe('formulas.ts - Iraqi Ministerial Grade Calculations', () => {
  describe('roundHalfUp', () => {
    it('should keep integer values unchanged', () => {
      expect(roundHalfUp(0)).toBe(0);
      expect(roundHalfUp(50)).toBe(50);
      expect(roundHalfUp(100)).toBe(100);
    });

    it('should round half (>= 0.5) up to the next integer (+1)', () => {
      expect(roundHalfUp(0.5)).toBe(1);
      expect(roundHalfUp(49.5)).toBe(50);
      expect(roundHalfUp(75.5)).toBe(76);
      expect(roundHalfUp(99.5)).toBe(100);
    });

    it('should round down when fraction is strictly less than 0.5', () => {
      expect(roundHalfUp(0.49)).toBe(0);
      expect(roundHalfUp(49.49)).toBe(49);
      expect(roundHalfUp(49.333333333333336)).toBe(49);
      expect(roundHalfUp(75.1)).toBe(75);
    });

    it('should round up when fraction is greater than 0.5', () => {
      expect(roundHalfUp(49.666666666666664)).toBe(50);
      expect(roundHalfUp(50.51)).toBe(51);
      expect(roundHalfUp(75.9)).toBe(76);
    });

    it('should throw GradeValidationError on invalid non-finite numbers', () => {
      expect(() => roundHalfUp(NaN)).toThrow(GradeValidationError);
      expect(() => roundHalfUp(Infinity)).toThrow(GradeValidationError);
      expect(() => roundHalfUp(-Infinity)).toThrow(GradeValidationError);
      expect(() => roundHalfUp('50' as unknown as number)).toThrow(GradeValidationError);
    });

    it('should throw GradeValidationError on negative values', () => {
      expect(() => roundHalfUp(-1)).toThrow(GradeValidationError);
      expect(() => roundHalfUp(-0.5)).toThrow(GradeValidationError);
    });
  });

  describe('calculateSemesterGrade', () => {
    it('should calculate integer average correctly', () => {
      expect(calculateSemesterGrade(60, 60)).toBe(60);
      expect(calculateSemesterGrade(75, 75)).toBe(75);
    });

    it('should apply half-up rounding on fractional semester grades', () => {
      expect(calculateSemesterGrade(75, 76)).toBe(76); // 75.5 -> 76
      expect(calculateSemesterGrade(49, 50)).toBe(50); // 49.5 -> 50 (passing threshold)
      expect(calculateSemesterGrade(48, 50)).toBe(49); // 49.0 -> 49 (failing)
    });

    it('should handle extreme valid boundaries [0, 100]', () => {
      expect(calculateSemesterGrade(0, 0)).toBe(0);
      expect(calculateSemesterGrade(100, 100)).toBe(100);
      expect(calculateSemesterGrade(0, 100)).toBe(50);
    });

    it('should reject out of range scores and invalid types', () => {
      expect(() => calculateSemesterGrade(-1, 50)).toThrow(GradeValidationError);
      expect(() => calculateSemesterGrade(50, -1)).toThrow(GradeValidationError);
      expect(() => calculateSemesterGrade(101, 50)).toThrow(GradeValidationError);
      expect(() => calculateSemesterGrade(50, 105)).toThrow(GradeValidationError);
      expect(() => calculateSemesterGrade(NaN, 50)).toThrow(GradeValidationError);
      expect(() => calculateSemesterGrade(50, Infinity)).toThrow(GradeValidationError);
    });
  });

  describe('calculateAnnualEffort', () => {
    it('should calculate annual effort with exact division', () => {
      expect(calculateAnnualEffort(60, 60, 60)).toBe(60);
      expect(calculateAnnualEffort(85, 92, 78)).toBe(85); // 255 / 3 = 85
    });

    it('should round up remainder 2 (fraction 0.666...)', () => {
      expect(calculateAnnualEffort(50, 49, 50)).toBe(50); // 149 / 3 = 49.666... -> 50
      expect(calculateAnnualEffort(70, 71, 71)).toBe(71); // 212 / 3 = 70.666... -> 71
    });

    it('should round down remainder 1 (fraction 0.333...)', () => {
      expect(calculateAnnualEffort(49, 50, 49)).toBe(49); // 148 / 3 = 49.333... -> 49
      expect(calculateAnnualEffort(60, 60, 61)).toBe(60); // 181 / 3 = 60.333... -> 60
    });

    it('should handle boundaries 0 and 100', () => {
      expect(calculateAnnualEffort(0, 0, 0)).toBe(0);
      expect(calculateAnnualEffort(100, 100, 100)).toBe(100);
    });

    it('should reject invalid scores', () => {
      expect(() => calculateAnnualEffort(-1, 50, 50)).toThrow(GradeValidationError);
      expect(() => calculateAnnualEffort(50, -1, 50)).toThrow(GradeValidationError);
      expect(() => calculateAnnualEffort(50, 50, -1)).toThrow(GradeValidationError);
      expect(() => calculateAnnualEffort(101, 50, 50)).toThrow(GradeValidationError);
      expect(() => calculateAnnualEffort(50, 101, 50)).toThrow(GradeValidationError);
      expect(() => calculateAnnualEffort(50, 50, 101)).toThrow(GradeValidationError);
      expect(() => calculateAnnualEffort(NaN, 50, 50)).toThrow(GradeValidationError);
    });
  });

  describe('calculateFinalResult and calculateRound2Result', () => {
    it('should calculate final exam result with half-up rounding', () => {
      expect(calculateFinalResult(49, 50)).toBe(50); // 49.5 -> 50
      expect(calculateFinalResult(50, 49)).toBe(50); // 49.5 -> 50
      expect(calculateFinalResult(48, 50)).toBe(49); // 49.0 -> 49
      expect(calculateFinalResult(0, 100)).toBe(50);
      expect(calculateFinalResult(100, 0)).toBe(50);
      expect(calculateFinalResult(100, 100)).toBe(100);
      expect(calculateFinalResult(0, 0)).toBe(0);
    });

    it('should calculate round 2 exam result', () => {
      expect(calculateRound2Result(49, 50)).toBe(50);
      expect(calculateRound2Result(50, 49)).toBe(50);
      expect(calculateRound2Result(0, 100)).toBe(50);
      expect(calculateRound2Result(100, 100)).toBe(100);
    });

    it('should reject invalid final result inputs', () => {
      expect(() => calculateFinalResult(-1, 50)).toThrow(GradeValidationError);
      expect(() => calculateFinalResult(50, 101)).toThrow(GradeValidationError);
      expect(() => calculateRound2Result(-5, 50)).toThrow(GradeValidationError);
      expect(() => calculateRound2Result(50, 105)).toThrow(GradeValidationError);
    });
  });

  describe('isPassingGrade', () => {
    it('should return true for passing scores (>= 50)', () => {
      expect(isPassingGrade(50)).toBe(true);
      expect(isPassingGrade(51)).toBe(true);
      expect(isPassingGrade(75)).toBe(true);
      expect(isPassingGrade(100)).toBe(true);
    });

    it('should return false for failing scores (< 50)', () => {
      expect(isPassingGrade(49)).toBe(false);
      expect(isPassingGrade(49.9)).toBe(false);
      expect(isPassingGrade(0)).toBe(false);
    });

    it('should reject invalid scores', () => {
      expect(() => isPassingGrade(-1)).toThrow(GradeValidationError);
      expect(() => isPassingGrade(101)).toThrow(GradeValidationError);
      expect(() => isPassingGrade(NaN)).toThrow(GradeValidationError);
    });
  });
});
