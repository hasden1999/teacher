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
//# sourceMappingURL=templates.d.ts.map