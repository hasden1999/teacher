import { describe, it, expect } from 'vitest';
import {
  IRAQ_DEFAULT_V1_SCHEME,
  evaluate,
  project,
  solveFor,
  explain,
  deriveMonthlyComponents,
  scaleExamScore,
  type StudentGradeInput,
} from '../src/index.js';

describe('@techeeer/grading-engine — Section 6 Mandatory Test Vectors', () => {
  const mandatoryStudentData: StudentGradeInput = {
    months: {
      m1: {
        components: {
          activity: 18,
          behavior: 19,
          prep: 17,
          attendance: 20,
          custom1: 16,
        },
        monthlyExam: 80,
      },
      m2: {
        componentsSum: 80,
        monthlyExam: 70,
      },
      m3: {
        componentsSum: 95,
        monthlyExam: 85,
      },
      m4: {
        componentsSum: 85,
        monthlyExam: 75,
      },
    },
    halfYearExam: 70,
    finalExam: 60,
  };

  it('matches every single Section 6.4 mandatory grade vector exactly', () => {
    const res = evaluate(IRAQ_DEFAULT_V1_SCHEME, mandatoryStudentData);

    expect(res.status).toBe('complete');
    expect(res.nodes.m1_componentsSum.displayValue).toBe(90);
    expect(res.nodes.m1.displayValue).toBe(85);
    expect(res.nodes.m2.displayValue).toBe(75);
    expect(res.nodes.term1.displayValue).toBe(80);
    expect(res.nodes.halfYearExam.displayValue).toBe(70);
    expect(res.nodes.m3.displayValue).toBe(90);
    expect(res.nodes.m4.displayValue).toBe(80);
    expect(res.nodes.term2.displayValue).toBe(85);
    expect(res.nodes.annualSaee.displayValue).toBe(78.33);
    expect(res.nodes.final.displayValue).toBe(69.17);
    expect(res.passStatus).toBe('pass');
  });

  it('calculates solveFor required final exam marks matching Section 6.4 vectors', () => {
    // 1. Annual Saee 78.33 -> required for pass (50) is 100 - 78.33 = 21.67
    const solveMain = solveFor(IRAQ_DEFAULT_V1_SCHEME, mandatoryStudentData);
    expect(solveMain.displayRequiredScore).toBe(21.67);

    // 2. Annual Saee 40 -> 60, 30 -> 70, 25 -> 75
    const makeSaeeInput = (saee: number): StudentGradeInput => ({
      months: {
        m1: { componentsSum: saee, monthlyExam: saee },
        m2: { componentsSum: saee, monthlyExam: saee },
        m3: { componentsSum: saee, monthlyExam: saee },
        m4: { componentsSum: saee, monthlyExam: saee },
      },
      halfYearExam: saee,
    });

    expect(solveFor(IRAQ_DEFAULT_V1_SCHEME, makeSaeeInput(40)).displayRequiredScore).toBe(60);
    expect(solveFor(IRAQ_DEFAULT_V1_SCHEME, makeSaeeInput(30)).displayRequiredScore).toBe(70);
    expect(solveFor(IRAQ_DEFAULT_V1_SCHEME, makeSaeeInput(25)).displayRequiredScore).toBe(75);
  });

  it('derives monthly components from daily events matching Section 6.3 & 6.4 examples', () => {
    // Section 6.4: 25 sessions, 2 absences -> 20 * 23/25 = 18.4 -> with 0.5 step = 18.5
    const derived25 = deriveMonthlyComponents(
      IRAQ_DEFAULT_V1_SCHEME,
      [
        { type: 'attendance', value: 'absent' },
        { type: 'attendance', value: 'absent' },
      ],
      25
    );
    expect(derived25.attendance.rawSuggested).toBe(18.4);
    expect(derived25.attendance.suggestedValue).toBe(18.5);

    // Section 6.3 table examples:
    // Attendance: 24 sessions, 3 absences -> 17.5
    // Activity: 7 participations (target 10) -> 14
    // Behavior: 2 negative notes -> 18
    // Prep: 8 done out of 10 -> 16
    const events63 = [
      { type: 'attendance' as const, value: 'absent' as const },
      { type: 'attendance' as const, value: 'absent' as const },
      { type: 'attendance' as const, value: 'absent' as const },
      ...Array.from({ length: 7 }, () => ({ type: 'participation' as const, value: 1 })),
      { type: 'behavior' as const, value: 'negative' as const },
      { type: 'behavior' as const, value: 'negative' as const },
      ...Array.from({ length: 8 }, () => ({ type: 'prep' as const, value: 'done' as const })),
      ...Array.from({ length: 2 }, () => ({ type: 'prep' as const, value: 'not_done' as const })),
    ];

    const derived63 = deriveMonthlyComponents(IRAQ_DEFAULT_V1_SCHEME, events63, 24);
    expect(derived63.attendance.suggestedValue).toBe(17.5);
    expect(derived63.activity.suggestedValue).toBe(14);
    expect(derived63.behavior.suggestedValue).toBe(18);
    expect(derived63.prep.suggestedValue).toBe(16);
  });

  it('never treats missing or absent grades as zero when absentPolicy is incomplete', () => {
    const partialData: StudentGradeInput = {
      months: {
        m1: { componentsSum: 90, monthlyExam: 'absent' },
      },
    };
    const res = evaluate(IRAQ_DEFAULT_V1_SCHEME, partialData);
    expect(res.status).toBe('incomplete');
    expect(res.nodes.m1.status).toBe('absent');
    expect(res.nodes.m1.displayValue).toBeNull();
    expect(res.missingFields).toContain('m1.monthlyExam');
  });

  it('supports absentPolicy = zero when configured in scheme', () => {
    const zeroScheme = { ...IRAQ_DEFAULT_V1_SCHEME, absentPolicy: 'zero' as const };
    const data: StudentGradeInput = {
      months: {
        m1: { componentsSum: 80, monthlyExam: 'absent' },
        m2: { componentsSum: 80, monthlyExam: 80 },
        m3: { componentsSum: 80, monthlyExam: 80 },
        m4: { componentsSum: 80, monthlyExam: 80 },
      },
      halfYearExam: 80,
      finalExam: 80,
    };
    const res = evaluate(zeroScheme, data);
    expect(res.nodes.m1.displayValue).toBe(40); // (80 + 0) / 2
    expect(res.status).toBe('complete');
  });

  it('provides temporary projections tagged with مؤقّت and full Arabic explanations', () => {
    const partial: StudentGradeInput = {
      months: {
        m1: { componentsSum: 90, monthlyExam: 80 },
      },
    };
    const proj = project(IRAQ_DEFAULT_V1_SCHEME, partial);
    expect(proj.isTemporary).toBe(true);
    expect(proj.badgeLabel).toBe('مؤقّت');
    expect(proj.projectedFinal).toBe(85);

    const tree = explain(IRAQ_DEFAULT_V1_SCHEME, mandatoryStudentData, 'annualSaee');
    expect(tree.labelAr).toBe('السعي السنوي');
    expect(tree.displayValue).toBe(78.33);
    expect(tree.inputs).toHaveLength(3);
  });

  it('scales exam scores from non-100 maxMarks properly', () => {
    expect(scaleExamScore(40, 50, 100)).toBe(80);
  });
});
