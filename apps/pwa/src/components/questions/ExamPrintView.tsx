import { forwardRef } from 'react';
import type { ExamPaperAST } from '@techeeer/core';
import { MathRenderer } from './MathRenderer.js';

export interface ExamPrintViewProps {
  paper: ExamPaperAST;
  twoColumnLayout?: boolean;
  watermarkText?: string;
  showModelAnswer?: boolean;
  scale?: number;
  className?: string;
  onPrint?: () => void;
  onExportPdf?: () => void;
  onExportImage?: () => void;
}

export const ExamPrintView = forwardRef<HTMLDivElement, ExamPrintViewProps>(({
  paper,
  twoColumnLayout = false,
  watermarkText = 'جمهورية العراق - وزارة التربية',
  className = '',
  onPrint,
  onExportPdf,
  onExportImage,
}, ref) => {
  const h = paper.header;
  // Enforce max 2 columns per Iraqi MoE boundary condition T2.18.3
  const isTwoCols = Boolean(twoColumnLayout);

  return (
    <div className={`relative flex flex-col items-center bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 print:p-0 print:bg-white ${className}`}>
      {/* Top Action Bar (hidden in print) */}
      {(onPrint || onExportPdf || onExportImage) && (
        <div className="w-full max-w-[210mm] mb-4 flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 print:hidden font-tajawal">
          <div className="flex items-center gap-2">
            <span className="text-xl">🖨️</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">معاينة الورقة الامتحانية A4</span>
          </div>
          <div className="flex items-center gap-2">
            {onExportPdf && (
              <button
                type="button"
                onClick={onExportPdf}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>📄 حفظ PDF</span>
              </button>
            )}
            {onExportImage && (
              <button
                type="button"
                onClick={onExportImage}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>🖼️ تصدير صورة</span>
              </button>
            )}
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>🖨️ طباعة A4</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* A4 Sheet Container */}
      <div
        ref={ref}
        id="exam-print-sheet"
        dir="rtl"
        className="w-full max-w-[210mm] min-h-[297mm] p-[15mm] bg-white text-slate-950 font-amiri shadow-xl print:shadow-none print:w-full print:max-w-none print:min-h-0 print:p-0 relative flex flex-col justify-between selection:bg-teal-100 border border-slate-200 print:border-none"
        style={{
          boxSizing: 'border-box',
        }}
      >
        {/* Subtle Watermark (opacity strictly 0.08 for safe risograph replication) */}
        {watermarkText && (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
            style={{ opacity: 0.08 }}
          >
            <div className="transform -rotate-30 text-center font-bold text-slate-900 text-4xl sm:text-5xl leading-tight max-w-[80%]">
              {watermarkText}
            </div>
          </div>
        )}

        {/* Paper Content Wrapper */}
        <div className="relative z-10 space-y-4">
          {/* Official 3-Column Ministerial Header */}
          <header className="border-b-2 border-slate-900 pb-3">
            <div className="grid grid-cols-3 gap-2 items-center text-center text-xs sm:text-sm">
              {/* Right Column */}
              <div className="text-right space-y-0.5 leading-snug">
                <div className="font-bold">{h.country || 'جمهورية العراق'}</div>
                <div>{h.ministry || 'وزارة التربية'}</div>
                <div className="text-slate-800">{h.directorate || 'المديرية العامة للتربية'}</div>
                <div className="font-bold text-slate-900">{h.schoolName || 'اسم المدرسة'}</div>
              </div>

              {/* Center Column */}
              <div className="space-y-1">
                {/* Iraqi Coat of Arms Emblem SVG */}
                <div className="flex justify-center my-0.5">
                  <svg className="w-8 h-8 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L9.5 6.5L4 7.3L8 11.2L7.1 16.7L12 14.1L16.9 16.7L16 11.2L20 7.3L14.5 6.5L12 2Z" />
                  </svg>
                </div>
                <div className="font-bold text-sm sm:text-base text-slate-900">
                  {h.examTitle || 'امتحانات نصف السنة'}
                </div>
                {h.academicYear && (
                  <div className="text-xs text-slate-700">
                    {h.academicYear.includes('للعام') ? h.academicYear : `للعام الدراسي ${h.academicYear}`}
                  </div>
                )}
              </div>

              {/* Left Column */}
              <div className="text-left space-y-0.5 leading-snug">
                {h.subject && <div className="font-bold">{h.subject.includes(':') ? h.subject : `المادة: ${h.subject}`}</div>}
                {h.grade && <div>{h.grade.includes(':') ? h.grade : `الصف: ${h.grade}`}</div>}
                {h.timeAllowed && <div>{h.timeAllowed.includes(':') ? h.timeAllowed : `الوقت: ${h.timeAllowed}`}</div>}
                <div className="text-slate-700">التاريخ: .... / .... / 2027</div>
              </div>
            </div>

            {/* General Note Banner */}
            {h.generalNote && (
              <div className="mt-3 p-1.5 text-center text-xs sm:text-sm font-bold border border-slate-900 rounded-md bg-slate-50/50 print:bg-transparent">
                {h.generalNote.startsWith('ملاحظة') ? h.generalNote : `ملاحظة: ${h.generalNote}`}
              </div>
            )}
          </header>

          {/* Questions Container (supports 1 or 2 columns) */}
          <main className={isTwoCols ? 'columns-2 gap-8' : 'space-y-4'}>
            {paper.questions.map((q) => {
              const qMarksStr = q.marks ? `(${q.marks} درجة)` : '';
              const qLabel = q.headerLabel || `س${q.questionNumber}`;
              const instrText = q.instruction || (q.header && q.header !== qLabel ? q.header.replace(/^س(?:ؤال)?\s*[0-9٠-٩]+[:/\-.)\]]?\s*/, '').trim() : '');

              return (
                <article
                  key={q.id}
                  className="break-inside-avoid print:break-inside-avoid pb-3 border-b border-dashed border-slate-300 last:border-b-0"
                >
                  {/* Question Header & Marks */}
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <div className="font-bold text-sm sm:text-base text-slate-950 font-exam-header flex items-baseline gap-1">
                      <span>{qLabel}:</span>
                      {instrText && <span className="font-normal">{instrText}</span>}
                    </div>
                    {qMarksStr && (
                      <span className="text-xs sm:text-sm font-bold text-slate-800 shrink-0 font-exam-header">
                        {qMarksStr}
                      </span>
                    )}
                  </div>

                  {/* Question Main Body Text if any */}
                  {q.mainText && (
                    <div className="text-xs sm:text-sm leading-relaxed mb-2 ps-2">
                      <MathRenderer text={q.mainText} fontFamily="amiri" />
                    </div>
                  )}

                  {/* Branches */}
                  {q.branches && q.branches.length > 0 && (
                    <div className="space-y-1.5 ps-3">
                      {q.branches.map((b) => {
                        const bMarksStr = b.marks ? `(${b.marks} درجة)` : '';
                        const bLabel = b.label || 'أ';
                        const prefix = ['أولاً', 'اولا', 'ثانياً', 'ثانيا', 'ثالثاً', 'ثالثا', 'رابعاً', 'رابعا', 'خامساً', 'خامسا'].includes(bLabel)
                          ? `${bLabel}:`
                          : (bLabel.startsWith('فرع') ? `${bLabel}:` : `فرع ${bLabel}:`);

                        return (
                          <div
                            key={b.id}
                            className="flex items-baseline justify-between gap-2 text-xs sm:text-sm leading-relaxed"
                          >
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-bold text-slate-900 shrink-0">{prefix}</span>
                              <MathRenderer text={b.text} fontFamily="amiri" />
                            </div>
                            {bMarksStr && (
                              <span className="text-xs font-medium text-slate-700 shrink-0">
                                {bMarksStr}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </main>
        </div>

        {/* Paper Footer */}
        <footer className="pt-4 border-t border-slate-900 mt-6 relative z-10">
          <div className="flex items-center justify-between text-xs text-slate-800">
            <span className="font-bold">مع تمنياتنا لكم بالنجاح والتوفيق</span>
            <span>مدرس المادة: ............................</span>
            <span>صفحة 1 من 1</span>
          </div>
        </footer>
      </div>
    </div>
  );
});

ExamPrintView.displayName = 'ExamPrintView';
