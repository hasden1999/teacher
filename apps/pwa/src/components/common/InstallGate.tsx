import React, { useState, useEffect } from 'react';
import { isStandaloneMode, detectPlatform } from '../../utils/pwaDetect.js';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface InstallGateProps {
  children: React.ReactNode;
  forcedDisplayMode?: 'standalone' | 'browser';
  forcedUserAgent?: string;
}

export const InstallGate: React.FC<InstallGateProps> = ({
  children,
  forcedDisplayMode,
  forcedUserAgent,
}) => {
  const [standalone, setStandalone] = useState<boolean>(() => {
    if (forcedDisplayMode === 'standalone') return true;
    if (forcedDisplayMode === 'browser') return false;
    return isStandaloneMode();
  });

  const [dismissed, setDismissed] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const platform = detectPlatform(forcedUserAgent);

  useEffect(() => {
    try {
      const isDismissedStored = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('techeeer_install_gate_dismissed') === 'true';
      if (isDismissedStored) {
        setDismissed(true);
      }
    } catch {
      // Ignore
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setStandalone(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Direct app launch: NEVER block children!
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      {/* 1. Main Application always loads directly - Non blocking */}
      {children}

      {/* 2. Sleek Non-Blocking Install Action Bar / Pill when running in browser mode */}
      {!standalone && !dismissed && (
        <div
          dir="rtl"
          className="fixed bottom-18 md:bottom-4 start-4 z-40 flex flex-col gap-2 p-3 bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white rounded-2xl shadow-2xl border border-teal-500/40 font-tajawal animate-in fade-in slide-in-from-bottom duration-300 backdrop-blur-md max-w-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-lg shadow-inner">
                📲
              </div>
              <div className="flex flex-col text-start">
                <span className="text-xs font-extrabold leading-tight">مساعد المعلم العراقي</span>
                <span className="text-[10px] text-teal-300">المنظومة التعليمية المستقلة</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                try {
                  sessionStorage.setItem('techeeer_install_gate_dismissed', 'true');
                } catch {}
              }}
              className="text-[11px] text-slate-300 hover:text-white px-2 py-1 rounded-lg transition"
              aria-label="المتابعة من المتصفح مؤقتاً"
            >
              المتابعة من المتصفح مؤقتاً
            </button>
          </div>

          {platform === 'ios' && (
            <div className="text-[11px] text-teal-200 bg-white/10 p-2 rounded-xl space-y-1">
              <span className="font-bold block">طريقة التثبيت على أجهزة iPhone / iPad:</span>
              <p>اضغط على مشاركة (Share ⎋) ثم اختر «إضافة إلى الشاشة الرئيسية» لتثبيته.</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[10px] text-slate-400">للعمل بدون نت وشاشة كاملة</span>
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black shadow transition active:scale-95 cursor-pointer"
            >
              تثبيت التطبيق الآن
            </button>
          </div>
        </div>
      )}

      {/* 3. Detailed Guide Modal */}
      {isModalOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-tajawal animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-teal-800 to-emerald-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📲</span>
                <h3 className="text-base font-extrabold">طريقة تثبيت مساعد المعلم</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700 dark:text-slate-300">
              {platform === 'ios' ? (
                <div className="space-y-3">
                  <p className="font-bold text-teal-800 dark:text-teal-300 text-sm">
                    طريقة التثبيت على أجهزة iPhone / iPad:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 bg-teal-50 dark:bg-teal-950/60 p-3.5 rounded-2xl border border-teal-200 dark:border-teal-800">
                    <li>اضغط على زر المشاركة <strong>(Share ⎋)</strong> أسفل الشاشة.</li>
                    <li>اختر <strong>«إضافة إلى الشاشة الرئيسية» (Add to Home Screen ⊞)</strong>.</li>
                    <li>اضغط <strong>«إضافة» (Add)</strong> بالأعلى ليظهر التطبيق مع برامجك.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-bold text-teal-800 dark:text-teal-300 text-sm">
                    للتثبيت على Android و Windows عبر المتصفح:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <li>افتح قائمة الخيارات <strong>(⋮)</strong> أعلى أو أسفل المتصفح.</li>
                    <li>اضغط على <strong>«تثبيت التطبيق» (Install app)</strong> أو «إضافة إلى الشاشة الرئيسية».</li>
                    <li>أكّد التثبيت ليفتح التطبيق في نافذة مستقلة دون إنترنت.</li>
                  </ol>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full min-h-[42px] bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow transition"
              >
                تم، فهمت ذلك ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

