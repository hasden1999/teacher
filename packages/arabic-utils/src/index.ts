/**
 * @techeeer/arabic-utils
 * Pure deterministic utilities for:
 * 1. Arabic name normalization (matching-only, preserving display name)
 * 2. Roster line cleaning (pasted lists)
 * 3. Token-based fuzzy student name matching (Jaro-Winkler + ambiguity guard)
 * 4. Iraqi colloquial spoken number & fraction parser (Appendix A of PLAN.md)
 */

const DIACRITICS_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL_REGEX = /\u0640/g;

const EASTERN_TO_WESTERN_MAP: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

/**
 * Converts Eastern Arabic / Persian digits to Western ASCII digits.
 */
export function normalizeDigitsToWestern(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (ch) => EASTERN_TO_WESTERN_MAP[ch] ?? ch);
}

/**
 * Normalizes an Arabic name for comparison and search ONLY.
 * - Removes Tashkeel (diacritics) and Tatweel (kashida)
 * - Unifies Alef variants (أ إ آ ٱ -> ا)
 * - Unifies Alef Maqsura (ى -> ي)
 * - Unifies Teh Marbuta (ة -> ه)
 * - Unifies Waw/Yeh with Hamza (ؤ -> و, ئ -> ي)
 * - Collapses compound "عبد ال..." spacing and extra whitespace
 */
export function normalizeArabicName(input: string): string {
  if (!input) return '';
  return input
    .replace(DIACRITICS_REGEX, '')
    .replace(TATWEEL_REGEX, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\u0621-\u064A\s]/g, ' ')
    .replace(/(^|\s)عبد\s+ال/g, '$1عبدال')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cleans a raw pasted student line (Section 8.1) while keeping the original Arabic spelling intact.
 * Removes leading serial numbers (e.g. "1-", "١.", "(2)", "3/"), bullets, and extra spaces.
 */
export function cleanStudentListLine(line: string): string {
  if (!line) return '';
  const westernized = normalizeDigitsToWestern(line.trim());
  return westernized
    .replace(/^[\s\-•*#()[\]/.:،,\d]+/, '')
    .replace(/[\s\-•*#()[\]/.:،,\d]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes Jaro-Winkler similarity in [0, 1] between two normalized strings.
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(s1.length, s2.length) / 2) - 1);
  const s1Matches = new Array<boolean>(s1.length).fill(false);
  const s2Matches = new Array<boolean>(s2.length).fill(false);

  let matches = 0;
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let t = 0;
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }

  const transpositions = t / 2;
  const jaro =
    (matches / s1.length + matches / s2.length + (matches - transpositions) / matches) / 3;

  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

export interface StudentRosterEntry {
  id: string;
  name: string;
}

export interface NameMatchResult {
  status: 'matched' | 'ambiguous' | 'unmatched';
  matchedId: string | null;
  matchedName: string | null;
  score: number;
  candidates: Array<{ id: string; name: string; score: number }>;
}

/**
 * Matches a spoken or OCR-extracted student name against a class roster (Section 8.3).
 * Prevents false green matches when a single first name (e.g. "أحمد") is shared by multiple students.
 */
export function matchStudentName(
  spokenName: string,
  roster: StudentRosterEntry[],
  threshold = 0.85
): NameMatchResult {
  const normSpoken = normalizeArabicName(spokenName);
  if (!normSpoken || roster.length === 0) {
    return { status: 'unmatched', matchedId: null, matchedName: null, score: 0, candidates: [] };
  }

  const spokenTokens = normSpoken.split(' ').filter(Boolean);

  const scored = roster.map((student) => {
    const normTarget = normalizeArabicName(student.name);
    const targetTokens = normTarget.split(' ').filter(Boolean);

    if (normSpoken === normTarget) {
      return { id: student.id, name: student.name, score: 1.0, exactFirst: true };
    }

    const tokenCount = Math.min(spokenTokens.length, targetTokens.length);
    let tokenScoreSum = 0;
    for (let i = 0; i < tokenCount; i++) {
      tokenScoreSum += jaroWinklerSimilarity(spokenTokens[i], targetTokens[i]);
    }
    const tokenAvg = tokenCount > 0 ? tokenScoreSum / tokenCount : 0;
    const fullSim = jaroWinklerSimilarity(normSpoken, normTarget);

    // If spoken has fewer tokens than target (e.g., first + father name), weight tokenAvg higher
    const combinedScore =
      spokenTokens.length <= targetTokens.length
        ? tokenAvg * 0.8 + fullSim * 0.2
        : fullSim;

    const firstTokenSim =
      spokenTokens.length > 0 && targetTokens.length > 0
        ? jaroWinklerSimilarity(spokenTokens[0], targetTokens[0])
        : 0;

    return {
      id: student.id,
      name: student.name,
      score: Number(combinedScore.toFixed(4)),
      exactFirst: firstTokenSim >= 0.92,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  const second = scored[1];

  if (!top || top.score < threshold) {
    return {
      status: 'unmatched',
      matchedId: null,
      matchedName: null,
      score: top?.score ?? 0,
      candidates: scored.slice(0, 3).map(({ id, name, score }) => ({ id, name, score })),
    };
  }

  // Ambiguity check:
  // 1) Spoken is a single token (first name only) and multiple students share that first name
  if (spokenTokens.length === 1) {
    const sameFirstCount = scored.filter((c) => c.exactFirst).length;
    if (sameFirstCount > 1) {
      return {
        status: 'ambiguous',
        matchedId: null,
        matchedName: null,
        score: top.score,
        candidates: scored
          .filter((c) => c.exactFirst)
          .map(({ id, name, score }) => ({ id, name, score })),
      };
    }
  }

  // 2) Top two candidates are dangerously close in similarity (gap < 0.04)
  if (second && second.score >= threshold && top.score - second.score < 0.04) {
    return {
      status: 'ambiguous',
      matchedId: null,
      matchedName: null,
      score: top.score,
      candidates: [top, second].map(({ id, name, score }) => ({ id, name, score })),
    };
  }

  return {
    status: 'matched',
    matchedId: top.id,
    matchedName: top.name,
    score: top.score,
    candidates: scored.slice(0, 3).map(({ id, name, score }) => ({ id, name, score })),
  };
}

export type SpokenGradeParseResult =
  | { status: 'value'; value: number }
  | { status: 'absent' }
  | { status: 'invalid'; raw: string };

const ABSENT_PATTERNS = [
  'غايب',
  'غائب',
  'غايبه',
  'غائبه',
  'ما حضر',
  'ماحضر',
  'لم يحضر',
  'غياب',
];

const UNITS_MAP: Record<string, number> = {
  صفر: 0,
  واحد: 1,
  وحده: 1,
  واحده: 1,
  اثنين: 2,
  ثنين: 2,
  اثنان: 2,
  ثلاثه: 3,
  ثلاث: 3,
  تلاثه: 3,
  اربعه: 4,
  اربع: 4,
  خمسه: 5,
  خمس: 5,
  سته: 6,
  ست: 6,
  سبعه: 7,
  سبع: 7,
  ثمانيه: 8,
  ثمان: 8,
  ثمن: 8,
  تسعه: 9,
  تسع: 9,
  عشره: 10,
  عشر: 10,
};

const TEENS_MAP: Record<string, number> = {
  حداعش: 11,
  احدعش: 11,
  'احدى عشر': 11,
  'احدي عشر': 11,
  'احد عشر': 11,
  اثنعش: 12,
  ثنعش: 12,
  'اثنا عشر': 12,
  'اثني عشر': 12,
  ثلطعش: 13,
  ثلاثطعش: 13,
  تلطعش: 13,
  'ثلاثه عشر': 13,
  اربعطعش: 14,
  'اربعه عشر': 14,
  خمسطعش: 15,
  خمستعش: 15,
  'خمسه عشر': 15,
  سطعش: 16,
  ستطعش: 16,
  'سته عشر': 16,
  سبعطعش: 17,
  سبعتعش: 17,
  'سبعه عشر': 17,
  ثمنطعش: 18,
  ثمانطعش: 18,
  ثمنتعش: 18,
  'ثمانيه عشر': 18,
  تسعطعش: 19,
  تسعتعش: 19,
  'تسعه عشر': 19,
};

const TENS_MAP: Record<string, number> = {
  عشرين: 20,
  عشرون: 20,
  ثلاثين: 30,
  ثلاثون: 30,
  تلاثين: 30,
  اربعين: 40,
  اربعون: 40,
  خمسين: 50,
  خمسون: 50,
  ستين: 60,
  ستون: 60,
  سبعين: 70,
  سبعون: 70,
  ثمانين: 80,
  ثمانون: 80,
  تسعين: 90,
  تسعون: 90,
  ميه: 100,
  مئه: 100,
  مائه: 100,
  مية: 100,
};

/**
 * Deterministic parser for Iraqi colloquial & standard Arabic spoken grades (Appendix A of PLAN.md).
 * Used as the second independent verification source in Voice Grades (Section 8.3).
 */
export function parseIraqiSpokenGrade(rawInput: string): SpokenGradeParseResult {
  if (!rawInput || !rawInput.trim()) {
    return { status: 'invalid', raw: rawInput };
  }

  const digitNormalized = normalizeDigitsToWestern(rawInput.trim());

  // Normalize Arabic text while preserving decimal points and digits
  const normalized = digitNormalized
    .replace(DIACRITICS_REGEX, '')
    .replace(TATWEEL_REGEX, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/،/g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Check absent phrases
  for (const pat of ABSENT_PATTERNS) {
    if (normalized === pat || normalized.includes(pat)) {
      return { status: 'absent' };
    }
  }

  // 2. Check direct numeric literal (e.g. "18", "18.5", "١٨")
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const val = Number(normalized);
    if (Number.isFinite(val)) {
      return { status: 'value', value: val };
    }
  }

  // 3. Extract fractional modifiers ("ونص", "ونصف", "وربع", "الا ربع")
  let fractionDelta = 0;
  let working = normalized;

  if (/(?:^|\s)الا\s+ربع(?=\s|$)/.test(working)) {
    fractionDelta = -0.25;
    working = working.replace(/(?:^|\s)الا\s+ربع(?=\s|$)/, ' ').trim();
  } else if (/(?:^|\s)الا\s+نص(?:ف)?(?=\s|$)/.test(working)) {
    fractionDelta = -0.5;
    working = working.replace(/(?:^|\s)الا\s+نص(?:ف)?(?=\s|$)/, ' ').trim();
  } else if (/(?:^|\s)(?:و\s*نص(?:ف)?|ونص(?:ف)?)(?=\s|$)/.test(working)) {
    fractionDelta = 0.5;
    working = working.replace(/(?:^|\s)(?:و\s*نص(?:ف)?|ونص(?:ف)?)(?=\s|$)/, ' ').trim();
  } else if (/(?:^|\s)(?:و\s*ربع|وربع)(?=\s|$)/.test(working)) {
    fractionDelta = 0.25;
    working = working.replace(/(?:^|\s)(?:و\s*ربع|وربع)(?=\s|$)/, ' ').trim();
  }

  working = working.replace(/\s+/g, ' ').trim();

  // If working is empty and user only said "نص" or "ربع"
  if (!working) {
    if (normalized === 'نص' || normalized === 'نصف') return { status: 'value', value: 0.5 };
    if (normalized === 'ربع') return { status: 'value', value: 0.25 };
    return { status: 'invalid', raw: rawInput };
  }

  // Check if working is now a direct number (e.g. "18 ونص")
  if (/^\d+(\.\d+)?$/.test(working)) {
    return { status: 'value', value: Number(working) + fractionDelta };
  }

  // 4. Check exact teen match (11..19)
  if (TEENS_MAP[working] !== undefined) {
    return { status: 'value', value: TEENS_MAP[working] + fractionDelta };
  }

  // 5. Check exact unit (0..10) or ten (20..100)
  if (UNITS_MAP[working] !== undefined) {
    return { status: 'value', value: UNITS_MAP[working] + fractionDelta };
  }
  if (TENS_MAP[working] !== undefined) {
    return { status: 'value', value: TENS_MAP[working] + fractionDelta };
  }

  // 6. Check compound "<unit> و<ten>" (e.g. "خمسة وسبعين" or "خمسه و سبعين")
  const compoundMatch = working.match(/^(\S+)\s+و\s*(\S+)$/);
  if (compoundMatch) {
    const [, firstPart, secondPart] = compoundMatch;
    const unitVal = UNITS_MAP[firstPart];
    const tenVal = TENS_MAP[secondPart];
    if (unitVal !== undefined && tenVal !== undefined && unitVal >= 1 && unitVal <= 9 && tenVal < 100) {
      return { status: 'value', value: tenVal + unitVal + fractionDelta };
    }
  }

  // Also handle attached waw on tens: "خمسه وسبعين" where secondPart = "وسبعين"
  const tokens = working.split(' ').filter(Boolean);
  if (tokens.length === 2 && tokens[1].startsWith('و')) {
    const unitVal = UNITS_MAP[tokens[0]];
    const tenWord = tokens[1].slice(1);
    const tenVal = TENS_MAP[tenWord];
    if (unitVal !== undefined && tenVal !== undefined && unitVal >= 1 && unitVal <= 9 && tenVal < 100) {
      return { status: 'value', value: tenVal + unitVal + fractionDelta };
    }
  }

  return { status: 'invalid', raw: rawInput };
}
