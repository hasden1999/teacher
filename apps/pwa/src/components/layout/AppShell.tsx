import React, { useState } from 'react';
import { AppHeader } from './AppHeader.js';
import { DesktopSidebar, NavTabId, NAV_ITEMS } from './DesktopSidebar.js';
import { MobileBottomNav } from './MobileBottomNav.js';
import { DbSyncStatus } from '../common/StatusBadges.js';

import type { AssignedClass } from '../../services/authService.js';

export interface AppShellProps {
  children?: React.ReactNode;
  activeTab?: NavTabId;
  onTabChange?: (tab: NavTabId) => void;
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

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab: externalTab,
  onTabChange: externalTabChange,
  dbStatus = 'ready',
  teacherName,
  subjectName,
  trialLabel,
  isActivated,
  assignedClasses = [],
  activeClassId = '',
  onSelectAssignedClass,
  onOpenActivation,
  onOpenProfile,
}) => {
  const [internalTab, setInternalTab] = useState<NavTabId>('today');
  const activeTab = externalTab ?? internalTab;
  const handleTabChange = externalTabChange ?? setInternalTab;

  const currentSection = NAV_ITEMS.find((item) => item.id === activeTab)?.label || 'اليوم';
  const currentActiveClass =
    assignedClasses.find((c) => c.id === activeClassId) || assignedClasses[0];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-tajawal text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <AppHeader
        currentSectionTitle={currentSection}
        dbStatus={dbStatus}
        teacherName={teacherName}
        subjectName={subjectName}
        trialLabel={trialLabel}
        isActivated={isActivated}
        assignedClasses={assignedClasses}
        activeClassId={activeClassId}
        onSelectAssignedClass={onSelectAssignedClass}
        onOpenActivation={onOpenActivation}
        onOpenProfile={onOpenProfile}
      />

      {/* Main Content Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (hidden on mobile & print) */}
        <div className="no-print">
          <DesktopSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Viewport Content Area */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6"
        >
          {/* Prominent Active Class, Section & Subject Selector Bar (Sleek & Non-Distracting) */}
          {assignedClasses.length > 0 && (
            <div className="no-print mb-3 bg-white dark:bg-slate-900 border border-teal-200/70 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-2xs flex items-center justify-between gap-2 overflow-hidden">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 overflow-x-auto py-0.5 no-scrollbar">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-teal-900 text-white text-[10px] sm:text-xs font-black shadow-2xs shrink-0">
                  <span>📚</span>
                  <span>{subjectName || 'العلوم'}</span>
                </span>

                {/* Interactive Class & Section Pills */}
                {assignedClasses.map((cls) => {
                  const isSelected = (currentActiveClass?.id || '') === cls.id;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => onSelectAssignedClass?.(cls)}
                      className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-900 dark:text-teal-300 border border-teal-600 shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-teal-600' : 'bg-slate-400'}`} />
                      <span>{cls.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleTabChange('settings')}
                className="hidden sm:inline-flex px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                title="إدارة الصفوف والشعب من الإعدادات"
              >
                + إدارة الصفوف
              </button>
            </div>
          )}

          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (hidden on desktop & print) */}
      <div className="no-print">
        <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </div>
  );
};
