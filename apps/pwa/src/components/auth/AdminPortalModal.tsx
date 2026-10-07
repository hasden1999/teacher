import React, { useState, useEffect } from 'react';
import {
  authService,
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
  AdminLockoutInfo,
} from '../../services/authService.js';
import { useToast } from '../common/Toast.js';

export interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAdminLoggedIn());
  const [lockoutInfo, setLockoutInfo] = useState<AdminLockoutInfo>(authService.getAdminLockoutInfo());
  const [isGenerating, setIsGenerating] = useState(false);

  // Generator form
  const [targetPhone, setTargetPhone] = useState('');
  const [targetTeacherName, setTargetTeacherName] = useState('');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('monthly');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const { showToast } = useToast();

  // Periodically refresh lockout state when locked
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const current = authService.getAdminLockoutInfo();
      setLockoutInfo(current);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutInfo.isLocked) {
      showToast({
        message: `تم قفل الدخول مؤقتاً. يرجى الانتظار ${lockoutInfo.remainingSeconds} ثانية`,
        type: 'error',
      });
      return;
    }

    if (!pin.trim()) {
      showToast({ message: 'يرجى إدخال رمز الدخول', type: 'error' });
      return;
    }

    const success = authService.loginAdmin(pin.trim());
    const updatedLockout = authService.getAdminLockoutInfo();
    setLockoutInfo(updatedLockout);

    if (success) {
      setIsAuthenticated(true);
      setPin('');
      showToast({ message: 'مرحباً بك في لوحة تحكم إدارة النظام', type: 'success' });
    } else {
      if (updatedLockout.isLocked) {
        showToast({
          message: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم قفل الدخول لمدة 5 دقائق لحماية النظام.',
          type: 'error',
        });
      } else {
        const remaining = 3 - updatedLockout.failedAttempts;
        showToast({
          message: `رمز الدخول غير صحيح. المحاولات المتبقية: ${remaining}`,
          type: 'error',
        });
      }
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPhone.trim()) {
      showToast({ message: 'يرجى إدخال رقم هاتف المعلم', type: 'error' });
      return;
    }

    setIsGenerating(true);
    try {
      const key = await authService.generateKeyForTeacher(
        targetPhone.trim(),
        selectedTier,
        targetTeacherName.trim()
      );
      setGeneratedKey(key);
      showToast({ message: 'تم توليد كود التفعيل المشفر بنجاح!', type: 'success' });
    } catch (err: any) {
      showToast({ message: 'فشل توليد التوقيع الرقمي: ' + (err?.message || ''), type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    showToast({ message: 'تم نسخ كود التفعيل المشفر إلى الحافظة', type: 'success' });
  };

  const shareViaWhatsApp = () => {
    if (!generatedKey) return;
    const tierLabel = SUBSCRIPTION_TIERS.find((t) => t.id === selectedTier)?.labelAr || '';
    const message = `مرحباً ${targetTeacherName || 'أستاذنا الفاضل'}،\nتم إصدار كود التفعيل الرقمي المشفر الخاص بك لتطبيق مساعد المعلم العراقي:\n\nكود التفعيل (Ed25519):\n${generatedKey}\n\nنوع الاشتراك: ${tierLabel}\n\nنتمنى لكم فصلاً دراسياً موفقاً!`;
    const cleanPhone = targetPhone.replace(/\D/g, '').replace(/^0/, '964');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-tajawal animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white relative border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-600/30 border border-teal-500/40 text-teal-300 font-black text-2xl flex items-center justify-center shadow-inner">
              👑
            </div>
            <div>
              <h2 className="text-xl font-extrabold">منصة إدارة التراخيص الرقمية</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                توليد وإصدار تراخيص Ed25519 الرسمية المعتمدة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 left-6 text-white/70 hover:text-white text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {!isAuthenticated ? (
            /* Admin Login Form with Brute-Force Rate-Limiting Protection */
            <form onSubmit={handleLogin} className="space-y-4 py-4">
              <div className="text-center space-y-1 mb-4">
                <span className="text-3xl">🔐</span>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                  تسجيل دخول الإدارة والتراخيص
                </h3>
                <p className="text-xs text-slate-500">
                  يرجى إدخال رمز الاعتماد الإداري المصرح به (مُؤمن ضد التخمين والتكرار)
                </p>
              </div>

              {lockoutInfo.isLocked && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-2xl text-xs text-red-700 dark:text-red-300 text-center font-bold animate-pulse">
                  ⛔ تم قفل محاولات الدخول مؤقتاً بسبب تكرار الأخطاء. يرجى الانتظار {lockoutInfo.remainingSeconds} ثانية قبل المحاولة مجدداً.
                </div>
              )}

              <div>
                <input
                  type="password"
                  disabled={lockoutInfo.isLocked}
                  placeholder="رمز الاعتماد الإداري..."
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className={`w-full min-h-[48px] px-4 font-mono text-center tracking-widest text-lg rounded-xl border ${
                    lockoutInfo.isLocked
                      ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-teal-600 focus:outline-none'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={lockoutInfo.isLocked}
                className={`w-full min-h-[48px] py-3 rounded-2xl font-extrabold text-sm shadow-md transition ${
                  lockoutInfo.isLocked
                    ? 'bg-slate-400 text-white cursor-not-allowed'
                    : 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer active:scale-[0.99]'
                }`}
              >
                دخول إلى لوحة إدارة التراخيص
              </button>
            </form>
          ) : (
            /* Admin Key Generator */
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  أنت مسجل حالياً بجلسة إدارة نشطة
                </span>
                <button
                  type="button"
                  onClick={() => {
                    authService.logoutAdmin();
                    setIsAuthenticated(false);
                  }}
                  className="text-xs text-red-600 hover:underline cursor-pointer"
                >
                  تسجيل خروج
                </button>
              </div>

              <form onSubmit={handleGenerateKey} className="space-y-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>⚡</span>
                  <span>إصدار وتوقيع ترخيص Ed25519 رقمي:</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      اسم المعلم (اختياري):
                    </label>
                    <input
                      type="text"
                      placeholder="الأستاذ..."
                      value={targetTeacherName}
                      onChange={(e) => setTargetTeacherName(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم هاتف المعلم: *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="077XXXXXXXX"
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    مدة وباقة الاشتراك:
                  </label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as SubscriptionTier)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  >
                    {SUBSCRIPTION_TIERS.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.labelAr} ({tier.durationDays} يوماً) - {tier.description}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full min-h-[48px] py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isGenerating ? 'جارِ التوقيع الرقمي...' : 'توليد وتوقيع كود التفعيل الرقمي (Ed25519)'}</span>
                  <span>🔑</span>
                </button>
              </form>

              {/* Generated Result Card */}
              {generatedKey && (
                <div className="bg-teal-50 dark:bg-teal-950/40 border-2 border-teal-500 rounded-2xl p-4.5 space-y-3 animate-in zoom-in-95 duration-150">
                  <div className="text-xs font-bold text-teal-800 dark:text-teal-200">
                    تم إصدار وتوقيع الرمز بنجاح:
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-teal-300 dark:border-teal-800 font-mono text-[11px] text-teal-900 dark:text-teal-100 select-all tracking-tight break-all max-h-24 overflow-y-auto">
                    {generatedKey}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>📋</span>
                      <span>نسخ الكود</span>
                    </button>
                    <button
                      type="button"
                      onClick={shareViaWhatsApp}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>💬</span>
                      <span>إرسال عبر واتساب</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
