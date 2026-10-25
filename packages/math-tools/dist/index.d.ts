/**
 * @techeeer/math-tools
 * Deterministic natural Arabic/English math & chemistry converter to LaTeX (Section 8.5 & 10.6).
 * Works 100% offline with zero AI cost.
 */
export interface MathConversionOptions {
    /** Keep Arabic variables (س ص ع) instead of converting to (x y z) */
    preserveArabicVariables?: boolean;
}
export interface MathConversionResult {
    success: boolean;
    latex: string;
    isChemistry: boolean;
    requiresAiFallback: boolean;
}
/**
 * Deterministic natural math/chemistry text to LaTeX converter (Section 8.5).
 */
export declare function convertNaturalMathToLatex(rawInput: string, options?: MathConversionOptions): MathConversionResult;
export interface ReadyEquationItem {
    id: string;
    subject: 'physics' | 'chemistry' | 'mathematics';
    titleAr: string;
    latex: string;
    variablesAr: string;
}
/**
 * Section 10.6: Ready-made Equation Library for Physics, Chemistry, and Mathematics.
 */
export declare const EQUATION_LIBRARY: ReadyEquationItem[];
//# sourceMappingURL=index.d.ts.map