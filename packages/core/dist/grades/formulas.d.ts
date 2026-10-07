import { calculateDetailedTotal, decomposeSimplifiedScore, rebalanceComponentsToTotal, COMPONENT_PRIORITY } from './conversion.js';
import { applyDecisionMarks } from './decision.js';
import type { GradeComponents, ComponentKey, StudentSubjectGrade, DecisionMarksResult } from './types.js';
export { calculateDetailedTotal, decomposeSimplifiedScore, rebalanceComponentsToTotal, applyDecisionMarks, COMPONENT_PRIORITY, type GradeComponents, type ComponentKey, type StudentSubjectGrade, type DecisionMarksResult };
/**
 * تقريب نصف-للأعلى القياسي لوزارة التربية العراقية (Half-Up Rounding)
 * أي كسر >= 0.5 يجبر إلى العدد الصحيح الأعلى (+1) لصالح الطالب.
 */
export declare function roundHalfUp(val: number): number;
/**
 * حساب معدل الفصل الدراسي (الفصل الأول أو الثاني) من درجتي الشهرين
 * T = round((m1 + m2) / 2)
 */
export declare function calculateSemesterGrade(m1: number, m2: number): number;
/**
 * حساب السعي السنوي من معدل الفصل الأول ونصف السنة ومعدل الفصل الثاني
 * S = round((term1 + midterm + term2) / 3)
 */
export declare function calculateAnnualEffort(term1: number, midterm: number, term2: number): number;
/**
 * حساب النتيجة النهائية للصفوف غير المنتهية (الدور الأول)
 * F = round((annualEffort + finalExam) / 2)
 */
export declare function calculateFinalResult(annualEffort: number, finalExam: number): number;
/**
 * حساب النتيجة النهائية للدور الثاني
 * F_r2 = round((annualEffort + round2Exam) / 2)
 */
export declare function calculateRound2Result(annualEffort: number, round2Exam: number): number;
/**
 * تحديد ما إذا كانت الدرجة ناجحة وفق العتبة الوزارية (50)
 */
export declare function isPassingGrade(score: number): boolean;
//# sourceMappingURL=formulas.d.ts.map