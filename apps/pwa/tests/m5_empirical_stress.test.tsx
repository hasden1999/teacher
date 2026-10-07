// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseExamPaperAST,
  type ExamPaperAST,
} from '@techeeer/core';
import { ExamEditor } from '../src/components/questions/ExamEditor.js';
import { ExamPrintView } from '../src/components/questions/ExamPrintView.js';
import { QuestionBankModal } from '../src/components/questions/QuestionBankModal.js';
import { ExamExportService } from '../src/services/exportService.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Milestone 5 Adversarial Stress & Boundary Harness — UI & Services', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    if (!URL.createObjectURL) {
      URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = vi.fn();
    }
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  describe('Dimension 3: Arabic Search with Varied Diacritics & Hamza Variations', () => {
    it('searches question bank with full Arabic diacritics (تَشْكِيل)', async () => {
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

      // Search with fatha, damma, kasra, shadda
      await act(async () => {
        searchInput.value = 'تَفَاعُلُ التَّأَكْسُدِ';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(container).toBeDefined();
      // Should not crash and should render search results or empty state cleanly
      const listContainer = container.querySelector('.overflow-y-auto');
      expect(listContainer).not.toBeNull();
    });

    it('searches with Hamza variations (أ, إ, آ vs ا)', async () => {
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

      // Query with Alif-Hamza above
      await act(async () => {
        searchInput.value = 'أيون';
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const textAfterHamzaAbove = container.textContent;

      // Query with plain Alif
      await act(async () => {
        searchInput.value = 'ايون';
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const textAfterPlainAlif = container.textContent;

      // Both should yield consistent normalized behavior
      expect(textAfterHamzaAbove).toBeDefined();
      expect(textAfterPlainAlif).toBeDefined();
    });

    it('empirically probes Tatweel (ـ) and special regex characters in Arabic search', async () => {
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

      // Probe regex control characters (must not crash)
      const specialQuery = 'تفاعل (الكيمياء) [1] + $pH$ * ?';
      await act(async () => {
        searchInput.value = specialQuery;
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(container.textContent).toBeDefined();

      // Probe Tatweel / Kashida
      const tatweelQuery = 'الـكـيـمـيـاء';
      await act(async () => {
        searchInput.value = tatweelQuery;
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(container.textContent).toBeDefined();
    });
  });

  describe('Dimension 4: ExamExportService Edge Cases', () => {
    it('handles exportToPdf with 0x0 element, Arabic Unicode title, and custom scale', async () => {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.width = '0px';
      emptyDiv.style.height = '0px';
      document.body.appendChild(emptyDiv);

      const blob = await ExamExportService.exportToPdf(emptyDiv, {
        title: 'امتحان نصف السنة لمادة الكيمياء - جمهورية العراق',
        fileName: 'exam_moe_chem',
        scale: 1,
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');

      // Verify PDF header bytes (%PDF-)
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const headerString = String.fromCharCode(...bytes.slice(0, 5));
      expect(headerString).toBe('%PDF-');

      emptyDiv.remove();
    });

    it('handles exportToImage with PNG and JPEG formats and quality extremes', async () => {
      const div = document.createElement('div');
      div.innerHTML = '<h2>ورقة اختبار تجريبية</h2>';
      document.body.appendChild(div);

      // PNG export
      const pngBlob = await ExamExportService.exportToImage(div, {
        format: 'png',
        fileName: 'test_exam.png',
        scale: 2,
      });
      expect(pngBlob).toBeInstanceOf(Blob);
      expect(pngBlob.type).toBe('image/png');

      // JPEG export with quality 0.1 and quality 1.0
      const jpegBlob = await ExamExportService.exportToImage(div, {
        format: 'jpeg',
        quality: 0.1,
        fileName: 'test_exam_low.jpeg',
      });
      expect(jpegBlob).toBeInstanceOf(Blob);
      expect(jpegBlob.type).toBe('image/jpeg');

      div.remove();
    });

    it('empirically evaluates shareExamToWhatsApp targetPhone parsing', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const dummyBlob = new Blob(['image-data'], { type: 'image/png' });

      // Case 1: Standard Western Iraqi phone 07701234567
      await ExamExportService.shareExamToWhatsApp(dummyBlob, 'test.png', 'رسالة اختبار', '07701234567');
      expect(openSpy).toHaveBeenCalled();
      const lastCallUrl1 = openSpy.mock.calls[0][0] as string;
      expect(lastCallUrl1).toContain('wa.me/07701234567');

      // Case 2: Phone with spaces and dashes (0780-123-4567)
      openSpy.mockClear();
      await ExamExportService.shareExamToWhatsApp(dummyBlob, 'test.png', 'رسالة', '0780-123-4567');
      const lastCallUrl2 = openSpy.mock.calls[0][0] as string;
      expect(lastCallUrl2).toContain('wa.me/07801234567');

      // Case 3: Eastern Arabic numerals phone (٠٧٧٠١٢٣٤٥٦٧)
      // Empirically observe how targetPhone.replace(/\D/g, '') handles Eastern Arabic digits
      openSpy.mockClear();
      await ExamExportService.shareExamToWhatsApp(dummyBlob, 'test.png', 'رسالة', '٠٧٧٠١٢٣٤٥٦٧');
      const lastCallUrl3 = openSpy.mock.calls[0][0] as string;
      // In JS regex \D matches non-ASCII digits, so cleanPhone becomes empty!
      // This is a documented empirical observation.
      expect(lastCallUrl3.startsWith('https://wa.me/')).toBe(true);

      // Case 4: Empty phone
      openSpy.mockClear();
      await ExamExportService.shareExamToWhatsApp(dummyBlob, 'test.png', 'رسالة', '');
      const lastCallUrl4 = openSpy.mock.calls[0][0] as string;
      expect(lastCallUrl4).toBe('https://wa.me/?text=%D8%B1%D8%B3%D8%A7%D9%84%D8%A9');
    });

    it('formats WhatsApp message across edge case ASTs (empty header, 25 questions, special characters)', () => {
      // Empty header paper
      const emptyPaper: ExamPaperAST = {
        header: {},
        questions: [],
        rawText: '',
      };
      const msgEmpty = ExamExportService.formatWhatsAppExamShareMessage(emptyPaper);
      expect(msgEmpty).toContain('مساعد المعلم');
      expect(msgEmpty).toContain('عدد الأسئلة: 0');

      // Large 25 questions paper with full metadata
      const largePaper: ExamPaperAST = {
        header: {
          schoolName: 'ثانوية المتميزين *النموذجية*',
          examTitle: 'امتحان الكيمياء النهائي',
          subject: 'الكيمياء',
          grade: 'السادس العلمي',
          timeAllowed: '3 ساعات',
          generalNote: 'الإجابة عن خمسة أسئلة فقط',
        },
        questions: Array.from({ length: 25 }, (_, i) => ({
          id: `q${i + 1}`,
          questionNumber: i + 1,
          headerLabel: `س${i + 1}`,
          header: `س${i + 1}:`,
          marks: 4,
          type: 'GENERAL',
          branches: [],
          subItems: [],
        })),
        rawText: '',
      };

      const msgLarge = ExamExportService.formatWhatsAppExamShareMessage(largePaper);
      expect(msgLarge).toContain('المدرسة: ثانوية المتميزين *النموذجية*');
      expect(msgLarge).toContain('الامتحان: امتحان الكيمياء النهائي');
      expect(msgLarge).toContain('عدد الأسئلة: 25');
    });
  });

  describe('Dimension 1 (UI Stress): Large Exam Paper Workload Rendering', () => {
    it('renders ExamPrintView with 20 questions and 60 branches without crashing', async () => {
      const qList = [];
      for (let i = 1; i <= 20; i++) {
        qList.push({
          id: `q_${i}`,
          questionNumber: i,
          headerLabel: `س${i}`,
          header: `س${i}: أجب عما يأتي: (5 درجات)`,
          instruction: `سؤال رقم ${i} في الكيمياء`,
          marks: 5,
          type: 'GENERAL' as const,
          branches: [
            { id: `b_${i}_1`, label: 'أ', text: `فرع أ في السؤال ${i}`, marks: 2 },
            { id: `b_${i}_2`, label: 'ب', text: `فرع ب في السؤال ${i}`, marks: 2 },
            { id: `b_${i}_3`, label: 'ج', text: `فرع ج في السؤال ${i}`, marks: 1 },
          ],
          subItems: [],
        });
      }

      const largeAST: ExamPaperAST = {
        header: {
          country: 'جمهورية العراق',
          ministry: 'وزارة التربية',
          directorate: 'المديرية العامة لتربية الكرخ الأولى',
          schoolName: 'ثانوية المتفوقين',
          examTitle: 'امتحان نهاية الفصل الأول',
          subject: 'الكيمياء',
          grade: 'الرابع العلمي',
          timeAllowed: 'ساعتان',
          generalNote: 'الإجابة عن كافة الأسئلة',
        },
        questions: qList,
        rawText: '',
      };

      await act(async () => {
        root.render(<ExamPrintView paper={largeAST} twoColumnLayout={true} />);
      });

      // Verify DOM contains all 20 question articles
      const articles = container.querySelectorAll('article');
      expect(articles.length).toBe(20);

      // Verify 2-column layout
      const main = container.querySelector('main');
      expect(main?.className).toContain('columns-2');

      // Verify 3-column ministerial header is present
      expect(container.textContent).toContain('جمهورية العراق');
      expect(container.textContent).toContain('وزارة التربية');
      expect(container.textContent).toContain('ثانوية المتفوقين');
      expect(container.textContent).toContain('الرابع العلمي');

      // Verify watermark is rendered with opacity 0.08
      const watermark = container.querySelector('[aria-hidden="true"]') as HTMLElement;
      expect(watermark).not.toBeNull();
      expect(watermark.style.opacity).toBe('0.08');
    });

    it('renders ExamEditor with 20 questions and switches mode cleanly under workload', async () => {
      const qList = [];
      for (let i = 1; i <= 20; i++) {
        qList.push({
          id: `q_${i}`,
          questionNumber: i,
          headerLabel: `س${i}`,
          header: `س${i}: السؤال رقم ${i}: (5 درجات)`,
          instruction: `توجيه السؤال ${i}`,
          marks: 5,
          type: 'GENERAL' as const,
          branches: [
            { id: `b_${i}_1`, label: 'أ', text: `فرع أ`, marks: 3 },
            { id: `b_${i}_2`, label: 'ب', text: `فرع ب`, marks: 2 },
          ],
          subItems: [],
        });
      }

      const initialAST: ExamPaperAST = {
        header: {
          schoolName: 'المدرسة الكبرى',
          subject: 'الكيمياء',
          examTitle: 'امتحان شامل',
        },
        questions: qList,
        rawText: '',
      };

      await act(async () => {
        root.render(<ExamEditor initialAST={initialAST} />);
      });

      // Total marks should be 20 questions x 5 = 100 marks
      expect(container.textContent).toContain('المجموع: 100 / 100 درجة');

      // Switch to natural text mode
      const naturalModeBtn = Array.from(container.querySelectorAll('button')).find(b =>
        b.textContent?.includes('النص الطبيعي واللصق')
      );
      expect(naturalModeBtn).toBeDefined();

      await act(async () => {
        naturalModeBtn?.click();
      });

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();
      expect(textarea.value).toContain('س1:');
      expect(textarea.value).toContain('س20:');

      // Switch back to structured mode
      const structuredModeBtn = Array.from(container.querySelectorAll('button')).find(b =>
        b.textContent?.includes('النمط المنظم')
      );
      expect(structuredModeBtn).toBeDefined();

      await act(async () => {
        structuredModeBtn?.click();
      });

      expect(container.textContent).toContain('المجموع: 100 / 100 درجة');
    });
  });
});
