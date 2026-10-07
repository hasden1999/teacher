import React from 'react';
import { NavTabId } from './DesktopSidebar.js';

export interface MobileBottomNavProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
}

export const MOBILE_TABS: Array<{ id: NavTabId; label: string; icon: string }> = [
  { id: 'gradebook', label: 'السجل', icon: '📊' },
  { id: 'questions', label: 'الأسئلة', icon: '📝' },
  { id: 'plans', label: 'الخطط', icon: '📅' },
  { id: 'classes', label: 'الصفوف', icon: '👥' },
  { id: 'settings', label: 'المزيد', icon: '⚙️' },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav
      aria-label="شريط التنقل السفلي"
      className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-safe font-tajawal"
    >
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {MOBILE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={tab.label}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors ${
                isActive
                  ? 'text-teal-700 dark:text-teal-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <span className="text-xl mb-0.5">{tab.icon}</span>
              <span className="text-[11px] leading-tight">{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-700 dark:bg-teal-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
