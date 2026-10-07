import React from 'react';
import { OfflineBadge, DbSyncBadge, DbSyncStatus } from '../common/StatusBadges.js';

export interface AppHeaderProps {
  currentSectionTitle: string;
  dbStatus?: DbSyncStatus;
  teacherName?: string;
  subjectName?: string;
  trialLabel?: string;
  isActivated?: boolean;
  onOpenActivation?: () => void;
  onOpenProfile?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentSectionTitle,
  dbStatus = 'ready',
  teacherName = 'الأستاذ',
  subjectName = 'الرياضيات',
  trialLabel,
  isActivated = false,
  onOpenActivation,
  onOpenProfile,
}) => {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 font-tajawal">
      {/* Brand & Section Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            م
          </div>
          <span className="font-extrabold text-teal-800 dark:text-teal-400 text-lg hidden sm:inline">
            مساعد المعلم
          </span>
        </div>
        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
        <h1 className="text-base font-bold text-slate-800 dark:text-slate-200 truncate">
          {currentSectionTitle}
        </h1>
      </div>

      {/* Status Badges, Trial Pill & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Trial or Activation Badge */}
        {onOpenActivation && (
          <button
            type="button"
            onClick={onOpenActivation}
            className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
              isActivated
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 hover:bg-amber-200 border border-amber-300 dark:border-amber-800'
            }`}
          >
            <span>{isActivated ? '🎖️' : '⏳'}</span>
            <span className="hidden xs:inline">{isActivated ? 'النسخة مفعلة' : trialLabel || 'تجربة مجانية'}</span>
          </button>
        )}

        <DbSyncBadge status={dbStatus} />
        <OfflineBadge />

        {/* Teacher Profile Pill */}
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-2 ps-2 border-s border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-80 transition"
          title="تعديل بيانات المعلم والاشتراك"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-teal-600/30 flex items-center justify-center text-teal-800 dark:text-teal-300 font-bold text-xs shadow-xs">
            {teacherName.slice(0, 1)}
          </div>
          <div className="hidden lg:flex flex-col text-start">
            <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {teacherName}
            </span>
            <span className="text-[10px] text-teal-700 dark:text-teal-400">
              {subjectName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
