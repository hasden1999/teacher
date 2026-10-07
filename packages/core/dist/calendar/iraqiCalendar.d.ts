export interface IraqiHoliday {
    date: string;
    nameAr: string;
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
    durationPeriods?: number;
    isPostponed?: boolean;
}
export interface ScheduledLesson {
    lessonId: string;
    title: string;
    unit: string;
    scheduledDate: string;
    dayOfWeekAr: string;
    periodNumber?: number;
    isRescheduled: boolean;
    rescheduleReason?: string;
}
export declare const ARABIC_WEEKDAYS: string[];
export declare const FIXED_SOLAR_HOLIDAYS: Record<string, string>;
export declare const LUNAR_HOLIDAYS_CATALOG: Record<string, Array<{
    date: string;
    name: string;
}>>;
/**
 * فحص هل التاريخ المعطى يمثل عطلة رسمية عراقية أو عطلة أسبوعية
 */
export declare function checkIraqiDate(dateInput: Date | string): {
    isHoliday: boolean;
    isWeekend: boolean;
    holidayName?: string;
};
/**
 * فحص هل التاريخ المعطى يمثل عطلة رسمية عراقية
 */
export declare function isOfficialHoliday(dateInput: Date | string): boolean;
/**
 * خوارزمية جدولة المنهاج والترحيل التلقائي للحصص عند العطل أو التأجيل
 */
export declare function rescheduleLessonPlan(lessons: LessonItem[], teachingDays: number[], // e.g. [0, 2, 4] for الأحد، الثلاثاء، الخميس
startDate: Date | string, endDate: Date | string): ScheduledLesson[];
/**
 * حساب إجمالي أسابيع التدريس الصافية وعدد الأيام الفعلية بين تاريخين
 */
export declare function calculateTeachingWeeks(startDate: Date | string, endDate: Date | string, teachingDays: number[]): {
    totalTeachingDays: number;
    totalTeachingWeeks: number;
    holidaysEncountered: IraqiHoliday[];
};
/**
 * دالة استخراج أسابيع التدريس للفصل الدراسي
 */
export declare function getSemesterTeachingWeeks(startDate: Date | string, endDate: Date | string, teachingDays: number[]): {
    totalTeachingDays: number;
    totalTeachingWeeks: number;
    holidaysEncountered: IraqiHoliday[];
};
//# sourceMappingURL=iraqiCalendar.d.ts.map