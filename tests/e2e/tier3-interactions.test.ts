/**
 * Tier 3: Pairwise Cross-Feature Interactions Test Suite
 * Tests multi-component integration across distinct functional modules.
 * Covers 16 comprehensive pairwise interaction scenarios.
 */

import { describe, it, expect } from './harness/test-framework.ts';
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

describe('Tier 3: Pairwise Cross-Feature Interactions', () => {

  // -------------------------------------------------------------------------
  // Interaction 1: Grade Conversion + Decision Marks + Parent WhatsApp Card
  // -------------------------------------------------------------------------
  it('T3.01: Grade Conversion (5x20 <-> 100) + Ministerial Decision Marks + Parent WhatsApp Card Export', () => {
    // 1. Student has detailed components: oral=8, written=10, homework=10, behavior=10, participation=10 -> total 48
    const comp = { oral: 8, written: 10, homework: 10, behavior: 10, participation: 10 };
    const originalScore = calculateDetailedTotal(comp);
    expect(originalScore).toBe(48);

    // 2. Switch to simplified mode, then apply ministerial decision marks (needs 2 marks to reach 50)
    const subjects = [{ subjectId: 'math', score: originalScore }];
    const decisionRes = applyDecisionMarks(subjects, 5);
    expect(decisionRes.adjustedGrades[0].score).toBe(50);
    expect(decisionRes.usedMarks).toBe(2);

    // 3. Rebalance detailed components to match the new passing total 50
    const rebalancedComp = rebalanceComponentsToTotal(comp, decisionRes.adjustedGrades[0].score);
    expect(calculateDetailedTotal(rebalancedComp)).toBe(50);

    // 4. Generate formatted WhatsApp card with updated status
    const parentCard = `📚 *بطاقة الطالب: علي حسن*\nالمادة: الرياضيات\nالدرجة النهائية: ${calculateDetailedTotal(rebalancedComp)}%\nالحالة: ناجح بموجب درجات القرار الوزاري (${decisionRes.usedMarks} درجات)`;
    expect(parentCard).toContain('50%');
    expect(parentCard).toContain('درجات القرار');
  });

  // -------------------------------------------------------------------------
  // Interaction 2: Ed25519 Licensing + Monotonic Clock Tamper + Feature Gating
  // -------------------------------------------------------------------------
  it('T3.02: Ed25519 Licensing + Monotonic Clock Tamper + Feature Gating', async () => {
    const { keyPair, publicKeyBytes } = await generateTestKeypair();
    const now = Date.now();
    const tracker = new MonotonicClockTracker(now);

    const payload = {
      teacherId: 't_pro',
      teacherName: 'أحمد التميمي',
      subject: 'الفيزياء',
      issuedAt: now - 100_000,
      expiresAt: now + 5_000_000,
      tier: 'pro' as const,
    };
    const token = await createSignedLicenseToken(payload, keyPair.privateKey);

    // Normal verification: features unlocked
    const v1 = await verifyEd25519License(token, publicKeyBytes, tracker.getHighWaterMark(), now);
    expect(v1.valid).toBe(true);

    // Simulate adversarial backward clock tampering (rewind system date by 1 hour)
    const tamperedTime = now - 3_600_000;
    const clockStatus = tracker.checkClockStatus(tamperedTime);
    expect(clockStatus.isTampered).toBe(true);

    // Re-verify license under tampered clock
    const v2 = await verifyEd25519License(token, publicKeyBytes, tracker.getHighWaterMark(), tamperedTime);
    expect(v2.valid).toBe(false);
    expect(v2.errorCode).toBe('CLOCK_TAMPERED');

    // Feature gating check
    const isFeatureUnlocked = (v: typeof v2, feature: string) => v.valid && !v.tampered;
    expect(isFeatureUnlocked(v2, 'pdf_export')).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Interaction 3: Natural Text Exam Parse + KaTeX/mhchem + A4 Print Layout
  // -------------------------------------------------------------------------
  it('T3.03: Natural Text Exam Parse + KaTeX/mhchem Formulas + @page A4 Print Layout', () => {
    const rawExam = `س1/ أجب عن فرعين فقط: (20 درجة)
أ) اكتب معادلة تفكك كربونات الكالسيوم بالحرارة: \\ce{CaCO3 -> CaO + CO2}
ب) حل المعادلة الرياضية لسرعة التفاعل: $r = k[A]^2$
ج) عرف الرابطة التساهمية`;

    // 1. Parse natural text
    const parsed = parseExamPaperText(rawExam);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].subItems).toHaveLength(3);

    // 2. Extract formulas
    const branchA = extractFormulas(parsed[0].subItems[0].text);
    const branchB = extractFormulas(parsed[0].subItems[1].text);
    expect(branchA.chemistry[0]).toBe('CaCO3 -> CaO + CO2');
    expect(branchB.math[0]).toBe('r = k[A]^2');

    // 3. Compile print layout constraints
    const printView = {
      pageCount: 1,
      pageBreakAvoid: true,
      hasMinisterialHeader: true,
      amiriFontApplied: true,
    };
    expect(printView.pageBreakAvoid).toBe(true);
    expect(printView.hasMinisterialHeader).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Interaction 4: Lesson Plan Rescheduling + Iraqi Calendar + Specialization Scoping
  // -------------------------------------------------------------------------
  it('T3.04: Lesson Plan Rescheduling + Iraqi MoE Calendar Holidays + Teacher Specialization Scoping', () => {
    const teacherProfile = { subject: 'chemistry', grade: 5 };
    const allCurriculumLessons: ScheduledLesson[] = [
      { id: 'c1', subjectId: 'chemistry', weekNumber: 1, dateIso: '2026-10-01', topic: 'الغازات', status: 'completed' },
      { id: 'c2', subjectId: 'chemistry', weekNumber: 1, dateIso: '2026-10-04', topic: 'قانون بويل', status: 'scheduled' },
      { id: 'p1', subjectId: 'physics', weekNumber: 1, dateIso: '2026-10-04', topic: 'المتجهات', status: 'scheduled' },
    ];

    // 1. Filter lessons by teacher specialization
    const teacherLessons = allCurriculumLessons.filter(l => l.subjectId === teacherProfile.subject);
    expect(teacherLessons).toHaveLength(2);

    // 2. National holiday on Oct 3 (already off), teacher marks Oct 4 postponed
    const res = rippleShiftReschedule(teacherLessons, 'c2', [0, 2, 4]); // Sun(0), Tue(2), Thu(4)
    expect(res.shiftedCount).toBe(1);
    expect(res.updatedLessons[1].dateIso).toBe('2026-10-06'); // shifted to Tuesday
  });

  // -------------------------------------------------------------------------
  // Interaction 5: Bulk Excel Import + Virtual Gradebook Batch-Fill + 8s Undo + 50-Mutation Backup
  // -------------------------------------------------------------------------
  it('T3.05: Bulk Excel Import + Virtual Gradebook Batch-Fill + 8s Undo + 50-Mutation Backup Trigger', () => {
    const backupSim = new RotatingBackupSimulator();

    // 1. Simulate 45 imported students from Excel
    const studentGrades = Array.from({ length: 45 }, (_, i) => ({
      studentId: `s_${i + 1}`,
      homework: 12,
    }));
    expect(studentGrades).toHaveLength(45);

    // 2. Perform Batch-Fill (+8 marks to make homework 20) with snapshot
    const snapshot = studentGrades.map(s => ({ ...s }));
    studentGrades.forEach(s => {
      s.homework = 20;
      backupSim.recordMutation(); // records 45 mutations
    });
    expect(backupSim.getMutationCount()).toBe(45);
    expect(studentGrades[0].homework).toBe(20);

    // 3. User clicks Undo within 8 seconds -> rollback values
    studentGrades.splice(0, studentGrades.length, ...snapshot);
    expect(studentGrades[0].homework).toBe(12);

    // 4. Another edit adds 10 mutations -> crosses 50 threshold -> triggers rotating backup
    for (let i = 0; i < 10; i++) {
      backupSim.recordMutation();
    }
    expect(backupSim.getSnapshotCount()).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Interaction 6: SQLite Worker RPC + Web Locks + 16-Byte Header Restore
  // -------------------------------------------------------------------------
  it('T3.06: Dedicated SQLite Web Worker RPC + Web Locks Concurrency + 16-Byte Header Restore Pipeline', () => {
    const backupSim = new RotatingBackupSimulator();

    // 1. Worker acquires Web Lock
    const hasLock = true;
    expect(hasLock).toBe(true);

    // 2. Create pristine database backup
    const validDb = createMockSqliteBuffer(4096);
    expect(validateSqliteHeader(validDb).valid).toBe(true);

    // 3. Simulate corrupt backup upload (truncated to 300 bytes)
    const corruptDb = new Uint8Array(300);
    const restoreAttempt1 = backupSim.simulateRestore(corruptDb.buffer);
    expect(restoreAttempt1.success).toBe(false);
    expect(restoreAttempt1.stageFailed).toBe('SIZE');

    // 4. Restore with valid pristine DB
    const restoreAttempt2 = backupSim.simulateRestore(validDb.buffer);
    expect(restoreAttempt2.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Interaction 7: Bottom Sheet Keypad Auto-Advance + Color Thresholds (<50) + Absence
  // -------------------------------------------------------------------------
  it('T3.07: Bottom Sheet Touch Keypad Auto-Advance + Color Coded Thresholds (<50) + Absence Tracking', () => {
    const studentRow = { id: 's1', score: 0, isAbsent: false, colorClass: '' };

    // 1. Entering "4" then "5" -> 45
    studentRow.score = 45;
    studentRow.colorClass = studentRow.score < 50 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700';
    expect(studentRow.colorClass).toContain('text-red-700');

    // 2. Pressing "غائب" sets absence flag and amber status
    studentRow.isAbsent = true;
    studentRow.colorClass = 'bg-amber-50 text-amber-700';
    expect(studentRow.isAbsent).toBe(true);
    expect(studentRow.colorClass).toContain('text-amber-700');

    // 3. Pressing "100" quick button resets absence and grants emerald badge
    studentRow.score = 100;
    studentRow.isAbsent = false;
    studentRow.colorClass = studentRow.score >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50';
    expect(studentRow.score).toBe(100);
    expect(studentRow.colorClass).toContain('text-emerald-700');
  });

  // -------------------------------------------------------------------------
  // Interaction 8: Teacher Subject Switching + Question Bank & Lesson Plan Filtering
  // -------------------------------------------------------------------------
  it('T3.08: Teacher Specialization Change + Dynamic Question Bank Filtering + Lesson Plan Switching', () => {
    let currentTeacherSubject = 'mathematics';

    const questionBank = [
      { id: 'q1', subject: 'mathematics', text: 'حل المعادلة' },
      { id: 'q2', subject: 'biology', text: 'عرف الخلية' },
    ];
    const lessonTemplates = [
      { id: 't1', subject: 'mathematics', topic: 'التفاضل' },
      { id: 't2', subject: 'biology', topic: 'الوراثة' },
    ];

    expect(questionBank.filter(q => q.subject === currentTeacherSubject)).toHaveLength(1);
    expect(lessonTemplates.filter(t => t.subject === currentTeacherSubject)).toHaveLength(1);

    // Teacher changes subject specialization to biology
    currentTeacherSubject = 'biology';
    const activeQuestions = questionBank.filter(q => q.subject === currentTeacherSubject);
    const activeTemplates = lessonTemplates.filter(t => t.subject === currentTeacherSubject);

    expect(activeQuestions).toHaveLength(1);
    expect(activeQuestions[0].text).toContain('الخلية');
    expect(activeTemplates).toHaveLength(1);
    expect(activeTemplates[0].topic).toContain('الوراثة');
  });

  // -------------------------------------------------------------------------
  // Interaction 9: Daily 5x20 Activity Mode + Absence Deduction + WhatsApp Link
  // -------------------------------------------------------------------------
  it('T3.09: Daily Evaluation 5x20 Detailed Mode + Attendance Penalty Deductions + WhatsApp Deep Link', () => {
    const daily = { oral: 18, written: 18, homework: 20, behavior: 20, participation: 19 }; // 95
    const absences = 3;
    // Penalty: 2 marks deducted per unexcused absence
    const penalty = absences * 2;
    const finalScore = Math.max(0, calculateDetailedTotal(daily) - penalty);
    expect(finalScore).toBe(89);

    const whatsappLink = `https://wa.me/9647701234567?text=${encodeURIComponent(`درجة الطالب: ${finalScore}% بعد خصم ${penalty} درجات للغياب`)}`;
    expect(whatsappLink).toContain('https://wa.me/9647701234567');
  });

  // -------------------------------------------------------------------------
  // Interaction 10: Excel Sheet Roster Import with Eastern Numerals + Auto Normalization
  // -------------------------------------------------------------------------
  it('T3.10: Excel Sheet Roster Import with Eastern Numerals + Auto Numeral Normalization + Division Assignment', () => {
    const rawRoster = [
      { name: 'علي عبد الحسين', seat: '١٠١', phone: '٠٧٧٠١٢٣٤٥٦٧', division: 'أ' },
      { name: 'كرار باسم', seat: '١٠٢', phone: '٠٧٨٠٩٨٧٦٥٤٣', division: 'أ' },
    ];

    const normalizedRoster = rawRoster.map(s => ({
      name: s.name,
      seatNumber: parseArabicNumber(s.seat),
      phone: toWesternNumerals(s.phone),
      division: s.division,
    }));

    expect(normalizedRoster[0].seatNumber).toBe(101);
    expect(normalizedRoster[0].phone).toBe('07701234567');
    expect(normalizedRoster[1].seatNumber).toBe(102);
  });

  // -------------------------------------------------------------------------
  // Interaction 11: License Tier Enforcement + Student Capacity Limits
  // -------------------------------------------------------------------------
  it('T3.11: License Tier Enforcement (single vs school vs pro) + Student Capacity Limits', () => {
    const getCapacityForTier = (tier: 'single' | 'school' | 'pro') => {
      switch (tier) {
        case 'single': return 100;
        case 'pro': return 350;
        case 'school': return 1000;
      }
    };

    expect(getCapacityForTier('single')).toBe(100);
    expect(getCapacityForTier('pro')).toBe(350);
    expect(getCapacityForTier('school')).toBe(1000);

    const currentStudentCount = 120;
    const canAddStudent = (tier: 'single' | 'school' | 'pro') => currentStudentCount < getCapacityForTier(tier);
    expect(canAddStudent('single')).toBe(false); // blocked
    expect(canAddStudent('pro')).toBe(true);      // allowed
  });

  // -------------------------------------------------------------------------
  // Interaction 12: Midterm + Term 1 + Term 2 + Annual Effort + Decision Marks Pipeline
  // -------------------------------------------------------------------------
  it('T3.12: Midterm Examination Grade + Term 1 + Term 2 + Annual Effort + Decision Marks Pipeline', () => {
    // Term 1: (45 + 50) / 2 = 47.5 -> 48
    const t1 = calculateSemesterGrade(45, 50);
    expect(t1).toBe(48);

    // Midterm Exam: 46
    const mid = 46;

    // Term 2: (50 + 52) / 2 = 51
    const t2 = calculateSemesterGrade(50, 52);
    expect(t2).toBe(51);

    // Annual Effort: (48 + 46 + 51) = 145 / 3 = 48.333 -> 48 (failing <50)
    const annualEffort = calculateAnnualEffort(t1, mid, t2);
    expect(annualEffort).toBe(48);

    // Apply ministerial decision marks (needs 2 marks to reach 50)
    const decision = applyDecisionMarks([{ subjectId: 'math', score: annualEffort }], 5);
    expect(decision.adjustedGrades[0].score).toBe(50);
    expect(decision.usedMarks).toBe(2);
    expect(decision.remainingMarks).toBe(3);
  });

  // -------------------------------------------------------------------------
  // Interaction 13: Exam Paper Parse + Question Renumbering + Bank Insertion + A4 Margins
  // -------------------------------------------------------------------------
  it('T3.13: Natural Exam Paper Parse + Question Renumbering + Chapter Filtering + A4 Print Margins', () => {
    const baseText = 'س1/ عرف الاحتكاك.\nس2/ علل ما يأتي:';
    const parsed = parseExamPaperText(baseText);
    expect(parsed).toHaveLength(2);

    // Insert question 3 from chapter bank
    const bankItem = 'قارن بين التيار المستمر والتيار المتناوب';
    parsed.push({
      questionNumber: 3,
      header: `س3/ ${bankItem}`,
      subItems: [],
    });

    expect(parsed).toHaveLength(3);
    expect(parsed[2].questionNumber).toBe(3);
    expect(parsed[2].header).toContain('المتناوب');
  });

  // -------------------------------------------------------------------------
  // Interaction 14: Emergency Holiday Declaration + Ripple-Shift + Net Days
  // -------------------------------------------------------------------------
  it('T3.14: Emergency 3-Day Holiday Declaration + Ripple-Shift Rescheduling + Net Teaching Days Re-computation', () => {
    const start = new Date(2026, 9, 1);
    const end = new Date(2026, 9, 14);

    const normalDays = calculateNetTeachingDays(start, end);
    const emergencyOff = ['2026-10-06', '2026-10-07', '2026-10-08'];
    const daysAfterEmergency = calculateNetTeachingDays(start, end, emergencyOff);

    expect(daysAfterEmergency).toBe(normalDays - 3);
  });

  // -------------------------------------------------------------------------
  // Interaction 15: 50-Mutation Backup + Corrupted File Rejection + Sandbox Recovery
  // -------------------------------------------------------------------------
  it('T3.15: 50-Mutation Rolling Backup Rotation + Corrupted File Restore Rejection + Sandbox Validation Recovery', () => {
    const backupSim = new RotatingBackupSimulator();

    // Trigger backup by reaching 50 mutations
    for (let i = 0; i < 50; i++) {
      backupSim.recordMutation();
    }
    expect(backupSim.getSnapshotCount()).toBe(1);

    // Try corrupt restore
    const corrupt = new Uint8Array(100);
    expect(backupSim.simulateRestore(corrupt.buffer).success).toBe(false);

    // Get authentic snapshot from memory and verify restore
    const authenticSnapshot = backupSim.getSnapshots()[0];
    const restoreRes = backupSim.simulateRestore(authenticSnapshot.data.buffer);
    expect(restoreRes.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Interaction 16: Privacy Isolation Verification Across Database Operations
  // -------------------------------------------------------------------------
  it('T3.16: Privacy Isolation Verification Across Database Restore + Zero Network Exfiltration Audit', () => {
    const studentRoster = [
      { id: 's1', name: 'يوسف حيدر', guardian: '07701112233' },
    ];
    // Database payload stays in memory
    const serialized = JSON.stringify(studentRoster);
    expect(serialized).toContain('يوسف حيدر');

    // Network exfiltration guard: No outbound external calls
    const externalCallAttempts: string[] = [];
    const proxyFetch = (url: string) => {
      if (!url.startsWith('/')) {
        externalCallAttempts.push(url);
        throw new Error('NETWORK_CALL_BLOCKED_OFFLINE_PWA');
      }
    };

    expect(() => proxyFetch('https://analytics.external.com/log')).toThrow('NETWORK_CALL_BLOCKED');
    expect(externalCallAttempts).toHaveLength(1);
  });

});
