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
  SUPPORT_PHONE_NUMBER,
  SUBSCRIPTION_TIERS,
  type AssignedClass,
} from '../../services/authService.js';
import { ActivationGateModal } from '../auth/ActivationGateModal.js';
import { getStoredTheme, setAppTheme, type AppTheme } from '../../utils/theme.js';
import { IconSun, IconMoon, IconDevice } from '../common/Icons.js';

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

export function getGradeDisplayLabel(stage: string, grade: number, stream: string): string {
  const config = STAGES_CONFIG.find(s => s.stage === stage);
  if (config) {
    const found = config.grades.find(g => g.grade === grade && (g as { stream?: string }).stream === stream);
    if (found) return found.label;
  }
  return `الصف ${grade}`;
}

export const SettingsStudio: React.FC<SettingsStudioProps> = ({
  teacher = {
    subject: 'science_primary',
    stage: 'primary',
    grade: 5,
    secondarySubjects: [],
  },
  onTeacherChange,
}) => {
  const savedProfile = authService.getTeacherProfile();

  const [teacherName, setTeacherName] = useState(savedProfile?.fullName || 'كرار علي');
  const [phone, setPhone] = useState(savedProfile?.phone || '');
  const [schoolName, setSchoolName] = useState(savedProfile?.schoolName || 'مدرسة سومر الابتدائية');
  const [governorate, setGovernorate] = useState(savedProfile?.governorate || 'بغداد');

  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => getStoredTheme());

  const handleThemeChange = (newTheme: AppTheme) => {
    setCurrentTheme(newTheme);
    setAppTheme(newTheme);
    showToast({
      message: `تم تفعيل ${newTheme === 'dark' ? 'الوضع الليلي' : newTheme === 'light' ? 'الوضع النهاري' : 'الوضع التلقائي'} بنجاح`,
      type: 'success',
    });
  };

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

  // Multiple Assigned Classes State
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>(
    () => savedProfile?.assignedClasses || []
  );
  const [newClassGradeKey, setNewClassGradeKey] = useState<string>('primary_5_general');
  const [newClassSubject, setNewClassSubject] = useState<string>('');
  const [newClassDivision, setNewClassDivision] = useState<string>('أ');

  const newClassParsed = useMemo(() => {
    const parts = newClassGradeKey.split('_');
    const stage = parts[0] as 'primary' | 'intermediate' | 'preparatory';
    const grade = parseInt(parts[1], 10) || 5;
    const stream = (parts[2] || 'general') as 'general' | 'scientific' | 'literary';
    return { stage, grade, stream };
  }, [newClassGradeKey]);

  const newClassAvailableSubjects = useMemo(() => {
    return getSubjectsByStageAndGrade(
      newClassParsed.stage,
      newClassParsed.grade,
      newClassParsed.stream
    );
  }, [newClassParsed]);

  useEffect(() => {
    if (newClassAvailableSubjects.length > 0) {
      setNewClassSubject(newClassAvailableSubjects[0].id);
    }
  }, [newClassAvailableSubjects]);

  const { showToast } = useToast();

  const handleAddClass = () => {
    const subObj = newClassAvailableSubjects.find((s) => s.id === newClassSubject);
    const grdLbl = getGradeDisplayLabel(newClassParsed.stage, newClassParsed.grade, newClassParsed.stream);
    const cleanDiv = newClassDivision.trim() || 'أ';
    const label = `${grdLbl} - شعبة ${cleanDiv} (${subObj?.nameAr || newClassSubject})`;

    const newCls: AssignedClass = {
      id: `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      stage: newClassParsed.stage,
      grade: newClassParsed.grade,
      stream: newClassParsed.stream,
      subject: newClassSubject || selectedSubject,
      label,
      division: cleanDiv,
    };

    const nextList = [...assignedClasses, newCls];
    setAssignedClasses(nextList);

    // Save immediately to persistent storage and activate the newly added class
    authService.saveTeacherProfile({
      assignedClasses: nextList,
      activeClassId: newCls.id,
    });

    if (onTeacherChange) {
      onTeacherChange({
        ...teacher,
        stage: newCls.stage,
        grade: newCls.grade,
        stream: newCls.stream,
        subject: newCls.subject,
        secondarySubjects: [],
      });
    }

    showToast({ message: `تمت إضافة وتفعيل: ${label}`, type: 'success' });
  };

  const handleRemoveClass = (id: string) => {
    const nextList = assignedClasses.filter((c) => c.id !== id);
    setAssignedClasses(nextList);

    authService.saveTeacherProfile({
      assignedClasses: nextList,
    });

    if (onTeacherChange) {
      onTeacherChange({ ...teacher });
    }

    showToast({ message: 'تم إزالة الصف من قائمة التدريس وتحديث الشاشة الرئيسية', type: 'info' });
  };

  // Modals state
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);

  // Live trial & license state
  const trialStatus = authService.getTrialStatus();
  const activeLicense = authService.getActiveLicense();

  const handleSaveProfile = () => {
    const primaryId = `primary_${parsedSelection.stage}_${parsedSelection.grade}_${savedProfile?.division || 'أ'}`;
    authService.saveTeacherProfile({
      fullName: teacherName.trim(),
      phone: phone.trim(),
      schoolName: schoolName.trim(),
      governorate,
      stage: parsedSelection.stage,
      grade: parsedSelection.grade,
      stream: parsedSelection.stream,
      subject: selectedSubject,
      activeClassId: primaryId,
      assignedClasses,
    });

    if (onTeacherChange) {
      onTeacherChange({
        ...teacher,
        stage: parsedSelection.stage,
        grade: parsedSelection.grade,
        stream: parsedSelection.stream,
        subject: selectedSubject,
        secondarySubjects: [],
      });
    }

    showToast({ message: 'تم حفظ اختصاص الأستاذ وكافة الصفوف المسندة وتخصيص المنصة بالكامل ✓', type: 'success' });
  };

  const whatsappUrl = `https://wa.me/964${SUPPORT_PHONE_NUMBER.replace(/^0/, '')}?text=${encodeURIComponent(
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

        {/* Multi-Class Assignment Section */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>🏫</span>
                <span>الصفوف والشعب المسندة للمدرس (تدريس أكثر من صف)</span>
              </h3>
              <p className="text-xs text-slate-500">
                أضف كافة المراحل والشعب التي تدرسها لتتمكن من التبديل بينها ومتابعة درجاتها وخططها بسهولة
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-slate-800 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-900">
              {assignedClasses.length + 1} صفوف مسندة
            </span>
          </div>

          {/* Assigned Classes List */}
          <div className="space-y-2">
            {/* Primary active class */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-700 text-white">الصف الأساسي</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {getGradeDisplayLabel(parsedSelection.stage, parsedSelection.grade, parsedSelection.stream)}
                  {' - '}
                  {availableSubjects.find(s => s.id === selectedSubject)?.nameAr || selectedSubject}
                </span>
              </div>
              <span className="text-xs text-teal-800 dark:text-teal-300 font-semibold">نشط حالياً</span>
            </div>

            {/* Additional assigned classes */}
            {assignedClasses.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 transition hover:border-slate-300"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    صف إضافي
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {cls.label}
                  </span>
                  {cls.division && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-mono">
                      شعبة {cls.division}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGradeKey(`${cls.stage}_${cls.grade}_${cls.stream}`);
                      setSelectedSubject(cls.subject);
                      authService.saveTeacherProfile({
                        stage: cls.stage,
                        grade: cls.grade,
                        stream: cls.stream,
                        subject: cls.subject,
                        division: cls.division || 'أ',
                        activeClassId: cls.id,
                      });
                      onTeacherChange?.({
                        ...teacher,
                        stage: cls.stage,
                        grade: cls.grade,
                        stream: cls.stream,
                        subject: cls.subject,
                        secondarySubjects: [],
                      });
                      showToast({ message: `تم تفعيل ${cls.label} كصف نشط في المنصة`, type: 'info' });
                    }}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition cursor-pointer"
                    title="التعيين كصف أساسي نشط"
                  >
                    تعيين كنشط
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveClass(cls.id)}
                    className="min-h-[36px] px-2 rounded-lg text-red-600 hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                    title="حذف هذا الصف"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Additional Class Form */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-teal-300 dark:border-teal-800 space-y-3">
            <span className="text-xs font-bold text-teal-900 dark:text-teal-300 block">
              ➕ إضافة صف آخر لقائمتك التدريسية:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  المرحلة والصف:
                </label>
                <select
                  value={newClassGradeKey}
                  onChange={(e) => setNewClassGradeKey(e.target.value)}
                  className="w-full min-h-[40px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
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
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  المادة المعتمدة:
                </label>
                <select
                  value={newClassSubject}
                  onChange={(e) => setNewClassSubject(e.target.value)}
                  className="w-full min-h-[40px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-teal-900 dark:text-teal-200"
                >
                  {newClassAvailableSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  الشعبة (اختياري):
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newClassDivision}
                    onChange={(e) => setNewClassDivision(e.target.value)}
                    placeholder="أ، ب، ج..."
                    className="w-full min-h-[40px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddClass}
                    className="min-h-[40px] px-3.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs whitespace-nowrap shadow-xs cursor-pointer active:scale-95 transition"
                  >
                    إضافة +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow transition cursor-pointer"
        >
          حفظ التغييرات وكافة الصفوف المسندة ✓
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
                href={`tel:${SUPPORT_PHONE_NUMBER}`}
                className="px-3.5 py-2 rounded-xl bg-teal-800 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <span>📞</span>
                <span>{SUPPORT_PHONE_NUMBER}</span>
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
              <strong>رقم هاتف الدعم الفني والتفعيل:</strong> {SUPPORT_PHONE_NUMBER}
            </span>
          </div>
        </div>
      </div>

      {/* 2.5 Theme & Appearance Settings (Dark Mode) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>🎨</span>
            <span>المظهر وسمة العرض (الوضع الليلي / النهاري):</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            اختر مظهر المنصة المفضل لك لتوفير الراحة لعينيك أثناء رصد الدرجات أو إعداد الامتحانات ليلاً.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 max-w-md">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            aria-label="تفعيل الوضع النهاري"
            className={`min-h-[48px] p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              currentTheme === 'light'
                ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 ring-2 ring-teal-500/30 font-black shadow-xs'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <IconSun size={20} className={currentTheme === 'light' ? 'text-amber-500' : 'text-slate-400'} />
            <span className="text-xs">نهاري</span>
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            aria-label="تفعيل الوضع الليلي"
            className={`min-h-[48px] p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              currentTheme === 'dark'
                ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 ring-2 ring-teal-500/30 font-black shadow-xs'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <IconMoon size={20} className={currentTheme === 'dark' ? 'text-teal-400' : 'text-slate-400'} />
            <span className="text-xs">ليلي</span>
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange('system')}
            aria-label="تفعيل الوضع التلقائي حسب النظام"
            className={`min-h-[48px] p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              currentTheme === 'system'
                ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 ring-2 ring-teal-500/30 font-black shadow-xs'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <IconDevice size={20} className={currentTheme === 'system' ? 'text-teal-600' : 'text-slate-400'} />
            <span className="text-xs">تلقائي</span>
          </button>
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
