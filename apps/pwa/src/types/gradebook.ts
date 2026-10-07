/**
 * Gradebook & WhatsApp Evaluation Types
 * Interface contracts for SQLite persistence, evaluation cards, and table matrix.
 */
import type { GradeComponents } from '@techeeer/core';

export interface ClassEntity {
  id: string;
  name: string;
  stage: 'primary' | 'intermediate' | 'preparatory';
  grade_level: number;
  academic_year: string;
  created_at: number;
}

export interface DivisionEntity {
  id: string;
  class_id: string;
  name: string;
  created_at: number;
}

export interface StudentEntity {
  id: string;
  division_id: string;
  full_name: string;
  gender: 'male' | 'female';
  roll_number: number;
  is_active: number;
  guardian_phone?: string | null;
  notes?: string | null;
  created_at: number;
}

export interface SubjectEntity {
  id: string;
  name: string;
  stage: string;
  grade_level: number;
  has_oral: number;
  created_at: number;
}

export interface AcademicTermEntity {
  id: string;
  name: string;
  academic_year: string;
  is_locked: number;
  created_at: number;
}

export type GradeCategory =
  | 'month_1'
  | 'month_2'
  | 'mid_term'
  | 'annual_effort'
  | 'final_exam'
  | 'round_2';

export type GradeMode = 'detailed' | 'simplified';

export interface GradeEntity {
  id: string;
  student_id: string;
  subject_id: string;
  term_id: string;
  category: GradeCategory;
  mode: GradeMode;
  score: number | null;
  component_oral: number;
  component_written: number;
  component_homework: number;
  component_behavior: number;
  component_participation: number;
  is_absent: number;
  absence_excused: number;
  decision_points_applied: number;
  notes?: string | null;
  updated_at: number;
}

export type EvaluationCardType =
  | 'monthly'
  | 'midterm'
  | 'annual_effort'
  | 'final_result'
  | 'attendance';

export interface StudentEvaluationCardData {
  schoolName: string;
  teacherName: string;
  studentName: string;
  className: string;
  divisionName: string;
  subjectName: string;
  academicYear: string;
  termName?: string;
  cardType: EvaluationCardType;

  score?: number | null;
  components?: GradeComponents & { total: number };

  term1Average?: number;
  midtermScore?: number;
  term2Average?: number;
  annualEffort?: number;
  finalExamScore?: number;
  finalResult?: number;

  decisionMarks?: {
    applied: boolean;
    originalScore: number;
    adjustedScore: number;
    usedMarks: number;
    pool: number;
  };

  absencesCount?: number;
  absencePenaltyMarks?: number;

  statusLabel?: string;
  teacherNotes?: string;
  encouragingClosing?: string;
  guardianPhone?: string | null;
}
