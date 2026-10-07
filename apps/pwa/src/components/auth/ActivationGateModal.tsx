import React, { useState } from 'react';
import {
  authService,
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
} from '../../services/authService.js';
import { useToast } from '../common/Toast.js';

export interface ActivationGateModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  canDismiss?: boolean;
}

export const ActivationGateModal: React.FC<ActivationGateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  canDismiss = false,
}) => {
  const [activationKey, setActivationKey] = useState('');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('monthly');
  const [isActivating, setIsActivating] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKey.trim()) {
      showToast({ message: 'يرجى إدخال رمز التفعيل المشفر المستلم من الإدارة', type: 'error' });
      return;
    }

    setIsActivating(true);
    try {
      const res = await authService.activateLicense(activationKey.trim());
      if (res.success) {
        showToast({ message: res.message, type: 'success' });
        onSuccess();
      } else {
        showToast({ message: res.message, type: 'error' });
      }
    } catch (err: any) {
      showToast({
        message: 'حدث خطأ أثناء فك تشفير والتحقق من الترخيص: ' + (err?.message || ''),
        type: 'error',
      });
    } finally {
      setIsActivating(false);
    }
  };

  const currentTeacher = authService.getTeacherProfile();
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `السلام عليكم ورحمة الله، أرغب بتفعيل تطبيق مساعد المعلم العراقي.\nاسم المعلم: ${currentTeacher?.fullName || 'معلم'}\nرقم الهاتف: ${currentTeacher?.phone || ''}\nالباقة المطلوبة: ${
      SUBSCRIPTION_TIERS.find((t) => t.id === selectedTier)?.labelAr || 'تفعيل'
    }`
  )}`;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-tajawal animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg">
              🔒
            </div>
            <div>
              <h2 className="text-xl font-extrabold">طلب تفعيل تطبيق مساعد المعلم</h2>
              <p className="text-teal-100 text-xs mt-0.5">
                تفعيل تشفيري رسمي معتمد (Ed25519) - حماية مطلقة وسجل درجات متكامل
              </p>
            </div>
          </div>
          {canDismiss && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-6 left-6 text-white/80 hover:text-white text-lg p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {/* Customer Support Contact Banner */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 rounded-2xl p-4.5 text-center space-y-2 shadow-sm">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              للحصول على رمز التفعيل الرقمي المشفر، تواصل مع الدعم الفني والمبيعات:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
              >
                <span>💬</span>
                <span>طلب رمز التفعيل عبر واتساب</span>
              </a>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              يتم إصدار التراخيص رقمياً ومشفرة بتقنية Ed25519 لكل معلم بصورة مستقلة تماماً بدون وسيط.
            </p>
          </div>

          {/* Subscription Tiers Selector */}
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-2">
              <span>💳</span>
              <span>اختر باقة التفعيل المناسبة:</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SUBSCRIPTION_TIERS.map((tier) => {
                const isSelected = selectedTier === tier.id;
                return (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {tier.labelAr}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                        {tier.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {tier.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activation Key Form */}
          <form onSubmit={handleActivate} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                أدخل رمز التفعيل المشفر (Ed25519 Token):
              </label>
              <textarea
                rows={3}
                placeholder="الصيغة: <payloadBase64Url>.<signatureBase64Url>"
                value={activationKey}
                onChange={(e) => setActivationKey(e.target.value)}
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isActivating}
              className="w-full min-h-[48px] py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-teal-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isActivating ? 'جارِ التحقق الرقمي...' : 'تفعيل الحساب الآن'}</span>
              <span>🔑</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
