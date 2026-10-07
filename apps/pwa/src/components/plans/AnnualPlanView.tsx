/**
 * AnnualPlanView - 32-Week Iraqi Ministry of Education Curriculum Distribution
 * Displays standard 32 teaching weeks:
 * - Weeks 1-16: Semester 1 (including Week 16 Midterm review)
 * - Weeks 17-32: Semester 2 (including Week 32 Final exams review)
 */

import React, { useState } from 'react';
import { createAnnualPlan } from '@techeeer/content';

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
  const [activeSemester, setActiveSemester] = useState<1 | 2>(1);
  const annualPlan = createAnnualPlan(subjectId, grade);

  const semesterWeeks = annualPlan.filter((w) => w.semester === activeSemester);

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
            <h2 className="text-lg font-bold">الخطة السنوية وتوزيع المنهج (32 أسبوعاً)</h2>
            <p className="text-xs text-teal-200">
              توزيع الحصص المعتمد رسمياً لـ: {subjectTitle}
            </p>
          </div>
        </div>

        {/* Semester Selector */}
        <div className="flex items-center bg-teal-900/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSemester(1)}
            className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeSemester === 1
                ? 'bg-white text-teal-900 shadow'
                : 'text-teal-200 hover:text-white'
            }`}
          >
            الفصل الدراسي الأول (الأسابيع 1-16)
          </button>
          <button
            type="button"
            onClick={() => setActiveSemester(2)}
            className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeSemester === 2
                ? 'bg-white text-teal-900 shadow'
                : 'text-teal-200 hover:text-white'
            }`}
          >
            الفصل الدراسي الثاني (الأسابيع 17-32)
          </button>
        </div>
      </div>

      {/* 2. Weeks Grid / Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
              <th className="p-3 w-16 text-center">الأسبوع</th>
              <th className="p-3 w-32">الوحدة التعليمية</th>
              <th className="p-3 w-40">الفصل الدراسي</th>
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
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
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
    </div>
  );
};
