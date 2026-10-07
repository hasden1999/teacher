import { describe, it, expect } from 'vitest';
import { applyDecisionMarks } from '../../src/grades/decision.js';
import { GradeValidationError } from '../../src/grades/errors.js';
import type { StudentSubjectGrade } from '../../src/grades/types.js';

describe('decision.ts - Optimal Greedy Decision Marks Allocator', () => {
  it('should allocate marks greedily to the subjects closest to 50 first', () => {
    const grades: StudentSubjectGrade[] = [
      { subjectId: 'math', score: 48 },      // needs 2
      { subjectId: 'arabic', score: 47 },    // needs 3
      { subjectId: 'english', score: 45 }    // needs 5
    ];

    const result = applyDecisionMarks(grades, 5);

    expect(result.usedMarks).toBe(5);
    expect(result.remainingMarks).toBe(0);
    expect(result.statusChanged).toBe(true);
    expect(result.benefitedSubjectIds).toEqual(['math', 'arabic']);

    expect(result.adjustedGrades).toEqual([
      { subjectId: 'math', score: 50 },
      { subjectId: 'arabic', score: 50 },
      { subjectId: 'english', score: 45 }
    ]);
  });

  it('should enforce the No Waste Rule strictly (never add marks if insufficient to reach 50)', () => {
    const grades: StudentSubjectGrade[] = [
      { subjectId: 'physics', score: 48 },   // needs 2
      { subjectId: 'chemistry', score: 46 }  // needs 4
    ];

    // Pool 5: physics takes 2 (reaches 50). Remaining is 3. Chemistry needs 4 > 3, so chemistry gets 0!
    const result = applyDecisionMarks(grades, 5);

    expect(result.usedMarks).toBe(2);
    expect(result.remainingMarks).toBe(3);
    expect(result.benefitedSubjectIds).toEqual(['physics']);
    expect(result.adjustedGrades).toEqual([
      { subjectId: 'physics', score: 50 },
      { subjectId: 'chemistry', score: 46 } // remains unchanged!
    ]);
  });

  it('should never touch subjects that are already passing (>= 50)', () => {
    const grades: StudentSubjectGrade[] = [
      { subjectId: 'biology', score: 50 },
      { subjectId: 'history', score: 75 },
      { subjectId: 'geography', score: 90 }
    ];

    const result = applyDecisionMarks(grades, 5);

    expect(result.usedMarks).toBe(0);
    expect(result.remainingMarks).toBe(5);
    expect(result.benefitedSubjectIds).toEqual([]);
    expect(result.statusChanged).toBe(false);
    expect(result.adjustedGrades).toEqual(grades);
  });

  it('should resolve ties stably using original input array order', () => {
    const grades: StudentSubjectGrade[] = [
      { subjectId: 'sub1', score: 48 }, // needs 2
      { subjectId: 'sub2', score: 48 }  // needs 2
    ];

    const result = applyDecisionMarks(grades, 2);

    expect(result.usedMarks).toBe(2);
    expect(result.remainingMarks).toBe(0);
    expect(result.benefitedSubjectIds).toEqual(['sub1']);
    expect(result.adjustedGrades).toEqual([
      { subjectId: 'sub1', score: 50 },
      { subjectId: 'sub2', score: 48 }
    ]);
  });

  it('should handle zero decision pool without altering any grade', () => {
    const grades: StudentSubjectGrade[] = [
      { subjectId: 'math', score: 49 }
    ];

    const result = applyDecisionMarks(grades, 0);

    expect(result.usedMarks).toBe(0);
    expect(result.remainingMarks).toBe(0);
    expect(result.statusChanged).toBe(false);
    expect(result.adjustedGrades).toEqual(grades);
  });

  it('should handle empty grades array gracefully', () => {
    const result = applyDecisionMarks([], 5);
    expect(result.adjustedGrades).toEqual([]);
    expect(result.usedMarks).toBe(0);
    expect(result.remainingMarks).toBe(5);
    expect(result.statusChanged).toBe(false);
  });

  it('should ensure input array and objects are strictly immutable', () => {
    const grades: StudentSubjectGrade[] = [
      { subjectId: 'math', score: 48 }
    ];
    const deepClone = JSON.parse(JSON.stringify(grades));

    applyDecisionMarks(grades, 5);

    expect(grades).toEqual(deepClone);
  });

  it('should reject invalid pool or grade numbers', () => {
    expect(() => applyDecisionMarks([], -1)).toThrow(GradeValidationError);
    expect(() => applyDecisionMarks([], NaN)).toThrow(GradeValidationError);
    expect(() => applyDecisionMarks([{ subjectId: 's', score: -1 }], 5)).toThrow(GradeValidationError);
    expect(() => applyDecisionMarks([{ subjectId: 's', score: 105 }], 5)).toThrow(GradeValidationError);
  });
});
