import React, { useState, useMemo } from 'react';
import { createAnnualPlan, IRAQI_ACADEMIC_MONTHS } from '@techeeer/content';

const ACADEMIC_MONTH_BLOCKS: Array<{
  month: string;
  semester: 1 | 2;
  weeksRange: [number, number];
}> = [
  { month: 'تشرين الأول', semester: 1, weeksRange: [1, 4] },
  { month: 'تشرين الثاني', semester: 1, weeksRange: [5, 8] },
  { month: 'كانون الأول', semester: 1, weeksRange: [9, 12] },
  { month: 'كانون الثاني', semester: 1, weeksRange: [13, 16] },
  { month: 'شباط', semester: 2, weeksRange: [17, 20] },
  { month: 'آذار', semester: 2, weeksRange: [21, 24] },
  { month: 'نيسان', semester: 2, weeksRange: [25, 28] },
  { month: 'أيار', semester: 2, weeksRange: [29, 32] },
];

export interface AnnualPlanViewProps {
  subjectId?: string;
  grade?: number;
  subjectTitle?: string;
}

export const AnnualPlanView: React.FC<AnnualPlanViewProps> = ({
  subjectId = 'science_primary',
  grade = 5,
  subjectTitle = 'العلوم - الصف الخامس الابتدائي',
}) => {
  const [viewMode, setViewMode] = useState<'months' | 'weeks'>('months');
  const [activeSemester, setActiveSemester] = useState<1 | 2>(1);

  const annualPlan = useMemo(() => createAnnualPlan(subjectId, grade), [subjectId, grade]);
  const semesterWeeks = useMemo(
    () => annualPlan.filter((w) => w.semester === activeSemester),
    [annualPlan, activeSemester]
  );

  // Group weeks by Iraqi Academic Months (تشرين الأول through أيار)
  const monthlyDistribution = useMemo(() => {
    return ACADEMIC_MONTH_BLOCKS.map((m) => {
      const [startW, endW] = m.weeksRange;
      const weeksInMonth = annualPlan.filter((w) => w.week >= startW && w.week <= endW);
      const uniqueUnits = Array.from(new Set(weeksInMonth.map((w) => IRAQI_ACADEMIC_MONTHS[w.week] || w.unit)));
      const uniqueChapters = Array.from(new Set(weeksInMonth.map((w) => w.chapterTitle)));
      const allTopics = Array.from(new Set(weeksInMonth.flatMap((w) => w.topics)));
      const totalPeriods = weeksInMonth.reduce((sum, w) => sum + (w.periodsPerWeek || 0), 0);

      return {
        ...m,
        units: uniqueUnits,
        chapters: uniqueChapters,
        topics: allTopics,
        totalPeriods,
        weeksCount: weeksInMonth.length,
      };
    });
  }, [annualPlan]);

  return (
    <div
      dir="rtl"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col font-tajawal overflow-hidden"
    >
      {/* 1. Header Toolbar */}
      <div className="p-4 bg-teal-800 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗓️</span>
          <div>
            <h2 className="text-base sm:text-lg font-bold">
              الخطة السنوية وتوزيع المنهج ({subjectTitle})
            </h2>
            <p className="text-xs text-teal-200">
              موزعة على أشهر السنة الدراسية العراقية (تشرين الأول - أيار) و 32 أسبوعاً وفق ضوابط وزارة التربية
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Semester Filter Buttons */}
          <div className="flex items-center bg-teal-950/60 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveSemester(1)}
              className={`min-h-[36px] px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeSemester === 1
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              الفصل الدراسي الأول (1-16)
            </button>
            <button
              type="button"
              onClick={() => setActiveSemester(2)}
              className={`min-h-[36px] px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeSemester === 2
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              الفصل الدراسي الثاني (17-32)
            </button>
          </div>

          {/* View Mode Switcher: Monthly vs Weekly */}
          <div className="flex items-center bg-teal-950/60 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewMode('months')}
              className={`min-h-[36px] px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewMode === 'months'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              📅 توزيع الأشهر (تشرين الأول - أيار)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weeks')}
              className={`min-h-[36px] px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewMode === 'weeks'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              📋 التوزيع الأسبوعي (32 أسبوعاً)
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 no-print"
          >
            <span>🖨️</span>
            <span>طباعة الخطة السنوية</span>
          </button>
        </div>
      </div>

      {viewMode === 'months' ? (
        /* Monthly Distribution View (Req 7.2: خطة سنوية موزعة على أشهر السنة الدراسية العراقية) */
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {monthlyDistribution.map((m, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/70 space-y-2.5 shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-teal-700 text-white text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-teal-900 dark:text-teal-200">
                        شهر {m.month}
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        {m.semester === 1 ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني'} (الأسابيع{' '}
                        {m.weeksRange[0]} - {m.weeksRange[1]})
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200 px-2.5 py-1 rounded-lg">
                    {m.totalPeriods > 0 ? `${m.totalPeriods} حصة` : 'امتحانات وعطلة'}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  الفصول المقررة: {m.chapters.join(' ، ')}
                </div>

                <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  {m.topics.map((t, tIdx) => (
                    <li key={tIdx} className="leading-relaxed">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 32-Week Detailed View */
        <>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              اختر الفصل الدراسي لعرض الأسابيع:
            </span>
            <div className="flex items-center bg-slate-200 dark:bg-slate-900 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveSemester(1)}
                className={`min-h-[34px] px-3.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSemester === 1
                    ? 'bg-teal-700 text-white shadow'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                الفصل الأول (الأسابيع 1-16)
              </button>
              <button
                type="button"
                onClick={() => setActiveSemester(2)}
                className={`min-h-[34px] px-3.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSemester === 2
                    ? 'bg-teal-700 text-white shadow'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                الفصل الثاني (الأسابيع 17-32)
              </button>
            </div>
          </div>

          {/* Mobile Weekly Cards (< md) */}
          <div className="md:hidden p-3 space-y-2.5">
            {semesterWeeks.map((week) => {
              const isExamWeek = week.week === 16 || week.week === 32;
              return (
                <div
                  key={week.week}
                  className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                    isExamWeek
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                          isExamWeek
                            ? 'bg-amber-600 text-white'
                            : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200'
                        }`}
                      >
                        {week.week}
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">
                        الأسبوع {week.week}: {week.unit}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md">
                      {week.periodsPerWeek} حصص
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {week.chapterTitle}
                  </p>
                  <div className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                    {week.topics.join(' — ')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Weeks Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  <th className="p-3 w-16 text-center">الأسبوع</th>
                  <th className="p-3 w-36">الشهر الدراسي</th>
                  <th className="p-3 w-44">الفصل المنهجي</th>
                  <th className="p-3">الموضوعات المقررة</th>
                  <th className="p-3 w-24 text-center">الحصص الأسبوعية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {semesterWeeks.map((week) => {
                  const isExamWeek = week.week === 16 || week.week === 32;
                  return (
                    <tr
                      key={week.week}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isExamWeek
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 font-bold text-amber-950 dark:text-amber-200'
                          : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            isExamWeek
                              ? 'bg-amber-600 text-white'
                              : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200'
                          }`}
                        >
                          {week.week}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-teal-800 dark:text-teal-300">
                        {week.unit}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {week.chapterTitle}
                      </td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 leading-relaxed">
                        {week.topics.join(' — ')}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {week.periodsPerWeek} حصص
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
