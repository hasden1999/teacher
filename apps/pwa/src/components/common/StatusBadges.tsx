import React, { useState, useEffect } from 'react';

/**
 * Hook to monitor online/offline status with zero network dependency.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  return isOnline;
}

export type DbSyncStatus = 'ready' | 'saving' | 'backed_up' | 'error';

export interface DbSyncState {
  status: DbSyncStatus;
  lastBackupTime?: number;
  mutationCount: number;
}

/**
 * Offline Status Badge Component
 */
export const OfflineBadge: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div
      role="status"
      aria-label={isOnline ? 'حالة الاتصال: متصل بالإنترنت' : 'حالة الاتصال: الوضع المحلي دون إنترنت'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-tajawal font-medium transition-colors ${
        isOnline
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
          : 'bg-teal-100 text-teal-950 border border-teal-300 dark:bg-teal-900/60 dark:text-teal-100 dark:border-teal-700'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-emerald-500' : 'bg-teal-500 animate-pulse'
        }`}
      />
      <span>{isOnline ? 'متصل' : 'الوضع المحلي (دون إنترنت)'}</span>
    </div>
  );
};

/**
 * Local OPFS Database Sync & Backup Status Badge
 */
export const DbSyncBadge: React.FC<{
  status?: DbSyncStatus;
  mutationCount?: number;
}> = ({ status = 'ready', mutationCount = 0 }) => {
  const statusConfig = {
    ready: {
      label: 'محفوظ محلياً',
      color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      dotColor: 'bg-teal-600',
    },
    saving: {
      label: 'جارٍ الحفظ...',
      color: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      dotColor: 'bg-amber-500 animate-spin',
    },
    backed_up: {
      label: 'نسخة احتياطية آمنة (OPFS)',
      color: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
      dotColor: 'bg-teal-500',
    },
    error: {
      label: 'خطأ في التخزين',
      color: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      dotColor: 'bg-rose-500',
    },
  }[status];

  return (
    <div
      role="status"
      aria-label={`حالة قاعدة البيانات: ${statusConfig.label}`}
      className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-tajawal font-medium border ${statusConfig.color}`}
    >
      <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`} />
      <span>{statusConfig.label}</span>
      {mutationCount > 0 && status === 'ready' && (
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          ({mutationCount})
        </span>
      )}
    </div>
  );
};
