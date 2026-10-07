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
    grades: number[];
    allowedStreams: AcademicStream[];
}
export interface GradeDefinition {
    id: string;
    stage: EducationalStage;
    grade: number;
    stream: AcademicStream;
    nameAr: string;
    nameEn: string;
    isMinisterial: boolean;
}
export interface SubjectDefinition {
    id: string;
    nameAr: string;
    nameEn: string;
    stage: EducationalStage;
    grades: number[];
    stream?: AcademicStream;
    isCore: boolean;
    isMinisterialGrade: number[];
    weeklyPeriods: number;
    icon?: string;
    hasOral?: boolean;
}
export interface CurriculumChapter {
    id: string;
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
    subject: string;
    stage: EducationalStage;
    grade: number;
    secondarySubjects?: string[];
    stream?: AcademicStream;
}
export type QuestionType = 'mcq' | 'fill_blank' | 'true_false' | 'essay' | 'matching' | 'problem';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export interface MatchingPair {
    left: string;
    right: string;
}
export interface MinisterialExamMetadata {
    year: number;
    round: 1 | 2 | 3;
    session?: string;
}
export interface QuestionBankItem {
    id: string;
    subject: string;
    subjectId?: string;
    grade: number;
    stage: EducationalStage;
    stream?: AcademicStream;
    chapter: number;
    chapterId?: string;
    topic: string;
    type: QuestionType;
    difficulty: QuestionDifficulty;
    text: string;
    options?: string[];
    matchingPairs?: MatchingPair[];
    modelAnswer: string;
    defaultMarks?: number;
    isMinisterial: boolean;
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
export declare const MINISTERIAL_FIVE_STEPS: readonly ["الأهداف السلوكية (Behavioral Objectives)", "التمهيد والتهيئة (Warm-up)", "العرض والأنشطة (Presentation)", "التقويم التكويني (Formative Assessment)", "الواجب البيتي والغلق (Closure)"];
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
    division?: string;
    topic: string;
    durationMinutes: number;
    date?: string;
    objectives: string[];
    cognitiveObjectives?: string[];
    affectiveObjectives?: string[];
    psychomotorObjectives?: string[];
    warmup: string;
    presentation: string;
    teachingAids?: string[];
    teachingStrategies?: string[];
    assessment: string;
    closure: string;
    supervisoryDoc?: SupervisoryDoc;
}
export interface AnnualPlanWeek {
    week: number;
    weekNumber?: number;
    semester: 1 | 2;
    monthNameAr?: string;
    unit: string;
    chapterTitle?: string;
    topics: string[];
    periodsPerWeek: number;
}
//# sourceMappingURL=index.d.ts.map