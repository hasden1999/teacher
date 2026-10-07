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
import type { TeacherProfile } from '@techeeer/content';

export interface PlansStudioProps {
  teacher?: TeacherProfile;
}

export const PlansStudio: React.FC<PlansStudioProps> = ({
  teacher = {
    subject: 'science_primary',
    stage: 'primary',
    grade: 5,
    secondarySubjects: ['physics_scientific', 'chemistry_scientific'],
  },
}) => {
  const [subTab, setSubTab] = useState<'daily' | 'tracker' | 'annual'>('daily');

  return (
    <div dir="rtl" className="max-w-7xl mx-auto space-y-4 font-tajawal">
      {/* Sub-Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubTab('daily')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            subTab === 'daily'
              ? 'bg-teal-700 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>📋</span>
          <span>الخطة اليومية (خماسية التدريس)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('tracker')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            subTab === 'tracker'
              ? 'bg-teal-700 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>⚡</span>
          <span>متابعة المنهاج وإعادة الجدولة (Ripple-Shift)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('annual')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            subTab === 'annual'
              ? 'bg-teal-700 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>🗓️</span>
          <span>الخطة السنوية (32 أسبوعاً)</span>
        </button>
      </div>

      {/* Main Content Area */}
      {subTab === 'daily' && (
        <LessonPlanEditor
          teacher={teacher}
          onSave={async (plan, scheduledDate) => {
            try {
              await lessonPlanDbService.saveDailyPlan(plan, scheduledDate);
            } catch (err) {
              console.error('Failed to save lesson plan to SQLite:', err);
            }
          }}
        />
      )}

      {subTab === 'tracker' && (
        <PlanTracker />
      )}

      {subTab === 'annual' && (
        <AnnualPlanView
          subjectId={teacher.subject}
          grade={teacher.grade}
          subjectTitle="العلوم - الصف الخامس الابتدائي"
        />
      )}
    </div>
  );
};
