import { describe, it, expect } from 'vitest';
import {
  normalizeArabicName,
  cleanStudentListLine,
  matchStudentName,
  parseIraqiSpokenGrade,
} from '../src/index.js';
import fixtures from '../fixtures/numbers.json' with { type: 'json' };

describe('@techeeer/arabic-utils', () => {
  describe('normalizeArabicName', () => {
    it('normalizes Alef variants, Teh Marbuta, Alef Maqsura, and diacritics for matching', () => {
      expect(normalizeArabicName('أَحْمَدُ عَلِيّ مُصْطَفَى')).toBe('احمد علي مصطفي');
      expect(normalizeArabicName('فاطمة الزهراء')).toBe('فاطمه الزهراء');
      expect(normalizeArabicName('إبراهيم آصف')).toBe('ابراهيم اصف');
      expect(normalizeArabicName('عبد الله رحيم')).toBe('عبدالله رحيم');
    });
  });

  describe('cleanStudentListLine', () => {
    it('strips serial numbers, Eastern digits, parentheses, and dashes', () => {
      expect(cleanStudentListLine('١- أحمد علي حسن')).toBe('أحمد علي حسن');
      expect(cleanStudentListLine('24) زينب محمد كاظم')).toBe('زينب محمد كاظم');
      expect(cleanStudentListLine('• مصطفى حيدر')).toBe('مصطفى حيدر');
    });
  });

  describe('matchStudentName', () => {
    const roster = [
      { id: 's1', name: 'أحمد علي حسن' },
      { id: 's2', name: 'أحمد قاسم جبار' },
      { id: 's3', name: 'زينب حسن كريم' },
      { id: 's4', name: 'مصطفى عبد الله' },
    ];

    it('matches full or two-part unique student names accurately', () => {
      const res = matchStudentName('احمد علي', roster);
      expect(res.status).toBe('matched');
      expect(res.matchedId).toBe('s1');
    });

    it('flags ambiguous when only a shared first name is spoken', () => {
      const res = matchStudentName('أحمد', roster);
      expect(res.status).toBe('ambiguous');
      expect(res.matchedId).toBeNull();
      expect(res.candidates.length).toBe(2);
    });

    it('matches single first name when it is unique in the roster', () => {
      const res = matchStudentName('زينب', roster);
      expect(res.status).toBe('matched');
      expect(res.matchedId).toBe('s3');
    });
  });

  describe('parseIraqiSpokenGrade — Appendix A Mandatory Cases', () => {
    it('passes all mandatory Appendix A test vectors from PLAN.md', () => {
      for (const item of fixtures.mandatoryCases) {
        const parsed = parseIraqiSpokenGrade(item.phrase);
        if (item.expected === 'absent') {
          expect(parsed).toEqual({ status: 'absent' });
        } else {
          expect(parsed).toEqual({ status: 'value', value: item.expected });
        }
      }
    });

    it('parses all Iraqi colloquial teens (11..19) and fractions', () => {
      for (const [numStr, variants] of Object.entries(fixtures.colloquialTeens)) {
        const expectedVal = Number(numStr);
        for (const phrase of variants) {
          expect(parseIraqiSpokenGrade(phrase)).toEqual({
            status: 'value',
            value: expectedVal,
          });
          expect(parseIraqiSpokenGrade(`${phrase} ونص`)).toEqual({
            status: 'value',
            value: expectedVal + 0.5,
          });
        }
      }
    });

    it('returns invalid for unparseable text', () => {
      expect(parseIraqiSpokenGrade('غير معروف')).toEqual({
        status: 'invalid',
        raw: 'غير معروف',
      });
    });
  });
});
