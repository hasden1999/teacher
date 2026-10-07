import { GradeValidationError, validateGradeRange } from './errors.js';
import {
  calculateDetailedTotal,
  decomposeSimplifiedScore,
  rebalanceComponentsToTotal,
  COMPONENT_PRIORITY
} from './conversion.js';
import { applyDecisionMarks } from './decision.js';
import type {
  GradeComponents,
  ComponentKey,
  StudentSubjectGrade,
  DecisionMarksResult
} from './types.js';

export {
  calculateDetailedTotal,
  decomposeSimplifiedScore,
  rebalanceComponentsToTotal,
  applyDecisionMarks,
  COMPONENT_PRIORITY,
  type GradeComponents,
  type ComponentKey,
  type StudentSubjectGrade,
  type DecisionMarksResult
};

/**
 * تقريب نصف-للأعلى القياسي لوزارة التربية العراقية (Half-Up Rounding)
 * أي كسر >= 0.5 يجبر إلى العدد الصحيح الأعلى (+1) لصالح الطالب.
 */
export function roundHalfUp(val: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    throw new GradeValidationError(`Invalid numeric value for rounding: ${val}`);
  }
  if (val < 0) {
    throw new GradeValidationError(`Negative value cannot be rounded: ${val}`);
  }
  return Math.floor(val + 0.5 + Number.EPSILON);
}

/**
 * حساب معدل الفصل الدراسي (الفصل الأول أو الثاني) من درجتي الشهرين
 * T = round((m1 + m2) / 2)
 */
export function calculateSemesterGrade(m1: number, m2: number): number {
  validateGradeRange(m1, 'Month 1 score');
  validateGradeRange(m2, 'Month 2 score');
  return roundHalfUp((m1 + m2) / 2);
}

/**
 * حساب السعي السنوي من معدل الفصل الأول ونصف السنة ومعدل الفصل الثاني
 * S = round((term1 + midterm + term2) / 3)
 */
export function calculateAnnualEffort(term1: number, midterm: number, term2: number): number {
  validateGradeRange(term1, 'Term 1 average');
  validateGradeRange(midterm, 'Midterm exam score');
  validateGradeRange(term2, 'Term 2 average');
  return roundHalfUp((term1 + midterm + term2) / 3);
}

/**
 * حساب النتيجة النهائية للصفوف غير المنتهية (الدور الأول)
 * F = round((annualEffort + finalExam) / 2)
 */
export function calculateFinalResult(annualEffort: number, finalExam: number): number {
  validateGradeRange(annualEffort, 'Annual effort');
  validateGradeRange(finalExam, 'Final exam score');
  return roundHalfUp((annualEffort + finalExam) / 2);
}

/**
 * حساب النتيجة النهائية للدور الثاني
 * F_r2 = round((annualEffort + round2Exam) / 2)
 */
export function calculateRound2Result(annualEffort: number, round2Exam: number): number {
  validateGradeRange(annualEffort, 'Annual effort');
  validateGradeRange(round2Exam, 'Round 2 exam score');
  return roundHalfUp((annualEffort + round2Exam) / 2);
}

/**
 * تحديد ما إذا كانت الدرجة ناجحة وفق العتبة الوزارية (50)
 */
export function isPassingGrade(score: number): boolean {
  validateGradeRange(score, 'Score');
  return score >= 50;
}
