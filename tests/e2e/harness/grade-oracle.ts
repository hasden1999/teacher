/**
 * Authoritative Iraqi Ministerial Grade Calculation & Daily Activity Oracle
 * Powered directly by production @techeeer/core package.
 */

import {
  calculateSemesterGrade,
  calculateAnnualEffort,
  calculateFinalResult,
  calculateRound2Result,
  calculateDetailedTotal,
  decomposeSimplifiedScore as coreDecomposeSimplifiedScore,
  rebalanceComponentsToTotal,
  applyDecisionMarks,
  roundHalfUp,
  GradeValidationError,
  type GradeComponents,
  type StudentSubjectGrade,
  type DecisionMarksResult,
} from '@techeeer/core';

export function decomposeSimplifiedScore(score: number): GradeComponents {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return coreDecomposeSimplifiedScore(clamped);
}

export {
  calculateSemesterGrade,
  calculateAnnualEffort,
  calculateFinalResult,
  calculateRound2Result,
  calculateDetailedTotal,
  rebalanceComponentsToTotal,
  applyDecisionMarks,
  roundHalfUp,
  roundHalfUp as halfUpRound,
  GradeValidationError,
  type GradeComponents,
  type StudentSubjectGrade,
  type StudentSubjectGrade as SubjectGrade,
  type DecisionMarksResult,
};
