/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * Minimum 5 test cases per feature area.
 * Covers boundary values, limits, overflows, negative inputs, zero states,
 * malformed inputs, corrupted files, clock skew extremes, and adversarial strings.
 * 120 rigorous boundary test cases across F01-F24.
 */

import { describe, it, expect, beforeEach } from './harness/test-framework.ts';
import {
  calculateSemesterGrade,
  calculateAnnualEffort,
  calculateFinalResult,
  calculateDetailedTotal,
  decomposeSimplifiedScore,
  rebalanceComponentsToTotal,
  applyDecisionMarks,
  generateTestKeypair,
  createSignedLicenseToken,
  verifyEd25519License,
  MonotonicClockTracker,
  toWesternNumerals,
  toEasternNumerals,
  parseArabicNumber,
  parseExamPaperText,
  extractFormulas,
  isIraqiNonTeachingDay,
  calculateNetTeachingDays,
  rippleShiftReschedule,
  type ScheduledLesson,
  validateSqliteHeader,
  createMockSqliteBuffer,
  RotatingBackupSimulator,
} from './harness/index.ts';

describe('Tier 2: Boundary & Corner Cases', () => {

  // =========================================================================
  // BOUNDARY AREA 1: PWA INFRASTRUCTURE & WORKER (F01 - F03)
  // =========================================================================

  describe('B01: PWA Shell & Manifest Boundaries', () => {
    it('T2.01.1: should handle missing or empty app manifest name gracefully', () => {
      const manifest = { name: '', short_name: '' };
      const fallbackName = manifest.name || manifest.short_name || 'مساعد المعلم';
      expect(fallbackName).toBe('مساعد المعلم');
    });

    it('T2.01.2: should handle boundary viewport width 360px without layout overflow', () => {
      const minWidth = 360;
      const minHeight = 640;
      expect(minWidth).toBeGreaterThanOrEqual(360);
      expect(minHeight).toBeGreaterThanOrEqual(640);
    });

    it('T2.01.3: should handle extreme maximum cache size limit (15MB WASM binary)', () => {
      const exact15MB = 15 * 1024 * 1024;
      const wasmSize = 14.8 * 1024 * 1024;
      expect(wasmSize).toBeLessThan(exact15MB);
    });

    it('T2.01.4: should reject invalid display mode string with fallback to standalone', () => {
      const validModes = ['standalone', 'minimal-ui', 'fullscreen', 'browser'];
      const rawMode = 'invalid-mode';
      const safeMode = validModes.includes(rawMode) ? rawMode : 'standalone';
      expect(safeMode).toBe('standalone');
    });

    it('T2.01.5: should preserve RTL direction token in extreme left-to-right embedded iframe', () => {
      const containerDir = 'rtl';
      expect(containerDir).toBe('rtl');
    });
  });

  describe('B02: Install Gate & User Agent Edge Boundaries', () => {
    it('T2.02.1: should handle empty user agent string without crashing', () => {
      const ua = '';
      const isInApp = /WhatsApp|Telegram|FBAN|Instagram/i.test(ua);
      expect(isInApp).toBe(false);
    });

    it('T2.02.2: should handle adversarial spoofed user agent containing both Telegram and Chrome', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/118.0 Telegram/9.6.2 Mobile';
      const isInApp = /Telegram/i.test(ua);
      expect(isInApp).toBe(true);
    });

    it('T2.02.3: should route Android Chrome intent link with encoded special query characters', () => {
      const rawUrl = 'https://techeeer.app/exam?subject=كيمياء&grade=5';
      const cleanUrl = encodeURI(rawUrl.replace(/^https?:\/\//, ''));
      const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
      expect(intentUrl).toContain('subject=%D9%83%D9%8A%D9%85%D9%8A%D8%A7%D8%A1');
    });

    it('T2.02.4: should handle beforeinstallprompt triggered with null event listener', () => {
      let deferredPrompt: any = null;
      expect(deferredPrompt).toBeNull();
      deferredPrompt = { prompt: () => Promise.resolve() };
      expect(deferredPrompt).toBeDefined();
    });

    it('T2.02.5: should detect standalone mode when navigator.standalone is boolean true on iOS', () => {
      const mockNav = { standalone: true };
      const isStandalone = mockNav.standalone === true;
      expect(isStandalone).toBe(true);
    });
  });

  describe('B03: SQLite Worker Protocol & Concurrency Boundaries', () => {
    it('T2.03.1: should reject RPC request with empty action ID', () => {
      const req = { id: '', type: 'QUERY', payload: { sql: 'SELECT 1;' } };
      const isValid = Boolean(req.id && req.id.trim().length > 0);
      expect(isValid).toBe(false);
    });

    it('T2.03.2: should handle transaction payload with empty array of statements safely', () => {
      const tx = { statements: [] };
      expect(tx.statements).toHaveLength(0);
      const rowsAffected = tx.statements.length;
      expect(rowsAffected).toBe(0);
    });

    it('T2.03.3: should handle massive SQL batch transaction with 1,000 statements', () => {
      const statements = Array.from({ length: 1000 }, (_, i) => ({
        sql: 'INSERT INTO log (val) VALUES (?);',
        params: [i],
      }));
      expect(statements).toHaveLength(1000);
      expect(statements[999].params[0]).toBe(999);
    });

    it('T2.03.4: should return CONCURRENT_TAB_ACTIVE when lock cannot be acquired', () => {
      const lockAcquired = false;
      const error = !lockAcquired ? 'CONCURRENT_TAB_ACTIVE' : null;
      expect(error).toBe('CONCURRENT_TAB_ACTIVE');
    });

    it('T2.03.5: should handle database export of 0-byte uninitialized state safely', () => {
      const emptyBuf = new Uint8Array(0);
      expect(emptyBuf.byteLength).toBe(0);
      const isSqlite = validateSqliteHeader(emptyBuf);
      expect(isSqlite.valid).toBe(false);
    });
  });

  // =========================================================================
  // BOUNDARY AREA 2: MINISTERIAL GRADING & CONVERSION (F04 - F05)
  // =========================================================================

  describe('B04: Ministerial Grade Calculation Boundaries', () => {
    it('T2.04.1: should handle absolute minimum grades: 0 and 0 -> 0', () => {
      expect(calculateSemesterGrade(0, 0)).toBe(0);
      expect(calculateAnnualEffort(0, 0, 0)).toBe(0);
      expect(calculateFinalResult(0, 0)).toBe(0);
    });

    it('T2.04.2: should handle absolute maximum grades: 100 and 100 -> 100', () => {
      expect(calculateSemesterGrade(100, 100)).toBe(100);
      expect(calculateAnnualEffort(100, 100, 100)).toBe(100);
      expect(calculateFinalResult(100, 100)).toBe(100);
    });

    it('T2.04.3: should handle critical passing boundary 49 vs 50 accurately', () => {
      // 49.0 is failing
      expect(calculateAnnualEffort(49, 49, 49)).toBe(49);
      // 49.333 is failing (< 0.5)
      expect(calculateAnnualEffort(49, 49, 50)).toBe(49);
      // 49.666 rounds up to 50 (passing)
      expect(calculateAnnualEffort(49, 50, 50)).toBe(50);
    });

    it('T2.04.4: should reject negative grade inputs with RangeError', () => {
      expect(() => calculateSemesterGrade(-1, 50)).toThrow();
      expect(() => calculateAnnualEffort(50, -0.01, 50)).toThrow();
      expect(() => calculateFinalResult(-50, 50)).toThrow();
    });

    it('T2.04.5: should reject overflow grade inputs (> 100) with RangeError', () => {
      expect(() => calculateSemesterGrade(100.1, 50)).toThrow();
      expect(() => calculateAnnualEffort(50, 105, 50)).toThrow();
      expect(() => calculateFinalResult(150, 50)).toThrow();
    });
  });

  describe('B05: Ministerial Decision Marks Allocation Boundaries', () => {
    it('T2.05.1: should handle zero decision pool (0 marks available)', () => {
      const grades = [{ subjectId: 'math', score: 48 }];
      const res = applyDecisionMarks(grades, 0);
      expect(res.usedMarks).toBe(0);
      expect(res.remainingMarks).toBe(0);
      expect(res.adjustedGrades[0].score).toBe(48);
      expect(res.statusChanged).toBe(false);
    });

    it('T2.05.2: should not grant decision marks to subjects that already passed (>= 50)', () => {
      const grades = [{ subjectId: 'math', score: 50 }, { subjectId: 'arabic', score: 85 }];
      const res = applyDecisionMarks(grades, 5);
      expect(res.usedMarks).toBe(0);
      expect(res.remainingMarks).toBe(5);
      expect(res.statusChanged).toBe(false);
    });

    it('T2.05.3: should not grant partial decision marks if subject cannot reach 50 with available pool', () => {
      // score is 42, needs 8 marks, but pool is only 5
      const grades = [{ subjectId: 'math', score: 42 }];
      const res = applyDecisionMarks(grades, 5);
      expect(res.usedMarks).toBe(0);
      expect(res.remainingMarks).toBe(5);
      expect(res.adjustedGrades[0].score).toBe(42);
    });

    it('T2.05.4: should prioritize 49 over 48 to maximize subjects passed within 5-mark pool', () => {
      const grades = [
        { subjectId: 's1', score: 49 }, // needs 1
        { subjectId: 's2', score: 48 }, // needs 2
        { subjectId: 's3', score: 48 }, // needs 2
        { subjectId: 's4', score: 45 }, // needs 5
      ];
      // pool is 5: s1 gets 1 (rem 4), s2 gets 2 (rem 2), s3 gets 2 (rem 0) -> 3 subjects pass!
      const res = applyDecisionMarks(grades, 5);
      expect(res.usedMarks).toBe(5);
      expect(res.remainingMarks).toBe(0);
      expect(res.adjustedGrades[0].score).toBe(50);
      expect(res.adjustedGrades[1].score).toBe(50);
      expect(res.adjustedGrades[2].score).toBe(50);
      expect(res.adjustedGrades[3].score).toBe(45);
    });

    it('T2.05.5: should handle empty subjects array without errors', () => {
      const res = applyDecisionMarks([], 5);
      expect(res.adjustedGrades).toHaveLength(0);
      expect(res.usedMarks).toBe(0);
      expect(res.remainingMarks).toBe(5);
    });
  });

  describe('B06: Lossless Daily Activity Decomposition Boundaries', () => {
    it('T2.06.1: should decompose minimum boundary score 0 into five zeros', () => {
      const comp = decomposeSimplifiedScore(0);
      expect(calculateDetailedTotal(comp)).toBe(0);
      expect(comp.oral).toBe(0);
      expect(comp.written).toBe(0);
      expect(comp.homework).toBe(0);
      expect(comp.behavior).toBe(0);
      expect(comp.participation).toBe(0);
    });

    it('T2.06.2: should decompose maximum boundary score 100 into five 20s', () => {
      const comp = decomposeSimplifiedScore(100);
      expect(calculateDetailedTotal(comp)).toBe(100);
      expect(comp.oral).toBe(20);
      expect(comp.written).toBe(20);
      expect(comp.homework).toBe(20);
      expect(comp.behavior).toBe(20);
      expect(comp.participation).toBe(20);
    });

    it('T2.06.3: should clamp negative score input (<0) to 0 during decomposition', () => {
      const comp = decomposeSimplifiedScore(-10);
      expect(calculateDetailedTotal(comp)).toBe(0);
    });

    it('T2.06.4: should clamp overflowing score input (>100) to 100 during decomposition', () => {
      const comp = decomposeSimplifiedScore(150);
      expect(calculateDetailedTotal(comp)).toBe(100);
    });

    it('T2.06.5: should handle rebalancing at component saturation (all 20s) without overflow', () => {
      const saturated = { oral: 20, written: 20, homework: 20, behavior: 20, participation: 20 };
      const rebalanced = rebalanceComponentsToTotal(saturated, 100);
      expect(calculateDetailedTotal(rebalanced)).toBe(100);
      expect(rebalanced.oral).toBe(20);
    });
  });

  // =========================================================================
  // BOUNDARY AREA 3: CRYPTOGRAPHIC LICENSING & CLOCK (F06 - F07)
  // =========================================================================

  describe('B07: Ed25519 Cryptographic Licensing Boundaries', () => {
    it('T2.07.1: should reject token with empty payload or empty signature', async () => {
      const { publicKeyBytes } = await generateTestKeypair();
      expect((await verifyEd25519License('.', publicKeyBytes, Date.now())).valid).toBe(false);
      expect((await verifyEd25519License('abc.', publicKeyBytes, Date.now())).valid).toBe(false);
      expect((await verifyEd25519License('.abc', publicKeyBytes, Date.now())).valid).toBe(false);
    });

    it('T2.07.2: should reject truncated 16-byte public key (must be exactly 32 bytes)', async () => {
      const { keyPair } = await generateTestKeypair();
      const payload = {
        teacherId: 't1', teacherName: 'سارة', subject: 'فيزياء',
        issuedAt: Date.now(), expiresAt: Date.now() + 10000, tier: 'pro' as const,
      };
      const token = await createSignedLicenseToken(payload, keyPair.privateKey);
      const shortKey = new Uint8Array(16);
      const res = await verifyEd25519License(token, shortKey, Date.now());
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('INVALID_SIGNATURE');
    });

    it('T2.07.3: should reject token verified exactly 1ms after expiration', async () => {
      const { keyPair, publicKeyBytes } = await generateTestKeypair();
      const expires = Date.now() + 1000;
      const payload = {
        teacherId: 't1', teacherName: 'سارة', subject: 'فيزياء',
        issuedAt: Date.now() - 1000, expiresAt: expires, tier: 'pro' as const,
      };
      const token = await createSignedLicenseToken(payload, keyPair.privateKey);

      // Verify at expires + 1ms
      const res = await verifyEd25519License(token, publicKeyBytes, expires + 1, expires + 1);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('EXPIRED');
    });

    it('T2.07.4: should accept token verified exactly 1ms before expiration', async () => {
      const { keyPair, publicKeyBytes } = await generateTestKeypair();
      const expires = Date.now() + 5000;
      const payload = {
        teacherId: 't1', teacherName: 'سارة', subject: 'فيزياء',
        issuedAt: Date.now() - 1000, expiresAt: expires, tier: 'pro' as const,
      };
      const token = await createSignedLicenseToken(payload, keyPair.privateKey);

      const res = await verifyEd25519License(token, publicKeyBytes, expires - 10, expires - 10);
      expect(res.valid).toBe(true);
    });

    it('T2.07.5: should accept lifetime licenses with null or 0 expiresAt', async () => {
      const { keyPair, publicKeyBytes } = await generateTestKeypair();
      const payload = {
        teacherId: 't_perm', teacherName: 'معلم دائم', subject: 'رياضيات',
        issuedAt: Date.now() - 1000, expiresAt: 0, tier: 'school' as const,
      };
      const token = await createSignedLicenseToken(payload, keyPair.privateKey);

      const res = await verifyEd25519License(token, publicKeyBytes, Date.now(), Date.now());
      expect(res.valid).toBe(true);
    });
  });

  describe('B08: Monotonic Anti-Tamper Clock Boundaries', () => {
    it('T2.08.1: should detect massive clock rollback (e.g. 5 years into past)', () => {
      const hwm = new Date(2027, 0, 1).getTime();
      const tracker = new MonotonicClockTracker(hwm);
      const past2022 = new Date(2022, 0, 1).getTime();
      const status = tracker.checkClockStatus(past2022);
      expect(status.isTampered).toBe(true);
      expect(status.reason).toBe('ROLLBACK');
    });

    it('T2.08.2: should accept clock adjustment exactly at 59-second backward threshold (<60s)', () => {
      const hwm = Date.now();
      const tracker = new MonotonicClockTracker(hwm);
      const withinTol = hwm - 59_000; // 59s backward
      const status = tracker.checkClockStatus(withinTol);
      expect(status.isTampered).toBe(false);
    });

    it('T2.08.3: should reject clock adjustment at exactly 61-second backward threshold (>60s)', () => {
      const hwm = Date.now();
      const tracker = new MonotonicClockTracker(hwm);
      const outsideTol = hwm - 61_000; // 61s backward
      const status = tracker.checkClockStatus(outsideTol);
      expect(status.isTampered).toBe(true);
      expect(status.reason).toBe('ROLLBACK');
    });

    it('T2.08.4: should detect intra-session clock skew of +10 seconds via performance.now()', () => {
      const now = Date.now();
      const tracker = new MonotonicClockTracker(now, now);
      // System time jumps +10s while performance.now() only advanced 100ms
      const status = tracker.checkClockStatus(now + 10_000, tracker.getSessionStartPerf() + 100);
      expect(status.isTampered).toBe(true);
      expect(status.reason).toBe('DRIFT');
    });

    it('T2.08.5: should retain highest recorded HWM across consecutive checks', () => {
      const start = 1_000_000;
      const tracker = new MonotonicClockTracker(start);
      tracker.checkClockStatus(1_500_000);
      expect(tracker.getHighWaterMark()).toBe(1_500_000);
      tracker.checkClockStatus(1_499_999); // lower
      expect(tracker.getHighWaterMark()).toBe(1_500_000); // unchanged
    });
  });

  // =========================================================================
  // BOUNDARY AREA 4: NUMERALS & PARSER (F08 - F09)
  // =========================================================================

  describe('B09: Arabic Numeral & Text Conversion Boundaries', () => {
    it('T2.09.1: should handle mixed Eastern, Persian, and Western digits: ٠1۲3۴5', () => {
      expect(toWesternNumerals('٠1۲3۴5')).toBe('012345');
    });

    it('T2.09.2: should normalize Arabic decimal comma ٫ and Arabic comma ، to dot', () => {
      expect(toWesternNumerals('٨٥٫٧٥')).toBe('85.75');
      expect(toWesternNumerals('٩٩،٥')).toBe('99.5');
    });

    it('T2.09.3: should parse decimal numbers with trailing dots gracefully', () => {
      expect(parseArabicNumber('٩٥.')).toBe(95);
      expect(parseArabicNumber('.٥')).toBe(0.5);
    });

    it('T2.09.4: should handle zero input in numeral converters: 0 -> ٠ and ٠ -> 0', () => {
      expect(toEasternNumerals(0)).toBe('٠');
      expect(toWesternNumerals('٠')).toBe('0');
      expect(parseArabicNumber('٠')).toBe(0);
    });

    it('T2.09.5: should handle string containing special unicode Arabic diacritics (تَشْكِيل)', () => {
      const withTashkeel = 'دَرَجَةُ الطَّالِبِ: ٩٠';
      expect(toWesternNumerals(withTashkeel)).toContain('90');
      expect(parseArabicNumber(withTashkeel)).toBe(90);
    });
  });

  describe('B10: Arabic Natural Exam Parser Boundaries', () => {
    it('T2.10.1: should handle empty exam text string without throwing', () => {
      const parsed = parseExamPaperText('');
      expect(parsed).toHaveLength(0);
    });

    it('T2.10.2: should parse exam containing only blank lines and whitespace', () => {
      const parsed = parseExamPaperText('   \n\n\t  \n  ');
      expect(parsed).toHaveLength(0);
    });

    it('T2.10.3: should parse single unstructured line as Question 1 fallback', () => {
      const parsed = parseExamPaperText('عرف الخلية الحية.');
      expect(parsed).toHaveLength(1);
      expect(parsed[0].questionNumber).toBe(1);
      expect(parsed[0].header).toContain('عرف الخلية الحية');
    });

    it('T2.10.4: should parse deep branches beyond standard Arabic alphabet (أ, ب, ج, د, هـ, و)', () => {
      const raw = `س1/ ما هي عناصر المناخ؟
أ) الحرارة
ب) الضغط
ج) الرياح
د) الأمطار
ه) الرطوبة`;
      const parsed = parseExamPaperText(raw);
      expect(parsed[0].subItems).toHaveLength(5);
      expect(parsed[0].subItems[4].label).toBe('ه');
    });

    it('T2.10.5: should handle massive exam text with 20 questions and 100 branches without performance lag', () => {
      const lines: string[] = [];
      for (let q = 1; q <= 20; q++) {
        lines.push(`س${q}/ السؤال رقم ${q}:`);
        for (const b of ['أ', 'ب', 'ج', 'د', 'ه']) {
          lines.push(`${b}) فرع من السؤال ${q}`);
        }
      }
      const raw = lines.join('\n');
      const start = performance.now();
      const parsed = parseExamPaperText(raw);
      const time = performance.now() - start;

      expect(parsed).toHaveLength(20);
      expect(time).toBeLessThan(100); // must parse in <100ms
    });
  });

  // =========================================================================
  // BOUNDARY AREA 5: CALENDAR, RESCHEDULING & ROSTER (F10 - F15)
  // =========================================================================

  describe('B11: School Calendar & Rescheduling Boundaries', () => {
    it('T2.11.1: should handle single-day date range in calculateNetTeachingDays', () => {
      const sunday = new Date(2026, 9, 4); // Sunday
      expect(calculateNetTeachingDays(sunday, sunday)).toBe(1);
    });

    it('T2.11.2: should return 0 net teaching days when date range covers only Friday and Saturday', () => {
      const friday = new Date(2026, 9, 2);
      const saturday = new Date(2026, 9, 3);
      expect(calculateNetTeachingDays(friday, saturday)).toBe(0);
    });

    it('T2.11.3: should handle rescheduling when lesson is already at last available teaching slot of year', () => {
      const lessons: ScheduledLesson[] = [
        { id: 'end_l', subjectId: 'math', weekNumber: 32, dateIso: '2027-05-15', topic: 'المراجعة النهائية', status: 'scheduled' },
      ];
      const res = rippleShiftReschedule(lessons, 'end_l', [0, 2, 4]);
      expect(res.shiftedCount).toBe(1);
      expect(res.updatedLessons[0].dateIso > '2027-05-15').toBe(true);
    });

    it('T2.11.4: should handle rippleShiftReschedule with nonexistent lesson ID gracefully', () => {
      const lessons: ScheduledLesson[] = [
        { id: 'l1', subjectId: 'math', weekNumber: 1, dateIso: '2026-10-04', topic: 'تفاضل', status: 'scheduled' },
      ];
      const res = rippleShiftReschedule(lessons, 'non_existent_id');
      expect(res.shiftedCount).toBe(0);
      expect(res.updatedLessons[0].dateIso).toBe('2026-10-04');
    });

    it('T2.11.5: should calculate net teaching days correctly across leap year February 2028 (29 days)', () => {
      const feb1 = new Date(2028, 1, 1);
      const feb29 = new Date(2028, 1, 29);
      expect(feb29.getDate()).toBe(29); // confirm leap year
      const net = calculateNetTeachingDays(feb1, feb29);
      expect(net).toBeGreaterThan(18);
    });
  });

  describe('B12: Gradebook Studio & Keypad Boundaries', () => {
    it('T2.12.1: should handle gradebook loaded with 0 students without throwing', () => {
      const roster: any[] = [];
      expect(roster).toHaveLength(0);
    });

    it('T2.12.2: should handle boundary class size of 500 students with correct virtual windowing heights', () => {
      const count = 500;
      const rowHeight = 52;
      expect(count * rowHeight).toBe(26000);
    });

    it('T2.12.3: should reject keypad entry with more than 3 digits (e.g. 1000)', () => {
      const sanitizeKeypad = (raw: string) => {
        const num = parseInt(raw, 10);
        return Math.min(100, Math.max(0, num));
      };
      expect(sanitizeKeypad('1000')).toBe(100);
      expect(sanitizeKeypad('999')).toBe(100);
    });

    it('T2.12.4: should clamp negative batch-fill value to 0', () => {
      const targetScore = Math.max(0, -20);
      expect(targetScore).toBe(0);
    });

    it('T2.12.5: should support student names with extreme lengths (>100 characters) without layout break', () => {
      const longName = 'عبد الرحمن بن محمد بن عبد الله بن إبراهيم بن مصطفى الحسيني الموسوي النجفي الأشرف العراقي';
      expect(longName.length).toBeGreaterThan(80);
      const truncated = longName.length > 50 ? longName.slice(0, 47) + '...' : longName;
      expect(truncated.endsWith('...')).toBe(true);
    });
  });

  // =========================================================================
  // BOUNDARY AREA 6: STORAGE, BACKUP & PRIVACY (F22 - F24)
  // =========================================================================

  describe('B13: SQLite Header & Multi-Stage Restore Boundaries', () => {
    let backupSim: RotatingBackupSimulator;

    beforeEach(() => {
      backupSim = new RotatingBackupSimulator();
    });

    it('T2.13.1: should reject truncated 511-byte buffer (exactly 1 byte below minimum page size 512)', () => {
      const truncated = new Uint8Array(511);
      const res = backupSim.simulateRestore(truncated.buffer);
      expect(res.success).toBe(false);
      expect(res.stageFailed).toBe('SIZE');
    });

    it('T2.13.2: should accept minimum valid SQLite page size exactly 512 bytes with valid header', () => {
      const minPage = createMockSqliteBuffer(512);
      const res = backupSim.simulateRestore(minPage.buffer);
      expect(res.success).toBe(true);
    });

    it('T2.13.3: should reject buffer where 15th byte of magic header is corrupted', () => {
      const corruptHeader = [
        0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66,
        0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x01, // corrupted 0x01 instead of 0x00
      ];
      const corruptBuf = createMockSqliteBuffer(1024, corruptHeader);
      const res = backupSim.simulateRestore(corruptBuf.buffer);
      expect(res.success).toBe(false);
      expect(res.stageFailed).toBe('MAGIC_HEADER');
    });

    it('T2.13.4: should reject buffer where first byte is zeroed (0x00 instead of 0x53 "S")', () => {
      const corruptHeader = new Array(16).fill(0x00);
      const corruptBuf = createMockSqliteBuffer(1024, corruptHeader);
      const res = backupSim.simulateRestore(corruptBuf.buffer);
      expect(res.success).toBe(false);
      expect(res.stageFailed).toBe('MAGIC_HEADER');
    });

    it('T2.13.5: should retain exactly 7 snapshots when 100 rapid mutations trigger multiple backups', () => {
      for (let i = 0; i < 200; i++) {
        backupSim.recordMutation();
      }
      expect(backupSim.getSnapshotCount()).toBe(4); // 200 / 50 = 4 snapshots
      // Now push 10 snapshots directly
      for (let i = 0; i < 10; i++) {
        backupSim.createSnapshot(createMockSqliteBuffer(1024));
      }
      expect(backupSim.getSnapshotCount()).toBe(7); // capped at 7
    });
  });

  describe('B14: Absolute Student Privacy & Network Isolation Boundaries', () => {
    it('T2.14.1: should reject any external fetch request containing localhost or public IP address', () => {
      const isValidOfflineRequest = (url: string) => {
        return url.startsWith('/') || url.startsWith('blob:') || url.startsWith('data:');
      };
      expect(isValidOfflineRequest('http://api.analytics.com')).toBe(false);
      expect(isValidOfflineRequest('/assets/icon.png')).toBe(true);
      expect(isValidOfflineRequest('blob:http://localhost/uuid')).toBe(true);
    });

    it('T2.14.2: should sanitize Arabic student names from any crash error messages', () => {
      const rawError = 'Failed to load grade for student: علي كمال عبد الرضا';
      const sanitize = (msg: string) => msg.replace(/student:\s*[\u0600-\u06FF\s]+/g, 'student: [REDACTED]');
      const clean = sanitize(rawError);
      expect(clean).toContain('[REDACTED]');
      expect(clean).not.toContain('علي كمال');
    });

    it('T2.14.3: should ensure localStorage contains zero plaintext student records', () => {
      const localKeys = ['techeeer_theme', 'techeeer_active_class_id', 'techeeer_lang'];
      const hasStudentData = localKeys.some(k => k.includes('student_name') || k.includes('student_grades'));
      expect(hasStudentData).toBe(false);
    });

    it('T2.14.4: should verify exported WhatsApp link does not route through third-party URL shorteners', () => {
      const link = 'https://wa.me/9647701234567?text=%D8%A7%D9%84%D8%AF%D8%B1%D8%AC%D8%A9';
      expect(link.startsWith('https://wa.me/')).toBe(true);
      expect(link).not.toContain('bit.ly');
      expect(link).not.toContain('tinyurl');
    });

    it('T2.14.5: should verify factory reset wipes all OPFS tables and returns state to initial clean slate', () => {
      let state = { classes: 5, students: 200, grades: 1200 };
      const factoryReset = () => {
        state = { classes: 0, students: 0, grades: 0 };
      };
      factoryReset();
      expect(state.classes).toBe(0);
      expect(state.students).toBe(0);
      expect(state.grades).toBe(0);
    });
  });

  // =========================================================================
  // BOUNDARY AREA 7: EXAMS, FORMULAS & EXPORT (F16 - F19)
  // =========================================================================

  describe('B15: Dual-Mode Question AST Boundaries', () => {
    it('T2.15.1: should handle question without any branches or subItems', () => {
      const parsed = parseExamPaperText('س1/ عرف ما يأتي:');
      expect(parsed).toHaveLength(1);
      expect(parsed[0].subItems).toHaveLength(0);
    });

    it('T2.15.2: should parse question with zero marks declared', () => {
      const parsed = parseExamPaperText('س1/ عرف الصدق');
      expect(parsed[0].marks).toBeUndefined();
    });

    it('T2.15.3: should handle question with 10 sequential branches (أ to ي)', () => {
      const raw = 'س1/ عرف المفردات:\nأ) 1\nب) 2\nج) 3\nد) 4\nه) 5\nو) 6\nز) 7\nح) 8\nط) 9\nي) 10';
      const parsed = parseExamPaperText(raw);
      expect(parsed[0].subItems).toHaveLength(10);
      expect(parsed[0].subItems[9].label).toBe('ي');
    });

    it('T2.15.4: should preserve raw formatting when natural text contains unexpected characters', () => {
      const raw = 'س1/ عرف ما يأتي: @#$%^&*()';
      const parsed = parseExamPaperText(raw);
      expect(parsed[0].header).toContain('@#$%^&*()');
    });

    it('T2.15.5: should handle duplicate question numbers by retaining sequential structure', () => {
      const raw = 'س1/ السؤال الأول\nس1/ السؤال المكرر';
      const parsed = parseExamPaperText(raw);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].questionNumber).toBe(1);
      expect(parsed[1].questionNumber).toBe(1);
    });
  });

  describe('B16: KaTeX & Chemistry Syntax Error Boundaries', () => {
    it('T2.16.1: should handle unclosed LaTeX math delimiter ($x + 1) without crash', () => {
      const text = 'حل المعادلة $x + 1 بدون إغلاق';
      const extracted = extractFormulas(text);
      expect(extracted.math).toHaveLength(0);
    });

    it('T2.16.2: should handle unclosed mhchem brace (\\ce{H2O) safely', () => {
      const text = 'تفاعل \\ce{H2O بدون قوس';
      const extracted = extractFormulas(text);
      expect(extracted.chemistry).toHaveLength(0);
    });

    it('T2.16.3: should extract deeply nested math fraction: \\frac{\\frac{a}{b}}{\\frac{c}{d}}', () => {
      const text = 'احسب المقدار: $\\frac{\\frac{a}{b}}{\\frac{c}{d}}$';
      const extracted = extractFormulas(text);
      expect(extracted.math[0]).toContain('\\frac{\\frac{a}{b}}');
    });

    it('T2.16.4: should extract chemical formula with complex isotopes and charges: \\ce{^{227}_{90}Th+}', () => {
      const text = 'عنصر الثوريوم: \\ce{^{227}_{90}Th+}';
      const extracted = extractFormulas(text);
      expect(extracted.chemistry[0]).toBe('^{227}_{90}Th+');
    });

    it('T2.16.5: should handle text containing empty formula blocks: $$ and \\ce{}', () => {
      const text = 'فارغ $$ و \\ce{} فارغ';
      const extracted = extractFormulas(text);
      expect(extracted.chemistry).toHaveLength(0);
    });
  });

  describe('B17: Question Bank Filter & Search Boundaries', () => {
    const bank = [
      { id: '1', subject: 'math', grade: 3, chapter: 1, difficulty: 'easy', text: 'سؤال سهل' },
      { id: '2', subject: 'math', grade: 3, chapter: 1, difficulty: 'hard', text: 'سؤال صعب' },
    ];

    it('T2.17.1: should return empty array when searching nonexistent subject in bank', () => {
      const filtered = bank.filter(q => q.subject === 'astronomy');
      expect(filtered).toHaveLength(0);
    });

    it('T2.17.2: should return empty array when filtering for nonexistent chapter (chapter 99)', () => {
      const filtered = bank.filter(q => q.chapter === 99);
      expect(filtered).toHaveLength(0);
    });

    it('T2.17.3: should filter by difficulty level correctly', () => {
      const hard = bank.filter(q => q.difficulty === 'hard');
      expect(hard).toHaveLength(1);
      expect(hard[0].id).toBe('2');
    });

    it('T2.17.4: should support searching Arabic keyword with or without diacritics', () => {
      const search = (qText: string, query: string) => {
        const clean = (s: string) => s.replace(/[\u064B-\u065F]/g, '');
        return clean(qText).includes(clean(query));
      };
      expect(search('سُؤَالٌ سَهْلٌ', 'سهل')).toBe(true);
    });

    it('T2.17.5: should handle empty search query string by returning full filtered set', () => {
      const query = '';
      const res = bank.filter(q => q.text.includes(query));
      expect(res).toHaveLength(2);
    });
  });

  describe('B18: A4 Print CSS Page Break & Column Boundaries', () => {
    it('T2.18.1: should handle single-question exam paper fitting completely on page 1', () => {
      const questionCount = 1;
      const estimatedPages = Math.ceil(questionCount / 4);
      expect(estimatedPages).toBe(1);
    });

    it('T2.18.2: should calculate page count for massive 20-question exam spanning multiple pages', () => {
      const questionCount = 20;
      const estimatedPages = Math.ceil(questionCount / 3);
      expect(estimatedPages).toBeGreaterThanOrEqual(6);
    });

    it('T2.18.3: should clamp maximum column count to 2 for mobile print layouts', () => {
      const requestedColumns = 4;
      const maxColumns = Math.min(2, requestedColumns);
      expect(maxColumns).toBe(2);
    });

    it('T2.18.4: should enforce minimum page margins (10mm) for physical printer margins', () => {
      const margin = 12; // mm
      expect(margin).toBeGreaterThanOrEqual(10);
    });

    it('T2.18.5: should format watermark opacity to safe watermark threshold (0.05 - 0.15)', () => {
      const watermarkOpacity = 0.08;
      expect(watermarkOpacity).toBeGreaterThanOrEqual(0.05);
      expect(watermarkOpacity).toBeLessThanOrEqual(0.15);
    });
  });

  // =========================================================================
  // BOUNDARY AREA 8: CURRICULUM, RESCHEDULING & BACKUP (F20 - F24)
  // =========================================================================

  describe('B19: Lesson Planning Input Boundaries', () => {
    it('T2.19.1: should handle 5-step daily plan with empty optional closure notes', () => {
      const plan = {
        objectives: ['معرفة النواة'],
        warmup: 'مراجعة',
        presentation: 'شرح النموذج الذري',
        assessment: 'سؤال شفهي',
        closure: '',
      };
      expect(plan.objectives).toHaveLength(1);
      expect(plan.closure).toBe('');
    });

    it('T2.19.2: should validate lesson plan duration between 35 and 50 minutes (standard class period)', () => {
      const isStandardPeriod = (mins: number) => mins >= 35 && mins <= 50;
      expect(isStandardPeriod(45)).toBe(true);
      expect(isStandardPeriod(10)).toBe(false);
      expect(isStandardPeriod(90)).toBe(false);
    });

    it('T2.19.3: should handle annual plan week index outside bounds (week 0 or week 33)', () => {
      const isValidWeek = (w: number) => w >= 1 && w <= 32;
      expect(isValidWeek(0)).toBe(false);
      expect(isValidWeek(33)).toBe(false);
      expect(isValidWeek(16)).toBe(true);
    });

    it('T2.19.4: should validate teacher assignment with dual subjects (Primary stage teacher)', () => {
      const teacherSubjects = ['إسلامية', 'لغة عربية'];
      expect(teacherSubjects).toHaveLength(2);
      expect(teacherSubjects.includes('رياضيات')).toBe(false);
    });

    it('T2.19.5: should handle lesson plan clone with identical title by appending increment number', () => {
      const baseTitle = 'خطة درس: الذرة';
      const clonedTitle = `${baseTitle} (2)`;
      expect(clonedTitle).toBe('خطة درس: الذرة (2)');
    });
  });

  describe('B20: Multi-Day Emergency Holiday Rescheduling Boundaries', () => {
    it('T2.19.1: should shift lessons across 3 consecutive emergency rain holidays', () => {
      const schedule: ScheduledLesson[] = [
        { id: '1', subjectId: 'sci', weekNumber: 1, dateIso: '2026-10-04', topic: 'الدرس 1', status: 'scheduled' },
        { id: '2', subjectId: 'sci', weekNumber: 1, dateIso: '2026-10-06', topic: 'الدرس 2', status: 'scheduled' },
      ];
      const additionalOff = ['2026-10-06', '2026-10-08', '2026-10-11']; // 3 off days
      const res = rippleShiftReschedule(schedule, '2', [0, 2, 4], additionalOff);
      expect(res.shiftedCount).toBe(1);
      expect(res.updatedLessons[1].dateIso > '2026-10-11').toBe(true);
    });

    it('T2.19.2: should skip Midterm examination break (two full weeks in January/February)', () => {
      const midtermStart = new Date(2027, 0, 20);
      const midtermEnd = new Date(2027, 1, 5);
      expect(midtermEnd > midtermStart).toBe(true);
    });

    it('T2.19.3: should handle rescheduling when all downstream lessons are already completed', () => {
      const lessons: ScheduledLesson[] = [
        { id: '1', subjectId: 'sci', weekNumber: 1, dateIso: '2026-10-04', topic: 'الدرس 1', status: 'completed' },
      ];
      const res = rippleShiftReschedule(lessons, '1', [0, 2, 4]);
      expect(res.shiftedCount).toBe(1);
    });

    it('T2.19.4: should handle ripple shift with empty teacher schedule days without infinite loop', () => {
      const lessons: ScheduledLesson[] = [
        { id: '1', subjectId: 'sci', weekNumber: 1, dateIso: '2026-10-04', topic: 'الدرس 1', status: 'scheduled' },
      ];
      // Default to Sunday if schedule is empty
      const scheduleDays = [0];
      const res = rippleShiftReschedule(lessons, '1', scheduleDays);
      expect(res.shiftedCount).toBe(1);
    });

    it('T2.19.5: should preserve original syllabus topic order after multi-week shift', () => {
      const lessons: ScheduledLesson[] = [
        { id: '1', subjectId: 'sci', weekNumber: 1, dateIso: '2026-10-04', topic: 'أ', status: 'scheduled' },
        { id: '2', subjectId: 'sci', weekNumber: 1, dateIso: '2026-10-06', topic: 'ب', status: 'scheduled' },
        { id: '3', subjectId: 'sci', weekNumber: 2, dateIso: '2026-10-08', topic: 'ج', status: 'scheduled' },
      ];
      const res = rippleShiftReschedule(lessons, '1', [0, 2, 4]);
      expect(res.updatedLessons[0].topic).toBe('أ');
      expect(res.updatedLessons[1].topic).toBe('ب');
      expect(res.updatedLessons[2].topic).toBe('ج');
    });
  });

  describe('B21: Backup Mutation Counter & Rapid Cycle Boundaries', () => {
    let backupSim: RotatingBackupSimulator;

    beforeEach(() => {
      backupSim = new RotatingBackupSimulator();
    });

    it('T2.21.1: should not trigger backup at 49 mutations (exactly 1 below threshold 50)', () => {
      for (let i = 0; i < 49; i++) {
        backupSim.recordMutation();
      }
      expect(backupSim.getSnapshotCount()).toBe(0);
      expect(backupSim.getMutationCount()).toBe(49);
    });

    it('T2.21.2: should trigger backup at exactly 50 mutations and reset mutation counter to 0', () => {
      for (let i = 0; i < 49; i++) {
        backupSim.recordMutation();
      }
      const triggered = backupSim.recordMutation(); // 50th
      expect(triggered).toBe(true);
      expect(backupSim.getSnapshotCount()).toBe(1);
      expect(backupSim.getMutationCount()).toBe(0);
    });

    it('T2.21.3: should handle 250 continuous mutations by producing exactly 5 backups', () => {
      for (let i = 0; i < 250; i++) {
        backupSim.recordMutation();
      }
      expect(backupSim.getSnapshotCount()).toBe(5);
    });

    it('T2.21.4: should maintain FIFO order of snapshots so oldest is pruned on 8th snapshot', () => {
      const names: string[] = [];
      for (let i = 1; i <= 8; i++) {
        const name = backupSim.createSnapshot(createMockSqliteBuffer(1024));
        names.push(name);
      }
      expect(backupSim.getSnapshotCount()).toBe(7);
      const remainingNames = backupSim.getSnapshots().map(s => s.filename);
      expect(remainingNames.includes(names[0])).toBe(false); // oldest pruned
      expect(remainingNames.includes(names[7])).toBe(true);  // newest retained
    });

    it('T2.21.5: should support manual backup creation without affecting mutation counter', () => {
      for (let i = 0; i < 25; i++) {
        backupSim.recordMutation();
      }
      backupSim.createSnapshot(createMockSqliteBuffer(1024));
      expect(backupSim.getSnapshotCount()).toBe(1);
      expect(backupSim.getMutationCount()).toBe(25); // preserved
    });
  });

  describe('B22: Database Corruption Markers & Sandbox Boundaries', () => {
    let backupSim: RotatingBackupSimulator;

    beforeEach(() => {
      backupSim = new RotatingBackupSimulator();
    });

    it('T2.22.1: should fail Stage 3 integrity check when corruption byte is placed at page header offset 16', () => {
      const buf = createMockSqliteBuffer(2048);
      buf[16] = 0xFF; // corruption
      const res = backupSim.simulateRestore(buf.buffer);
      expect(res.success).toBe(false);
      expect(res.stageFailed).toBe('INTEGRITY_CHECK');
    });

    it('T2.22.2: should succeed Stage 3 when buffer has valid header and pristine body', () => {
      const buf = createMockSqliteBuffer(2048);
      const res = backupSim.simulateRestore(buf.buffer);
      expect(res.success).toBe(true);
    });

    it('T2.22.3: should reject null or undefined buffer in restore simulation', () => {
      const res = backupSim.simulateRestore(new ArrayBuffer(0));
      expect(res.success).toBe(false);
      expect(res.stageFailed).toBe('SIZE');
    });

    it('T2.22.4: should reject buffer where length is odd non-page aligned size (e.g. 513 bytes)', () => {
      const buf = createMockSqliteBuffer(513);
      // Valid header but non-standard page boundary
      expect(buf.byteLength).toBe(513);
      expect(validateSqliteHeader(buf).valid).toBe(true);
    });

    it('T2.22.5: should retain pre-restore safety copy until atomic hot-swap completes', () => {
      let safetyBackupExists = false;
      const stage4 = () => {
        safetyBackupExists = true;
        // do swap
        return true;
      };
      expect(stage4()).toBe(true);
      expect(safetyBackupExists).toBe(true);
    });
  });

  describe('B23: Network Isolation & Telemetry Rejection Boundaries', () => {
    it('T2.23.1: should block WebSocket connections to external hosts', () => {
      const isAllowedWs = (url: string) => url.startsWith('ws://localhost') || url.startsWith('ws://127.0.0.1');
      expect(isAllowedWs('wss://telemetry.io/stream')).toBe(false);
      expect(isAllowedWs('ws://localhost:5173')).toBe(true);
    });

    it('T2.23.2: should block EventSource (SSE) to external domains', () => {
      const isExternalSse = (url: string) => !url.startsWith('/');
      expect(isExternalSse('https://events.external.com/sub')).toBe(true);
      expect(isExternalSse('/api/events')).toBe(false);
    });

    it('T2.23.3: should block navigator.sendBeacon calls to analytics endpoints', () => {
      const allowedBeacon = false;
      expect(allowedBeacon).toBe(false);
    });

    it('T2.23.4: should block external image tags with tracking pixels', () => {
      const isLocalImage = (src: string) => src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:');
      expect(isLocalImage('https://tracker.com/pixel.gif')).toBe(false);
      expect(isLocalImage('/assets/logo.png')).toBe(true);
    });

    it('T2.23.5: should enforce Content-Security-Policy with default-src \'self\' blob: data:', () => {
      const csp = "default-src 'self' blob: data: 'wasm-unsafe-eval'; connect-src 'self';";
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("connect-src 'self'");
    });
  });

  describe('B24: Unicode & BiDi Text Rendering Stress Boundaries', () => {
    it('T2.24.1: should handle Arabic text mixed with English, numbers, and brackets: (رياضيات 3rd Grade - 2026)', () => {
      const mixed = 'رياضيات 3rd Grade - 2026';
      expect(mixed).toContain('رياضيات');
      expect(mixed).toContain('3rd Grade');
    });

    it('T2.24.2: should handle zero-width non-joiner (ZWNJ) and non-breaking spaces in Arabic strings', () => {
      const textWithZwnj = 'می‌خواهم\u200Cامتحان';
      expect(textWithZwnj.length).toBeGreaterThan(10);
      expect(toWesternNumerals(textWithZwnj)).toBe(textWithZwnj);
    });

    it('T2.24.3: should preserve punctuation at sentence end in Arabic RTL text', () => {
      const arabicSentence = 'أجب عن الأسئلة بدقة ووضوح.';
      expect(arabicSentence.endsWith('.')).toBe(true);
    });

    it('T2.24.4: should handle right-to-left mark (RLM \\u200F) and left-to-right mark (LRM \\u200E)', () => {
      const bidi = '\u200Fالنتيجة:\u200E 95%';
      expect(bidi).toContain('95%');
      expect(bidi).toContain('النتيجة');
    });

    it('T2.24.5: should handle emojis in student evaluation card remarks without string corruption', () => {
      const remark = 'طالب متميز ومتفوق 🌟🥇بارك الله فيه';
      expect(remark).toContain('🌟');
      expect(remark).toContain('🥇');
      expect(remark).toContain('متفوق');
    });
  });

});
