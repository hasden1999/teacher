import React from 'react';
import { NavTabId } from './DesktopSidebar.js';

export interface MobileBottomNavProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
}

export const MOBILE_TABS: Array<{ id: NavTabId; label: string; icon: string; badge?: string }> = [
  { id: 'gradebook', label: 'الدرجات', icon: '📊' },
  { id: 'questions', label: 'الأسئلة', icon: '📝' },
  { id: 'plans', label: 'الخطط', icon: '📅' },
  { id: 'classes', label: 'الصفوف', icon: '👥' },
  { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange }) => {
  const handleTabClick = (tabId: NavTabId) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {}
    onTabChange(tabId);
  };

  return (
    <nav
      aria-label="شريط التنقل السفلي"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/92 dark:bg-slate-900/92 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] font-tajawal select-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}
    >
      <div className="grid grid-cols-5 h-16 items-center px-1 max-w-lg mx-auto">
        {MOBILE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={tab.label}
              className={`group relative flex flex-col items-center justify-center min-h-[48px] py-1 transition-all duration-150 active:scale-90 cursor-pointer ${
                isActive
                  ? 'text-teal-700 dark:text-teal-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              {/* Icon Container with subtle background pill when active */}
              <div
                className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-100/70 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 scale-105 shadow-xs'
                    : 'group-hover:bg-slate-100/60 dark:group-hover:bg-slate-800/40'
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
              </div>

              {/* Label */}
              <span className="text-[10px] mt-0.5 tracking-tight leading-tight transition-transform">
                {tab.label}
              </span>

              {/* Bottom active dot indicator */}
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-teal-700 dark:bg-teal-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
