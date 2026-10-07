import type { GradeComponents, ComponentKey } from './types.js';
export { type GradeComponents, type ComponentKey };
/**
 * ترتيب الأولوية التربوية والامتحانية المعتمد في العراق
 */
export declare const COMPONENT_PRIORITY: readonly ComponentKey[];
/**
 * حساب مجموع المكونات التفصيلية مع التحقق الصارم من الحدود
 */
export declare function calculateDetailedTotal(components: GradeComponents): number;
/**
 * تجزئة درجة مبسطة إلى 5 مكونات تفصيلية عادلة تماماً
 * يضمن: المجموع = score، وكل مكون صحيح بين [0, 20]
 */
export declare function decomposeSimplifiedScore(score: number): GradeComponents;
/**
 * إعادة موازنة المكونات التفصيلية لمطابقة المجموع الجديد بدون فقدان أو انحراف
 */
export declare function rebalanceComponentsToTotal(current: GradeComponents, newTotal: number): GradeComponents;
//# sourceMappingURL=conversion.d.ts.map