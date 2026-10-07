import React, { useState } from 'react';
import { authService, TeacherAccount } from '../../services/authService.js';
import { getSubjectsByStageAndGrade } from '@techeeer/content';
import { useToast } from '../common/Toast.js';

export interface TeacherLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: TeacherAccount) => void;
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

export const TeacherLoginModal: React.FC<TeacherLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const current = authService.getTeacherProfile();
  const [fullName, setFullName] = useState(current?.fullName || '');
  const [phone, setPhone] = useState(current?.phone || '');
  const [schoolName, setSchoolName] = useState(current?.schoolName || '');
  const [governorate, setGovernorate] = useState(current?.governorate || 'بغداد');
  
  // Selected stage & grade key
  const [selectedGradeKey, setSelectedGradeKey] = useState<string>(
    current ? `${current.stage}_${current.grade}_${current.stream}` : 'primary_5_general'
  );

  const parsedSelection = React.useMemo(() => {
    const parts = selectedGradeKey.split('_');
    const stage = parts[0] as 'primary' | 'intermediate' | 'preparatory';
    const grade = parseInt(parts[1], 10) || 5;
    const stream = (parts[2] || 'general') as 'general' | 'scientific' | 'literary';
    return { stage, grade, stream };
  }, [selectedGradeKey]);

  // Dynamic subjects based on official Iraqi curriculum
  const availableSubjects = React.useMemo(() => {
    return getSubjectsByStageAndGrade(
      parsedSelection.stage,
      parsedSelection.grade,
      parsedSelection.stream
    );
  }, [parsedSelection]);

  const [selectedSubject, setSelectedSubject] = useState(
    current?.subject || availableSubjects[0]?.id || 'science_primary'
  );

  // Sync subject when available subjects change
  React.useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.some((s) => s.id === selectedSubject)) {
      setSelectedSubject(availableSubjects[0].id);
    }
  }, [availableSubjects, selectedSubject]);

  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast({ message: 'يرجى إدخال اسم المعلم / المدرس', type: 'error' });
      return;
    }
    if (!phone.trim()) {
      showToast({ message: 'يرجى إدخال رقم الهاتف للتواصل وحفظ الترخيص', type: 'error' });
      return;
    }

    const saved = authService.saveTeacherProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      schoolName: schoolName.trim() || 'المدرسة',
      governorate,
      stage: parsedSelection.stage,
      grade: parsedSelection.grade,
      stream: parsedSelection.stream,
      subject: selectedSubject,
    });

    showToast({
      message: 'تم تسجيل بيانات المعلم وبدء التجربة المجانية لمدة يومين بنجاح!',
      type: 'success',
    });
    onSuccess(saved);
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm font-tajawal animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-teal-700 to-emerald-800 text-white relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl shadow-inner">
              👨‍🏫
            </div>
            <div>
              <h2 className="text-xl font-extrabold">تسجيل الدخول وملف المعلم</h2>
              <p className="text-teal-100 text-xs mt-0.5">
                مساعد المعلم العراقي الذكي - تجربة مجانية لمدة يومين كاملين
              </p>
            </div>
          </div>
          {current && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-6 left-6 text-white/80 hover:text-white text-lg p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Free trial badge */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-6 py-2.5 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
          <span className="text-base">🎁</span>
          <span>
            <strong>عرض التجربة:</strong> يحصل كل معلم على تجربة مجانية لكافة الميزات لمدة يومين (48 ساعة) فور التسجيل!
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              اسم المعلم / المدرس الكامل: *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: الأستاذ كرار علي حسن"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم الهاتف (للتفعيل والواتساب): *
              </label>
              <input
                type="tel"
                required
                placeholder="077XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المحافظة:
              </label>
              <select
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                {['بغداد', 'البصرة', 'النجف الأشرف', 'كربلاء المقدسة', 'بابل', 'نينوى', 'أربيل', 'ذي قار', 'ميسان', 'واسط', 'المثنى', 'الديوانية', 'ديالى', 'صلاح الدين', 'الأنبار', 'كركوك', 'السليمانية', 'دهوك'].map((gov) => (
                  <option key={gov} value={gov}>{gov}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              اسم المدرسة:
            </label>
            <input
              type="text"
              placeholder="مثال: مدرسة سومر للبنين"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          {/* Targeted Grade Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              الصف الدراسي المستهدف: *
            </label>
            <select
              value={selectedGradeKey}
              onChange={(e) => setSelectedGradeKey(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-teal-600 focus:outline-none"
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
              يتم تحديث المواد التخصصية تلقائياً وفق المناهج الرسمية لوزارة التربية العراقية.
            </p>
          </div>

          {/* Dynamic Subject Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              المادة التخصصية الأساسية: *
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-teal-50/50 dark:bg-slate-800 text-teal-900 dark:text-teal-200 font-bold focus:ring-2 focus:ring-teal-600 focus:outline-none"
            >
              {availableSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[48px] py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-teal-700/20 transition flex items-center justify-center gap-2"
            >
              <span>تسجيل البيانات والدخول للبرنامج</span>
              <span>←</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
