import { forwardRef, useState } from 'react';
import type { ExamPaperAST } from '@techeeer/core';
import { MathRenderer } from './MathRenderer.js';
import { IraqiEagleEmblem } from './IraqiEagleEmblem.js';

export type ExamTemplateId = 'ministerial' | 'modern' | 'framed';

export interface ExamPrintViewProps {
  paper: ExamPaperAST;
  twoColumnLayout?: boolean;
  typography?: {
    fontFamily: 'Amiri' | 'Tajawal';
    scale: 'small' | 'medium' | 'large';
  };
  watermarkText?: string;
  showModelAnswer?: boolean;
  scale?: number;
  className?: string;
  initialTemplate?: ExamTemplateId;
  onPrint?: () => void;
  onExportPdf?: () => void;
  onExportImage?: () => void;
}

export const ExamPrintView = forwardRef<HTMLDivElement, ExamPrintViewProps>(({
  paper,
  twoColumnLayout = false,
  typography,
  watermarkText = 'جمهورية العراق - وزارة التربية',
  className = '',
  initialTemplate = 'ministerial',
  onPrint,
  onExportPdf,
  onExportImage,
}, ref) => {
  const [template, setTemplate] = useState<ExamTemplateId>(initialTemplate);
  const h = paper.header;
  const isTwoCols = Boolean(twoColumnLayout);

  return (
    <div className={`relative flex flex-col items-center bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 print:p-0 print:bg-white ${className}`}>
      {/* Top Action Bar & Template Selector (hidden in print) */}
      <div className="w-full max-w-[210mm] mb-4 flex flex-col gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 print:hidden font-tajawal">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🖨️</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              معاينة الورقة الامتحانية A4
            </span>
          </div>

          {/* Action Buttons */}
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

        {/* 3 Exam Templates Switcher Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            نمط وقالب الأسئلة:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTemplate('ministerial')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                template === 'ministerial'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>🦅 القالب الوزاري الرسمي (نسر العراق)</span>
            </button>
            <button
              type="button"
              onClick={() => setTemplate('modern')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                template === 'modern'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>✨ القالب العصري الحديث</span>
            </button>
            <button
              type="button"
              onClick={() => setTemplate('framed')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                template === 'framed'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>📜 القالب الكلاسيكي المؤطر</span>
            </button>
          </div>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div
        ref={ref}
        id="exam-print-sheet"
        dir="rtl"
        className={`w-full max-w-[210mm] min-h-[297mm] p-[14mm] sm:p-[16mm] bg-white text-slate-950 ${
          typography?.fontFamily === 'Tajawal' ? 'font-tajawal' : 'font-amiri'
        } ${
          typography?.scale === 'small' ? 'text-xs' : typography?.scale === 'large' ? 'text-base' : 'text-sm'
        } shadow-xl print:shadow-none print:w-full print:max-w-none print:min-h-0 print:p-0 relative flex flex-col justify-between selection:bg-teal-100 ${
          template === 'framed'
            ? 'border-4 border-double border-slate-900 m-1'
            : template === 'modern'
            ? 'border border-slate-300 rounded-xl'
            : 'border border-slate-200 print:border-none'
        }`}
        style={{ boxSizing: 'border-box' }}
      >
        {/* Watermark */}
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
          {/* ========================================================
              TEMPLATE 1: MINISTERIAL OFFICIAL (With Iraqi Eagle)
             ======================================================== */}
          {template === 'ministerial' && (
            <header className="border-b-2 border-slate-900 pb-3">
              <div className="grid grid-cols-3 gap-2 items-center text-center text-xs sm:text-sm">
                {/* Right Column */}
                <div className="text-right space-y-0.5 leading-snug">
                  <div className="font-bold">{h.country || 'جمهورية العراق'}</div>
                  <div>{h.ministry || 'وزارة التربية'}</div>
                  <div className="text-slate-800">{h.directorate || 'المديرية العامة للتربية'}</div>
                  <div className="font-bold text-slate-900">{h.schoolName || 'اسم المدرسة'}</div>
                </div>

                {/* Center Column: Iraqi Republican Eagle */}
                <div className="space-y-1">
                  <div className="flex justify-center my-0.5">
                    <IraqiEagleEmblem size={52} />
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
          )}

          {/* ========================================================
              TEMPLATE 2: MODERN CLEAN
             ======================================================== */}
          {template === 'modern' && (
            <header className="border-b border-slate-300 pb-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-dashed border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg">
                    {h.country || 'جمهورية العراق'} - {h.ministry || 'وزارة التربية'}
                  </span>
                  <span className="text-xs text-slate-600">{h.directorate || 'المديرية العامة للتربية'}</span>
                </div>
                <span className="font-bold text-xs text-slate-700">{h.schoolName || 'اسم المدرسة'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center text-center text-xs">
                <div className="text-right space-y-1">
                  <div className="font-extrabold text-sm text-slate-900">{h.subject || 'المادة الدراسية'}</div>
                  <div className="text-slate-700">{h.grade || 'الصف الدراسي'}</div>
                </div>
                <div>
                  <div className="font-black text-base text-slate-900">{h.examTitle || 'الامتحان الرسمي'}</div>
                  <div className="text-xs text-slate-500">{h.academicYear || '2026 - 2027'}</div>
                </div>
                <div className="text-left space-y-1">
                  <div>الوقت: {h.timeAllowed || 'ساعتان'}</div>
                  <div className="text-slate-500">التاريخ: .... / .... / 2027</div>
                </div>
              </div>
              {h.generalNote && (
                <div className="mt-2.5 p-2 rounded-xl bg-teal-50/60 text-teal-900 text-xs font-bold text-center border border-teal-200/60">
                  {h.generalNote.startsWith('ملاحظة') ? h.generalNote : `ملاحظة: ${h.generalNote}`}
                </div>
              )}
            </header>
          )}

          {/* ========================================================
              TEMPLATE 3: CLASSIC FRAMED
             ======================================================== */}
          {template === 'framed' && (
            <header className="border-b-2 border-slate-900 pb-3">
              <div className="text-center font-bold text-xs text-slate-800 mb-1">
                بسم الله الرحمن الرحيم
              </div>
              <div className="grid grid-cols-3 gap-2 items-center text-center text-xs sm:text-sm">
                <div className="text-right space-y-0.5">
                  <div className="font-bold">{h.country || 'جمهورية العراق'}</div>
                  <div>{h.ministry || 'وزارة التربية'}</div>
                  <div>{h.schoolName || 'المدرسة'}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="font-black text-base text-slate-950 underline underline-offset-4">
                    {h.examTitle || 'ورقة الأسئلة الامتحانية'}
                  </div>
                  <div className="text-xs text-slate-700">{h.academicYear || 'العام الدراسي 2026 - 2027'}</div>
                </div>
                <div className="text-left space-y-0.5">
                  <div className="font-bold">{h.subject || 'المادة'}</div>
                  <div>{h.grade || 'الصف'}</div>
                  <div>{h.timeAllowed ? `الزمن: ${h.timeAllowed}` : 'الزمن: ساعتان'}</div>
                </div>
              </div>
              {h.generalNote && (
                <div className="mt-3 p-1.5 text-center text-xs font-bold border-2 border-slate-900 bg-slate-100/60">
                  {h.generalNote.startsWith('ملاحظة') ? h.generalNote : `ملاحظة: ${h.generalNote}`}
                </div>
              )}
            </header>
          )}

          {/* Questions Container (supports 1 or 2 columns) */}
          <main className={isTwoCols ? 'columns-2 gap-8' : 'space-y-4'}>
            {paper.questions.map((q) => {
              const qMarksStr = q.marks ? `(${q.marks} درجة)` : '';
              const qLabel = q.headerLabel || `س${q.questionNumber}`;
              const instrText = q.instruction || (q.header && q.header !== qLabel ? q.header.replace(/^س(?:ؤال)?\s*[0-9٠-٩]+[:/\-.)\]]?\s*/, '').trim() : '');

              return (
                <article
                  key={q.id}
                  className={`break-inside-avoid print:break-inside-avoid pb-3 border-b border-dashed border-slate-300 last:border-b-0 ${
                    template === 'modern' ? 'p-2.5 rounded-xl bg-slate-50/40 mb-2 border-none' : ''
                  }`}
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
