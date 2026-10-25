/**
 * @techeeer/arabic-utils
 * Pure deterministic utilities for:
 * 1. Arabic name normalization (matching-only, preserving display name)
 * 2. Roster line cleaning (pasted lists)
 * 3. Token-based fuzzy student name matching (Jaro-Winkler + ambiguity guard)
 * 4. Iraqi colloquial spoken number & fraction parser (Appendix A of PLAN.md)
 */
/**
 * Converts Eastern Arabic / Persian digits to Western ASCII digits.
 */
export declare function normalizeDigitsToWestern(input: string): string;
/**
 * Normalizes an Arabic name for comparison and search ONLY.
 * - Removes Tashkeel (diacritics) and Tatweel (kashida)
 * - Unifies Alef variants (أ إ آ ٱ -> ا)
 * - Unifies Alef Maqsura (ى -> ي)
 * - Unifies Teh Marbuta (ة -> ه)
 * - Unifies Waw/Yeh with Hamza (ؤ -> و, ئ -> ي)
 * - Collapses compound "عبد ال..." spacing and extra whitespace
 */
export declare function normalizeArabicName(input: string): string;
/**
 * Cleans a raw pasted student line (Section 8.1) while keeping the original Arabic spelling intact.
 * Removes leading serial numbers (e.g. "1-", "١.", "(2)", "3/"), bullets, and extra spaces.
 */
export declare function cleanStudentListLine(line: string): string;
/**
 * Computes Jaro-Winkler similarity in [0, 1] between two normalized strings.
 */
export declare function jaroWinklerSimilarity(s1: string, s2: string): number;
export interface StudentRosterEntry {
    id: string;
    name: string;
}
export interface NameMatchResult {
    status: 'matched' | 'ambiguous' | 'unmatched';
    matchedId: string | null;
    matchedName: string | null;
    score: number;
    candidates: Array<{
        id: string;
        name: string;
        score: number;
    }>;
}
/**
 * Matches a spoken or OCR-extracted student name against a class roster (Section 8.3).
 * Prevents false green matches when a single first name (e.g. "أحمد") is shared by multiple students.
 */
export declare function matchStudentName(spokenName: string, roster: StudentRosterEntry[], threshold?: number): NameMatchResult;
export type SpokenGradeParseResult = {
    status: 'value';
    value: number;
} | {
    status: 'absent';
} | {
    status: 'invalid';
    raw: string;
};
/**
 * Deterministic parser for Iraqi colloquial & standard Arabic spoken grades (Appendix A of PLAN.md).
 * Used as the second independent verification source in Voice Grades (Section 8.3).
 */
export declare function parseIraqiSpokenGrade(rawInput: string): SpokenGradeParseResult;
//# sourceMappingURL=index.d.ts.map