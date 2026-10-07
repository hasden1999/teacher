/**
 * PlanTracker - Curriculum Progress & Ripple-Shift Rescheduling Studio
 * Features:
 * - Real-time progress metric: completed count, total count, completion percentage
 * - Iraqi official holiday awareness (solar holidays and lunar Hijri catalog)
 * - Status toggle: completed, scheduled, postponed
 * - 1-tap "إعادة جدولة متسلسلة" (ripple-shift rescheduling) across active teaching days (e.g. Sun, Tue, Thu)
 * - Safe SQLite persistence
 */

import React, { useState } from 'react';
import {
  rescheduleLessonPlan,
  checkIraqiDate,
  type LessonItem,
  type ScheduledLesson,
  ARABIC_WEEKDAYS,
} from '@techeeer/core';
import { calculateLessonProgress } from '@techeeer/content';

export interface PlanTrackerItem {
  id: string;
  title: string;
  unit: string;
  scheduledDate: string; // YYYY-MM-DD
  status: 'completed' | 'scheduled' | 'postponed';
  postponedReason?: string;
}

export interface PlanTrackerProps {
  initialItems?: PlanTrackerItem[];
  teachingDays?: number[]; // [0, 2, 4] for Sunday, Tuesday, Thursday
  onItemsChange?: (items: PlanTrackerItem[]) => void;
}

const DEFAULT_SAMPLE_ITEMS: PlanTrackerItem[] = [
  { id: 'les_1', title: 'الجهاز التنفسي: الأجزاء والوظائف', unit: 'الوحدة الأولى: جسم الإنسان', scheduledDate: '2026-10-04', status: 'completed' },
  { id: 'les_2', title: 'آلية الشهيق والزفير وتبادل الغازات', unit: 'الوحدة الأولى: جسم الإنسان', scheduledDate: '2026-10-06', status: 'completed' },
  { id: 'les_3', title: 'العادات الصحية للمحافظة على الرئتين', unit: 'الوحدة الأولى: جسم الإنسان', scheduledDate: '2026-10-08', status: 'scheduled' },
  { id: 'les_4', title: 'الجهاز الهضمي وصحته (1)', unit: 'الوحدة الأولى: جسم الإنسان', scheduledDate: '2026-10-11', status: 'scheduled' },
  { id: 'les_5', title: 'الجهاز الهضمي وصحته (2)', unit: 'الوحدة الأولى: جسم الإنسان', scheduledDate: '2026-10-13', status: 'scheduled' },
  { id: 'les_6', title: 'العناصر الكيميائية وتصنيفها', unit: 'الوحدة الثانية: المادة وتفاعلاتها', scheduledDate: '2026-10-15', status: 'scheduled' },
  { id: 'les_7', title: 'الرابطة الأيونية وخواصها', unit: 'الوحدة الثانية: المادة وتفاعلاتها', scheduledDate: '2026-10-18', status: 'scheduled' },
  { id: 'les_8', title: 'الرابطة التساهمية وتراكيب لويس', unit: 'الوحدة الثانية: المادة وتفاعلاتها', scheduledDate: '2026-10-20', status: 'scheduled' },
];

export const PlanTracker: React.FC<PlanTrackerProps> = ({
  initialItems = DEFAULT_SAMPLE_ITEMS,
  teachingDays = [0, 2, 4], // الأحد، الثلاثاء، الخميس
  onItemsChange,
}) => {
  const [items, setItems] = useState<PlanTrackerItem[]>(initialItems);
  const [selectedTeachingDays, setSelectedTeachingDays] = useState<number[]>(teachingDays);
  const [startDate, setStartDate] = useState<string>('2026-10-04');
  const [endDate, setEndDate] = useState<string>('2027-01-31');
  const [rescheduleNotice, setRescheduleNotice] = useState<string | null>(null);

  const progress = calculateLessonProgress(items);

  // Status toggle handler
  const handleToggleStatus = (id: string, newStatus: 'completed' | 'scheduled' | 'postponed') => {
    let reason: string | undefined;
    if (newStatus === 'postponed') {
      const promptReason = window.prompt('سبب تأجيل الدرس (مثال: عطلة طارئة، أمطار، احتفالية مدرسية):');
      reason = promptReason || 'تأجيل يدوي من قبل المعلم';
    }

    const updated = items.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: newStatus,
          postponedReason: newStatus === 'postponed' ? reason : undefined,
        };
      }
      return item;
    });

    setItems(updated);
    if (onItemsChange) onItemsChange(updated);
  };

  // 1-Tap Ripple-shift rescheduling
  const handleRippleReschedule = () => {
    const lessonItems: LessonItem[] = items.map((item, idx) => ({
      id: item.id,
      title: item.title,
      unit: item.unit,
      sequence: idx + 1,
      isPostponed: item.status === 'postponed',
    }));

    const scheduled: ScheduledLesson[] = rescheduleLessonPlan(
      lessonItems,
      selectedTeachingDays,
      startDate,
      endDate
    );

    const updated = items.map((item) => {
      const found = scheduled.find((s) => s.lessonId === item.id);
      if (found) {
        return {
          ...item,
          scheduledDate: found.scheduledDate,
          status: (item.status === 'postponed' ? 'scheduled' : item.status) as 'completed' | 'scheduled' | 'postponed',
          postponedReason: undefined,
        };
      }
      return item;
    });

    setItems(updated);
    if (onItemsChange) onItemsChange(updated);

    setRescheduleNotice(`تمت إعادة الجدولة المتسلسلة لـ ${scheduled.length} درساً بنجاح مع تخطي العطل الرسمية وعطل نهاية الأسبوع.`);
    setTimeout(() => setRescheduleNotice(null), 5000);
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedTeachingDays.includes(dayIndex)) {
      if (selectedTeachingDays.length > 1) {
        setSelectedTeachingDays(selectedTeachingDays.filter((d) => d !== dayIndex));
      }
    } else {
      setSelectedTeachingDays([...selectedTeachingDays, dayIndex].sort());
    }
  };

  return (
    <div
      dir="rtl"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col font-tajawal overflow-hidden"
    >
      {/* 1. Header Toolbar */}
      <div className="p-4 bg-teal-800 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <h2 className="text-lg font-bold">متابعة المنهاج وإعادة الجدولة المتسلسلة (Ripple-Shift)</h2>
            <p className="text-xs text-teal-200">
              جدولة ذكية تتخطى العطل الرسمية العراقية ونهايات الأسبوع تلقائياً
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRippleReschedule}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-teal-950 font-bold text-xs shadow transition flex items-center gap-1.5"
        >
          <span>⚡</span>
          <span>إعادة جدولة متسلسلة الآن</span>
        </button>
      </div>

      {rescheduleNotice && (
        <div className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-bold px-4 py-2 border-b border-emerald-200">
          ✓ {rescheduleNotice}
        </div>
      )}

      {/* 2. Progress Overview Banner */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              نسبة إنجاز المنهاج:
            </span>
            <span className="text-lg font-extrabold text-teal-800 dark:text-teal-400">
              {progress.percentage}%
            </span>
            <span className="text-xs text-slate-500">
              ({progress.completedCount} من {progress.totalCount} درساً مكتمل)
            </span>
          </div>

          {/* Teaching Days Selection */}
          <div className="flex items-center gap-1 text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-400 me-1">أيام الحصص:</span>
            {[0, 1, 2, 3, 4].map((d) => {
              const isSelected = selectedTeachingDays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg border font-bold transition ${
                    isSelected
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {ARABIC_WEEKDAYS[d]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
          <div
            className="bg-teal-700 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* 3. Date Configuration */}
      <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <label className="font-bold text-slate-600 dark:text-slate-400">بداية الفصل:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="min-h-[38px] px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="font-bold text-slate-600 dark:text-slate-400">نهاية الفصل:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="min-h-[38px] px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
          />
        </div>
      </div>

      {/* 4. Lesson Timeline List */}
      <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[500px]">
        {items.map((item, idx) => {
          const holidayCheck = checkIraqiDate(item.scheduledDate);
          return (
            <div
              key={item.id}
              className={`py-3 flex flex-wrap items-center justify-between gap-3 ${
                item.status === 'completed'
                  ? 'bg-slate-50/50 dark:bg-slate-900/50'
                  : item.status === 'postponed'
                  ? 'bg-rose-50/40 dark:bg-rose-950/20'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3 min-w-[280px] flex-1">
                <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h4>
                    {item.status === 'completed' && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        ✓ مكتمل
                      </span>
                    )}
                    {item.status === 'postponed' && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        ⚠ مؤجل
                      </span>
                    )}
                    {item.status === 'scheduled' && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        مجدول
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-0.5">{item.unit}</p>

                  {item.postponedReason && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      سبب التأجيل: {item.postponedReason}
                    </p>
                  )}

                  {holidayCheck.isHoliday && (
                    <span className="inline-block mt-1 text-[11px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                      🎉 عطلة: {holidayCheck.holidayName}
                    </span>
                  )}
                </div>
              </div>

              {/* Date & Actions */}
              <div className="flex items-center gap-3">
                <div className="text-start">
                  <span className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {item.scheduledDate}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    {ARABIC_WEEKDAYS[new Date(item.scheduledDate).getDay()] || ''}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item.id, 'completed')}
                      className="min-h-[44px] px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                      title="تحديد كمكتمل"
                    >
                      ✓ إنجاز
                    </button>
                  )}

                  {item.status !== 'postponed' && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item.id, 'postponed')}
                      className="min-h-[44px] px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
                      title="تأجيل الدرس وترحيل الحصص اللاحقة"
                    >
                      ⏱️ تأجيل
                    </button>
                  )}

                  {item.status !== 'scheduled' && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item.id, 'scheduled')}
                      className="min-h-[44px] px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                    >
                      إعادة لجدول
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
