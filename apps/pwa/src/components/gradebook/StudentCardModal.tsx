/**
 * StudentCardModal - Interactive Evaluation Card & WhatsApp Exporter
 * Features:
 * - Responsive Arabic RTL modal for customized WhatsApp text, printable certificate preview, and decision marks.
 * - Tabbed switcher for Monthly, Midterm, Annual Effort, and Final Result evaluation modes.
 * - Ministerial Decision marks calculation and preview via @techeeer/core.
 * - Direct wa.me integration without third-party URL shorteners.
 * - Fallback clipboard copy and printable view.
 */

import React, { useState } from 'react';
import type {
  StudentEntity,
  GradeEntity,
  EvaluationCardType,
  StudentEvaluationCardData,
} from '../../types/gradebook.js';
import {
  formatWhatsAppCard,
  generateWhatsAppUrl,
  copyCardToClipboard,
  normalizeIraqiPhone,
  getStudentStatusText,
} from '../../services/whatsAppService.js';
import { applyDecisionMarks } from '@techeeer/core';

export interface StudentCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentEntity;
  className: string;
  divisionName: string;
  subjectName: string;
  academicYear: string;
  schoolName?: string;
  teacherName?: string;
  grades?: {
    month1?: GradeEntity;
    month2?: GradeEntity;
    midterm?: GradeEntity;
    month3?: GradeEntity;
    month4?: GradeEntity;
    annualEffort?: number;
    finalExam?: GradeEntity;
    finalResult?: number;
  };
  decisionPool?: number;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  isOpen,
  onClose,
  student,
  className,
  divisionName,
  subjectName,
  academicYear,
  schoolName = 'مدرسة الأمل الابتدائية للبنين',
  teacherName = 'الأستاذ',
  grades,
  decisionPool = 5,
}) => {
  if (!isOpen) return null;

  const [cardType, setCardType] = useState<EvaluationCardType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<'month_1' | 'month_2'>('month_1');
  const [teacherNotes, setTeacherNotes] = useState<string>(student.notes || '');
  const [guardianPhone, setGuardianPhone] = useState<string>(student.guardian_phone || '');
  const [applyDecision, setApplyDecision] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Active grade item based on selection
  const activeGrade = selectedMonth === 'month_1' ? grades?.month1 : grades?.month2;
  const currentScore =
    cardType === 'monthly'
      ? activeGrade?.score ?? null
      : cardType === 'midterm'
      ? grades?.midterm?.score ?? null
      : cardType === 'annual_effort'
      ? grades?.annualEffort ?? null
      : grades?.finalResult ?? null;

  // Decision Marks Calculation
  const isDecisionEligible = currentScore !== null && currentScore >= 40 && currentScore < 50;
  const decisionResult =
    isDecisionEligible && applyDecision
      ? applyDecisionMarks([{ subjectId: 'active_subject', score: currentScore }], decisionPool)
      : null;

  const effectiveScore = decisionResult?.adjustedGrades[0]?.score ?? currentScore;
  const decisionUsed = decisionResult?.usedMarks ?? 0;

  // Components breakdown if available
  const components =
    activeGrade && activeGrade.mode === 'detailed'
      ? {
          oral: activeGrade.component_oral,
          written: activeGrade.component_written,
          homework: activeGrade.component_homework,
          behavior: activeGrade.component_behavior,
          participation: activeGrade.component_participation,
          total: Number(activeGrade.score) || 0,
        }
      : undefined;

  // Construct unified evaluation card data
  const evaluationData: StudentEvaluationCardData = {
    schoolName,
    teacherName,
    studentName: student.full_name,
    className,
    divisionName,
    subjectName,
    academicYear,
    cardType,
    score: effectiveScore,
    components,
    annualEffort: grades?.annualEffort,
    midtermScore: grades?.midterm?.score ?? undefined,
    finalExamScore: grades?.finalExam?.score ?? undefined,
    finalResult: grades?.finalResult ?? undefined,
    decisionMarks:
      decisionResult && decisionUsed > 0
        ? {
            applied: true,
            originalScore: currentScore!,
            adjustedScore: effectiveScore!,
            usedMarks: decisionUsed,
            pool: decisionPool,
          }
        : undefined,
    absencesCount: activeGrade?.is_absent ? 1 : 0,
    teacherNotes,
    guardianPhone,
  };

  const formattedWhatsAppText = formatWhatsAppCard(evaluationData);
  const waUrl = generateWhatsAppUrl(guardianPhone, formattedWhatsAppText);
  const statusInfo = getStudentStatusText(effectiveScore, !!decisionResult, decisionUsed);

  const handleCopy = async () => {
    const ok = await copyCardToClipboard(formattedWhatsAppText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const noteSuggestions = [
    'طالب متميز ومواظب في أداء واجباته 🌟',
    'مشارك بفاعلية وأخلاق عالية داخل الصف 👍',
    'يحتاج إلى مزيد من التركيز والمتابعة المنزلية 📝',
    'يرجى الاهتمام بالحضور وتجنب تكرار الغياب ⚠️',
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-tajawal overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden text-start">
        {/* Mobile Drag Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-teal-50/50 dark:bg-teal-950/20">
          <div>
            <h2 id="card-modal-title" className="text-base font-bold text-teal-950 dark:text-teal-100">
              بطاقة تقييم الطالب (واتساب وطباعة)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {student.full_name} • {className} ({divisionName})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Card Type Selector */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'monthly', label: 'تقييم شهري' },
              { id: 'midterm', label: 'نصف السنة' },
              { id: 'annual_effort', label: 'السعي السنوي' },
              { id: 'final_result', label: 'النتيجة النهائية' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCardType(tab.id as EvaluationCardType)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  cardType === tab.id
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Month Sub-selector */}
          {cardType === 'monthly' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedMonth('month_1')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold ${
                  selectedMonth === 'month_1'
                    ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 border border-teal-300'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600'
                }`}
              >
                الشهر الأول
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth('month_2')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold ${
                  selectedMonth === 'month_2'
                    ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 border border-teal-300'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600'
                }`}
              >
                الشهر الثاني
              </button>
            </div>
          )}

          {/* Graphical Certificate Preview Card */}
          <div className="printable-card p-5 rounded-2xl border-2 border-teal-600/30 bg-gradient-to-b from-teal-50/30 to-white dark:from-slate-800/50 dark:to-slate-900 shadow-sm space-y-4">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 block">
                  جمهورية العراق • وزارة التربية
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {schoolName}
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold">
                {academicYear}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {student.full_name}
                </h3>
                <p className="text-xs text-slate-500">
                  المادة: <span className="font-semibold text-teal-800 dark:text-teal-300">{subjectName}</span> • الصف: {className} ({divisionName})
                </p>
              </div>

              <div className="text-center bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 min-w-[70px]">
                <span className="text-2xl font-black text-teal-700 dark:text-teal-300 block">
                  {effectiveScore !== null && effectiveScore !== undefined ? `${effectiveScore}%` : '--'}
                </span>
                <span className="text-[10px] text-slate-500">الدرجة المقيدة</span>
              </div>
            </div>

            {/* Detailed components breakdown */}
            {components && (
              <div className="grid grid-cols-5 gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">الشفوي</span>
                  <span className="font-bold">{components.oral}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">التحريري</span>
                  <span className="font-bold">{components.written}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">الواجبات</span>
                  <span className="font-bold">{components.homework}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">السلوك</span>
                  <span className="font-bold">{components.behavior}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">المشاركة</span>
                  <span className="font-bold">{components.participation}</span>
                </div>
              </div>
            )}

            {/* Decision Marks Toggle if borderline fail */}
            {isDecisionEligible && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                <div>
                  <label htmlFor="decision-check" className="text-xs font-bold text-amber-900 dark:text-amber-200 block cursor-pointer">
                    تطبيق رصيد درجات القرار الوزاري ({decisionPool} درجات)
                  </label>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400">
                    يحتاج الطالب {50 - currentScore!} درجات للوصول إلى درجة النجاح (50)
                  </span>
                </div>
                <input
                  id="decision-check"
                  type="checkbox"
                  checked={applyDecision}
                  onChange={(e) => setApplyDecision(e.target.checked)}
                  className="w-5 h-5 accent-teal-600 rounded cursor-pointer"
                />
              </div>
            )}

            <div className="flex justify-between items-center pt-2 text-xs">
              <span className={`font-bold ${statusInfo.colorClass}`}>
                الحالة: {statusInfo.label}
              </span>
              <span className="text-slate-400">مدرس المادة: {teacherName}</span>
            </div>
          </div>

          {/* Quick Note Suggestions */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              ملاحظات المعلم لولي الأمر:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {noteSuggestions.map((note, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTeacherNotes(note)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {note}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              placeholder="اكتب ملاحظة خاصة لولي الأمر..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-600 outline-none"
            />
          </div>

          {/* Guardian Phone */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              رقم هاتف ولي الأمر (واتساب):
            </label>
            <div className="relative">
              <input
                type="tel"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="07701234567"
                dir="ltr"
                className="w-full text-sm font-mono p-2.5 ps-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-600 outline-none"
              />
              <span className="absolute start-3 top-2.5 text-xs font-mono font-bold text-slate-400">
                +964 🇮🇶
              </span>
            </div>
            {guardianPhone && !normalizeIraqiPhone(guardianPhone) && (
              <span className="text-[11px] text-amber-600 block">
                تنبيه: الرقم غير مطابق للصيغة العراقية القياسية ولكن سيتم فتح واتساب بالصيغة المدخلة.
              </span>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap gap-2.5 justify-end">
          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[48px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            🖨️ طباعة
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 transition-colors flex items-center gap-1.5"
          >
            📋 {copied ? 'تم النسخ بنجاح!' : 'نسخ نص البطاقة'}
          </button>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[48px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2 active:scale-95"
          >
            💬 إرسال عبر واتساب
          </a>
        </div>
      </div>
    </div>
  );
};
