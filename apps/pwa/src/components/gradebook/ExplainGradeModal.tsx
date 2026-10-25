import React from 'react';
import {
  IRAQ_DEFAULT_V1_SCHEME,
  explain,
  solveFor,
  type StudentGradeInput,
} from '@techeeer/grading-engine';

export interface ExplainGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  nodeId: string;
  studentGrades: Record<string, { score: number | null; isAbsent: boolean }>;
}

export const ExplainGradeModal: React.FC<ExplainGradeModalProps> = ({
  isOpen,
  onClose,
  studentName,
  nodeId,
  studentGrades,
}) => {
  if (!isOpen) return null;

  // Adapt gradebook matrix format to grading-engine StudentGradeInput format
  const engineInput: StudentGradeInput = {
    months: {
      m1: {
        componentsSum: studentGrades.month_1?.score ?? null,
        monthlyExam: studentGrades.month_1?.score ?? null,
      },
      m2: {
        componentsSum: studentGrades.month_2?.score ?? null,
        monthlyExam: studentGrades.month_2?.score ?? null,
      },
      m3: {
        componentsSum: studentGrades.month_3?.score ?? null,
        monthlyExam: studentGrades.month_3?.score ?? null,
      },
      m4: {
        componentsSum: studentGrades.month_4?.score ?? null,
        monthlyExam: studentGrades.month_4?.score ?? null,
      },
    },
    halfYearExam: studentGrades.mid_term?.score ?? null,
    finalExam: studentGrades.final_exam?.score ?? null,
  };

  const explanation = explain(IRAQ_DEFAULT_V1_SCHEME, engineInput, nodeId);
  const solveResult = solveFor(IRAQ_DEFAULT_V1_SCHEME, engineInput);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in select-none font-tajawal"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400">
              <span>📐 تفصيل احتساب الدرجة</span>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-400">iraq-default-v1</span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
              {explanation.labelAr} — {studentName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-sm font-black cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Formula Banner */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
            الصيغة الرسمية المعتمدة:
          </span>
          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
            {explanation.formulaAr}
          </p>
        </div>

        {/* Inputs Breakdown List */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            المدخلات الداخلة في الحساب:
          </span>
          {explanation.inputs.length > 0 ? (
            explanation.inputs.map((inp) => (
              <div
                key={inp.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
              >
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {inp.labelAr}
                </span>
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  {inp.displayValue !== null ? inp.displayValue : 'غير مكتمل'}
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs font-bold text-slate-400 py-2">
              هذه الدرجة مدخلة يدوياً أو ليس لها تفرع حسابي.
            </div>
          )}
        </div>

        {/* Final Computed Value */}
        <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-teal-900 dark:text-teal-300 block">
              الناتج النهائي المحسوب
            </span>
            <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
              دقة كاملة مع عرض بمنزلتين
            </span>
          </div>
          <div className="text-xl font-mono font-black text-teal-800 dark:text-teal-200">
            {explanation.displayValue !== null ? explanation.displayValue : 'غير مكتمل'}
          </div>
        </div>

        {/* Success Target Solver (solveFor - Section 9.7) */}
        {solveResult.annualSaee !== null && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/80">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-300 mb-1">
              <span>🎯 حاسبة النجاح (الامتحان النهائي)</span>
            </div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200 leading-relaxed">
              بناءً على السعي السنوي ({solveResult.annualSaee})، يحتاج الطالب إلى{' '}
              <span className="font-mono font-black underline">
                {solveResult.displayRequiredScore}
              </span>{' '}
              في الامتحان النهائي لبلوغ درجة النجاح (50).
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-black transition cursor-pointer active:scale-95"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
