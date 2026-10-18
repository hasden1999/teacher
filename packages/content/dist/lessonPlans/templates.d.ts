/**
 * @techeeer/content - Official MoE 5-Step Lesson Plan Templates
 * Architecture strictly enforces the Iraqi Ministry of Education 5 canonical steps:
 * 1. الأهداف السلوكية (Behavioral Objectives)
 * 2. التمهيد والتهيئة (Warm-up)
 * 3. العرض والأنشطة (Presentation)
 * 4. التقويم التكويني (Formative Assessment)
 * 5. الواجب البيتي والغلق (Closure)
 */
import { MINISTERIAL_FIVE_STEPS, type DailyLessonPlan } from '../types/index.js';
export { MINISTERIAL_FIVE_STEPS };
export declare const LESSON_TEMPLATES: DailyLessonPlan[];
export declare function getAllLessonTemplates(): DailyLessonPlan[];
export declare function getLessonTemplateById(id: string): DailyLessonPlan | undefined;
/**
 * Generates a structured 5-step Iraqi MoE daily lesson plan grounded in the teacher's selected
 * subject, grade, chapter, and topic.
 */
export declare function generateSmartDailyPlan(params: {
    subjectId: string;
    subjectNameAr: string;
    grade: number;
    stage: 'primary' | 'intermediate' | 'preparatory';
    division?: string;
    date?: string;
    chapterTitle: string;
    topic: string;
    learningOutcomes?: string[];
    schoolName?: string;
    teacherName?: string;
}): DailyLessonPlan;
//# sourceMappingURL=templates.d.ts.map