/**
 * @techeeer/core
 * Shared calculation engines, licensing, parsers, and calendar logic for Iraqi Teacher Assistant PWA.
 */
export { calculateSemesterGrade, calculateAnnualEffort, calculateFinalResult, calculateRound2Result, isPassingGrade, roundHalfUp, calculateDetailedTotal, decomposeSimplifiedScore, rebalanceComponentsToTotal, applyDecisionMarks, COMPONENT_PRIORITY, } from './grades/formulas.js';
export { GradeValidationError, validateGradeRange, } from './grades/errors.js';
export type { GradeComponents, ComponentKey, StudentSubjectGrade, SubjectGrade, DecisionMarksResult, DecisionApplicationResult, } from './grades/types.js';
export { verifyEd25519License, createEd25519KeyPair, signLicensePayload, base64UrlToBytes, bytesToBase64Url, } from './crypto/ed25519.js';
export type { LicensePayload, LicenseTier, LicenseErrorCode, VerificationResult, } from './crypto/ed25519.js';
export { AntiTamperClock, verifyClockSanity, updateHighWaterMark, } from './crypto/clock.js';
export type { ClockCheckResult, ClockSanityResult, AntiTamperClockOptions, } from './crypto/clock.js';
export { parseExamPaperText, parseExamPaperAST, serializeExamPaperAST, calculateExamTotalMarks, DEFAULT_EXAM_TYPOGRAPHY, LatexPreserver, } from './parser/examParser.js';
export type { ParsedExamQuestion, ParsedSubItem, ExamPaperAST, ExamHeaderAST, ExamQuestionAST, ExamBranchAST, ExamQuestionType, ExamMarksSummary, ExamFontFamily, ExamFontSizeScale, ExamLineSpacing, ExamTypographyConfig, } from './parser/examParser.js';
export { toWesternNumerals, toEasternNumerals, parseArabicNumber, toArabicOrdinal, fromArabicOrdinal, } from './parser/numerals.js';
export { checkIraqiDate, isOfficialHoliday, rescheduleLessonPlan, calculateTeachingWeeks, getSemesterTeachingWeeks, ARABIC_WEEKDAYS, FIXED_SOLAR_HOLIDAYS, LUNAR_HOLIDAYS_CATALOG, } from './calendar/iraqiCalendar.js';
export type { IraqiHoliday, AcademicHoliday, TeachingCalendarSummary, LessonItem, ScheduledLesson, } from './calendar/iraqiCalendar.js';
//# sourceMappingURL=index.d.ts.map