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

const GREEK_WORDS_MAP: Array<[RegExp, string]> = [
  [/(?:^|\s)الفا(?=\s|$)|(?:^|\s)ألفا(?=\s|$)|\balpha\b/gi, ' \\alpha '],
  [/(?:^|\s)بيتا(?=\s|$)|\bbeta\b/gi, ' \\beta '],
  [/(?:^|\s)غاما(?=\s|$)|(?:^|\s)جاما(?=\s|$)|\bgamma\b/gi, ' \\gamma '],
  [/(?:^|\s)دلتا(?=\s|$)|\bdelta\b/gi, ' \\Delta '],
  [/(?:^|\s)ثيتا(?=\s|$)|(?:^|\s)تيتا(?=\s|$)|\btheta\b/gi, ' \\theta '],
  [/(?:^|\s)لندا(?=\s|$)|(?:^|\s)لمدا(?=\s|$)|\blambda\b/gi, ' \\lambda '],
  [/(?:^|\s)باي(?=\s|$)|(?:^|\s)ط(?=\s|$)|\bpi\b/gi, ' \\pi '],
  [/(?:^|\s)سيغما(?=\s|$)|(?:^|\s)سيجما(?=\s|$)|\bsigma\b/gi, ' \\sigma '],
  [/(?:^|\s)اوميغا(?=\s|$)|(?:^|\s)أوميغا(?=\s|$)|\bomega\b/gi, ' \\omega '],
];

const ARABIC_TO_LATIN_VARS: Record<string, string> = {
  س: 'x',
  ص: 'y',
  ع: 'z',
  ن: 'n',
  ت: 't',
  ك: 'k',
  م: 'm',
  ر: 'r',
};

/**
 * Deterministic natural math/chemistry text to LaTeX converter (Section 8.5).
 */
export function convertNaturalMathToLatex(
  rawInput: string,
  options: MathConversionOptions = {}
): MathConversionResult {
  if (!rawInput || !rawInput.trim()) {
    return { success: false, latex: '', isChemistry: false, requiresAiFallback: false };
  }

  let expr = rawInput.trim();

  // Normalize Eastern digits to Western digits
  expr = expr.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  // Detect explicit mhchem or chemical reaction arrows with elements
  if (expr.startsWith('\\ce{') || (/[A-Z][a-z]?\d*/.test(expr) && /(->|→|⇌|<=>)/.test(expr))) {
    const cleanChem = expr.startsWith('\\ce{')
      ? expr
      : `\\ce{${expr.replace(/→/g, '->').replace(/⇌/g, '<=>')}}`;
    return {
      success: true,
      latex: cleanChem,
      isChemistry: true,
      requiresAiFallback: false,
    };
  }

  // Replace Arabic math phrases with symbolic equivalents
  expr = expr
    // Powers: تربيع / تكعيب / اس
    .replace(/(\S+)\s+تربيع/g, '$1^{2}')
    .replace(/(\S+)\s+تكعيب/g, '$1^{3}')
    .replace(/(\S+)\s+(?:أس|اس)\s+(\S+)/g, '$1^{$2}')
    // Square and cubic roots: جذر تكعيبي(...) / جذر(...)
    .replace(/جذر\s+تكعيبي\s*\(([^)]+)\)/g, '\\sqrt[3]{$1}')
    .replace(/جذر\s*\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/جذر\s+(\S+)/g, '\\sqrt{$1}')
    .replace(/\bsqrt\s*\(([^)]+)\)/gi, '\\sqrt{$1}')
    // Calculus: تكامل / مشتقة / نهاية
    .replace(/تكامل\s+من\s+(\S+)\s+(?:إلى|الى)\s+(\S+)/g, '\\int_{$1}^{$2}')
    .replace(/(?:^|\s)تكامل(?=\s|$)/g, ' \\int ')
    .replace(/مشتق[ةه]\s+(\S+)\s+بالنسب[ةه]\s+(?:إلى|الى|لـ|ل)\s+(\S+)/g, '\\frac{d$1}{d$2}')
    .replace(/نهاي[ةه]\s+(\S+)\s*(?:->|←|تؤول\s+إلى|يقترب\s+من)\s*(\S+)/g, '\\lim_{$1 \\to $2}')
    // Vectors: متجه(أ)
    .replace(/متجه\s*\(([^)]+)\)/g, '\\vec{$1}')
    // Comparisons & operators
    .replace(/لا\s+يساوي|!=/g, '\\neq ')
    .replace(/اكبر\s+او\s+يساوي|أكبر\s+أو\s+يساوي|>=/g, '\\geq ')
    .replace(/اصغر\s+او\s+يساوي|أصغر\s+أو\s+يساوي|<=/g, '\\leq ')
    .replace(/موجب\s+او\s+سالب|±|\+-/g, '\\pm ')
    .replace(/ما\s*لا\s*نهاي[ةه]|انفنتي|\binfinity\b/gi, '\\infty ');

  // Greek letters
  for (const [pattern, replacement] of GREEK_WORDS_MAP) {
    expr = expr.replace(pattern, replacement);
  }

  // Convert Arabic single-letter variables to Latin unless preserveArabicVariables is true
  if (!options.preserveArabicVariables) {
    expr = expr.replace(/(^|[\s+\-*/=^({\[d])([سصعنتكمر])(?=[\s+\-*/=^)}\]\d}]|$)/g, (_, pre, v) => {
      return `${pre}${ARABIC_TO_LATIN_VARS[v] ?? v}`;
    });
  }

  // Convert simple exponents x^2 or x^(n+1)
  expr = expr
    .replace(/\^\(([^)]+)\)/g, '^{$1}')
    .replace(/\^([a-zA-Z0-9\u0621-\u064A]+)/g, '^{$1}');

  // Convert parenthesized fractions (a+b)/(c+d) and simple fractions a/b
  expr = expr
    .replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, '\\frac{$1}{$2}')
    .replace(/\(([^()]+)\)\s*\/\s*([a-zA-Z0-9\u0621-\u064A^{}\\]+)/g, '\\frac{$1}{$2}')
    .replace(/([a-zA-Z0-9\u0621-\u064A^{}\\]+)\s*\/\s*\(([^()]+)\)/g, '\\frac{$1}{$2}')
    .replace(/([a-zA-Z0-9\u0621-\u064A^{}]+)\s*\/\s*([a-zA-Z0-9\u0621-\u064A^{}]+)/g, '\\frac{$1}{$2}');

  expr = expr.replace(/\s+/g, ' ').trim();

  // Check if arbitrary unconverted multi-word Arabic prose remains when not preserving Arabic variables
  const hasRemainingArabicProse =
    !options.preserveArabicVariables && /[\u0621-\u064A]{3,}/.test(expr);

  return {
    success: !hasRemainingArabicProse,
    latex: expr,
    isChemistry: false,
    requiresAiFallback: hasRemainingArabicProse,
  };
}

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
export const EQUATION_LIBRARY: ReadyEquationItem[] = [
  {
    id: 'phys-ohm',
    subject: 'physics',
    titleAr: 'قانون أوم',
    latex: 'V = I \\cdot R',
    variablesAr: 'V: فرق الجهد (فولت)، I: التيار (أمبير)، R: المقاومة (أوم)',
  },
  {
    id: 'phys-coulomb',
    subject: 'physics',
    titleAr: 'قانون كولوم',
    latex: 'F = k \\frac{q_1 q_2}{r^2}',
    variablesAr: 'F: القوة الكهربائية، q: الشحنة، r: البعد بين الشحنتين',
  },
  {
    id: 'phys-kinetic',
    subject: 'physics',
    titleAr: 'الطاقة الحركية',
    latex: 'KE = \\frac{1}{2} m v^2',
    variablesAr: 'm: الكتلة، v: السرعة',
  },
  {
    id: 'chem-water',
    subject: 'chemistry',
    titleAr: 'تكوين الماء',
    latex: '\\ce{2H2(g) + O2(g) -> 2H2O(l)}',
    variablesAr: 'تفاعل غاز الهيدروجين مع الأوكسجين',
  },
  {
    id: 'chem-ph',
    subject: 'chemistry',
    titleAr: 'الدالة الحامضية pH',
    latex: '\\text{pH} = -\\log[\\text{H}^+]',
    variablesAr: '[H+]: تركيز أيون الهيدروجين المولاري',
  },
  {
    id: 'math-quadratic',
    subject: 'mathematics',
    titleAr: 'القانون العام لحل المعادلة التربيعية (الدستور)',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    variablesAr: 'a, b, c: معاملات المعادلة التربيعية',
  },
  {
    id: 'math-pythagoras',
    subject: 'mathematics',
    titleAr: 'مبرهنة فيثاغورس',
    latex: 'a^2 + b^2 = c^2',
    variablesAr: 'c: الوتر، a, b: الضلعان القائمان',
  },
];
