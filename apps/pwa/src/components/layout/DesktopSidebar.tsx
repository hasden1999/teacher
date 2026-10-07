import React from 'react';

export type NavTabId = 'gradebook' | 'questions' | 'plans' | 'classes' | 'backups' | 'settings';

export interface NavItem {
  id: NavTabId;
  label: string;
  icon: string;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'gradebook', label: 'سجل الدرجات', icon: '📊' },
  { id: 'questions', label: 'بنك الأسئلة والامتحانات', icon: '📝' },
  { id: 'plans', label: 'الخطط الدراسية', icon: '📅' },
  { id: 'classes', label: 'الصفوف والطلبة', icon: '👥' },
  { id: 'backups', label: 'النسخ الاحتياطي والأمان', icon: '🛡️' },
  { id: 'settings', label: 'الإعدادات والترخيص', icon: '⚙️' },
];

export interface DesktopSidebarProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside
      aria-label="القائمة الجانبية الرئيسية"
      className="hidden md:flex flex-col w-64 border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-tajawal shrink-0"
    >
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors text-start min-h-[48px] ${
                isActive
                  ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold border-s-4 border-teal-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
        <div className="flex justify-between items-center mb-1">
          <span>الإصدار 1.0.0</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
            OPFS
          </span>
        </div>
        <p className="text-[11px] text-slate-500">حماية البيانات: محلية 100%</p>
      </div>
    </aside>
  );
};
