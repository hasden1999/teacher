import type { StudentSubjectGrade, DecisionMarksResult } from './types.js';
export { type StudentSubjectGrade, type DecisionMarksResult };
/**
 * تطبيق درجات القرار الوزاري على المواد الدراسية بالطريقة الجشعة المثلى
 * يمنح الأولوية للمواد الأقرب للنجاح ويمنع هدر أي درجات لا تحقق النجاح (قاعدة منع الهدر).
 *
 * @param grades مصفوفة الدرجات الأصلية للمواد
 * @param decisionPool رصيد درجات القرار المتاح (الافتراضي 5)
 */
export declare function applyDecisionMarks(grades: readonly StudentSubjectGrade[], decisionPool?: number): DecisionMarksResult;
//# sourceMappingURL=decision.d.ts.map