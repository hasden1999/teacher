import React from 'react';
import { OfflineBadge, DbSyncBadge, DbSyncStatus } from '../common/StatusBadges.js';
import { IconBadgeCheck, IconHourglass } from '../common/Icons.js';

import type { AssignedClass } from '../../services/authService.js';

export interface AppHeaderProps {
  currentSectionTitle: string;
  dbStatus?: DbSyncStatus;
  teacherName?: string;
  subjectName?: string;
  trialLabel?: string;
  isActivated?: boolean;
  assignedClasses?: AssignedClass[];
  activeClassId?: string;
  onSelectAssignedClass?: (cls: AssignedClass) => void;
  onOpenActivation?: () => void;
  onOpenProfile?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentSectionTitle,
  dbStatus = 'ready',
  teacherName = 'الأستاذ',
  subjectName = 'العلوم',
  trialLabel,
  isActivated = false,
  assignedClasses = [],
  activeClassId = '',
  onSelectAssignedClass,
  onOpenActivation,
  onOpenProfile,
}) => {
  const safeName = typeof teacherName === 'string' && teacherName.trim() ? teacherName.trim() : 'الأستاذ';

  return (
    <header
      className="no-print sticky top-0 z-30 flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 font-tajawal select-none transition-all shadow-xs"
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
        <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[120px] xs:max-w-[160px] sm:max-w-[220px]">
          {currentSectionTitle}
        </h1>
      </div>

      {/* Status Badges, Trial Pill & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Trial or Activation Badge - Accessible Touch Target */}
        {onOpenActivation && (
          <button
            type="button"
            onClick={onOpenActivation}
            aria-label={isActivated ? 'الحساب مفعل برخصة رقمية' : `فترة التجربة: ${trialLabel || 'غير مفعل'}`}
            className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 touch-manipulation ${
              isActivated
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300/80 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 hover:bg-amber-100 border border-amber-300/80 dark:border-amber-800'
            }`}
          >
            {isActivated ? (
              <IconBadgeCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <IconHourglass size={15} className="text-amber-600 dark:text-amber-400 animate-pulse" />
            )}
            <span className="font-extrabold whitespace-nowrap">
              {isActivated ? 'مفعل' : trialLabel || 'تجربة'}
            </span>
          </button>
        )}

        {/* Badges for Desktop & Tablet */}
        <div className="hidden sm:flex items-center gap-1">
          <DbSyncBadge status={dbStatus} />
          <OfflineBadge />
        </div>

        {/* Multi-Class Switcher Dropdown in Header */}
        {assignedClasses && assignedClasses.length > 0 && onSelectAssignedClass && (
          <div className="hidden md:flex items-center gap-1.5 bg-teal-50/90 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl text-xs border border-teal-200 dark:border-slate-700">
            <span className="text-[11px] font-extrabold text-teal-800 dark:text-teal-300">الصف والشعبة:</span>
            <select
              aria-label="تبديل الصف الدراسي والشعبة"
              value={activeClassId || assignedClasses[0]?.id || ''}
              onChange={(e) => {
                const found = assignedClasses.find((c) => c.id === e.target.value);
                if (found) onSelectAssignedClass(found);
              }}
              className="bg-transparent font-extrabold text-slate-800 dark:text-slate-100 border-none outline-none cursor-pointer text-xs max-w-[180px] truncate"
            >
              {assignedClasses.map((cls) => (
                <option key={cls.id} value={cls.id} className="text-slate-900 bg-white dark:bg-slate-800">
                  {cls.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Teacher Profile Pill */}
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-1.5 sm:gap-2 ps-1.5 sm:ps-2 border-s border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-80 active:scale-95 transition min-h-[44px]"
          title="بيانات المعلم والاختصاص"
          role="button"
          tabIndex={0}
          aria-label={`الملف الشخصي: ${safeName}`}
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-teal-600/40 flex items-center justify-center text-teal-800 dark:text-teal-300 font-extrabold text-xs shadow-xs">
            {safeName.slice(0, 1)}
          </div>
          <div className="hidden lg:flex flex-col text-start">
            <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {safeName}
            </span>
            <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">
              اختصاص: {subjectName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
