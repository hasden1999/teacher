import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'undo';

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
  ariaLabel?: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs?: number;
  undoDurationMs?: number; // Exactly 8000ms for undo operations
  action?: ToastAction;
  onUndo?: () => void;
  onExpire?: () => void;
  createdAt: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (options: {
    message: string;
    type?: ToastType;
    durationMs?: number;
    action?: ToastAction;
  }) => string;
  showUndoToast: (options: {
    message: string;
    undoDurationMs?: number; // Defaults to 8000ms
    onUndo: () => void;
    onExpire?: () => void;
  }) => string;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const defaultToastValue: ToastContextValue = {
  toasts: [],
  showToast: (opts) => {
    if (typeof console !== 'undefined') console.log('[Toast]', opts.message);
    return 'fallback_toast';
  },
  showUndoToast: (opts) => {
    if (typeof console !== 'undefined') console.log('[UndoToast]', opts.message);
    return 'fallback_undo';
  },
  dismissToast: () => {},
  clearAll: () => {},
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    return defaultToastValue;
  }
  return context;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    ({
      message,
      type = 'info',
      durationMs = 4000,
      action,
    }: {
      message: string;
      type?: ToastType;
      durationMs?: number;
      action?: ToastAction;
    }): string => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = {
        id,
        message,
        type,
        durationMs,
        action,
        createdAt: Date.now(),
      };
      setToasts((prev) => [...prev.slice(-2), newToast]); // Keep at most 3 toasts
      return id;
    },
    []
  );

  const showUndoToast = useCallback(
    ({
      message,
      undoDurationMs = 8000, // Exactly 8000ms as per R3 / T1.14.2
      onUndo,
      onExpire,
    }: {
      message: string;
      undoDurationMs?: number;
      onUndo: () => void;
      onExpire?: () => void;
    }): string => {
      const id = `undo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = {
        id,
        message,
        type: 'undo',
        durationMs: undoDurationMs,
        undoDurationMs,
        onUndo,
        onExpire,
        createdAt: Date.now(),
      };
      // Undo toasts take immediate precedence
      setToasts([newToast]);
      return id;
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, showUndoToast, dismissToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="إشعارات النظام"
      className="fixed z-50 pointer-events-none inset-x-0 bottom-20 md:bottom-6 md:inset-x-auto md:start-6 flex flex-col gap-2 items-center md:items-start px-4 md:px-0"
    >
      {toasts.map((toast) => (
        <SingleToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
};

export const SingleToastItem: React.FC<{
  toast: ToastItem;
  onDismiss: () => void;
}> = ({ toast, onDismiss }) => {
  const isUndo = toast.type === 'undo';
  const totalDuration = isUndo ? toast.undoDurationMs || 8000 : toast.durationMs || 4000;
  const [remainingMs, setRemainingMs] = useState(totalDuration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
    const endTime = startTimeRef.current + totalDuration;

    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setRemainingMs(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (isUndo && toast.onExpire) {
          toast.onExpire();
        }
        onDismiss();
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [toast, totalDuration, isUndo, onDismiss]);

  const handleUndoClick = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (toast.onUndo) {
      toast.onUndo();
    }
    onDismiss();
  };

  const progressPercent = Math.max(0, Math.min(100, (remainingMs / totalDuration) * 100));
  const secondsLeft = Math.ceil(remainingMs / 1000);

  // Color schemas based on ToastType
  const typeStyles = {
    undo: 'bg-slate-900 text-white border-slate-700 shadow-xl',
    success: 'bg-emerald-900 text-white border-emerald-700 shadow-lg',
    error: 'bg-rose-900 text-white border-rose-700 shadow-lg',
    warning: 'bg-amber-900 text-white border-amber-700 shadow-lg',
    info: 'bg-teal-900 text-white border-teal-700 shadow-lg',
  }[toast.type];

  return (
    <div
      role={isUndo || toast.type === 'error' ? 'alert' : 'status'}
      aria-live={isUndo ? 'assertive' : 'polite'}
      className={`pointer-events-auto relative overflow-hidden flex items-center justify-between gap-3 w-full max-w-md p-3.5 rounded-xl border text-sm font-tajawal antialiased transition-all transform duration-200 ease-out translate-y-0 opacity-100 ${typeStyles}`}
    >
      {/* Icon & Message */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {isUndo ? (
          <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs">
            {secondsLeft}ث
          </span>
        ) : (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-teal-400" />
        )}
        <span className="text-sm font-medium leading-snug truncate" title={toast.message}>
          {toast.message}
        </span>
      </div>

      {/* Action / Undo Button */}
      {isUndo && (
        <button
          type="button"
          onClick={handleUndoClick}
          aria-label="تراجع عن العملية"
          className="flex-shrink-0 min-h-[48px] min-w-[48px] px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          تراجع
        </button>
      )}

      {/* Custom Action Button (if any) */}
      {!isUndo && toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          aria-label={toast.action.ariaLabel || toast.action.label}
          className="flex-shrink-0 min-h-[48px] min-w-[48px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
        >
          {toast.action.label}
        </button>
      )}

      {/* Manual Dismiss Button */}
      {!isUndo && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="إغلاق الإشعار"
          className="flex-shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      )}

      {/* Countdown Progress Bar (Linear) */}
      <div
        className="absolute bottom-0 inset-x-0 h-1 bg-white/10"
        aria-hidden="true"
      >
        <div
          className={`h-full transition-all duration-100 ease-linear ${
            isUndo ? 'bg-amber-500' : 'bg-teal-400'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
