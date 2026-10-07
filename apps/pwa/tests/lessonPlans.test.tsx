// @vitest-environment jsdom
/**
 * Milestone 6 Test Suite: Iraqi Curriculum & Lesson Plans Studio
 * Verifies:
 * - 5-Step ministerial daily lesson plan authoring & supervisory verification
 * - Iraqi calendar holiday awareness & ripple-shift rescheduling
 * - 32-Week annual plan distribution
 * - Teacher subject filtering
 * - Database persistence via LessonPlanDbService
 */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LessonPlanEditor,
  PlanTracker,
  AnnualPlanView,
  PlansStudio,
} from '../src/components/plans/index.js';
import { lessonPlanDbService } from '../src/services/lessonPlanDbService.js';
import {
  createAnnualPlan,
  cloneLessonPlan,
  validateLessonPlanDuration,
  filterCurriculumForTeacher,
  calculateLessonProgress,
  LESSON_TEMPLATES,
  type DailyLessonPlan,
  type TeacherProfile,
} from '@techeeer/content';
import {
  checkIraqiDate,
  isOfficialHoliday,
  rescheduleLessonPlan,
} from '@techeeer/core';
import { dbClient } from '../src/worker/dbClient.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Milestone 6: Curriculum & Lesson Plans Studio', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const mockTeacher: TeacherProfile = {
    subject: 'science_primary',
    stage: 'primary',
    grade: 5,
    secondarySubjects: ['chemistry_scientific'],
  };

  describe('1. 5-Step Ministerial Lesson Plan Editor', () => {
    it('validates lesson plan duration within Iraqi standard (35 to 50 minutes)', () => {
      expect(validateLessonPlanDuration(45)).toBe(true);
      expect(validateLessonPlanDuration(35)).toBe(true);
      expect(validateLessonPlanDuration(50)).toBe(true);
      expect(validateLessonPlanDuration(20)).toBe(false);
      expect(validateLessonPlanDuration(60)).toBe(false);
    });

    it('renders all 5 canonical ministerial steps in the editor', async () => {
      await act(async () => {
        root.render(<LessonPlanEditor teacher={mockTeacher} />);
      });

      expect(container.textContent).toContain('الأهداف السلوكية');
      expect(container.textContent).toContain('التمهيد والتهيئة');
      expect(container.textContent).toContain('العرض والأنشطة');
      expect(container.textContent).toContain('التقويم التكويني');
      expect(container.textContent).toContain('الواجب البيتي والغلق');
    });

    it('clones a lesson plan with unique ID and incremented title', () => {
      const template = LESSON_TEMPLATES[0];
      const cloned = cloneLessonPlan(template, 'ب');

      expect(cloned.id).not.toBe(template.id);
      expect(cloned.division).toBe('ب');
      expect(cloned.topic).toContain('(2)');
      expect(cloned.objectives).toEqual(template.objectives);
    });

    it('allows switching between the 5 steps and editing content', async () => {
      await act(async () => {
        root.render(<LessonPlanEditor teacher={mockTeacher} />);
      });

      // Switch to Step 2: التمهيد والتهيئة
      const buttons = Array.from(container.querySelectorAll('button'));
      const step2Btn = buttons.find((b) => b.textContent?.includes('التمهيد والتهيئة'));
      expect(step2Btn).toBeDefined();

      await act(async () => {
        step2Btn?.click();
      });

      const textarea = container.querySelector('textarea');
      expect(textarea).not.toBeNull();
      expect(textarea?.placeholder).toContain('اكتب التمهيد');
    });

    it('opens supervisory inspection modal with school name and signature area', async () => {
      await act(async () => {
        root.render(<LessonPlanEditor teacher={mockTeacher} />);
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const previewBtn = buttons.find((b) => b.textContent?.includes('معاينة إشرافية'));
      expect(previewBtn).toBeDefined();

      await act(async () => {
        previewBtn?.click();
      });

      expect(container.textContent).toContain('جمهورية العراق');
      expect(container.textContent).toContain('وزارة التربية');
      expect(container.textContent).toContain('توقيع المشرف التربوي');
    });
  });

  describe('2. Teacher Subject Specialization Filtering', () => {
    it('filters lesson templates strictly matching teacher subject and secondary subjects', () => {
      const filtered = filterCurriculumForTeacher(mockTeacher, LESSON_TEMPLATES);

      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((tpl) => {
        const matches =
          tpl.subjectId.includes('science') ||
          tpl.subjectId.includes('chemistry');
        expect(matches).toBe(true);
      });
    });

    it('excludes templates of non-assigned subjects', () => {
      const mathTeacher: TeacherProfile = {
        subject: 'math_primary',
        stage: 'primary',
        grade: 1,
      };

      const filtered = filterCurriculumForTeacher(mathTeacher, LESSON_TEMPLATES);
      expect(filtered.length).toBe(0);
    });
  });

  describe('3. Iraqi Calendar & Ripple-Shift Rescheduling', () => {
    it('identifies official Iraqi solar holidays accurately', () => {
      // 6 January: Army Day (عيد الجيش العراقي)
      const jan6 = checkIraqiDate('2026-01-06');
      expect(jan6.isHoliday).toBe(true);
      expect(jan6.holidayName).toContain('الجيش');
      expect(isOfficialHoliday('2026-01-06')).toBe(true);

      // 21 March: Nowruz (عيد نوروز)
      const mar21 = checkIraqiDate('2026-03-21');
      expect(mar21.isHoliday).toBe(true);
      expect(mar21.holidayName).toContain('نوروز');
    });

    it('identifies weekends (Friday and Saturday) in Iraq', () => {
      const friday = checkIraqiDate('2026-10-09');
      expect(friday.isWeekend).toBe(true);

      const saturday = checkIraqiDate('2026-10-10');
      expect(saturday.isWeekend).toBe(true);

      const sunday = checkIraqiDate('2026-10-11');
      expect(sunday.isWeekend).toBe(false);
    });

    it('performs ripple-shift rescheduling skipping holidays and weekends', () => {
      const lessons = [
        { id: 'l1', title: 'درس 1', unit: 'و1', sequence: 1 },
        { id: 'l2', title: 'درس 2', unit: 'و1', sequence: 2, isPostponed: true },
        { id: 'l3', title: 'درس 3', unit: 'و1', sequence: 3 },
      ];

      // Teaching days: Sunday (0), Tuesday (2), Thursday (4)
      const scheduled = rescheduleLessonPlan(lessons, [0, 2, 4], '2026-10-04', '2026-10-25');

      expect(scheduled.length).toBe(3);
      scheduled.forEach((s) => {
        const d = new Date(s.scheduledDate);
        expect(d.getDay()).not.toBe(5); // Not Friday
        expect(d.getDay()).not.toBe(6); // Not Saturday
      });
      expect(scheduled[1].isRescheduled).toBe(true);
    });

    it('calculates lesson progress percentage accurately', () => {
      const progress1 = calculateLessonProgress([
        { status: 'completed' },
        { status: 'completed' },
        { status: 'scheduled' },
        { status: 'scheduled' },
      ]);
      expect(progress1.percentage).toBe(50);
      expect(progress1.completedCount).toBe(2);
      expect(progress1.totalCount).toBe(4);

      const progressEmpty = calculateLessonProgress([]);
      expect(progressEmpty.percentage).toBe(0);
    });
  });

  describe('4. PlanTracker Component & Interactivity', () => {
    it('renders progress percentage and lesson list', async () => {
      await act(async () => {
        root.render(<PlanTracker />);
      });

      expect(container.textContent).toContain('نسبة إنجاز المنهاج');
      expect(container.textContent).toContain('الجهاز التنفسي');
      expect(container.textContent).toContain('إعادة جدولة متسلسلة الآن');
    });

    it('triggers ripple-shift rescheduling on button click', async () => {
      await act(async () => {
        root.render(<PlanTracker />);
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const rescheduleBtn = buttons.find((b) => b.textContent?.includes('إعادة جدولة متسلسلة الآن'));
      expect(rescheduleBtn).toBeDefined();

      await act(async () => {
        rescheduleBtn?.click();
      });

      expect(container.textContent).toContain('تمت إعادة الجدولة المتسلسلة');
    });
  });

  describe('5. 32-Week Annual Plan Distribution', () => {
    it('generates exactly 32 weeks with week 16 and 32 exam reviews', () => {
      const annualPlan = createAnnualPlan('science_primary', 5);

      expect(annualPlan.length).toBe(32);
      expect(annualPlan[15].week).toBe(16);
      expect(annualPlan[15].topics.some((t) => t.includes('نصف السنة'))).toBe(true);

      expect(annualPlan[31].week).toBe(32);
      expect(annualPlan[31].topics.some((t) => t.includes('نهاية السنة'))).toBe(true);
    });

    it('renders AnnualPlanView and switches between Semester 1 and 2', async () => {
      await act(async () => {
        root.render(<AnnualPlanView subjectId="science_primary" grade={5} />);
      });

      expect(container.textContent).toContain('الخطة السنوية وتوزيع المنهج');
      expect(container.textContent).toContain('الفصل الدراسي الأول');

      const buttons = Array.from(container.querySelectorAll('button'));
      const sem2Btn = buttons.find((b) => b.textContent?.includes('الفصل الدراسي الثاني'));
      expect(sem2Btn).toBeDefined();

      await act(async () => {
        sem2Btn?.click();
      });

      expect(container.textContent).toContain('17');
    });
  });

  describe('6. SQLite LessonPlanDbService', () => {
    it('saves a daily plan via dbClient and formats objectives JSON', async () => {
      const mockQuery = vi.spyOn(dbClient, 'query').mockResolvedValue([]);
      const mockExec = vi.spyOn(dbClient, 'exec').mockResolvedValue({ rowsAffected: 1 });

      const template = LESSON_TEMPLATES[0];
      await lessonPlanDbService.saveDailyPlan(template, '2026-10-15');

      expect(mockQuery).toHaveBeenCalled();
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lesson_plans'),
        expect.arrayContaining([template.id, template.subjectId, template.grade])
      );
    });

    it('updates plan status to postponed and sets reason', async () => {
      const mockExec = vi.spyOn(dbClient, 'exec').mockResolvedValue({ rowsAffected: 1 });

      await lessonPlanDbService.updatePlanStatus('lp_123', 'postponed', 'عطلة طارئة');

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lesson_plans SET'),
        ['postponed', 'عطلة طارئة', null, 'lp_123']
      );
    });
  });

  describe('7. PlansStudio Unified Component', () => {
    it('renders PlansStudio with sub-navigation tabs', async () => {
      await act(async () => {
        root.render(<PlansStudio teacher={mockTeacher} />);
      });

      expect(container.textContent).toContain('الخطة اليومية');
      expect(container.textContent).toContain('متابعة المنهاج وإعادة الجدولة');
      expect(container.textContent).toContain('الخطة السنوية');
    });
  });
});
