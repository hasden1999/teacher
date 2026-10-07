const EASTERN_ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

const ORDINAL_MAP: Record<number, string> = {
  1: 'الأول',
  2: 'الثاني',
  3: 'الثالث',
  4: 'الرابع',
  5: 'الخامس',
  6: 'السادس',
  7: 'السابع',
  8: 'الثامن',
  9: 'التاسع',
  10: 'العاشر'
};

const REVERSE_ORDINAL_MAP: Record<string, number> = {
  'الأول': 1,
  'الاول': 1,
  'الثاني': 2,
  'الثالث': 3,
  'الرابع': 4,
  'الخامس': 5,
  'السادس': 6,
  'السابع': 7,
  'الثامن': 8,
  'التاسع': 9,
  'العاشر': 10
};

/**
 * تحويل الأرقام المشرقية والفارسية والفواصل العربية إلى أرقام غربية (0-9)
 */
export function toWesternNumerals(input: string): string {
  if (!input) return '';
  return input
    .replace(/[٠-٩]/g, d => (d.charCodeAt(0) - 0x0660).toString())
    .replace(/[۰-۹]/g, d => (d.charCodeAt(0) - 0x06f0).toString())
    .replace(/[٫،]/g, '.');
}

/**
 * تحويل الأرقام الغربية إلى أرقام مشرقية (٠-٩) مع استخدام الفاصلة العشرية العربية (٫)
 */
export function toEasternNumerals(input: number | string): string {
  if (input === null || input === undefined) return '';
  const str = input.toString();
  return str
    .replace(/\d/g, d => EASTERN_ARABIC_DIGITS[parseInt(d, 10)])
    .replace(/\./g, '٫');
}

/**
 * استخراج قيمة عددية دقيقة من نص عربي أو مشرق مع دعم الكسور والإشارات
 */
export function parseArabicNumber(input: string): number | null {
  if (!input || typeof input !== 'string') return null;
  const normalized = toWesternNumerals(input.trim());
  const match = normalized.match(/[-+]?\d*\.?\d+/);
  if (!match) return null;
  return parseFloat(match[0]);
}

/**
 * تحويل الرقم إلى الوصف الرتبي العربي (1 -> الأول)
 */
export function toArabicOrdinal(num: number): string {
  return ORDINAL_MAP[num] || `السؤال ${toEasternNumerals(num)}`;
}

/**
 * تحويل الوصف الرتبي إلى رقم (الأول -> 1)
 */
export function fromArabicOrdinal(text: string): number | null {
  if (!text) return null;
  const clean = text.trim();
  return REVERSE_ORDINAL_MAP[clean] || null;
}
