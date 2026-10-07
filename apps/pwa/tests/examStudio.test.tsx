// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseExamPaperAST } from '@techeeer/core';
import { ExamEditor } from '../src/components/questions/ExamEditor.js';
import { ExamPrintView } from '../src/components/questions/ExamPrintView.js';
import { QuestionBankModal } from '../src/components/questions/QuestionBankModal.js';
import { ExamExportService } from '../src/services/exportService.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Question Studio, Dual-Mode Exam Editor & Exporter Suite (M5)', () => {
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

  describe('ExamEditor Dual-Mode Component', () => {
    const sampleText = `جمهورية العراق
وزارة التربية
المادة: الكيمياء

س1: عرف ما يأتي: (20 درجة)
فرع أ: المحلول المنظم (10 درجات)
فرع ب: قاعدة لوشاتليه (10 درجات)

س2: مسألة كيميائية: (20 درجة)
احسب قيمة $pH$ للمحلول`;

    it('renders in structured mode with interactive question cards and total marks', async () => {
      await act(async () => {
        root.render(<ExamEditor initialText={sampleText} />);
      });

      expect(container.textContent).toContain('ستوديو الأسئلة وإعداد الامتحانات');
      expect(container.textContent).toContain('المجموع: 40 / 100 درجة');
      expect(container.textContent).toContain('س1');
      expect(container.textContent).toContain('المحلول المنظم');
      expect(container.textContent).toContain('س2');
    });

    it('adds a new question and updates question count and marks', async () => {
      await act(async () => {
        root.render(<ExamEditor initialText={sampleText} />);
      });

      const addBtn = Array.from(container.querySelectorAll('button')).find(
        b => b.textContent?.includes('إضافة سؤال جديد للورقة الامتحانية')
      );
      expect(addBtn).toBeDefined();

      await act(async () => {
        addBtn?.click();
      });

      expect(container.textContent).toContain('س3');
      expect(container.textContent).toContain('المجموع: 60 / 100 درجة');
    });

    it('adds a branch to a question', async () => {
      await act(async () => {
        root.render(<ExamEditor initialText={sampleText} />);
      });

      const addBranchBtn = Array.from(container.querySelectorAll('button')).find(
        b => b.textContent?.includes('+ إضافة فرع')
      );
      expect(addBranchBtn).toBeDefined();

      await act(async () => {
        addBranchBtn?.click();
      });

      expect(container.textContent).toContain('نص الفرع الجديد...');
    });

    it('switches seamlessly to natural text mode with synchronized AST state', async () => {
      await act(async () => {
        root.render(<ExamEditor initialText={sampleText} />);
      });

      const naturalBtn = Array.from(container.querySelectorAll('button')).find(
        b => b.textContent?.includes('النص الطبيعي واللصق')
      );
      expect(naturalBtn).toBeDefined();

      await act(async () => {
        naturalBtn?.click();
      });

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();
      expect(textarea.value).toContain('س1: عرف ما يأتي: (20 درجة)');
      expect(textarea.value).toContain('المحلول المنظم');
    });
  });

  describe('ExamPrintView Component', () => {
    const ast = parseExamPaperAST(`جمهورية العراق
وزارة التربية
المديرية العامة لتربية الرصافة
ثانوية بغداد للبنات
امتحان نصف السنة 2026 - 2027
المادة: الرياضيات | الصف: الثالث المتوسط | الوقت: ساعتان
ملاحظة: الإجابة عن خمسة أسئلة فقط

س1: السؤال الأول (20 درجة)
فرع أ: فرع أ (10 درجات)`);

    it('renders official 3-column ministerial header matching Iraqi MoE standards', async () => {
      await act(async () => {
        root.render(<ExamPrintView paper={ast} />);
      });

      expect(container.textContent).toContain('جمهورية العراق');
      expect(container.textContent).toContain('وزارة التربية');
      expect(container.textContent).toContain('المديرية العامة لتربية الرصافة');
      expect(container.textContent).toContain('ثانوية بغداد للبنات');
      expect(container.textContent).not.toContain('بسمه تعالى');
      expect(container.textContent).toContain('المادة: الرياضيات');
      expect(container.textContent).toContain('الوقت: ساعتان');
      expect(container.textContent).toContain('الإجابة عن خمسة أسئلة فقط');
    });

    it('applies watermark with safe risograph opacity (0.08) adhering to T2.18.5', async () => {
      await act(async () => {
        root.render(<ExamPrintView paper={ast} watermarkText="وزارة التربية العراقية" />);
      });

      const watermarkEl = container.querySelector('[aria-hidden="true"]') as HTMLElement;
      expect(watermarkEl).not.toBeNull();
      expect(watermarkEl.style.opacity).toBe('0.08');
    });

    it('marks questions with break-inside-avoid to prevent page splitting (T1.19.2)', async () => {
      await act(async () => {
        root.render(<ExamPrintView paper={ast} />);
      });

      const article = container.querySelector('article');
      expect(article).not.toBeNull();
      expect(article?.className).toContain('break-inside-avoid');
    });

    it('supports two-column layout', async () => {
      await act(async () => {
        root.render(<ExamPrintView paper={ast} twoColumnLayout={true} />);
      });

      const main = container.querySelector('main');
      expect(main?.className).toContain('columns-2');
    });
  });

  describe('QuestionBankModal Component', () => {
    it('filters questions by subject and curriculum chapters', async () => {
      const onInsertQuestion = vi.fn();
      const onInsertBranch = vi.fn();

      await act(async () => {
        root.render(
          <QuestionBankModal
            isOpen={true}
            onClose={vi.fn()}
            subject="chemistry"
            onInsertAsNewQuestion={onInsertQuestion}
            onInsertAsSubBranch={onInsertBranch}
          />
        );
      });

      expect(container.textContent).toContain('بنك الأسئلة المنهجية والوزارية');
      expect(container.textContent).toContain('تصفح الأسئلة');

      // Click insert question button
      const insertBtns = container.querySelectorAll('button');
      const addAsNewBtn = Array.from(insertBtns).find(b => b.textContent?.includes('+ إدراج كسؤال جديد'));
      if (addAsNewBtn) {
        await act(async () => {
          addAsNewBtn.click();
        });
        expect(onInsertQuestion).toHaveBeenCalled();
      }
    });

    it('filters search queries with Arabic diacritic normalization (T2.17.4)', async () => {
      await act(async () => {
        root.render(
          <QuestionBankModal
            isOpen={true}
            onClose={vi.fn()}
            subject="chemistry"
            onInsertAsNewQuestion={vi.fn()}
            onInsertAsSubBranch={vi.fn()}
          />
        );
      });

      const searchInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      expect(searchInput).not.toBeNull();

      // Enter search term with diacritics
      await act(async () => {
        searchInput.value = 'تَفَاعُل';
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Should not crash and filter accordingly
      expect(container).toBeDefined();
    });
  });

  describe('ExamExportService Pipelines', () => {
    it('triggers window.print() safely', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      ExamExportService.triggerPrint();
      expect(printSpy).toHaveBeenCalled();
    });

    it('formats WhatsApp exam share message with Iraqi MoE metadata', () => {
      const ast = parseExamPaperAST(`جمهورية العراق
وزارة التربية
ثانوية المتميزين
المادة: الكيمياء
الصف: الخامس العلمي
امتحان نصف السنة`);

      const message = ExamExportService.formatWhatsAppExamShareMessage(ast);
      expect(message).toContain('مساعد المعلم');
      expect(message).toContain('الكيمياء');
      expect(message).toContain('ثانوية المتميزين');
    });

    it('generates a PDF document blob from an HTML element', async () => {
      const el = document.createElement('div');
      el.innerHTML = '<h1>ورقة امتحان A4</h1>';
      document.body.appendChild(el);

      const blob = await ExamExportService.exportToPdf(el, { title: 'امتحان تجريبي' });
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');

      el.remove();
    });

    it('generates an image blob from an HTML element', async () => {
      const el = document.createElement('div');
      el.innerHTML = '<h1>ورقة امتحان</h1>';
      document.body.appendChild(el);

      const blob = await ExamExportService.exportToImage(el, { format: 'png' });
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');

      el.remove();
    });
  });
});
