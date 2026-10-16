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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Inside the installed app: make sure data is protected from eviction.
    if (standalone) void requestPersistentStorage();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [standalone]);

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
    }
  };

  // The icon is only offered when installation is actually possible:
  // Chrome/Edge/Android (prompt available) or iOS Safari (manual Share flow).
  const canInstall = !standalone && (deferredPrompt !== null || platform === 'ios');

  return (
    <>
      {children}

      {canInstall && (
        <div
          dir="rtl"
          className="fixed bottom-20 md:bottom-6 start-4 z-40 flex flex-col items-start gap-2 font-tajawal"
        >
          {showIosHint && (
            <div className="max-w-[240px] text-[11px] leading-relaxed bg-slate-900 text-white p-2.5 rounded-xl shadow-2xl border border-teal-500/40">
              اضغط زر المشاركة <strong>⎋</strong> ثم «إضافة إلى الشاشة الرئيسية».
            </div>
          )}
          <button
            type="button"
            onClick={handleInstallClick}
            aria-label="تثبيت التطبيق"
            title="تثبيت التطبيق"
            className="flex items-center gap-2 ps-3 pe-4 h-12 rounded-full bg-teal-600 hover:bg-teal-500 text-white text-xs font-black shadow-xl shadow-teal-900/40 ring-2 ring-white/20 active:scale-95 transition cursor-pointer"
          >
            <span className="text-lg leading-none" aria-hidden="true">⬇️</span>
            <span>تثبيت</span>
          </button>
        </div>
      )}
    </>
  );
};
