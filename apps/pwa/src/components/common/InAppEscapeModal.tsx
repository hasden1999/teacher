import React, { useState, useEffect } from 'react';
import { detectInAppBrowser, detectPlatform } from '../../utils/pwaDetect.js';
import { buildAndroidChromeIntent } from '../../utils/intentUrl.js';

export interface InAppEscapeModalProps {
  userAgent?: string;
  targetUrl?: string;
  onDismiss?: () => void;
}

export const InAppEscapeModal: React.FC<InAppEscapeModalProps> = ({
  userAgent,
  targetUrl,
  onDismiss,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  const detection = detectInAppBrowser(userAgent);
  const platform = detectPlatform(userAgent);

  useEffect(() => {
    try {
      const storedDismiss = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('techeeer_inapp_escape_dismissed') : null;
      if (storedDismiss === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  if (!detection.isInApp || isDismissed) {
    return null;
  }

  const currentUrl = targetUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const androidIntentUrl = buildAndroidChromeIntent(currentUrl);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(currentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      // Fallback
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('techeeer_inapp_escape_dismissed', 'true');
      }
    } catch {
      // Ignore
    }
    onDismiss?.();
  };

  const handleEscapeAndroid = () => {
    if (typeof window !== 'undefined') {
      window.location.href = androidIntentUrl;
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inapp-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden text-slate-800">
        {/* Modal Header */}
        <div className="bg-amber-500/10 border-b border-amber-200 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-xl font-bold">
            ⚠️
          </div>
          <div>
            <h2 id="inapp-modal-title" className="text-lg font-bold text-amber-950 font-sans">
              متصفح غير مدعوم ({detection.appName})
            </h2>
            <p className="text-xs text-amber-800">بيانات الطلاب معرضة للفقدان</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-4 text-sm leading-relaxed text-slate-700">
          <p>
            أنت تستخدم التطبيق من داخل متصفح مؤقت تابع لتطبيق{' '}
            <strong className="text-amber-950 font-semibold">{detection.appName}</strong>.
          </p>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900 space-y-1">
            <p className="font-bold">⚠️ لماذا يجب الانتقال إلى المتصفح الأساسي؟</p>
            <p>
              تعتمد منظومة «مساعد المعلم» على محرك قواعد بيانات محلي فائق السرعة (SQLite OPFS).
              المتصفحات المصغرة لا تحتفظ بالسجلات وقد تحذف درجاتك فور إغلاق الشاشة!
            </p>
          </div>

          {platform === 'ios' ? (
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="font-semibold text-teal-900 text-xs">خطوات الفتح في متصفح Safari:</p>
              <ol className="list-decimal list-inside text-xs space-y-1.5 text-slate-600">
                <li>اضغط على زر المشاركة أو القائمة <strong>(⋯ أو ↗)</strong> أسفل أو أعلى الشاشة.</li>
                <li>اختر <strong>«فتح في متصفح Safari»</strong> (Open in Safari).</li>
              </ol>
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              يرجى فتح التطبيق مباشرة في متصفح <strong>Google Chrome</strong> لحفظ سجلاتك وتثبيت المنظومة.
            </p>
          )}
        </div>

        {/* Action Zone */}
        <div className="px-6 pb-6 pt-2 space-y-3">
          {platform === 'android' ? (
            <button
              type="button"
              onClick={handleEscapeAndroid}
              className="w-full min-h-[48px] px-4 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              <span>فتح مباشرة في Google Chrome</span>
              <span>↗</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleCopy}
            className="w-full min-h-[48px] px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl border border-slate-300 transition flex items-center justify-center gap-2"
          >
            <span>{copied ? '✅ تم نسخ الرابط بنجاح!' : 'نسخ رابط المنظومة'}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full min-h-[48px] py-2 text-xs text-slate-500 hover:text-slate-700 underline text-center transition"
          >
            متابعة كمعاينة مؤقتة (وضع القراءة فقط دون حفظ دائم)
          </button>
        </div>
      </div>
    </div>
  );
};
