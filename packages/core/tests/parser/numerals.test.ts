import { describe, it, expect } from 'vitest';
import {
  toWesternNumerals,
  toEasternNumerals,
  parseArabicNumber,
  toArabicOrdinal,
  fromArabicOrdinal
} from '../../src/parser/numerals.js';

describe('numerals.ts - Eastern & Western Numeral Bidirectional Conversion', () => {
  it('should convert Eastern Arabic digits to standard Western digits', () => {
    expect(toWesternNumerals('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(toWesternNumerals('سنة ٢٠٢٦')).toBe('سنة 2026');
  });

  it('should convert Persian/Urdu digits to standard Western digits', () => {
    expect(toWesternNumerals('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });

  it('should convert Arabic decimal commas (٫ and ،) to decimal dots (.)', () => {
    expect(toWesternNumerals('٧٥٫٥')).toBe('75.5');
    expect(toWesternNumerals('١٢،٣٤')).toBe('12.34');
  });

  it('should handle empty or nullish input for toWesternNumerals', () => {
    expect(toWesternNumerals('')).toBe('');
    expect(toWesternNumerals(null as unknown as string)).toBe('');
  });

  it('should convert Western digits to Eastern Arabic digits', () => {
    expect(toEasternNumerals('0123456789')).toBe('٠١٢٣٤٥٦٧٨٩');
    expect(toEasternNumerals(2026)).toBe('٢٠٢٦');
    expect(toEasternNumerals('75.5')).toBe('٧٥٫٥');
    expect(toEasternNumerals('')).toBe('');
    expect(toEasternNumerals(null as unknown as string)).toBe('');
  });

  it('should parse Arabic numbers from mixed Arabic/English text', () => {
    expect(parseArabicNumber('الدرجة: ٨٥٫٥ من ١٠٠')).toBe(85.5);
    expect(parseArabicNumber('س١: (٢٠ درجة)')).toBe(1);
    expect(parseArabicNumber('100%')).toBe(100);
    expect(parseArabicNumber('-١٥٫٥')).toBe(-15.5);
    expect(parseArabicNumber('+٧٠')).toBe(70);
  });

  it('should return null when parsing invalid or non-numeric strings', () => {
    expect(parseArabicNumber('')).toBeNull();
    expect(parseArabicNumber('لا توجد درجة هنا')).toBeNull();
    expect(parseArabicNumber(null as unknown as string)).toBeNull();
  });

  it('should convert numbers to Arabic ordinal descriptions', () => {
    expect(toArabicOrdinal(1)).toBe('الأول');
    expect(toArabicOrdinal(2)).toBe('الثاني');
    expect(toArabicOrdinal(3)).toBe('الثالث');
    expect(toArabicOrdinal(5)).toBe('الخامس');
    expect(toArabicOrdinal(10)).toBe('العاشر');
    expect(toArabicOrdinal(15)).toBe('السؤال ١٥');
  });

  it('should parse Arabic ordinal descriptions back to numbers', () => {
    expect(fromArabicOrdinal('الأول')).toBe(1);
    expect(fromArabicOrdinal('الاول')).toBe(1);
    expect(fromArabicOrdinal('الثاني')).toBe(2);
    expect(fromArabicOrdinal('العاشر')).toBe(10);
    expect(fromArabicOrdinal('')).toBeNull();
    expect(fromArabicOrdinal('غير معروف')).toBeNull();
  });
});
