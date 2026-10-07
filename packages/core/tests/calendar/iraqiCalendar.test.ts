import { describe, it, expect } from 'vitest';
import {
  checkIraqiDate,
  isOfficialHoliday,
  rescheduleLessonPlan,
  calculateTeachingWeeks,
  getSemesterTeachingWeeks,
  type LessonItem
} from '../../src/calendar/iraqiCalendar.js';

describe('iraqiCalendar.ts - Iraqi Official School Calendar & Rescheduling', () => {
  it('should identify fixed solar holidays correctly', () => {
    // 06 January: Iraqi Army Day
    const armyDay = checkIraqiDate('2025-01-06');
    expect(armyDay.isHoliday).toBe(true);
    expect(armyDay.holidayName).toBe('عيد الجيش العراقي');

    // 03 October: National Day of Iraq
    const nationalDay = checkIraqiDate('2025-10-03');
    expect(nationalDay.isHoliday).toBe(true);
    expect(nationalDay.holidayName).toBe('اليوم الوطني لجمهورية العراق');

    // 01 January: New Year
    expect(isOfficialHoliday('2025-01-01')).toBe(true);

    // 21 March: Nowruz
    expect(isOfficialHoliday('2025-03-21')).toBe(true);

    // 01 May: Labour Day
    expect(isOfficialHoliday('2025-05-01')).toBe(true);

    // 14 July: Republic Day
    expect(isOfficialHoliday('2025-07-14')).toBe(true);

    // 10 December: Victory Day
    expect(isOfficialHoliday('2025-12-10')).toBe(true);
  });

  it('should identify lunar / religious holidays from catalog', () => {
    // Eid al-Fitr 2025
    const eid = checkIraqiDate('2025-03-30');
    expect(eid.isHoliday).toBe(true);
    expect(eid.holidayName).toBe('عيد الفطر المبارك');
  });

  it('should identify Iraqi weekend days (Friday and Saturday)', () => {
    // Friday: 2025-01-10
    const friday = checkIraqiDate('2025-01-10');
    expect(friday.isWeekend).toBe(true);

    // Saturday: 2025-01-11
    const saturday = checkIraqiDate('2025-01-11');
    expect(saturday.isWeekend).toBe(true);

    // Sunday (working school day in Iraq): 2025-01-12
    const sunday = checkIraqiDate('2025-01-12');
    expect(sunday.isWeekend).toBe(false);
  });

  it('should identify a regular school working day', () => {
    // Tuesday: 2025-01-14
    const normalDay = checkIraqiDate('2025-01-14');
    expect(normalDay.isHoliday).toBe(false);
    expect(normalDay.isWeekend).toBe(false);
  });

  it('should reschedule lessons automatically across active teaching days skipping holidays and weekends', () => {
    const lessons: LessonItem[] = [
      { id: 'l1', title: 'الدرس الأول', unit: 'الوحدة الأولى', sequence: 1 },
      { id: 'l2', title: 'الدرس الثاني', unit: 'الوحدة الأولى', sequence: 2, isPostponed: true },
      { id: 'l3', title: 'الدرس الثالث', unit: 'الوحدة الأولى', sequence: 3 }
    ];

    // Teaching days: Sunday (0), Monday (1), Tuesday (2)
    // Range starts on 2025-01-05 (Sunday), 2025-01-06 is Monday (Army Day holiday!)
    const scheduled = rescheduleLessonPlan(
      lessons,
      [0, 1, 2], // Sunday, Monday, Tuesday
      '2025-01-05',
      '2025-01-15'
    );

    expect(scheduled.length).toBe(3);

    // First lesson on Sunday 2025-01-05
    expect(scheduled[0].lessonId).toBe('l1');
    expect(scheduled[0].scheduledDate).toBe('2025-01-05');
    expect(scheduled[0].dayOfWeekAr).toBe('الأحد');

    // Monday 2025-01-06 is Army Day (holiday), so lesson 2 must be scheduled on Tuesday 2025-01-07!
    expect(scheduled[1].lessonId).toBe('l2');
    expect(scheduled[1].scheduledDate).toBe('2025-01-07');
    expect(scheduled[1].dayOfWeekAr).toBe('الثلاثاء');
    expect(scheduled[1].isRescheduled).toBe(true);

    // Lesson 3 scheduled on Sunday 2025-01-12
    expect(scheduled[2].lessonId).toBe('l3');
    expect(scheduled[2].scheduledDate).toBe('2025-01-12');
    expect(scheduled[2].dayOfWeekAr).toBe('الأحد');
  });

  it('should calculate teaching days and net teaching weeks accurately', () => {
    // Calculate for 2 weeks in January 2025 with teaching days [0, 2, 4] (Sun, Tue, Thu)
    const result = calculateTeachingWeeks(
      '2025-01-05',
      '2025-01-18',
      [0, 2, 4] // 3 days per week
    );

    expect(result.totalTeachingDays).toBeGreaterThan(0);
    expect(result.totalTeachingWeeks).toBeGreaterThan(0);

    const semesterWeeks = getSemesterTeachingWeeks('2025-01-05', '2025-01-18', [0, 2, 4]);
    expect(semesterWeeks.totalTeachingDays).toBe(result.totalTeachingDays);
  });

  it('should capture encountered holidays during teaching days calculation and handle Date object inputs', () => {
    // 2025-01-05 (Sun) to 2025-01-07 (Tue) with teaching days Sunday (0) and Monday (1).
    // Monday 2025-01-06 is Army Day!
    const result = calculateTeachingWeeks(
      new Date(2025, 0, 5),
      '2025-01-07',
      [0, 1]
    );

    expect(result.holidaysEncountered.length).toBe(1);
    expect(result.holidaysEncountered[0].nameAr).toBe('عيد الجيش العراقي');
    expect(result.holidaysEncountered[0].date).toBe('2025-01-06');
    expect(result.totalTeachingDays).toBe(1); // Only Sunday was active

    // Date parsing with alternate string format
    const altCheck = checkIraqiDate('2025/01/06');
    expect(altCheck.isHoliday).toBe(true);
  });

  it('should fallback to 1 day per week when teachingDays only contains weekend days', () => {
    // teachingDays = [5, 6] (Friday and Saturday only) -> filtered weekday length is 0 -> falls back to || 1
    const result = calculateTeachingWeeks('2025-01-05', '2025-01-10', [5, 6]);
    expect(result.totalTeachingWeeks).toBe(0);
  });
});
