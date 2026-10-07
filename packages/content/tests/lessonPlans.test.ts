import { describe, it, expect } from 'vitest';
import {
  MINISTERIAL_FIVE_STEPS,
  getAllLessonTemplates,
  getLessonTemplateById,
  createAnnualPlan,
  validateLessonPlanDuration,
  isValidAnnualWeek,
  cloneLessonPlan,
  calculateLessonProgress,
  filterCurriculumForTeacher,
} from '../src/index.js';

describe('Iraqi MoE Lesson Plans & Verification (R5)', () => {
  it('should enforce official 5-step ministerial daily lesson plan architecture', () => {
    expect(MINISTERIAL_FIVE_STEPS).toHaveLength(5);
    expect(MINISTERIAL_FIVE_STEPS[0]).toContain('الأهداف السلوكية');
    expect(MINISTERIAL_FIVE_STEPS[1]).toContain('التمهيد والتهيئة');
    expect(MINISTERIAL_FIVE_STEPS[2]).toContain('العرض والأنشطة');
    expect(MINISTERIAL_FIVE_STEPS[3]).toContain('التقويم التكويني');
    expect(MINISTERIAL_FIVE_STEPS[4]).toContain('الواجب البيتي');
  });

  it('should validate official daily lesson templates for primary and secondary stages', () => {
    const templates = getAllLessonTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(3);

    // Karrar teacher in Najaf scenario: Primary Grade 5 Science Respiratory System
    const karrarPlan = getLessonTemplateById('lp_tpl_sci_5_resp');
    expect(karrarPlan).toBeDefined();
    expect(karrarPlan?.topic).toContain('الجهاز التنفسي وصحته');
    expect(karrarPlan?.grade).toBe(5);
    expect(karrarPlan?.stage).toBe('primary');
    expect(karrarPlan?.durationMinutes).toBe(45);
    expect(karrarPlan?.objectives.length).toBeGreaterThan(0);
    expect(karrarPlan?.warmup).toBeTruthy();
    expect(karrarPlan?.presentation).toBeTruthy();
    expect(karrarPlan?.assessment).toBeTruthy();
    expect(karrarPlan?.closure).toBeTruthy();
    expect(karrarPlan?.supervisoryDoc?.schoolName).toBeTruthy();
  });

  it('should validate lesson plan duration between 35 and 50 minutes (standard class period)', () => {
    expect(validateLessonPlanDuration(45)).toBe(true);
    expect(validateLessonPlanDuration(35)).toBe(true);
    expect(validateLessonPlanDuration(50)).toBe(true);

    // Out of bounds
    expect(validateLessonPlanDuration(10)).toBe(false);
    expect(validateLessonPlanDuration(34)).toBe(false);
    expect(validateLessonPlanDuration(51)).toBe(false);
    expect(validateLessonPlanDuration(90)).toBe(false);
  });

  it('should map annual plan across exactly 32 active teaching weeks', () => {
    const annualPlan = createAnnualPlan('chemistry_scientific', 5, { semesterSplit: 16, periodsPerWeek: 5 });
    expect(annualPlan).toHaveLength(32);
    expect(annualPlan[0].week).toBe(1);
    expect(annualPlan[31].week).toBe(32);
    expect(annualPlan[0].periodsPerWeek).toBe(5);

    // Verify unit grouping (8 units, ~4 weeks each)
    expect(annualPlan[0].unit).toBe('الوحدة 1');
    expect(annualPlan[3].unit).toBe('الوحدة 1');
    expect(annualPlan[4].unit).toBe('الوحدة 2');
    expect(annualPlan[31].unit).toBe('الوحدة 8');

    // Verify semesters
    expect(annualPlan[0].semester).toBe(1);
    expect(annualPlan[15].semester).toBe(1);
    expect(annualPlan[16].semester).toBe(2);
    expect(annualPlan[31].semester).toBe(2);
  });

  it('should handle annual plan week index outside bounds (week 0 or week 33)', () => {
    expect(isValidAnnualWeek(0)).toBe(false);
    expect(isValidAnnualWeek(33)).toBe(false);
    expect(isValidAnnualWeek(-1)).toBe(false);
    expect(isValidAnnualWeek(100)).toBe(false);

    expect(isValidAnnualWeek(1)).toBe(true);
    expect(isValidAnnualWeek(16)).toBe(true);
    expect(isValidAnnualWeek(32)).toBe(true);
  });

  it('should support copying previous lesson plan template with auto-incremented title and target division', () => {
    const originalPlan = getLessonTemplateById('lp_tpl_chem_5_bonds')!;
    const clonedPlan = cloneLessonPlan(originalPlan, 'ج');

    expect(clonedPlan.id).not.toBe(originalPlan.id);
    expect(clonedPlan.division).toBe('ج');
    expect(clonedPlan.topic).toBe(`${originalPlan.topic} (2)`);

    // Further clone increments to (3)
    const secondClone = cloneLessonPlan(clonedPlan);
    expect(secondClone.topic).toBe(`${originalPlan.topic} (3)`);
  });

  it('should calculate lesson progress percentage and handle edge cases', () => {
    const lessons: Array<{ status: 'completed' | 'scheduled' | 'postponed' | 'holiday' }> = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'scheduled' },
      { status: 'postponed' },
    ];
    const progress = calculateLessonProgress(lessons);
    expect(progress.totalCount).toBe(4);
    expect(progress.completedCount).toBe(2);
    expect(progress.percentage).toBe(50);

    const empty = calculateLessonProgress([]);
    expect(empty.totalCount).toBe(0);
    expect(empty.completedCount).toBe(0);
    expect(empty.percentage).toBe(0);
  });

  it('should isolate curriculum resources by teacher specialization', () => {
    const teacherProfile = {
      subject: 'physics',
      stage: 'preparatory' as const,
      grade: 4,
    };
    const materials = [
      { subject: 'physics', grade: 4, title: 'كتاب الفيزياء الرابع العلمي' },
      { subject: 'biology', grade: 4, title: 'كتاب الأحياء الرابع العلمي' },
      { subject: 'physics', grade: 5, title: 'كتاب الفيزياء الخامس العلمي' },
    ];
    const accessible = filterCurriculumForTeacher(teacherProfile, materials);
    expect(accessible).toHaveLength(1);
    expect(accessible[0].title).toBe('كتاب الفيزياء الرابع العلمي');
  });
});
