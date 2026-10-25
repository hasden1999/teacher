import { describe, it, expect } from 'vitest';
import { convertNaturalMathToLatex, EQUATION_LIBRARY } from '../src/index.js';

describe('@techeeer/math-tools', () => {
  it('converts natural Arabic and English algebraic phrases to LaTeX deterministically', () => {
    expect(convertNaturalMathToLatex('س تربيع + ص تربيع = 25').latex).toBe('x^{2} + y^{2} = 25');
    expect(convertNaturalMathToLatex('جذر(x^2 + 1)').latex).toBe('\\sqrt{x^{2} + 1}');
    expect(convertNaturalMathToLatex('(x + 1)/(x - 1)').latex).toBe('\\frac{x + 1}{x - 1}');
    expect(convertNaturalMathToLatex('تكامل من 0 إلى 1').latex).toBe('\\int_{0}^{1}');
    expect(convertNaturalMathToLatex('مشتقة ص بالنسبة إلى س').latex).toBe('\\frac{dy}{dx}');
  });

  it('supports preserving Arabic variables (س ص ع) when requested', () => {
    const res = convertNaturalMathToLatex('س تربيع + ص = ١٠', { preserveArabicVariables: true });
    expect(res.success).toBe(true);
    expect(res.latex).toBe('س^{2} + ص = 10');
  });

  it('detects chemical equations and wraps them in \\ce{...}', () => {
    const res = convertNaturalMathToLatex('2H2 + O2 -> 2H2O');
    expect(res.isChemistry).toBe(true);
    expect(res.latex).toBe('\\ce{2H2 + O2 -> 2H2O}');
  });

  it('provides pre-built equations for Physics, Chemistry, and Mathematics', () => {
    expect(EQUATION_LIBRARY.length).toBeGreaterThanOrEqual(7);
    expect(EQUATION_LIBRARY.some((e) => e.subject === 'physics')).toBe(true);
    expect(EQUATION_LIBRARY.some((e) => e.subject === 'chemistry')).toBe(true);
    expect(EQUATION_LIBRARY.some((e) => e.subject === 'mathematics')).toBe(true);
  });
});
