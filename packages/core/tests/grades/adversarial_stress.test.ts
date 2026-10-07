import { describe, it, expect } from 'vitest';
import {
  roundHalfUp,
  calculateSemesterGrade,
  calculateAnnualEffort,
  calculateFinalResult,
  calculateRound2Result,
  isPassingGrade,
  calculateDetailedTotal,
  decomposeSimplifiedScore,
  rebalanceComponentsToTotal,
  applyDecisionMarks,
  GradeValidationError,
  type GradeComponents,
  type StudentSubjectGrade
} from '../../src/index.js';

describe('Adversarial Stress & Fuzz Suite - Grading Engines', () => {
  describe('1. Mathematical Boundary Cases & Malformed Inputs', () => {
    describe('roundHalfUp', () => {
      it('handles extreme integer boundaries 0 and 100 and beyond', () => {
        expect(roundHalfUp(0)).toBe(0);
        expect(roundHalfUp(100)).toBe(100);
        expect(roundHalfUp(1000)).toBe(1000);
      });

      it('correctly rounds exact ministerial half boundaries (.5)', () => {
        expect(roundHalfUp(0.5)).toBe(1);
        expect(roundHalfUp(49.5)).toBe(50);
        expect(roundHalfUp(99.5)).toBe(100);
      });

      it('correctly handles fractional inputs strictly below 0.5', () => {
        expect(roundHalfUp(0.499)).toBe(0);
        expect(roundHalfUp(49.499)).toBe(49);
        expect(roundHalfUp(75.25)).toBe(75);
      });

      it('correctly handles fractional inputs strictly above 0.5', () => {
        expect(roundHalfUp(0.501)).toBe(1);
        expect(roundHalfUp(49.501)).toBe(50);
        expect(roundHalfUp(75.75)).toBe(76);
      });

      it('rejects negative numbers strictly with GradeValidationError', () => {
        expect(() => roundHalfUp(-0.0001)).toThrow(GradeValidationError);
        expect(() => roundHalfUp(-1)).toThrow(GradeValidationError);
        expect(() => roundHalfUp(-50)).toThrow(GradeValidationError);
      });

      it('rejects non-finite, NaN, and Infinity strictly', () => {
        expect(() => roundHalfUp(NaN)).toThrow(GradeValidationError);
        expect(() => roundHalfUp(Infinity)).toThrow(GradeValidationError);
        expect(() => roundHalfUp(-Infinity)).toThrow(GradeValidationError);
        expect(() => roundHalfUp('50' as unknown as number)).toThrow(GradeValidationError);
        expect(() => roundHalfUp(null as unknown as number)).toThrow(GradeValidationError);
        expect(() => roundHalfUp(undefined as unknown as number)).toThrow(GradeValidationError);
      });
    });

    describe('calculateSemesterGrade, calculateAnnualEffort, calculateFinalResult', () => {
      it('enforces [0, 100] range on calculateSemesterGrade', () => {
        expect(calculateSemesterGrade(0, 0)).toBe(0);
        expect(calculateSemesterGrade(100, 100)).toBe(100);
        expect(calculateSemesterGrade(0, 100)).toBe(50);

        expect(() => calculateSemesterGrade(-1, 50)).toThrow(GradeValidationError);
        expect(() => calculateSemesterGrade(50, 101)).toThrow(GradeValidationError);
        expect(() => calculateSemesterGrade(NaN, 50)).toThrow(GradeValidationError);
        expect(() => calculateSemesterGrade(50, Infinity)).toThrow(GradeValidationError);
      });

      it('enforces [0, 100] range on calculateAnnualEffort', () => {
        expect(calculateAnnualEffort(0, 0, 0)).toBe(0);
        expect(calculateAnnualEffort(100, 100, 100)).toBe(100);
        expect(calculateAnnualEffort(50, 50, 50)).toBe(50);

        expect(() => calculateAnnualEffort(-0.1, 50, 50)).toThrow(GradeValidationError);
        expect(() => calculateAnnualEffort(50, 100.1, 50)).toThrow(GradeValidationError);
        expect(() => calculateAnnualEffort(50, 50, NaN)).toThrow(GradeValidationError);
      });

      it('enforces [0, 100] range on calculateFinalResult and calculateRound2Result', () => {
        expect(calculateFinalResult(0, 0)).toBe(0);
        expect(calculateFinalResult(100, 100)).toBe(100);
        expect(calculateRound2Result(0, 0)).toBe(0);
        expect(calculateRound2Result(100, 100)).toBe(100);

        expect(() => calculateFinalResult(-5, 50)).toThrow(GradeValidationError);
        expect(() => calculateFinalResult(50, 105)).toThrow(GradeValidationError);
        expect(() => calculateRound2Result(NaN, 50)).toThrow(GradeValidationError);
      });

      it('evaluates passing grade predicate correctly at boundary 50', () => {
        expect(isPassingGrade(50)).toBe(true);
        expect(isPassingGrade(49.999)).toBe(false);
        expect(isPassingGrade(0)).toBe(false);
        expect(isPassingGrade(100)).toBe(true);
        expect(() => isPassingGrade(-1)).toThrow(GradeValidationError);
        expect(() => isPassingGrade(101)).toThrow(GradeValidationError);
        expect(() => isPassingGrade(NaN)).toThrow(GradeValidationError);
      });
    });

    describe('calculateDetailedTotal and decomposeSimplifiedScore', () => {
      it('handles boundaries 0 and 100 in decomposeSimplifiedScore', () => {
        const c0 = decomposeSimplifiedScore(0);
        expect(calculateDetailedTotal(c0)).toBe(0);
        expect(Object.values(c0).every(v => v === 0)).toBe(true);

        const c100 = decomposeSimplifiedScore(100);
        expect(calculateDetailedTotal(c100)).toBe(100);
        expect(Object.values(c100).every(v => v === 20)).toBe(true);
      });

      it('rejects invalid scores in decomposeSimplifiedScore', () => {
        expect(() => decomposeSimplifiedScore(-1)).toThrow(GradeValidationError);
        expect(() => decomposeSimplifiedScore(101)).toThrow(GradeValidationError);
        expect(() => decomposeSimplifiedScore(NaN)).toThrow(GradeValidationError);
        expect(() => decomposeSimplifiedScore(Infinity)).toThrow(GradeValidationError);
        expect(() => decomposeSimplifiedScore('50' as unknown as number)).toThrow(GradeValidationError);
      });

      it('rejects out of range components in calculateDetailedTotal', () => {
        const valid: GradeComponents = { oral: 10, written: 10, homework: 10, behavior: 10, participation: 10 };
        expect(() => calculateDetailedTotal({ ...valid, oral: -0.1 })).toThrow(GradeValidationError);
        expect(() => calculateDetailedTotal({ ...valid, oral: 20.1 })).toThrow(GradeValidationError);
        expect(() => calculateDetailedTotal({ ...valid, oral: NaN })).toThrow(GradeValidationError);
        expect(() => calculateDetailedTotal({ ...valid, oral: Infinity })).toThrow(GradeValidationError);
        expect(() => calculateDetailedTotal(null as unknown as GradeComponents)).toThrow(GradeValidationError);
        expect(() => calculateDetailedTotal({} as unknown as GradeComponents)).toThrow(GradeValidationError);
      });
    });
  });

  describe('2. Lossless Invariant Stress: 1,000 Multi-Round Transitions', () => {
    it('executes 1,000 multi-round transitions Detailed -> Simplified -> Detailed with random score adjustments without drift', () => {
      // PRNG seeded deterministically for reproducibility
      let seed = 424242;
      const pseudoRandom = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      // Initial state: start with a random valid detailed score
      let initialTotal = Math.floor(pseudoRandom() * 101);
      let currentDetailed = decomposeSimplifiedScore(initialTotal);

      const ROUNDS = 1000;
      let totalDriftCount = 0;
      let outOfBoundsCount = 0;
      let nonIntegerCount = 0;
      let identityPreservationSuccessCount = 0;

      for (let round = 0; round < ROUNDS; round++) {
        // Step A: Detailed -> Simplified
        const currentSimplified = calculateDetailedTotal(currentDetailed);

        // Sub-test 1: Identity check (Detailed -> Simplified -> Detailed without adjustment)
        const rebalancedSame = rebalanceComponentsToTotal(currentDetailed, currentSimplified);
        if (
          rebalancedSame.oral === currentDetailed.oral &&
          rebalancedSame.written === currentDetailed.written &&
          rebalancedSame.homework === currentDetailed.homework &&
          rebalancedSame.behavior === currentDetailed.behavior &&
          rebalancedSame.participation === currentDetailed.participation
        ) {
          identityPreservationSuccessCount++;
        }

        // Step B: Random adjustment to simplified score
        // Test various adjustment types: large jumps, single-mark adjustments, zero adjustments, boundary jumps
        const adjustmentMode = pseudoRandom();
        let targetScore: number;

        if (adjustmentMode < 0.1) {
          // Boundary jump to 0
          targetScore = 0;
        } else if (adjustmentMode < 0.2) {
          // Boundary jump to 100
          targetScore = 100;
        } else if (adjustmentMode < 0.4) {
          // Micro-adjustment (+-1 or +-2)
          const delta = Math.floor(pseudoRandom() * 5) - 2; // -2 to +2
          targetScore = Math.max(0, Math.min(100, currentSimplified + delta));
        } else if (adjustmentMode < 0.6) {
          // Moderate adjustment (+-10)
          const delta = Math.floor(pseudoRandom() * 21) - 10;
          targetScore = Math.max(0, Math.min(100, currentSimplified + delta));
        } else {
          // Full random target [0, 100]
          targetScore = Math.floor(pseudoRandom() * 101);
        }

        // Step C: Simplified -> Detailed (via rebalanceComponentsToTotal)
        const nextDetailed = rebalanceComponentsToTotal(currentDetailed, targetScore);

        // Verification 1: Zero drift invariant (sum must EXACTLY match targetScore)
        const resultingSum = calculateDetailedTotal(nextDetailed);
        if (resultingSum !== targetScore) {
          totalDriftCount++;
        }

        // Verification 2: Ministerial bounds invariant (each component must be in [0, 20])
        const components = Object.values(nextDetailed);
        for (const val of components) {
          if (val < 0 || val > 20) {
            outOfBoundsCount++;
          }
          if (!Number.isInteger(val)) {
            nonIntegerCount++;
          }
        }

        // Transition to next round
        currentDetailed = nextDetailed;
      }

      // Assertions
      expect(totalDriftCount, 'Total drift count across 1,000 transitions').toBe(0);
      expect(outOfBoundsCount, 'Out-of-bounds component count across 1,000 transitions').toBe(0);
      expect(nonIntegerCount, 'Non-integer component count across 1,000 transitions').toBe(0);
      expect(identityPreservationSuccessCount, 'Identity preservation when score is unchanged').toBe(ROUNDS);
    });

    it('executes 1,000 transitions with interleaved direct component mutations and simplified conversions', () => {
      let seed = 987654321;
      const pseudoRandom = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      let state = decomposeSimplifiedScore(75);
      const keys: (keyof GradeComponents)[] = ['oral', 'written', 'homework', 'behavior', 'participation'];

      for (let i = 0; i < 1000; i++) {
        // Teacher mutates one random component in Detailed mode
        const randomKey = keys[Math.floor(pseudoRandom() * keys.length)];
        state[randomKey] = Math.floor(pseudoRandom() * 21); // 0 to 20

        // Detailed -> Simplified
        const simplifiedTotal = calculateDetailedTotal(state);
        expect(simplifiedTotal).toBeGreaterThanOrEqual(0);
        expect(simplifiedTotal).toBeLessThanOrEqual(100);

        // Teacher adjusts simplified score in Simplified mode
        const newTarget = Math.floor(pseudoRandom() * 101);

        // Simplified -> Detailed (rebalance)
        state = rebalanceComponentsToTotal(state, newTarget);

        // Invariant checks
        const actualSum = calculateDetailedTotal(state);
        expect(actualSum).toBe(newTarget);
        for (const k of keys) {
          expect(state[k]).toBeGreaterThanOrEqual(0);
          expect(state[k]).toBeLessThanOrEqual(20);
          expect(Number.isInteger(state[k])).toBe(true);
        }
      }
    });

    it('survives all extreme target transitions (0 -> 100 -> 0 -> 100)', () => {
      let state = decomposeSimplifiedScore(0);
      expect(calculateDetailedTotal(state)).toBe(0);

      for (let i = 0; i < 20; i++) {
        state = rebalanceComponentsToTotal(state, 100);
        expect(calculateDetailedTotal(state)).toBe(100);
        expect(state).toEqual({ oral: 20, written: 20, homework: 20, behavior: 20, participation: 20 });

        state = rebalanceComponentsToTotal(state, 0);
        expect(calculateDetailedTotal(state)).toBe(0);
        expect(state).toEqual({ oral: 0, written: 0, homework: 0, behavior: 0, participation: 0 });
      }
    });

    it('tests single-mark stepwise increment from 0 to 100 and decrement from 100 to 0', () => {
      let state = decomposeSimplifiedScore(0);

      // Ascending step by step
      for (let score = 1; score <= 100; score++) {
        state = rebalanceComponentsToTotal(state, score);
        expect(calculateDetailedTotal(state)).toBe(score);
        for (const v of Object.values(state)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(20);
        }
      }

      // Descending step by step
      for (let score = 99; score >= 0; score--) {
        state = rebalanceComponentsToTotal(state, score);
        expect(calculateDetailedTotal(state)).toBe(score);
        for (const v of Object.values(state)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(20);
        }
      }
    });
  });

  describe('3. Decision Marks Allocator Stress & Edge Cases', () => {
    it('handles tie conditions stably based on original subject index', () => {
      // 5 subjects all needing 2 marks (score 48). Pool is 5.
      // Can only help 2 subjects (needs 2 + 2 = 4 marks, 1 mark left).
      const grades: StudentSubjectGrade[] = [
        { subjectId: 'subj_A', score: 48 },
        { subjectId: 'subj_B', score: 48 },
        { subjectId: 'subj_C', score: 48 },
        { subjectId: 'subj_D', score: 48 },
        { subjectId: 'subj_E', score: 48 }
      ];

      const res = applyDecisionMarks(grades, 5);

      expect(res.usedMarks).toBe(4);
      expect(res.remainingMarks).toBe(1);
      expect(res.statusChanged).toBe(true);
      // Order must strictly follow original array indices
      expect(res.benefitedSubjectIds).toEqual(['subj_A', 'subj_B']);

      expect(res.adjustedGrades).toEqual([
        { subjectId: 'subj_A', score: 50 },
        { subjectId: 'subj_B', score: 50 },
        { subjectId: 'subj_C', score: 48 },
        { subjectId: 'subj_D', score: 48 },
        { subjectId: 'subj_E', score: 48 }
      ]);
    });

    it('handles exhausted mark pool (pool = 0)', () => {
      const grades: StudentSubjectGrade[] = [
        { subjectId: 'math', score: 49 },
        { subjectId: 'science', score: 48 }
      ];

      const res = applyDecisionMarks(grades, 0);

      expect(res.usedMarks).toBe(0);
      expect(res.remainingMarks).toBe(0);
      expect(res.benefitedSubjectIds).toEqual([]);
      expect(res.statusChanged).toBe(false);
      expect(res.adjustedGrades).toEqual(grades);
    });

    it('handles all-failing subjects where none can reach 50 (strict No Waste rule)', () => {
      // 5 subjects scoring 10, 20, 30, 40, 44.
      // Pool is 5. Candidate closest to 50 is 44 (needs 6).
      // Pool is 5 < 6, so ZERO marks should be used!
      const grades: StudentSubjectGrade[] = [
        { subjectId: 's1', score: 10 },
        { subjectId: 's2', score: 20 },
        { subjectId: 's3', score: 30 },
        { subjectId: 's4', score: 40 },
        { subjectId: 's5', score: 44 }
      ];

      const res = applyDecisionMarks(grades, 5);

      expect(res.usedMarks).toBe(0);
      expect(res.remainingMarks).toBe(5);
      expect(res.benefitedSubjectIds).toEqual([]);
      expect(res.statusChanged).toBe(false);
      expect(res.adjustedGrades).toEqual(grades);
    });

    it('handles all-passing subjects (no marks consumed, zero modifications)', () => {
      const grades: StudentSubjectGrade[] = [
        { subjectId: 's1', score: 50 },
        { subjectId: 's2', score: 65 },
        { subjectId: 's3', score: 85 },
        { subjectId: 's4', score: 100 }
      ];

      const res = applyDecisionMarks(grades, 5);

      expect(res.usedMarks).toBe(0);
      expect(res.remainingMarks).toBe(5);
      expect(res.benefitedSubjectIds).toEqual([]);
      expect(res.statusChanged).toBe(false);
      expect(res.adjustedGrades).toEqual(grades);
    });

    it('handles abundant pool (more marks than needed by all failing subjects)', () => {
      const grades: StudentSubjectGrade[] = [
        { subjectId: 's1', score: 45 }, // needs 5
        { subjectId: 's2', score: 48 }, // needs 2
        { subjectId: 's3', score: 40 }  // needs 10
      ];
      // Total needed = 17. Pool = 50.
      const res = applyDecisionMarks(grades, 50);

      expect(res.usedMarks).toBe(17);
      expect(res.remainingMarks).toBe(33);
      expect(res.statusChanged).toBe(true);
      expect(res.benefitedSubjectIds).toEqual(['s2', 's1', 's3']);
      expect(res.adjustedGrades.every(g => g.score >= 50)).toBe(true);
    });

    it('preserves strict input immutability even under stress', () => {
      const original: StudentSubjectGrade[] = [
        { subjectId: 's1', score: 48 },
        { subjectId: 's2', score: 46 }
      ];
      const deepFrozen = JSON.parse(JSON.stringify(original));
      Object.freeze(original);
      original.forEach(o => Object.freeze(o));

      const res = applyDecisionMarks(original, 5);

      expect(original).toEqual(deepFrozen);
      expect(res.adjustedGrades).not.toBe(original);
    });

    it('rejects invalid pool values (negative, NaN, Infinity)', () => {
      const grades: StudentSubjectGrade[] = [{ subjectId: 's1', score: 48 }];

      expect(() => applyDecisionMarks(grades, -1)).toThrow(GradeValidationError);
      expect(() => applyDecisionMarks(grades, NaN)).toThrow(GradeValidationError);
      expect(() => applyDecisionMarks(grades, Infinity)).toThrow(GradeValidationError);
    });
  });

  describe('4. Floating Point & Adversarial Edge Cases in Grade Components', () => {
    it('observes behavior when components are non-integer (behavioral inquiry)', () => {
      // Check if rebalanceComponentsToTotal handles components that have decimals
      // If components have integer values, verify strict determinism
      const integerComponents: GradeComponents = {
        oral: 16,
        written: 16,
        homework: 16,
        behavior: 16,
        participation: 16
      };
      const res = rebalanceComponentsToTotal(integerComponents, 83);
      expect(calculateDetailedTotal(res)).toBe(83);
      expect(Object.values(res).every(v => Number.isInteger(v))).toBe(true);
    });

    it('empirically characterizes non-integer fractional components during rebalancing', () => {
      const fractionalComponents: GradeComponents = {
        oral: 15.5,
        written: 15.5,
        homework: 15,
        behavior: 15,
        participation: 15
      }; // total = 76 (even integer sum!)
      // When sum is integer, rebalance succeeds:
      const res = rebalanceComponentsToTotal(fractionalComponents, 80);
      expect(calculateDetailedTotal(res)).toBe(80);

      // But when sum is non-integer (e.g. 75.5), rebalance to integer target (e.g. 80)
      const oddFractionComponents: GradeComponents = {
        oral: 15.5,
        written: 15,
        homework: 15,
        behavior: 15,
        participation: 15
      }; // total = 75.5
      // This exposes delta = 80 - 75.5 = 4.5, where integer steps lead to finalSum !== target
      expect(() => rebalanceComponentsToTotal(oddFractionComponents, 80)).toThrow(/Sanity failure/);
    });

    it('stresses decision marks with a large cohort of 100 subjects with dense ties', () => {
      // 100 subjects with varied scores around failing threshold
      const subjects: StudentSubjectGrade[] = [];
      for (let i = 0; i < 100; i++) {
        // scores oscillating between 45 and 49
        const score = 45 + (i % 5);
        subjects.push({ subjectId: `subj_${i}`, score });
      }

      // Pool of 50 marks
      const res = applyDecisionMarks(subjects, 50);

      expect(res.statusChanged).toBe(true);
      expect(res.usedMarks).toBeLessThanOrEqual(50);
      expect(res.remainingMarks).toBe(50 - res.usedMarks);

      // Verify all benefited subjects now have score 50
      for (const id of res.benefitedSubjectIds) {
        const found = res.adjustedGrades.find(g => g.subjectId === id);
        expect(found?.score).toBe(50);
      }

      // Verify all non-benefited subjects retain their original score
      for (const subj of subjects) {
        if (!res.benefitedSubjectIds.includes(subj.subjectId)) {
          const found = res.adjustedGrades.find(g => g.subjectId === subj.subjectId);
          expect(found?.score).toBe(subj.score);
        }
      }
    });
  });
});
