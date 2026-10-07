import { describe, it, expect, vi } from 'vitest';
import {
  normalizeIraqiPhone,
  generateWhatsAppUrl,
  formatWhatsAppCard,
  getStudentStatusText,
  copyCardToClipboard,
} from '../src/services/whatsAppService.js';
import type { StudentEvaluationCardData } from '../src/types/gradebook.js';

describe('WhatsAppService Unit Test Suite', () => {
  describe('Iraqi Phone Number Normalization (T1.15.5)', () => {
    it('normalizes domestic 07... numbers to 9647... with spaces and formatting stripped', () => {
      expect(normalizeIraqiPhone('0770 123 4567')).toBe('9647701234567');
      expect(normalizeIraqiPhone('0780-987-6543')).toBe('9647809876543');
      expect(normalizeIraqiPhone('(0750) 111 2233')).toBe('9647501112233');
    });

    it('normalizes +964 and 00964 international prefixes', () => {
      expect(normalizeIraqiPhone('+9647809998877')).toBe('9647809998877');
      expect(normalizeIraqiPhone('009647701234567')).toBe('9647701234567');
      expect(normalizeIraqiPhone('9647901234567')).toBe('9647901234567');
    });

    it('handles Eastern Arabic numerals (٠-٩) in phone numbers', () => {
      expect(normalizeIraqiPhone('٠٧٧٠١٢٣٤٥٦٧')).toBe('9647701234567');
      expect(normalizeIraqiPhone('+٩٦٤٧٨٠١١٢٢٣٣٤')).toBe('9647801122334');
    });

    it('returns null for empty, invalid, or truncated phone numbers', () => {
      expect(normalizeIraqiPhone(null)).toBeNull();
      expect(normalizeIraqiPhone('')).toBeNull();
      expect(normalizeIraqiPhone('12345')).toBeNull();
      expect(normalizeIraqiPhone('invalid')).toBeNull();
    });
  });

  describe('Deep-Link Generation & Privacy Isolation (T1.15.2, T2.14.4)', () => {
    it('generates direct wa.me URL with normalized recipient and URI-encoded message', () => {
      const phone = '07701234567';
      const msg = 'مرحباً ولي أمر الطالب زيد';
      const url = generateWhatsAppUrl(phone, msg);

      expect(url.startsWith('https://wa.me/9647701234567?text=')).toBe(true);
      expect(url).toContain(encodeURIComponent(msg));
    });

    it('strictly forbids third-party URL shorteners (T2.14.4)', () => {
      const url = generateWhatsAppUrl('07701234567', 'رسالة تقييم');
      expect(url).not.toContain('bit.ly');
      expect(url).not.toContain('tinyurl.com');
      expect(url).not.toContain('t.co');
      expect(url.startsWith('https://wa.me/')).toBe(true);
    });

    it('falls back to general wa.me/?text= when phone number is missing or invalid', () => {
      const url = generateWhatsAppUrl(null, 'رسالة عامة');
      expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    });
  });

  describe('WhatsApp Arabic Card Text Formatter (T1.15.1, T1.15.3, T3.01, T3.09)', () => {
    const baseCard: StudentEvaluationCardData = {
      schoolName: 'ثانوية المتميزين للبنين',
      teacherName: 'الأستاذ أحمد شاكر',
      studentName: 'زيد علي عباس',
      className: 'الثالث متوسط',
      divisionName: 'أ',
      subjectName: 'الرياضيات',
      academicYear: '2026-2027',
      cardType: 'monthly',
      score: 88,
    };

    it('T1.15.1: generates formatted Arabic card with student name, subject, and scores', () => {
      const cardText = formatWhatsAppCard(baseCard);

      expect(cardText).toContain('زيد علي عباس');
      expect(cardText).toContain('الرياضيات');
      expect(cardText).toContain('88%');
      expect(cardText).toContain('ثانوية المتميزين');
      expect(cardText).toContain('ناجح بجدارة');
    });

    it('T1.15.3: includes absence days and behavioral notes in evaluation card', () => {
      const cardWithNotes: StudentEvaluationCardData = {
        ...baseCard,
        absencesCount: 3,
        teacherNotes: 'طالب مؤدب ومواظب ومشارك متميز',
      };
      const text = formatWhatsAppCard(cardWithNotes);

      expect(text).toContain('أيام الغياب: 3 يوم');
      expect(text).toContain('ملاحظات المعلم:');
      expect(text).toContain('طالب مؤدب ومواظب');
    });

    it('T3.01: displays applied ministerial decision marks clearly in card', () => {
      const cardWithDecision: StudentEvaluationCardData = {
        ...baseCard,
        score: 50,
        decisionMarks: {
          applied: true,
          originalScore: 47,
          adjustedScore: 50,
          usedMarks: 3,
          pool: 5,
        },
      };
      const text = formatWhatsAppCard(cardWithDecision);

      expect(text).toContain('تطبيق القرار الوزاري:');
      expect(text).toContain('الدرجة قبل القرار: 47%');
      expect(text).toContain('الدرجة بعد القرار: *50%*');
      expect(text).toContain('3 من رصيد 5');
      expect(text).toContain('ناجح بموجب درجات القرار الوزاري (3 درجات)');
    });

    it('T3.09: displays absence penalty marks when present', () => {
      const cardWithPenalty: StudentEvaluationCardData = {
        ...baseCard,
        absencesCount: 4,
        absencePenaltyMarks: 2,
      };
      const text = formatWhatsAppCard(cardWithPenalty);

      expect(text).toContain('أيام الغياب: 4 يوم');
      expect(text).toContain('خصم الغياب: 2 درجات');
    });

    it('formats detailed 5-component breakdown (5x20) correctly', () => {
      const cardDetailed: StudentEvaluationCardData = {
        ...baseCard,
        components: {
          oral: 18,
          written: 16,
          homework: 20,
          behavior: 20,
          participation: 17,
          total: 91,
        },
      };
      const text = formatWhatsAppCard(cardDetailed);

      expect(text).toContain('الشفوي: 18/20');
      expect(text).toContain('التحريري والأنشطة: 16/20');
      expect(text).toContain('الواجبات البيتية: 20/20');
      expect(text).toContain('السلوك والانضباط: 20/20');
      expect(text).toContain('المشاركة الصفية: 17/20');
      expect(text).toContain('مجموع النشاط اليومي: 91%');
      expect(text).toContain('ناجح ومتميز 🌟');
    });
  });

  describe('Status Badge Evaluation', () => {
    it('returns appropriate WCAG badge text and classes', () => {
      expect(getStudentStatusText(95).label).toContain('متميز');
      expect(getStudentStatusText(75).label).toContain('ناجح بجدارة');
      expect(getStudentStatusText(55).label).toContain('ناجح');
      expect(getStudentStatusText(45).label).toContain('يحتاج إلى متابعة');
      expect(getStudentStatusText(50, true, 2).label).toContain('ناجح بموجب درجات القرار الوزاري (2 درجات)');
    });
  });

  describe('Clipboard Copying', () => {
    it('uses navigator.clipboard.writeText when available', async () => {
      const originalNavigator = globalThis.navigator;
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(globalThis, 'navigator', {
        value: { clipboard: { writeText: writeTextMock } },
        configurable: true,
      });

      const ok = await copyCardToClipboard('محتوى البطاقة');
      expect(ok).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('محتوى البطاقة');

      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    });
  });
});
