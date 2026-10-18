/**
 * PlansStudio - Comprehensive Curriculum & Lesson Plans Studio
 * Integrates:
 * 1. Daily Lesson Plan Editor (5-Step Ministerial Format & Templates)
 * 2. Plan Progress Tracker & Ripple-Shift Rescheduling (Holiday & Weekend Awareness)
 * 3. 32-Week Annual Plan Distribution (MoE Syllabus Weeks)
 */

import React, { useState } from 'react';
import { LessonPlanEditor } from './LessonPlanEditor.js';
import { PlanTracker } from './PlanTracker.js';
import { AnnualPlanView } from './AnnualPlanView.js';
import { lessonPlanDbService } from '../../services/lessonPlanDbService.js';
import { getSubjectById } from '@techeeer/content';
import type { TeacherProfile } from '@techeeer/content';

export interface PlansStudioProps {
  teacher?: TeacherProfile;
  activeDivision?: string;
}

export const PlansStudio: React.FC<PlansStudioProps> = ({
  teacher = {
    subject: 'science_primary',
    stage: 'primary',
    grade: 5,
    secondarySubjects: [],
  },
  activeDivision = 'أ',
}) => {
  const [subTab, setSubTab] = useState<'daily' | 'annual' | 'tracker'>('daily');
  const subjectNameAr = getSubjectById(teacher.subject)?.nameAr || 'المنهج الدراسي';

  return (
    <div dir="rtl" className="max-w-7xl mx-auto space-y-4 font-tajawal pb-16">
      {/* Sub-Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-xs border border-slate-200 dark:border-slate-800 flex items-center overflow-x-auto no-scrollbar gap-1.5">
        <button
          type="button"
          onClick={() => setSubTab('daily')}
          className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 flex-1 whitespace-nowrap cursor-pointer ${
            subTab === 'daily'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>📋</span>
          <span className="sm:hidden">مولد الخطة اليومية</span>
          <span className="hidden sm:inline">مولد الخطة اليومية الذكي (خماسية التدريس - {subjectNameAr})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('annual')}
          className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 flex-1 whitespace-nowrap cursor-pointer ${
            subTab === 'annual'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>🗓️</span>
          <span className="sm:hidden">الخطة السنوية</span>
          <span className="hidden sm:inline">الخطة السنوية وتوزيع الأشهر (تشرين الأول - أيار)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('tracker')}
          className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 flex-1 whitespace-nowrap cursor-pointer ${
            subTab === 'tracker'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>⚡</span>
          <span className="sm:hidden">متابعة المنهاج</span>
          <span className="hidden sm:inline">متابعة المنهاج وإعادة الجدولة</span>
        </button>
      </div>

      {/* Main Content Area */}
      {subTab === 'daily' && (
        <LessonPlanEditor
          teacher={teacher}
          activeDivision={activeDivision}
          onSave={async (plan, scheduledDate) => {
            try {
              await lessonPlanDbService.saveDailyPlan(plan, scheduledDate);
            } catch (err) {
              console.error('Failed to save lesson plan to SQLite:', err);
            }
          }}
        />
      )}

      {subTab === 'annual' && (
        <AnnualPlanView
          subjectId={teacher.subject}
          grade={teacher.grade}
          subjectTitle={`${subjectNameAr} - الصف ${teacher.grade} (${activeDivision})`}
        />
      )}

      {subTab === 'tracker' && (
        <PlanTracker subjectId={teacher.subject} grade={teacher.grade} />
      )}
    </div>
  );
};
