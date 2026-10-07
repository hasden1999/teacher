export interface IraqiHoliday {
  date: string;            // 'YYYY-MM-DD'
  nameAr: string;          // اسم العطلة بالعربية
  type: 'solar' | 'lunar' | 'recess';
  durationDays?: number;
}

export type AcademicHoliday = IraqiHoliday;

export interface TeachingCalendarSummary {
  academicYear: string;
  totalWeeks: number;
  netTeachingDays: number;
  holidaysList: IraqiHoliday[];
}

export interface LessonItem {
  id: string;
  title: string;
  unit: string;
  sequence: number;
  durationPeriods?: number; // عدد الحصص المطلوبة للدرس (الافتراضي: 1)
  isPostponed?: boolean;
}

export interface ScheduledLesson {
  lessonId: string;
  title: string;
  unit: string;
  scheduledDate: string;   // 'YYYY-MM-DD'
  dayOfWeekAr: string;     // 'الأحد', 'الثلاثاء'...
  periodNumber?: number;
  isRescheduled: boolean;
  rescheduleReason?: string;
}

export const ARABIC_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// العطل الشمسية الثابتة بصيغة 'MM-DD'
export const FIXED_SOLAR_HOLIDAYS: Record<string, string> = {
  '01-01': 'رأس السنة الميلادية',
  '01-06': 'عيد الجيش العراقي',
  '03-21': 'عيد نوروز',
  '05-01': 'عيد العمال العالمي',
  '07-14': 'تأسيس جمهورية العراق (14 تموز)',
  '10-03': 'اليوم الوطني لجمهورية العراق',
  '12-10': 'يوم النصر العظيم'
};

// جداول العطل الهجرية المحسوبة للأعوام الدراسية المستهدفة (2024-2027)
export const LUNAR_HOLIDAYS_CATALOG: Record<string, Array<{ date: string; name: string }>> = {
  '2024-2025': [
    { date: '2024-07-07', name: 'رأس السنة الهجرية (1 محرم)' },
    { date: '2024-07-16', name: 'يوم عاشوراء (10 محرم)' },
    { date: '2024-08-25', name: 'أربعينية الإمام الحسين (ع)' },
    { date: '2024-09-15', name: 'المولد النبوي الشريف' },
    { date: '2025-03-30', name: 'عيد الفطر المبارك' },
    { date: '2025-03-31', name: 'عيد الفطر المبارك (اليوم الثاني)' },
    { date: '2025-04-01', name: 'عيد الفطر المبارك (اليوم الثالث)' },
    { date: '2025-06-06', name: 'عيد الأضحى المبارك' },
    { date: '2025-06-14', name: 'عيد الغدير الأغر' }
  ],
  '2025-2026': [
    { date: '2025-06-26', name: 'رأس السنة الهجرية (1 محرم)' },
    { date: '2025-07-05', name: 'يوم عاشوراء (10 محرم)' },
    { date: '2025-08-14', name: 'أربعينية الإمام الحسين (ع)' },
    { date: '2025-09-04', name: 'المولد النبوي الشريف' },
    { date: '2026-03-20', name: 'عيد الفطر المبارك' },
    { date: '2026-03-21', name: 'عيد الفطر المبارك (اليوم الثاني)' },
    { date: '2026-03-22', name: 'عيد الفطر المبارك (اليوم الثالث)' },
    { date: '2026-05-27', name: 'عيد الأضحى المبارك' },
    { date: '2026-06-04', name: 'عيد الغدير الأغر' }
  ],
  '2026-2027': [
    { date: '2026-06-16', name: 'رأس السنة الهجرية (1 محرم)' },
    { date: '2026-06-25', name: 'يوم عاشوراء (10 محرم)' },
    { date: '2026-08-04', name: 'أربعينية الإمام الحسين (ع)' },
    { date: '2026-08-25', name: 'المولد النبوي الشريف' },
    { date: '2027-03-10', name: 'عيد الفطر المبارك' },
    { date: '2027-03-11', name: 'عيد الفطر المبارك (اليوم الثاني)' },
    { date: '2027-03-12', name: 'عيد الفطر المبارك (اليوم الثالث)' },
    { date: '2027-05-16', name: 'عيد الأضحى المبارك' },
    { date: '2027-05-24', name: 'عيد الغدير الأغر' }
  ]
};

function parseDate(dateInput: Date | string): Date {
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateInput);
  }
  return new Date(dateInput);
}

/**
 * فحص هل التاريخ المعطى يمثل عطلة رسمية عراقية أو عطلة أسبوعية
 */
export function checkIraqiDate(dateInput: Date | string): {
  isHoliday: boolean;
  isWeekend: boolean;
  holidayName?: string;
} {
  const d = parseDate(dateInput);
  const dayOfWeek = d.getDay(); // 0 = الأحد, 5 = الجمعة, 6 = السبت

  // عطلة نهاية الأسبوع في العراق: الجمعة (5) والسبت (6)
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const monthDay = `${mm}-${dd}`;
  const fullDate = `${yyyy}-${mm}-${dd}`;

  // 1. فحص العطل الشمسية الثابتة
  if (FIXED_SOLAR_HOLIDAYS[monthDay]) {
    return {
      isHoliday: true,
      isWeekend,
      holidayName: FIXED_SOLAR_HOLIDAYS[monthDay]
    };
  }

  // 2. فحص العطل القمرية من الكتالوج
  for (const yearKey in LUNAR_HOLIDAYS_CATALOG) {
    const list = LUNAR_HOLIDAYS_CATALOG[yearKey];
    const match = list.find(h => h.date === fullDate);
    if (match) {
      return {
        isHoliday: true,
        isWeekend,
        holidayName: match.name
      };
    }
  }

  return {
    isHoliday: false,
    isWeekend
  };
}

/**
 * فحص هل التاريخ المعطى يمثل عطلة رسمية عراقية
 */
export function isOfficialHoliday(dateInput: Date | string): boolean {
  return checkIraqiDate(dateInput).isHoliday;
}

/**
 * خوارزمية جدولة المنهاج والترحيل التلقائي للحصص عند العطل أو التأجيل
 */
export function rescheduleLessonPlan(
  lessons: LessonItem[],
  teachingDays: number[], // e.g. [0, 2, 4] for الأحد، الثلاثاء، الخميس
  startDate: Date | string,
  endDate: Date | string
): ScheduledLesson[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  const results: ScheduledLesson[] = [];
  const current = new Date(start);
  let lessonIndex = 0;

  while (current <= end && lessonIndex < lessons.length) {
    const dayOfWeek = current.getDay();

    if (teachingDays.includes(dayOfWeek)) {
      const holidayInfo = checkIraqiDate(current);

      if (!holidayInfo.isHoliday && !holidayInfo.isWeekend) {
        const lesson = lessons[lessonIndex];
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');

        results.push({
          lessonId: lesson.id,
          title: lesson.title,
          unit: lesson.unit,
          scheduledDate: `${yyyy}-${mm}-${dd}`,
          dayOfWeekAr: ARABIC_WEEKDAYS[dayOfWeek],
          isRescheduled: !!lesson.isPostponed,
          rescheduleReason: lesson.isPostponed ? 'تم تأجيل الدرس يدوياً من قبل المعلم' : undefined
        });

        lessonIndex++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return results;
}

/**
 * حساب إجمالي أسابيع التدريس الصافية وعدد الأيام الفعلية بين تاريخين
 */
export function calculateTeachingWeeks(
  startDate: Date | string,
  endDate: Date | string,
  teachingDays: number[]
): { totalTeachingDays: number; totalTeachingWeeks: number; holidaysEncountered: IraqiHoliday[] } {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  let teachingDaysCount = 0;
  const holidays: IraqiHoliday[] = [];
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (teachingDays.includes(dayOfWeek)) {
      const info = checkIraqiDate(current);
      if (info.isHoliday) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        holidays.push({
          date: `${yyyy}-${mm}-${dd}`,
          nameAr: info.holidayName!,
          type: 'solar'
        });
      } else if (!info.isWeekend) {
        teachingDaysCount++;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  const daysPerWeek = teachingDays.filter(d => d !== 5 && d !== 6).length || 1;
  const totalWeeks = Math.round((teachingDaysCount / daysPerWeek) * 10) / 10;

  return {
    totalTeachingDays: teachingDaysCount,
    totalTeachingWeeks: totalWeeks,
    holidaysEncountered: holidays
  };
}

/**
 * دالة استخراج أسابيع التدريس للفصل الدراسي
 */
export function getSemesterTeachingWeeks(
  startDate: Date | string,
  endDate: Date | string,
  teachingDays: number[]
): { totalTeachingDays: number; totalTeachingWeeks: number; holidaysEncountered: IraqiHoliday[] } {
  return calculateTeachingWeeks(startDate, endDate, teachingDays);
}
