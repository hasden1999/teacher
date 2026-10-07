/**
 * تحويل الأرقام المشرقية والفارسية والفواصل العربية إلى أرقام غربية (0-9)
 */
export declare function toWesternNumerals(input: string): string;
/**
 * تحويل الأرقام الغربية إلى أرقام مشرقية (٠-٩) مع استخدام الفاصلة العشرية العربية (٫)
 */
export declare function toEasternNumerals(input: number | string): string;
/**
 * استخراج قيمة عددية دقيقة من نص عربي أو مشرق مع دعم الكسور والإشارات
 */
export declare function parseArabicNumber(input: string): number | null;
/**
 * تحويل الرقم إلى الوصف الرتبي العربي (1 -> الأول)
 */
export declare function toArabicOrdinal(num: number): string;
/**
 * تحويل الوصف الرتبي إلى رقم (الأول -> 1)
 */
export declare function fromArabicOrdinal(text: string): number | null;
//# sourceMappingURL=numerals.d.ts.map