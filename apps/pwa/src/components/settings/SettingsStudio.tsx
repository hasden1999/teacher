/**
 * SettingsStudio - Teacher Profile, Dynamic Subject Filtering, Offline Licensing & Application Settings
 * Features:
 * - Dynamic Iraqi Ministry of Education Grade/Stage selection and official subject filtering
 * - 2-Day Free Trial Tracking & Live License Status
 * - Admin Hotline: 07764271130
 * - Owner/Admin Portal Gateway
 * - Local storage & OPFS integrity indicators
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useToast } from '../common/Toast.js';
import type { TeacherProfile } from '@techeeer/content';
import { getSubjectsByStageAndGrade } from '@techeeer/content';
import {
  authService,
  ADMIN_PHONE_NUMBER,
  SUBSCRIPTION_TIERS,
} from '../../services/authService.js';
import { ActivationGateModal } from '../auth/ActivationGateModal.js';

export interface SettingsStudioProps {
  teacher?: TeacherProfile;
  onTeacherChange?: (profile: TeacherProfile) => void;
}

export const STAGES_CONFIG = [
  {
    stage: 'primary' as const,
    label: 'المرحلة الابتدائية',
    grades: [
      { grade: 1, label: 'الأول الابتدائي', stream: 'general' as const },
      { grade: 2, label: 'الثاني الابتدائي', stream: 'general' as const },
      { grade: 3, label: 'الثالث الابتدائي', stream: 'general' as const },
      { grade: 4, label: 'الرابع الابتدائي', stream: 'general' as const },
      { grade: 5, label: 'الخامس الابتدائي', stream: 'general' as const },
      { grade: 6, label: 'السادس الابتدائي (وزاري)', stream: 'general' as const },
    ],
  },
  {
    stage: 'intermediate' as const,
    label: 'المرحلة المتوسطة',
    grades: [
      { grade: 1, label: 'الأول المتوسط', stream: 'general' as const },
      { grade: 2, label: 'الثاني المتوسط', stream: 'general' as const },
      { grade: 3, label: 'الثالث المتوسط (وزاري)', stream: 'general' as const },
    ],
  },
  {
    stage: 'preparatory' as const,
    label: 'المرحلة الإعدادية',
    grades: [
      { grade: 4, label: 'الرابع العلمي', stream: 'scientific' as const },
      { grade: 4, label: 'الرابع الأدبي', stream: 'literary' as const },
      { grade: 5, label: 'الخامس العلمي', stream: 'scientific' as const },
      { grade: 5, label: 'الخامس الأدبي', stream: 'literary' as const },
      { grade: 6, label: 'السادس العلمي (وزاري)', stream: 'scientific' as const },
      { grade: 6, label: 'السادس الأدبي (وزاري)', stream: 'literary' as const },
    ],
  },
];

export const SettingsStudio: React.FC<SettingsStudioProps> = ({
  teacher = {
    subject: 'science_primary',
    stage: 'primary',
    grade: 5,
    secondarySubjects: ['physics_scientific'],
  },
  onTeacherChange,
}) => {
  const savedProfile = authService.getTeacherProfile();

  const [teacherName, setTeacherName] = useState(savedProfile?.fullName || 'كرار علي');
  const [phone, setPhone] = useState(savedProfile?.phone || '');
  const [schoolName, setSchoolName] = useState(savedProfile?.schoolName || 'مدرسة سومر الابتدائية');
  const [governorate, setGovernorate] = useState(savedProfile?.governorate || 'بغداد');

  // Selected stage & grade key
  const [selectedGradeKey, setSelectedGradeKey] = useState<string>(() => {
    const stg = savedProfile?.stage || teacher.stage || 'primary';
    const grd = savedProfile?.grade || teacher.grade || 5;
    const strm = savedProfile?.stream || teacher.stream || 'general';
    return `${stg}_${grd}_${strm}`;
  });

  const parsedSelection = useMemo(() => {
    const parts = selectedGradeKey.split('_');
    const stage = parts[0] as 'primary' | 'intermediate' | 'preparatory';
    const grade = parseInt(parts[1], 10) || 5;
    const stream = (parts[2] || 'general') as 'general' | 'scientific' | 'literary';
    return { stage, grade, stream };
  }, [selectedGradeKey]);

  // Dynamic official subjects list for this exact stage, grade and stream
  const availableSubjects = useMemo(() => {
    return getSubjectsByStageAndGrade(
      parsedSelection.stage,
      parsedSelection.grade,
      parsedSelection.stream
    );
  }, [parsedSelection]);

  const [selectedSubject, setSelectedSubject] = useState(
    savedProfile?.subject || teacher.subject || availableSubjects[0]?.id || 'science_primary'
  );

  // Auto-synchronize selected subject if the new grade does not contain the current subject
  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.some((s) => s.id === selectedSubject)) {
      setSelectedSubject(availableSubjects[0].id);
    }
  }, [availableSubjects, selectedSubject]);

  // Modals state
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);

  // Live trial & license state
  const trialStatus = authService.getTrialStatus();
  const activeLicense = authService.getActiveLicense();

  const { showToast } = useToast();

  const handleSaveProfile = () => {
    authService.saveTeacherProfile({
      fullName: teacherName.trim(),
      phone: phone.trim(),
      schoolName: schoolName.trim(),
      governorate,
      stage: parsedSelection.stage,
      grade: parsedSelection.grade,
      stream: parsedSelection.stream,
      subject: selectedSubject,
    });

    if (onTeacherChange) {
      onTeacherChange({
        ...teacher,
        stage: parsedSelection.stage,
        grade: parsedSelection.grade,
        stream: parsedSelection.stream,
        subject: selectedSubject,
      });
    }

    showToast({ message: 'تم حفظ بيانات المعلم والتخصص الدراسي محلياً بنجاح', type: 'success' });
  };

  const whatsappUrl = `https://wa.me/964${ADMIN_PHONE_NUMBER.replace(/^0/, '')}?text=${encodeURIComponent(
    `السلام عليكم ورحمة الله، أرغب بتفعيل تطبيق مساعد المعلم العراقي.\nاسم المعلم: ${teacherName}\nرقم الهاتف: ${phone}`
  )}`;

  return (
    <div dir="rtl" className="max-w-4xl mx-auto space-y-6 font-tajawal">
      {/* 1. Teacher Profile Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👤</span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              ملف المعلم والتخصص الدراسي
            </h2>
            <p className="text-xs text-slate-500">
              يحدد المناهج الرسمية، المواد الدراسية، وبنك الأسئلة المتاح لك تلقائياً
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              اسم المعلم / المدرس:
            </label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              رقم الهاتف (للتواصل وحفظ الترخيص):
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="077XXXXXXXX"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              اسم المدرسة:
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              المحافظة:
            </label>
            <select
              value={governorate}
              onChange={(e) => setGovernorate(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
            >
              {['بغداد', 'البصرة', 'النجف الأشرف', 'كربلاء المقدسة', 'بابل', 'نينوى', 'أربيل', 'ذي قار', 'ميسان', 'واسط', 'المثنى', 'الديوانية', 'ديالى', 'صلاح الدين', 'الأنبار', 'كركوك', 'السليمانية', 'دهوك'].map((gov) => (
                <option key={gov} value={gov}>{gov}</option>
              ))}
            </select>
          </div>

          {/* Targeted Grade Selection with Official Stage Categorization */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              الصف الدراسي المستهدف:
            </label>
            <select
              value={selectedGradeKey}
              onChange={(e) => setSelectedGradeKey(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
            >
              {STAGES_CONFIG.map((stg) => (
                <optgroup key={stg.stage} label={`--- ${stg.label} ---`}>
                  {stg.grades.map((grd) => (
                    <option
                      key={`${stg.stage}_${grd.grade}_${grd.stream}`}
                      value={`${stg.stage}_${grd.grade}_${grd.stream}`}
                    >
                      {grd.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              عند اختيار الصف، تظهر مواده الرسمية المعتمدة فقط في الحقل التالي.
            </p>
          </div>

          {/* Dynamic Subject Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              المادة التخصصية الأساسية:
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50/40 dark:bg-slate-800 text-teal-900 dark:text-teal-200 font-bold"
            >
              {availableSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nameAr}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-teal-700 dark:text-teal-400 mt-1">
              عدد المواد المتاحة لهذا الصف: {availableSubjects.length} مادة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow transition"
        >
          حفظ التغييرات
        </button>
      </div>

      {/* 2. Cryptographic Offline Licensing & Trial Status */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔐</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                حالة الترخيص والاشتراك
              </h2>
              <p className="text-xs text-slate-500">
                تفعيل رسمي مشفر - أمان متقدم ومراقبة زمنية دقيقة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsActivationModalOpen(true)}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
          >
            <span>🔑</span>
            <span>تفعيل / ترقية الحساب</span>
          </button>
        </div>

        {/* License or Trial Banner */}
        {activeLicense ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-700 text-white text-xs font-bold">
                ✓ الحساب مفعّل بنجاح ({SUBSCRIPTION_TIERS.find((t) => t.id === activeLicense.tier)?.labelAr || 'اشتراك نشط'})
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                تاريخ انتهاء الصلاحية: {new Date(activeLicense.expiresAt).toLocaleDateString('ar-IQ')}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                كود الترخيص: {activeLicense.key}
              </p>
            </div>
            <span className="text-3xl">🎖️</span>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-300 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-600 text-white text-xs font-bold">
                ⏳ النسخة التجريبية المجانية (يومان)
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                حالة التجربة: {trialStatus.formattedRemaining}
              </p>
              <p className="text-[11px] text-slate-500">
                يمكنك التفعيل في أي وقت للاستمرار بالاستفادة من سجل الدرجات وبنك الأسئلة.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${ADMIN_PHONE_NUMBER}`}
                className="px-3.5 py-2 rounded-xl bg-teal-800 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <span>📞</span>
                <span>{ADMIN_PHONE_NUMBER}</span>
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <span>💬</span>
                <span>واتساب</span>
              </a>
            </div>
          </div>
        )}

        {/* Customer Support Contact Hotline Callout */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span>📞</span>
            <span>
              <strong>رقم هاتف الدعم الفني والتفعيل:</strong> {ADMIN_PHONE_NUMBER}
            </span>
          </div>
        </div>
      </div>

      {/* 3. System & PWA Architecture Indicators */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-400">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
          معلومات النظام وبيئة التشغيل:
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="block font-bold text-teal-800 dark:text-teal-400">محرك قواعد البيانات</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">SQLite WASM (OPFS)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="block font-bold text-teal-800 dark:text-teal-400">الاعتماد الخارجي</span>
            <span className="font-bold text-emerald-600">0% (بدون CDN)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="block font-bold text-teal-800 dark:text-teal-400">وضع الطيران</span>
            <span className="font-bold text-emerald-600">يعمل 100% أوفلاين</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="block font-bold text-teal-800 dark:text-teal-400">خصوصية البيانات</span>
            <span className="font-bold text-emerald-600">عزل تام محلياً</span>
          </div>
        </div>
      </div>

      {/* 4. PWA Cache Management & Instant Update */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span>🔄</span>
              <span>تحديث المنصة والتخزين المؤقت (PWA Cache)</span>
              <span className="text-[10px] bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-bold px-2 py-0.5 rounded-full">
                إصدار v2.5 AI المركزي
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              إذا قمت بتحديث الموقع على فيرسل ولم تظهر التغييرات فوراً على هاتفك أو حاسوبك بسبب كاش PWA، اضغط هنا لتنظيف التخزين المؤقت وجلب أحدث كود فوراً.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                if ('serviceWorker' in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  for (const r of regs) await r.unregister();
                }
                if ('caches' in window) {
                  const keys = await caches.keys();
                  for (const k of keys) await caches.delete(k);
                }
                showToast({ message: 'تم مسح التخزين المؤقت بنجاح! جاري تحميل النسخة الأحدث...', type: 'success' });
                setTimeout(() => window.location.reload(), 600);
              } catch {
                window.location.reload();
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>🔄</span>
            <span>مسح الذاكرة المؤقتة والتحديث الآن</span>
          </button>
        </div>
      </div>

      {/* 5. Master Platform Admin Portal Shortcut */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/30 border border-teal-500/40 text-teal-300 text-xl flex items-center justify-center">
              👑
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>بوابة مالك المنصة (لوحة تحكم الأدمن)</span>
                <span className="text-[10px] bg-teal-900/80 text-teal-300 border border-teal-700/60 px-2 py-0.5 rounded-full font-mono">
                  SaaS Admin
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                إدارة المشتركين، توليد التراخيص المشفرة، والتحكم بمفتاح الذكاء الاصطناعي المركزي
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.hash = '#admin';
              window.location.reload();
            }}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>🔐</span>
            <span>الدخول إلى لوحة تحكم الأدمن</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <ActivationGateModal
        isOpen={isActivationModalOpen}
        canDismiss={true}
        onClose={() => setIsActivationModalOpen(false)}
        onSuccess={() => setIsActivationModalOpen(false)}
      />
    </div>
  );
};
