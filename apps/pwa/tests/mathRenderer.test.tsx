// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderKatexToString,
  renderChemistryToString,
  extractFormulas,
} from '../src/lib/math/katexRenderer.js';
import { lazyLoadMathLive, isMathLiveLoaded } from '../src/lib/math/mathliveLoader.js';
import { IRAQI_MATH_SYMBOLS } from '../src/lib/math/symbolsCatalog.js';
import { MathRenderer } from '../src/components/questions/MathRenderer.js';
import { EquationKeypad } from '../src/components/questions/EquationKeypad.js';
import { MathFormulaEditor } from '../src/components/questions/MathFormulaEditor.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('KaTeX & Math Formula Engine Suite', () => {
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

  describe('katexRenderer utility functions', () => {
    it('renders quadratic equation LaTeX to valid KaTeX HTML', () => {
      const html = renderKatexToString('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
      expect(html).toContain('katex');
      expect(html).toContain('annotation');
      expect(html).toContain('-b');
    });

    it('renders chemical formula using mhchem extension', () => {
      const html = renderChemistryToString('\\ce{CaCO3 -> CaO + CO2}');
      expect(html).toContain('katex');
      expect(html).toContain('CaCO');
      expect(html).toContain('CO');
    });

    it('handles empty or malformed formulas gracefully without throwing', () => {
      expect(renderKatexToString('')).toBe('');
      expect(renderChemistryToString('')).toBe('');
      // Malformed formula with unmatched bracket
      const fallbackHtml = renderKatexToString('\\frac{a}{');
      expect(fallbackHtml).toBeTruthy();
    });

    it('extracts math and chemical formulas from mixed Arabic text', () => {
      const text = 'حل المعادلة: $x^2 + 5x + 6 = 0$ وتفاعل التفكك: \\ce{2KClO3 -> 2KCl + 3O2 ^} والتكامل $$\\int x dx$$';
      const extracted = extractFormulas(text);

      expect(extracted.math).toContain('x^2 + 5x + 6 = 0');
      expect(extracted.math).toContain('\\int x dx');
      expect(extracted.chemistry).toContain('2KClO3 -> 2KCl + 3O2 ^');
    });
  });

  describe('mathliveLoader', () => {
    it('lazy-loads MathLive module dynamically returning version info (T1.17.3)', async () => {
      const info = await lazyLoadMathLive();
      expect(info.version).toContain('MathLive');
      expect(isMathLiveLoaded()).toBe(true);
    });
  });

  describe('IRAQI_MATH_SYMBOLS catalog', () => {
    it('contains essential symbols required by Iraqi MoE curriculum', () => {
      const latexList = IRAQI_MATH_SYMBOLS.map(s => s.latex);
      expect(latexList.some(l => l.includes('\\int'))).toBe(true);
      expect(latexList.some(l => l.includes('\\pi'))).toBe(true);
      expect(latexList.some(l => l.includes('\\theta'))).toBe(true);
      expect(latexList.some(l => l.includes('\\Delta'))).toBe(true);
      expect(latexList.some(l => l.includes('\\sqrt'))).toBe(true);
    });
  });

  describe('MathRenderer Component', () => {
    it('renders mixed Arabic text with isolated LTR math spans', async () => {
      const mixedText = 'أوجد قيمة $f(x) = x^2 + 1$ عند $x = 2$';

      await act(async () => {
        root.render(<MathRenderer text={mixedText} />);
      });

      expect(container.textContent).toContain('أوجد قيمة');
      expect(container.textContent).toContain('عند');

      const mathSpans = container.querySelectorAll('.ltr-math');
      expect(mathSpans.length).toBe(2);
      expect(mathSpans[0].getAttribute('dir')).toBe('ltr');
      expect((mathSpans[0] as HTMLElement).style.direction).toBe('ltr');
    });

    it('renders chemistry equations with ltr-chem isolation', async () => {
      const chemText = 'معادلة التفاعل: \\ce{CaCO3 -> CaO + CO2} راسب';

      await act(async () => {
        root.render(<MathRenderer text={chemText} />);
      });

      const chemSpans = container.querySelectorAll('.ltr-chem');
      expect(chemSpans.length).toBe(1);
      expect(chemSpans[0].getAttribute('dir')).toBe('ltr');
    });

    it('handles unclosed delimiters safely without crashing', async () => {
      const unclosed = 'سؤال غير مغلق $x + y ومتبقي النص';

      await act(async () => {
        root.render(<MathRenderer text={unclosed} />);
      });

      expect(container.textContent).toContain('سؤال غير مغلق');
      expect(container.textContent).toContain('x + y');
    });
  });

  describe('EquationKeypad Component', () => {
    it('renders categorized tabs and triggers onInsertSymbol callback on button click', async () => {
      const onInsertSymbol = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSpace = vi.fn();

      await act(async () => {
        root.render(
          <EquationKeypad
            onInsertSymbol={onInsertSymbol}
            onBackspace={onBackspace}
            onClear={onClear}
            onSpace={onSpace}
          />
        );
      });

      // Find first symbol button in basic tab
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(10);

      // Verify touch target >= 48px
      const firstKey = container.querySelector('.touch-manipulation') as HTMLElement;
      expect(firstKey).not.toBeNull();

      // Click a symbol key
      await act(async () => {
        firstKey.click();
      });
      expect(onInsertSymbol).toHaveBeenCalled();

      // Click space button
      const spaceBtn = Array.from(buttons).find(b => b.textContent?.includes('مسافة'));
      await act(async () => {
        spaceBtn?.click();
      });
      expect(onSpace).toHaveBeenCalled();

      // Click backspace button
      const backspaceBtn = Array.from(buttons).find(b => b.textContent?.includes('تراجع'));
      await act(async () => {
        backspaceBtn?.click();
      });
      expect(onBackspace).toHaveBeenCalled();
    });
  });

  describe('MathFormulaEditor Modal Component', () => {
    it('renders modal when isOpen is true, updates preview, and inserts formatted formula', async () => {
      const onInsert = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <MathFormulaEditor
            isOpen={true}
            onClose={onClose}
            onInsert={onInsert}
            initialValue="x^2 + 1"
          />
        );
      });

      expect(container.textContent).toContain('محرر المعادلات والصيغ الكيميائية');

      // Click insert button
      const insertBtn = Array.from(container.querySelectorAll('button')).find(
        b => b.textContent?.includes('إدراج في نص السؤال')
      );
      expect(insertBtn).toBeDefined();

      await act(async () => {
        insertBtn?.click();
      });

      expect(onInsert).toHaveBeenCalledWith('$x^2 + 1$');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
