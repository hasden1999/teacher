/**
 * @techeeer/content - Type Definitions
 * Canonical types for Iraqi curriculum, subjects, chapters, questions, and lesson plans.
 */

export type EducationalStage = 'primary' | 'intermediate' | 'preparatory';
export type AcademicStream = 'general' | 'scientific' | 'literary';

export interface StageDefinition {
  id: EducationalStage;
  nameAr: string;
  nameEn: string;
  grades: number[]; // [1..6] for primary, [1..3] for intermediate, [4..6] for preparatory
  allowedStreams: AcademicStream[];
}

export interface GradeDefinition {
  id: string; // e.g. 'primary_1', 'intermediate_3', 'preparatory_6_scientific'
  stage: EducationalStage;
  grade: number;
  stream: AcademicStream;
  nameAr: string;
  nameEn: string;
  isMinisterial: boolean;
}

export interface SubjectDefinition {
  id: string; // e.g. 'chemistry', 'physics', 'math', 'arabic', 'islamic', 'science', 'social', 'english', 'biology', 'history', 'geography', 'economics', 'philosophy', 'computer'
  nameAr: string;
  nameEn: string;
  stage: EducationalStage;
  grades: number[];
  stream?: AcademicStream;
  isCore: boolean;
  isMinisterialGrade: number[]; // Grades with national ministerial exams (e.g. 6 for primary, 3 for intermediate, 6 for preparatory)
  weeklyPeriods: number; // Recommended class periods per week
  icon?: string;
  hasOral?: boolean;
}

export interface CurriculumChapter {
  id: string; // e.g. 'ch_chem_5_c1'
  subjectId: string;
  subjectNameAr: string;
  grade: number;
  stage: EducationalStage;
  stream?: AcademicStream;
  unitNumber: number;
  unitTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  topics: string[];
  learningOutcomes: string[];
  estimatedPeriods: number;
  semester: 1 | 2;
}

export interface TeacherProfile {
  subject: string; // Canonical subject ID (or name)
  stage: EducationalStage;
  grade: number;
  secondarySubjects?: string[]; // Dual-assignment subjects (common in primary)
  stream?: AcademicStream;
}

export type QuestionType =
  | 'mcq'
  | 'fill_blank'
  | 'true_false'
  | 'essay'
  | 'matching'
  | 'problem';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface MatchingPair {
  left: string;
  right: string;
}

export interface MinisterialExamMetadata {
  year: number; // e.g. 2023
  round: 1 | 2 | 3; // First round, Second round, Third round
  session?: string; // Within Iraq, Diaspora, Preparatory external
}

export interface QuestionBankItem {
  id: string;
  subject: string; // e.g. 'chemistry', 'physics', 'math'
  subjectId?: string;
  grade: number;
  stage: EducationalStage;
  stream?: AcademicStream;
  chapter: number;
  chapterId?: string;
  topic: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  text: string; // Question text with LaTeX formulas if applicable
  options?: string[]; // Multiple choice options
  matchingPairs?: MatchingPair[]; // Matching pairs
  modelAnswer: string; // Official MoE model answer
  defaultMarks?: number;
  isMinisterial: boolean; // Ministerial baccalaureate question
  ministerialMeta?: MinisterialExamMetadata;
  containsLatex?: boolean;
  tags: string[];
}

export interface QuestionBankFilterOptions {
  subject?: string;
  grade?: number;
  stage?: EducationalStage;
  stream?: AcademicStream;
  chapter?: number;
  difficulty?: QuestionDifficulty;
  type?: QuestionType;
  isMinisterial?: boolean;
  searchTerm?: string;
  tags?: string[];
}

export const MINISTERIAL_FIVE_STEPS = [
  'الأهداف السلوكية (Behavioral Objectives)',
  'التمهيد والتهيئة (Warm-up)',
  'العرض والأنشطة (Presentation)',
  'التقويم التكويني (Formative Assessment)',
  'الواجب البيتي والغلق (Closure)',
] as const;

export type MinisterialStepTitle = (typeof MINISTERIAL_FIVE_STEPS)[number];

export interface SupervisoryDoc {
  schoolName: string;
  teacherName: string;
  supervisorNotes?: string;
  supervisorSignatureSpace: boolean;
}

export interface DailyLessonPlan {
  id: string;
  lessonId?: string;
  subjectId: string;
  grade: number;
  stage: EducationalStage;
  stream?: AcademicStream;
  division?: string; // "أ", "ب", "ج"
  topic: string;
  durationMinutes: number; // Standard: 35-50 minutes
  date?: string; // YYYY-MM-DD
  
  // Step 1: Behavioral objectives
  objectives: string[];
  cognitiveObjectives?: string[];
  affectiveObjectives?: string[];
  psychomotorObjectives?: string[];
  
  // Step 2: Warm-up (5 mins)
  warmup: string;
  
  // Step 3: Presentation and activities (25 mins)
  presentation: string;
  teachingAids?: string[];
  teachingStrategies?: string[];
  
  // Step 4: Formative assessment (10 mins)
  assessment: string;
  
  // Step 5: Homework and closure (5 mins)
  closure: string;
  
  supervisoryDoc?: SupervisoryDoc;
}

export interface AnnualPlanWeek {
  week: number; // 1..32
  weekNumber?: number;
  semester: 1 | 2;
  monthNameAr?: string;
  unit: string;
  chapterTitle?: string;
  topics: string[];
  periodsPerWeek: number;
}
