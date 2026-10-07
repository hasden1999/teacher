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

  // Pass-through if already standalone or user dismissed the prompt for this session
  if (standalone || dismissed) {
    return <>{children}</>;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setStandalone(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('techeeer_install_gate_dismissed', 'true');
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 text-slate-800"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Hero */}
        <div className="bg-teal-700 text-white p-6 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3 shadow-inner">
            📚
          </div>
          <h1 className="text-xl font-bold font-sans">مساعد المعلم العراقي</h1>
          <p className="text-xs text-teal-100 mt-1">المنظومة التعليمية المستقلة - تعمل دون إنترنت</p>
        </div>

        {/* Value Proposition Badges */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs shrink-0 font-bold">✓</span>
              <p className="text-xs text-slate-700"><strong>دون اتصال 100%:</strong> يعمل في وضع الطيران دون الحاجة للشبكة أو باقات البيانات.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs shrink-0 font-bold">✓</span>
              <p className="text-xs text-slate-700"><strong>حفظ محلي آمن:</strong> تخزين مشفر لقواعد بيانات الطلاب داخل هاتفك فقط.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs shrink-0 font-bold">✓</span>
              <p className="text-xs text-slate-700"><strong>تطبيق مستقل:</strong> شاشة كاملة وسرعة فائقة تشبه تطبيقات النظام الأصلية.</p>
            </div>
          </div>

          {/* Platform Specific Action */}
          {platform === 'ios' ? (
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-2">
              <p className="text-xs font-bold text-teal-900">طريقة التثبيت على أجهزة iPhone / iPad:</p>
              <ol className="list-decimal list-inside text-xs text-teal-800 space-y-1">
                <li>اضغط على زر المشاركة <strong>(Share ⎋)</strong> في أسفل شاشة Safari.</li>
                <li>مرر القائمة واختر <strong>«إضافة إلى الشاشة الرئيسية» (Add to Home Screen ⊞)</strong>.</li>
                <li>اضغط على <strong>«إضافة» (Add)</strong> أعلى الشاشة لتثبيت التطبيق.</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full min-h-[48px] px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl shadow transition flex items-center justify-center gap-2"
                >
                  <span>تثبيت التطبيق على الهاتف الآن</span>
                  <span>📲</span>
                </button>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-600">
                  لتثبيت التطبيق: افتح قائمة خيارات المتصفح (⋮) ثم اضغط <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
                </div>
              )}
            </div>
          )}

          {/* Bypass Button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-[48px] px-4 text-xs text-slate-500 hover:text-slate-800 font-medium underline py-2 transition"
            >
              المتابعة من المتصفح مؤقتاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
