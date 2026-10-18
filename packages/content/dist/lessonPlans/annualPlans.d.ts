/**
 * @techeeer/content - Annual Lesson Plans & Verification Helpers
 * Supports 32-week distribution aligned with Iraqi MoE academic calendar.
 */
import type { AnnualPlanWeek, DailyLessonPlan, TeacherProfile } from '../types/index.js';
export declare const IRAQI_ACADEMIC_MONTHS: Record<number, string>;
/**
 * Validates lesson plan class duration within standard Iraqi period limits (35 to 50 minutes).
 */
export declare function validateLessonPlanDuration(durationMinutes: number): boolean;
/**
 * Checks whether the given week index falls within the valid 32 teaching weeks (1 to 32).
 */
export declare function isValidAnnualWeek(week: number): boolean;
/**
 * Generates an annual lesson plan distribution across 32 teaching weeks (8 academic months)
 * strictly grounded in the teacher's Iraqi curriculum chapters and topics.
 */
export declare function createAnnualPlan(subjectId: string, grade: number, options?: {
    semesterSplit?: number;
    periodsPerWeek?: number;
}): AnnualPlanWeek[];
/**
 * Clones an existing lesson plan with unique ID, optional target division,
 * and automatic numbering append (e.g. "خطة درس: الذرة (2)") if cloned.
 */
export declare function cloneLessonPlan(original: DailyLessonPlan, targetDivision?: string): DailyLessonPlan;
/**
 * Calculates lesson plan syllabus progress percentage.
 */
export declare function calculateLessonProgress(lessons: Array<{
    status: 'completed' | 'scheduled' | 'postponed' | 'holiday';
}>): {
    completedCount: number;
    totalCount: number;
    percentage: number;
};
/**
 * Filters curriculum items strictly matching the teacher's registered subject specialization and grade.
 * Safely handles subject aliases (e.g. 'mathematics' <-> 'math', 'islamic_education' <-> 'islamic').
 */
export declare function filterCurriculumForTeacher<T extends {
    subjectId?: string;
    subject?: string;
    grade?: number;
}>(teacher: TeacherProfile, items: T[]): T[];
//# sourceMappingURL=annualPlans.d.ts.map