/**
 * @techeeer/core
 * Shared calculation engines, licensing, parsers, and calendar logic for Iraqi Teacher Assistant PWA.
 */
// ==========================================
// 1. Grade Calculations & Conversions
// ==========================================
export { calculateSemesterGrade, calculateAnnualEffort, calculateFinalResult, calculateRound2Result, isPassingGrade, roundHalfUp, calculateDetailedTotal, decomposeSimplifiedScore, rebalanceComponentsToTotal, applyDecisionMarks, COMPONENT_PRIORITY, } from './grades/formulas.js';
export { GradeValidationError, validateGradeRange, } from './grades/errors.js';
// ==========================================
// 2. Cryptographic Licensing & Clock Tracking
// ==========================================
export { verifyEd25519License, createEd25519KeyPair, signLicensePayload, base64UrlToBytes, bytesToBase64Url, } from './crypto/ed25519.js';
export { AntiTamperClock, verifyClockSanity, updateHighWaterMark, } from './crypto/clock.js';
// ==========================================
// 3. Exam Parsing & Numeral Conversion
// ==========================================
export { parseExamPaperText, parseExamPaperAST, serializeExamPaperAST, calculateExamTotalMarks, DEFAULT_EXAM_TYPOGRAPHY, LatexPreserver, } from './parser/examParser.js';
export { toWesternNumerals, toEasternNumerals, parseArabicNumber, toArabicOrdinal, fromArabicOrdinal, } from './parser/numerals.js';
// ==========================================
// 4. Iraqi MoE Calendar & Rescheduling
// ==========================================
export { checkIraqiDate, isOfficialHoliday, rescheduleLessonPlan, calculateTeachingWeeks, getSemesterTeachingWeeks, ARABIC_WEEKDAYS, FIXED_SOLAR_HOLIDAYS, LUNAR_HOLIDAYS_CATALOG, } from './calendar/iraqiCalendar.js';
//# sourceMappingURL=index.js.map