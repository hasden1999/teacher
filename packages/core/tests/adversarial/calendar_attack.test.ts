import { describe, it, expect } from 'vitest';
import {
  checkIraqiDate,
  isOfficialHoliday,
  rescheduleLessonPlan,
  calculateTeachingWeeks,
  getSemesterTeachingWeeks,
  type LessonItem
} from '../../src/calendar/iraqiCalendar.js';

describe('Adversarial Attack: Iraqi Calendar & Scheduling Engine', () => {
  describe('Calendar Vector 1: Leap Year Boundaries & Date Edge Cases', () => {
    it('ATTACK: Leap year 2024 (Feb 29 exists) vs non-leap year 2025/2026', () => {
      // 2024 was a leap year: Feb 29 was a Thursday (day 4)
      const feb29Check = checkIraqiDate('2024-02-29');
      expect(feb29Check.isWeekend).toBe(false); // Thursday
      expect(feb29Check.isHoliday).toBe(false);

      // Schedule lessons over leap day: 2024-02-27 to 2024-03-02 with teaching days [2, 4] (Tue, Thu)
      // 2024-02-27 is Tuesday, 2024-02-29 is Thursday (Leap day!)
      const lessons: LessonItem[] = [
        { id: 'l1', title: 'درس الثلاثاء', unit: 'وحدة 1', sequence: 1 },
        { id: 'l2', title: 'درس الخميس الكبيس', unit: 'وحدة 1', sequence: 2 }
      ];

      const scheduled = rescheduleLessonPlan(lessons, [2, 4], '2024-02-27', '2024-03-02');
      expect(scheduled.length).toBe(2);
      expect(scheduled[0].scheduledDate).toBe('2024-02-27');
      expect(scheduled[1].scheduledDate).toBe('2024-02-29');
    });

    it('ATTACK: Non-leap year February rollover: 2025-02-28 to 2025-03-01', () => {
      // 2025 is not a leap year. Feb 28 is Friday (weekend in Iraq).
      const feb28Check = checkIraqiDate('2025-02-28');
      expect(feb28Check.isWeekend).toBe(true);

      // March 1st is Saturday (weekend in Iraq)
      const mar01Check = checkIraqiDate('2025-03-01');
      expect(mar01Check.isWeekend).toBe(true);

      // March 2nd is Sunday (school day)
      const mar02Check = checkIraqiDate('2025-03-02');
      expect(mar02Check.isWeekend).toBe(false);
      expect(mar02Check.isHoliday).toBe(false);
    });

    it('ATTACK: Inverse date range (startDate > endDate)', () => {
      const lessons: LessonItem[] = [
        { id: 'l1', title: 'درس', unit: 'وحدة', sequence: 1 }
      ];
      // Start is after end: should gracefully return empty array without crashing or looping
      const scheduled = rescheduleLessonPlan(lessons, [0, 1, 2], '2025-06-01', '2025-01-01');
      expect(scheduled).toEqual([]);

      const weeks = calculateTeachingWeeks('2025-06-01', '2025-01-01', [0, 1, 2]);
      expect(weeks.totalTeachingDays).toBe(0);
      expect(weeks.totalTeachingWeeks).toBe(0);
      expect(weeks.holidaysEncountered).toEqual([]);
    });

    it('ATTACK: Single-day date range (startDate === endDate)', () => {
      const lessons: LessonItem[] = [
        { id: 'l1', title: 'درس واحد', unit: 'وحدة', sequence: 1 }
      ];
      // 2025-01-12 is Sunday (working day)
      const scheduled = rescheduleLessonPlan(lessons, [0], '2025-01-12', '2025-01-12');
      expect(scheduled.length).toBe(1);
      expect(scheduled[0].scheduledDate).toBe('2025-01-12');

      // 2025-01-06 is Monday (Army Day holiday)
      const holidayScheduled = rescheduleLessonPlan(lessons, [1], '2025-01-06', '2025-01-06');
      expect(holidayScheduled.length).toBe(0); // skipped due to holiday
    });
  });

  describe('Calendar Vector 2: Holiday Overlaps & Weekend Coincidence', () => {
    it('ATTACK: Fixed solar holiday falling directly on a weekend (e.g. 2025-10-03 is Friday)', () => {
      // 2025-10-03 is Iraqi National Day (Fixed solar holiday)
      // Oct 3, 2025 falls on a Friday (Weekend in Iraq)
      const check = checkIraqiDate('2025-10-03');
      expect(check.isHoliday).toBe(true);
      expect(check.isWeekend).toBe(true);
      expect(check.holidayName).toBe('اليوم الوطني لجمهورية العراق');

      // Scheduling on that Friday should skip it (both because of weekend and holiday)
      const lessons: LessonItem[] = [{ id: 'l1', title: 'درس', unit: 'و', sequence: 1 }];
      const scheduled = rescheduleLessonPlan(lessons, [5], '2025-10-03', '2025-10-03');
      expect(scheduled.length).toBe(0);
    });

    it('ATTACK: Holidays outside defined lunar catalog range (e.g. year 2028 or 2023)', () => {
      // Fixed solar holidays still work across any year
      const armyDay2028 = checkIraqiDate('2028-01-06');
      expect(armyDay2028.isHoliday).toBe(true);
      expect(armyDay2028.holidayName).toBe('عيد الجيش العراقي');

      const armyDay2020 = checkIraqiDate('2020-01-06');
      expect(armyDay2020.isHoliday).toBe(true);

      // Lunar holiday in 2029 (not in catalog) should not throw
      expect(() => checkIraqiDate('2029-05-15')).not.toThrow();
    });

    it('ATTACK: Multi-day holiday sequence (e.g. Eid al-Fitr 3 consecutive days)', () => {
      // Eid al-Fitr 2025: 2025-03-30 (Sun), 2025-03-31 (Mon), 2025-04-01 (Tue)
      expect(isOfficialHoliday('2025-03-30')).toBe(true);
      expect(isOfficialHoliday('2025-03-31')).toBe(true);
      expect(isOfficialHoliday('2025-04-01')).toBe(true);

      const lessons: LessonItem[] = [
        { id: 'l1', title: 'درس 1', unit: 'و', sequence: 1 },
        { id: 'l2', title: 'درس 2', unit: 'و', sequence: 2 }
      ];

      // Schedule with teaching days [0, 1, 2, 3] (Sun, Mon, Tue, Wed)
      // Sun, Mon, Tue are Eid! So lesson 1 must be pushed to Wednesday 2025-04-02!
      const scheduled = rescheduleLessonPlan(lessons, [0, 1, 2, 3], '2025-03-30', '2025-04-05');
      expect(scheduled.length).toBeGreaterThanOrEqual(1);
      expect(scheduled[0].scheduledDate).toBe('2025-04-02');
      expect(scheduled[0].dayOfWeekAr).toBe('الأربعاء');
    });
  });

  describe('Calendar Vector 3: Weekend Reschedules & Starvation Scenarios', () => {
    it('ATTACK: Teaching days containing only weekends [5, 6] (Schedule starvation)', () => {
      const lessons: LessonItem[] = [
        { id: 'l1', title: 'درس 1', unit: 'و', sequence: 1 },
        { id: 'l2', title: 'درس 2', unit: 'و', sequence: 2 }
      ];

      // Teaching days: Friday (5) and Saturday (6)
      // Because Iraq weekends are 5 and 6, no lessons should ever be scheduled
      const scheduled = rescheduleLessonPlan(lessons, [5, 6], '2025-01-01', '2025-01-31');
      expect(scheduled).toEqual([]);
    });

    it('ATTACK: Empty teaching days array []', () => {
      const lessons: LessonItem[] = [{ id: 'l1', title: 'درس', unit: 'و', sequence: 1 }];
      const scheduled = rescheduleLessonPlan(lessons, [], '2025-01-01', '2025-01-31');
      expect(scheduled).toEqual([]);

      const weeks = calculateTeachingWeeks('2025-01-01', '2025-01-31', []);
      expect(weeks.totalTeachingDays).toBe(0);
      expect(weeks.totalTeachingWeeks).toBe(0);
    });

    it('ATTACK: Excess lessons starved by insufficient school days before end date', () => {
      // 100 lessons, but only 3 days in date range
      const lessons: LessonItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `l_${i}`,
        title: `درس ${i}`,
        unit: 'وحدة',
        sequence: i + 1
      }));

      // Range: 2025-01-12 (Sun) to 2025-01-14 (Tue) -> 3 teaching days
      const scheduled = rescheduleLessonPlan(lessons, [0, 1, 2], '2025-01-12', '2025-01-14');
      // Must schedule exactly 3 lessons and not overflow or crash
      expect(scheduled.length).toBe(3);
      expect(scheduled[0].lessonId).toBe('l_0');
      expect(scheduled[2].lessonId).toBe('l_2');
    });

    it('ATTACK: Stress test with 1-year date range and large lesson list', () => {
      const lessons: LessonItem[] = Array.from({ length: 200 }, (_, i) => ({
        id: `lesson_${i}`,
        title: `درس ${i + 1}`,
        unit: 'المنهاج السنوي',
        sequence: i + 1,
        isPostponed: i % 10 === 0 // 10% of lessons postponed
      }));

      const start = performance.now();
      const scheduled = rescheduleLessonPlan(
        lessons,
        [0, 1, 2, 3, 4], // Sun to Thu
        '2025-09-15',
        '2026-06-15'
      );
      const duration = performance.now() - start;

      // Must complete rapidly (< 500ms)
      expect(duration).toBeLessThan(500);
      // In 2025-09-15 to 2026-06-15, there are exactly 190 teaching days (excluding weekends & holidays)
      expect(scheduled.length).toBe(190);

      // Verify no scheduled date lands on Friday or Saturday
      for (const item of scheduled) {
        const d = new Date(item.scheduledDate);
        expect([5, 6]).not.toContain(d.getDay());
        expect(checkIraqiDate(item.scheduledDate).isHoliday).toBe(false);
      }
    });
  });
});
