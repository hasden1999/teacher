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
    <header
      className="sticky top-0 z-30 flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 bg-white/92 dark:bg-slate-900/92 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 font-tajawal select-none transition-all shadow-xs"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Brand & Section Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-teal-800 to-emerald-600 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-sm">
            م
          </div>
          <span className="font-black text-teal-900 dark:text-teal-400 text-base sm:text-lg hidden md:inline tracking-tight">
            مساعد المعلم
          </span>
        </div>
        <span className="text-slate-300 dark:text-slate-700 hidden md:inline">|</span>
        <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[140px] sm:max-w-[200px]">
          {currentSectionTitle}
        </h1>
      </div>

      {/* Status Badges, Trial Pill & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Trial or Activation Badge */}
        {onOpenActivation && (
          <button
            type="button"
            onClick={onOpenActivation}
            className={`min-h-[32px] sm:min-h-[36px] px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 ${
              isActivated
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 hover:bg-amber-200 border border-amber-300 dark:border-amber-800'
            }`}
          >
            <span>{isActivated ? '🎖️' : '⏳'}</span>
            <span className="hidden xs:inline">{isActivated ? 'مفعل' : trialLabel || 'تجربة'}</span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1">
          <DbSyncBadge status={dbStatus} />
        </div>
        <OfflineBadge />

        {/* Teacher Profile Pill */}
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-1.5 sm:gap-2 ps-1.5 sm:ps-2 border-s border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-80 active:scale-95 transition"
          title="بيانات المعلم"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-teal-600/40 flex items-center justify-center text-teal-800 dark:text-teal-300 font-extrabold text-xs shadow-xs">
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
