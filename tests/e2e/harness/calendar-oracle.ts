/**
 * Authoritative Iraqi School Calendar & Auto-Rescheduling Oracle
 * Models Iraqi Ministry of Education official calendar, holidays, and plan rescheduling.
 */

export interface SchoolHoliday {
  name: string;
  month: number; // 1-12
  day: number;
  type: 'solar' | 'lunar' | 'emergency';
  durationDays: number;
}

export const OFFICIAL_IRAQI_SOLAR_HOLIDAYS: SchoolHoliday[] = [
  { name: 'العيد الوطني العراقي', month: 10, day: 3, type: 'solar', durationDays: 1 },
  { name: 'يوم النصر العظيم', month: 12, day: 10, type: 'solar', durationDays: 1 },
  { name: 'رأس السنة الميلادية', month: 1, day: 1, type: 'solar', durationDays: 1 },
  { name: 'عيد الجيش العراقي الباسل', month: 1, day: 6, type: 'solar', durationDays: 1 },
  { name: 'عيد نوروز', month: 3, day: 21, type: 'solar', durationDays: 1 },
  { name: 'عيد العمال العالمي', month: 5, day: 1, type: 'solar', durationDays: 1 },
  { name: 'ذكرى 14 تموز', month: 7, day: 14, type: 'solar', durationDays: 1 },
];

export interface ScheduledLesson {
  id: string;
  subjectId: string;
  weekNumber: number;
  dateIso: string; // YYYY-MM-DD
  topic: string;
  status: 'scheduled' | 'completed' | 'postponed' | 'holiday';
  postponeReason?: string;
}

/**
 * Check if a given date falls on a known Iraqi solar holiday or weekend (Friday/Saturday)
 */
export function isIraqiNonTeachingDay(date: Date, additionalHolidays: string[] = []): {
  isOff: boolean;
  reason?: string;
} {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const solar = OFFICIAL_IRAQI_SOLAR_HOLIDAYS.find(h => h.month === month && h.day === day);
  if (solar) {
    return { isOff: true, reason: solar.name };
  }

  const year = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const iso = `${year}-${m}-${d}`;
  if (additionalHolidays.includes(iso)) {
    return { isOff: true, reason: 'عطلة رسمية / طارئة' };
  }

  const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  if (dayOfWeek === 5) {
    return { isOff: true, reason: 'عطلة الجمعة' };
  }
  if (dayOfWeek === 6) {
    return { isOff: true, reason: 'عطلة السبت' };
  }

  return { isOff: false };
}

/**
 * Calculate net teaching days between two dates excluding weekends and official holidays
 */
export function calculateNetTeachingDays(startDate: Date, endDate: Date, additionalHolidays: string[] = []): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const status = isIraqiNonTeachingDay(current, additionalHolidays);
    if (!status.isOff) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Ripple-Shift Auto-Rescheduling Engine:
 * When a lesson is marked 'postponed' or displaced by an emergency holiday,
 * this function shifts all subsequent scheduled lessons to the next available teaching days.
 */
export function rippleShiftReschedule(
  lessons: ScheduledLesson[],
  postponedLessonId: string,
  teacherScheduleDays: number[] = [0, 2, 4], // 0=Sun, 2=Tue, 4=Thu
  additionalHolidays: string[] = []
): {
  updatedLessons: ScheduledLesson[];
  shiftedCount: number;
} {
  const index = lessons.findIndex(l => l.id === postponedLessonId);
  if (index === -1) {
    return { updatedLessons: [...lessons], shiftedCount: 0 };
  }

  const updated = lessons.map(l => ({ ...l }));
  const target = updated[index];
  target.status = 'postponed';

  // Extract the topic that was postponed and shift downstream topics
  const topicsToShift = updated.slice(index).map(l => l.topic);

  // We find the next available teaching date starting after the target's current date
  let currentDate = new Date(target.dateIso);
  let shiftedCount = 0;

  for (let i = index; i < updated.length; i++) {
    // Advance to next valid teaching slot
    while (true) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      if (teacherScheduleDays.includes(dayOfWeek)) {
        const off = isIraqiNonTeachingDay(currentDate, additionalHolidays);
        if (!off.isOff) {
          break;
        }
      }
    }

    // Set rescheduled lesson
    const nextLesson = updated[i];
    nextLesson.dateIso = currentDate.toISOString().split('T')[0];
    nextLesson.status = 'scheduled';
    shiftedCount++;
  }

  return {
    updatedLessons: updated,
    shiftedCount,
  };
}
