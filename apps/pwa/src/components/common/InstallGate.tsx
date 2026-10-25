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

/** Global trigger to open the install flow from any button in the app */
export function triggerAppInstall(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('techeeer:trigger-install'));
  }
}

/**
 * Early capture: `beforeinstallprompt` can fire before React mounts, so the
 * event is stored at module level and picked up by the component on mount.
 */
let earlyPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    earlyPrompt = e as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    earlyPrompt = null;
  });
}

/** Ask the browser to never evict the local (OPFS) database under storage pressure. */
async function requestPersistentStorage(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      await navigator.storage.persist();
    }
  } catch {
    // Ignore: best-effort only
  }
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

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => earlyPrompt
  );
  const [showIosHint, setShowIosHint] = useState<boolean>(false);
  const [showAndroidHint, setShowAndroidHint] = useState<boolean>(false);
  const platform = detectPlatform(forcedUserAgent);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      earlyPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(earlyPrompt);
    };

    const handleAppInstalled = () => {
      earlyPrompt = null;
      setDeferredPrompt(null);
      setStandalone(true);
      void requestPersistentStorage();
    };

    const handleExternalTrigger = () => {
      handleInstallClick();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('techeeer:trigger-install', handleExternalTrigger);

    // Inside the installed app: make sure data is protected from eviction.
    if (standalone) void requestPersistentStorage();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('techeeer:trigger-install', handleExternalTrigger);
    };
  }, [standalone, deferredPrompt, platform]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      earlyPrompt = null;
      setDeferredPrompt(null);
      if (choice.outcome === 'accepted') {
        setStandalone(true);
        void requestPersistentStorage();
      }
    } else if (platform === 'ios') {
      setShowIosHint((v) => !v);
      setShowAndroidHint(false);
    } else if (platform === 'android') {
      setShowAndroidHint((v) => !v);
      setShowIosHint(false);
    }
  };

  // The icon is offered on mobile devices or whenever deferredPrompt is available
  const isMobile = platform === 'android' || platform === 'ios';
  const canInstall = !standalone && (deferredPrompt !== null || isMobile);

  return (
    <>
      {children}

      {canInstall && (
        <div
          dir="rtl"
          className="fixed bottom-20 md:bottom-6 start-4 z-40 flex flex-col items-start gap-2 font-tajawal select-none"
        >
          {showIosHint && (
            <div className="max-w-[260px] text-[12px] leading-relaxed bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-teal-500/40 animate-in fade-in slide-in-from-bottom-2">
              <div className="font-extrabold text-teal-400 mb-1 flex items-center gap-1.5">
                <span>📲 لتثبيت التطبيق على آيفون:</span>
              </div>
              اضغط زر المشاركة <strong className="text-white text-sm">⎋</strong> أسفل الشاشة، ثم اختر <strong className="text-teal-300">«إضافة إلى الشاشة الرئيسية»</strong>.
            </div>
          )}
          {showAndroidHint && (
            <div className="max-w-[260px] text-[12px] leading-relaxed bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-teal-500/40 animate-in fade-in slide-in-from-bottom-2">
              <div className="font-extrabold text-teal-400 mb-1 flex items-center gap-1.5">
                <span>📲 لتثبيت التطبيق على أندرويد:</span>
              </div>
              اضغط قائمة المتصفح <strong className="text-white text-sm">⋮</strong> في الأعلى، ثم اختر <strong className="text-teal-300">«تثبيت التطبيق»</strong> أو <strong className="text-teal-300">«إضافة للشاشة الرئيسية»</strong>.
            </div>
          )}
          <button
            type="button"
            onClick={handleInstallClick}
            aria-label="تثبيت التطبيق"
            title="تثبيت التطبيق على الهاتف"
            className="flex items-center gap-2 ps-3.5 pe-4 h-12 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-black shadow-xl shadow-teal-950/40 ring-2 ring-white/30 active:scale-95 transition cursor-pointer"
          >
            <span className="text-base leading-none" aria-hidden="true">📲</span>
            <span>تثبيت التطبيق</span>
          </button>
        </div>
      )}
    </>
  );
};
