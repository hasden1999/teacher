import React, { useState } from 'react';
import { AppHeader } from './AppHeader.js';
import { DesktopSidebar, NavTabId, NAV_ITEMS } from './DesktopSidebar.js';
import { MobileBottomNav } from './MobileBottomNav.js';
import { DbSyncStatus } from '../common/StatusBadges.js';

export interface AppShellProps {
  children?: React.ReactNode;
  activeTab?: NavTabId;
  onTabChange?: (tab: NavTabId) => void;
  dbStatus?: DbSyncStatus;
  teacherName?: string;
  subjectName?: string;
  trialLabel?: string;
  isActivated?: boolean;
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
  onOpenActivation,
  onOpenProfile,
}) => {
  const [internalTab, setInternalTab] = useState<NavTabId>('gradebook');
  const activeTab = externalTab ?? internalTab;
  const handleTabChange = externalTabChange ?? setInternalTab;

  const currentSection = NAV_ITEMS.find((item) => item.id === activeTab)?.label || 'سجل الدرجات';

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
        onOpenActivation={onOpenActivation}
        onOpenProfile={onOpenProfile}
      />

      {/* Main Content Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (hidden on mobile) */}
        <DesktopSidebar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Viewport Content Area */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6"
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (hidden on desktop) */}
      <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};
