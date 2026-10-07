// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderKatexToString,
  renderChemistryToString,
  extractFormulas,
} from '../src/lib/math/katexRenderer.js';
import { MathRenderer } from '../src/components/questions/MathRenderer.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Adversarial Stress Suite: Milestone 5 Math & Chemistry Rendering', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  describe('1. renderKatexToString Adversarial Stress', () => {
    it('returns empty string on empty or whitespace inputs', () => {
      expect(renderKatexToString('')).toBe('');
      expect(renderKatexToString('   ')).toBe('');
      expect(renderKatexToString(null as any)).toBe('');
      expect(renderKatexToString(undefined as any)).toBe('');
    });

    it('gracefully handles severely malformed LaTeX without throwing', () => {
      const brokenExpressions = [
        '\\invalidMacro{abc}',
        '\\frac{1}',
        '\\sqrt{',
        '\\begin{matrix} 1 & 2',
        '\\left( \\frac{a}{b}',
        '^^^^^^',
        '\\over\\over\\over',
        '\\frac{}{}{}{}',
      ];

      for (const expr of brokenExpressions) {
        expect(() => {
          const res = renderKatexToString(expr);
          expect(typeof res).toBe('string');
          expect(res.length).toBeGreaterThan(0);
        }).not.toThrow();
      }
    });

    it('falls back to safe HTML-escaped span when throwOnError is true on bad syntax', () => {
      const res = renderKatexToString('\\unknown{fail}', { throwOnError: true });
      expect(res).toContain('katex-fallback');
      expect(res).toContain('\\unknown{fail}');
    });

    it('sanitizes and escapes malicious script injections in LaTeX fallback', () => {
      const malicious = '<script>alert("xss")</script>\\badcommand';
      const res = renderKatexToString(malicious, { throwOnError: true });
      expect(res).not.toContain('<script>');
      expect(res).toContain('&lt;script&gt;');
    });

    it('survives deeply nested fractions (50 levels) without call stack overflow', () => {
      let deep = 'x';
      for (let i = 0; i < 50; i++) {
        deep = `\\frac{1}{${deep}}`;
      }
      expect(() => {
        const res = renderKatexToString(deep);
        expect(typeof res).toBe('string');
      }).not.toThrow();
    });

    it('survives very long LaTeX expression (20,000 characters)', () => {
      const longExpr = 'x + '.repeat(5000) + '1';
      const start = performance.now();
      const res = renderKatexToString(longExpr);
      const elapsed = performance.now() - start;

      expect(typeof res).toBe('string');
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('2. renderChemistryToString & mhchem Stress', () => {
    it('handles complex and extreme chemistry reactions', () => {
      const reactions = [
        '2H2 + O2 -> 2H2O',
        '\\ce{2H2 + O2 -> 2H2O}',
        'Fe^{3+} + 3OH- -> Fe(OH)3 v',
        '^{226}_{88}Ra -> ^{222}_{86}Rn + ^{4}_{2}\\alpha',
        '[Cu(NH3)4]^2+ + 4H2O <=> [Cu(H2O)4]^2+ + 4NH3',
        'A ->[k_1][k_{-1}] B',
        'Cr2O7^{2-} + 14H+ + 6e- -> 2Cr^{3+} + 7H2O',
      ];

      for (const rx of reactions) {
        expect(() => {
          const res = renderChemistryToString(rx);
          expect(typeof res).toBe('string');
          expect(res).toContain('katex');
        }).not.toThrow();
      }
    });

    it('handles malformed and empty chemistry syntax without crashing', () => {
      const brokenChem = [
        '',
        '   ',
        '\\ce{}',
        '\\ce{',
        '\\ce{H2O{',
        '\\ce{->->->}',
        '\\ce{^^^^^}',
      ];

      for (const bc of brokenChem) {
        expect(() => {
          const res = renderChemistryToString(bc);
          expect(typeof res).toBe('string');
        }).not.toThrow();
      }
    });
  });

  describe('3. extractFormulas Boundary Analysis', () => {
    it('handles empty text and null', () => {
      expect(extractFormulas('')).toEqual({ math: [], chemistry: [] });
      expect(extractFormulas(null as any)).toEqual({ math: [], chemistry: [] });
    });

    it('extracts correctly even with nested braces in \\ce{...}', () => {
      const text = 'تفاعل الحديد: \\ce{Fe^{3+} + 3OH- -> Fe(OH)3 v} ومعادلة $x^2 + y^2 = r^2$';
      const extracted = extractFormulas(text);
      expect(extracted.chemistry).toHaveLength(1);
      expect(extracted.chemistry[0]).toBe('Fe^{3+} + 3OH- -> Fe(OH)3 v');
      expect(extracted.math).toHaveLength(1);
      expect(extracted.math[0]).toBe('x^2 + y^2 = r^2');
    });

    it('handles unclosed delimiters without hanging or loop overflow', () => {
      const unclosed = 'سؤال غير مغلق $x + 1 و كيمياء غير مغلقة \\ce{H2O + NaCl وبلوك $$E=mc^2';
      const extracted = extractFormulas(unclosed);
      expect(Array.isArray(extracted.math)).toBe(true);
      expect(Array.isArray(extracted.chemistry)).toBe(true);
    });
  });

  describe('4. MathRenderer Component Stress & DOM Rendering', () => {
    it('renders empty string without crashing', async () => {
      await act(async () => {
        root.render(<MathRenderer text="" />);
      });
      expect(container.firstChild).not.toBeNull();
    });

    it('renders pure Arabic text without math tokens', async () => {
      const text = 'امتحان مادة الفيزياء للصف الثالث المتوسط الدور الأول';
      await act(async () => {
        root.render(<MathRenderer text={text} />);
      });
      expect(container.textContent).toContain(text);
    });

    it('renders single unclosed delimiter safely as text without throwing', async () => {
      const text = 'احسب المقدار $x + 1 بدون إغلاق و \\ce{H2O بدون إغلاق';
      await act(async () => {
        root.render(<MathRenderer text={text} />);
      });
      expect(container.textContent).toContain('$x + 1');
      expect(container.textContent).toContain('\\ce{H2O');
    });

    it('demonstrates multiline delimiter capture bug when unclosed dollar sign spans subsequent equations', async () => {
      // If a line has an unclosed $ and a subsequent question has another $, the tokenizer erroneously captures cross-paragraph Arabic prose as LaTeX
      const text = 'سؤال 1: قيمة $x + 1 بدون إغلاق\nسؤال 2: احسب $y = 2$';
      await act(async () => {
        root.render(<MathRenderer text={text} />);
      });
      // The Arabic text between the two dollars should not be swallowed into a math span
      const mathSpans = container.querySelectorAll('.ltr-math');
      // If it erroneously merged, there will be only 1 math span containing Arabic text
      // Whereas properly it should treat the unclosed $ on line 1 as text, and $y = 2$ on line 2 as 1 math span
      expect(mathSpans.length).toBe(1);
      expect(mathSpans[0].textContent).toContain('y=2');
    });

    it('renders multiple consecutive delimiters ($$$, $$ $$, \\ce{}) safely', async () => {
      const text = 'معادلات متجاورة: $$$x$$$ و $$ $$ و \\ce{} و $$';
      await act(async () => {
        root.render(<MathRenderer text={text} />);
      });
      expect(container.textContent).toBeTruthy();
    });

    it('isolates LTR math inside Arabic RTL context with proper isolation style', async () => {
      const text = 'سؤال: احسب قيمة $x = 5$ في المعادلة الآتية';
      await act(async () => {
        root.render(<MathRenderer text={text} />);
      });
      const mathSpan = container.querySelector('.ltr-math');
      expect(mathSpan).not.toBeNull();
      expect(mathSpan?.getAttribute('dir')).toBe('ltr');
      expect((mathSpan as HTMLElement).style.direction).toBe('ltr');
    });

    it('renders block math with displayMode container', async () => {
      const text = 'المعادلة العامة هي:\n$$\\int_0^1 x^2 dx = \\frac{1}{3}$$';
      await act(async () => {
        root.render(<MathRenderer text={text} />);
      });
      const blockDiv = container.querySelector('.ltr-math-block');
      expect(blockDiv).not.toBeNull();
      expect(blockDiv?.getAttribute('dir')).toBe('ltr');
      expect((blockDiv as HTMLElement).style.direction).toBe('ltr');
    });

    it('renders complex chemical formulas with LTR chem isolation', async () => {
      const text = 'تفاعل الاحتراق: \\ce{2H2 + O2 -> 2H2O} ينتج عنه ماء';
      await act(async () => {
        root.render(<MathRenderer text={text} />);
      });
      const chemSpan = container.querySelector('.ltr-chem');
      expect(chemSpan).not.toBeNull();
      expect(chemSpan?.getAttribute('dir')).toBe('ltr');
      expect((chemSpan as HTMLElement).style.direction).toBe('ltr');
    });
  });
});
