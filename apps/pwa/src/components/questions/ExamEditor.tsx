import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  parseExamPaperAST,
  serializeExamPaperAST,
  calculateExamTotalMarks,
  DEFAULT_EXAM_TYPOGRAPHY,
  type ExamPaperAST,
  type ExamQuestionAST,
  type ExamBranchAST,
  type ExamTypographyConfig,
  type ExamMarksSummary,
} from '@techeeer/core';
import type { QuestionBankItem } from '@techeeer/content';
import { ExamPrintView } from './ExamPrintView.js';
import { MathFormulaEditor } from './MathFormulaEditor.js';
import { QuestionBankModal } from './QuestionBankModal.js';
import { HandwritingOcrModal } from './HandwritingOcrModal.js';
import { ExamExportService } from '../../services/exportService.js';

export type EditorMode = 'structured' | 'natural';

export interface ExamEditorProps {
  initialText?: string;
  initialAST?: ExamPaperAST;
  onSave?: (ast: ExamPaperAST) => void;
  teacherSubject?: string;
  teacherGrade?: number;
  className?: string;
}

const DEFAULT_RAW_TEXT = `جمهورية العراق
وزارة التربية
المديرية العامة لتربية الكرخ
مدرسة المتميزين للبنين
امتحان نصف السنة للعام الدراسي 2026 - 2027
المادة: الكيمياء | الصف: الخامس العلمي | الوقت: ساعتان ونصف
ملاحظة: الإجابة عن خمسة أسئلة فقط ولكل سؤال 20 درجة

س1: عرف ما يأتي: (20 درجة)
فرع أ: المحلول المنظم (10 درجات)
فرع ب: قاعدة لوشاتليه (10 درجات)

س2: أجب عن الآتي: (20 درجة)
فرع أ: اكتب معادلة تفكك كربونات الكالسيوم \\ce{CaCO3 -> CaO + CO2} (10 درجات)
فرع ب: احسب قيمة $pH$ لمحلول حامض الهيدروكلوريك بتركيز $0.01M$ (10 درجات)

س3: علل ما يأتي: (20 درجة)
أولاً: زيادة الضغط ترجح التفاعل نحو الحجم الأقل (10 درجات)
ثانياً: تزداد قابلية ذوبان معظم المواد الصلبة بارتفاع درجة الحرارة (10 درجات)

س4: مسألة كيميائية: (20 درجة)
احسب قيمة ثابت الاتزان $K_{eq}$ للتفاعل الغازي عند درجة حرارة $25^\\circ C$

س5: قارن بين كل مما يأتي: (20 درجة)
فرع أ: النظام المفتوح والنظام المغلق (10 درجات)
فرع ب: العمليات التلقائية وغير التلقائية (10 درجات)`;

export const ExamEditor: React.FC<ExamEditorProps> = ({
  initialText,
  initialAST,
  onSave,
  teacherSubject = 'الكيمياء',
  teacherGrade = 5,
  className = '',
}) => {
  // Initialize AST state
  const [ast, setAst] = useState<ExamPaperAST>(() => {
    if (initialAST) return initialAST;
    return parseExamPaperAST(initialText || DEFAULT_RAW_TEXT);
  });

  const [rawText, setRawText] = useState<string>(() => {
    if (initialText) return initialText;
    if (initialAST) return serializeExamPaperAST(initialAST);
    return DEFAULT_RAW_TEXT;
  });

  const [mode, setMode] = useState<EditorMode>('structured');
  const [activeMobileView, setActiveMobileView] = useState<'editor' | 'preview'>('editor');
  const [typography, setTypography] = useState<ExamTypographyConfig>(DEFAULT_EXAM_TYPOGRAPHY);
  const [twoColumnLayout, setTwoColumnLayout] = useState(false);

  // Modals & Panels State
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [typographyOpen, setTypographyOpen] = useState(false);
  const [questionBankOpen, setQuestionBankOpen] = useState(false);
  const [formulaEditorOpen, setFormulaEditorOpen] = useState(false);
  const [formulaTarget, setFormulaTarget] = useState<{ qIdx: number; bIdx?: number } | null>(null);
  const [handwritingOcrOpen, setHandwritingOcrOpen] = useState(false);

  // Reference for print element
  const printSheetRef = useRef<HTMLDivElement>(null);
  const naturalTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Live Marks Calculation
  const marksSummary: ExamMarksSummary = useMemo(() => {
    return calculateExamTotalMarks(ast.questions);
  }, [ast.questions]);

  // Handle Mode Switching with Bidirectional Sync
  const handleSwitchMode = useCallback((newMode: EditorMode) => {
    if (newMode === mode) return;

    if (newMode === 'natural') {
      // Structured -> Natural: Serialize current AST
      const serialized = serializeExamPaperAST(ast);
      setRawText(serialized);
    } else {
      // Natural -> Structured: Parse current raw text
      const parsed = parseExamPaperAST(rawText);
      setAst(parsed);
    }

    setMode(newMode);
  }, [mode, ast, rawText]);

  // Synchronize Natural Text changes into AST
  const handleNaturalTextChange = (newText: string) => {
    setRawText(newText);
    const updatedAST = parseExamPaperAST(newText);
    setAst(updatedAST);
    if (onSave) onSave(updatedAST);
  };

  // Update a question in structured mode
  const updateQuestion = (qIndex: number, updater: (q: ExamQuestionAST) => ExamQuestionAST) => {
    setAst(prev => {
      const nextQuestions = [...prev.questions];
      nextQuestions[qIndex] = updater(nextQuestions[qIndex]);
      const nextAST = { ...prev, questions: nextQuestions };
      setRawText(serializeExamPaperAST(nextAST));
      if (onSave) onSave(nextAST);
      return nextAST;
    });
  };

  // Add a new question
  const handleAddQuestion = () => {
    setAst(prev => {
      const nextNum = prev.questions.length + 1;
      const newQ: ExamQuestionAST = {
        id: `q_${nextNum}_${Date.now()}`,
        questionNumber: nextNum,
        headerLabel: `س${nextNum}`,
        header: `س${nextNum}:`,
        type: 'GENERAL',
        instruction: 'أجب عما يأتي:',
        subItems: [],
        branches: [],
        marks: 20,
      };
      const nextAST = { ...prev, questions: [...prev.questions, newQ] };
      setRawText(serializeExamPaperAST(nextAST));
      if (onSave) onSave(nextAST);
      return nextAST;
    });
  };

  // Delete a question
  const handleDeleteQuestion = (qIndex: number) => {
    setAst(prev => {
      const nextQuestions = prev.questions.filter((_, i) => i !== qIndex).map((q, idx) => ({
        ...q,
        questionNumber: idx + 1,
        headerLabel: `س${idx + 1}`,
      }));
      const nextAST = { ...prev, questions: nextQuestions };
      setRawText(serializeExamPaperAST(nextAST));
      if (onSave) onSave(nextAST);
      return nextAST;
    });
  };

  // Move Question Up/Down
  const handleMoveQuestion = (qIndex: number, direction: 'up' | 'down') => {
    setAst(prev => {
      const targetIdx = direction === 'up' ? qIndex - 1 : qIndex + 1;
      if (targetIdx < 0 || targetIdx >= prev.questions.length) return prev;

      const nextQuestions = [...prev.questions];
      const temp = nextQuestions[qIndex];
      nextQuestions[qIndex] = nextQuestions[targetIdx];
      nextQuestions[targetIdx] = temp;

      // Re-number
      const renumbered = nextQuestions.map((q, idx) => ({
        ...q,
        questionNumber: idx + 1,
        headerLabel: `س${idx + 1}`,
      }));

      const nextAST = { ...prev, questions: renumbered };
      setRawText(serializeExamPaperAST(nextAST));
      if (onSave) onSave(nextAST);
      return nextAST;
    });
  };

  // Add Branch to a Question
  const handleAddBranch = (qIndex: number) => {
    updateQuestion(qIndex, q => {
      const branchLabels = ['أ', 'ب', 'ج', 'د', 'هـ'];
      const nextLabel = branchLabels[q.branches.length] || `فرع ${q.branches.length + 1}`;
      const newBranch: ExamBranchAST = {
        id: `br_${q.questionNumber}_${nextLabel}_${Date.now()}`,
        label: nextLabel,
        text: 'نص الفرع الجديد...',
        marks: 10,
      };
      const branches = [...q.branches, newBranch];
      return {
        ...q,
        branches,
        subItems: branches.map(b => ({ label: b.label, text: b.text, marks: b.marks })),
      };
    });
  };

  // Delete Branch
  const handleDeleteBranch = (qIndex: number, bIndex: number) => {
    updateQuestion(qIndex, q => {
      const branches = q.branches.filter((_, i) => i !== bIndex);
      return {
        ...q,
        branches,
        subItems: branches.map(b => ({ label: b.label, text: b.text, marks: b.marks })),
      };
    });
  };

  // Update Branch
  const updateBranch = (
    qIndex: number,
    bIndex: number,
    updater: (b: ExamBranchAST) => ExamBranchAST
  ) => {
    updateQuestion(qIndex, q => {
      const branches = [...q.branches];
      branches[bIndex] = updater(branches[bIndex]);
      return {
        ...q,
        branches,
        subItems: branches.map(b => ({ label: b.label, text: b.text, marks: b.marks })),
      };
    });
  };

  // Insert Formula Snippet from MathFormulaEditor
  const handleInsertFormula = (snippet: string) => {
    if (formulaTarget) {
      const { qIdx, bIdx } = formulaTarget;
      if (bIdx !== undefined) {
        // Insert into branch
        updateBranch(qIdx, bIdx, b => ({ ...b, text: `${b.text} ${snippet}`.trim() }));
      } else {
        // Insert into question instruction / text
        updateQuestion(qIdx, q => ({
          ...q,
          instruction: q.instruction ? `${q.instruction} ${snippet}` : snippet,
        }));
      }
    } else if (mode === 'natural' && naturalTextareaRef.current) {
      // Insert into natural textarea at cursor
      const textarea = naturalTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = rawText.slice(0, start);
      const after = rawText.slice(end);
      const updated = `${before}${snippet}${after}`;
      handleNaturalTextChange(updated);
    }
    setFormulaTarget(null);
  };

  // Insert from Question Bank
  const handleInsertBankQuestion = (bankItem: QuestionBankItem) => {
    setAst(prev => {
      const nextNum = prev.questions.length + 1;
      const newQ: ExamQuestionAST = {
        id: `q_${nextNum}_${Date.now()}`,
        questionNumber: nextNum,
        headerLabel: `س${nextNum}`,
        header: `س${nextNum}:`,
        type: 'GENERAL',
        instruction: bankItem.text,
        subItems: [],
        branches: bankItem.options
          ? bankItem.options.map((opt, i) => ({
              id: `br_${nextNum}_${i}_${Date.now()}`,
              label: ['أ', 'ب', 'ج', 'د'][i] || `${i + 1}`,
              text: opt,
              marks: bankItem.defaultMarks ? Math.floor(bankItem.defaultMarks / bankItem.options!.length) : undefined,
            }))
          : [],
        marks: bankItem.defaultMarks || 20,
      };
      const nextAST = { ...prev, questions: [...prev.questions, newQ] };
      setRawText(serializeExamPaperAST(nextAST));
      if (onSave) onSave(nextAST);
      return nextAST;
    });
  };

  const handleInsertBankBranch = (bankItem: QuestionBankItem) => {
    if (ast.questions.length === 0) {
      handleInsertBankQuestion(bankItem);
      return;
    }
    const lastQIdx = ast.questions.length - 1;
    handleAddBranch(lastQIdx);
    updateQuestion(lastQIdx, q => {
      const branches = [...q.branches];
      const lastBIdx = branches.length - 1;
      if (lastBIdx >= 0) {
        branches[lastBIdx] = {
          ...branches[lastBIdx],
          text: bankItem.text,
          marks: bankItem.defaultMarks || 10,
        };
      }
      return {
        ...q,
        branches,
        subItems: branches.map(b => ({ label: b.label, text: b.text, marks: b.marks })),
      };
    });
  };

  // Export actions
  const handleExportPdf = () => {
    if (printSheetRef.current) {
      ExamExportService.exportToPdf(printSheetRef.current, {
        fileName: `${ast.header.examTitle || 'امتحان'}_${ast.header.subject || ''}.pdf`,
        twoColumnLayout,
      });
    }
  };

  const handleExportImage = () => {
    if (printSheetRef.current) {
      ExamExportService.exportToImage(printSheetRef.current, {
        fileName: `${ast.header.examTitle || 'امتحان'}_${ast.header.subject || ''}.png`,
      });
    }
  };

  const handleTriggerPrint = () => {
    ExamExportService.triggerPrint();
  };

  return (
    <div dir="rtl" className={`flex flex-col h-full bg-slate-100 dark:bg-slate-950 font-tajawal ${className}`}>
      {/* Top Main Navigation & Stats Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4 shrink-0 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Title & Mode Switcher */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-teal-900 dark:text-teal-200">
                ستوديو الأسئلة وإعداد الامتحانات
              </h1>
              <p className="text-xs text-slate-500">
                {ast.header.subject ? `${ast.header.subject}` : 'الامتحان الرسمي'} | {ast.header.grade || 'كافة الصفوف'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl ms-2">
              <button
                type="button"
                onClick={() => handleSwitchMode('structured')}
                className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'structured'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                🗂️ النمط المنظم
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('natural')}
                className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'natural'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                📄 النص الطبيعي واللصق
              </button>
            </div>
          </div>

          {/* Quick Actions & Marks Badge */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Marks Status Indicator */}
            <div
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                marksSummary.isStandard100
                  ? 'bg-green-50 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
              }`}
              title={marksSummary.isStandard100 ? 'المجموع 100 درجة (مطابق للضوابط الوزارية)' : 'تنبيه: المجموع لا يطابق معيار 100 درجة'}
            >
              <span>{marksSummary.isStandard100 ? '✓' : '⚠️'}</span>
              <span>المجموع: {marksSummary.totalMarks} / 100 درجة</span>
            </div>

            {/* AI Handwriting OCR Button */}
            <button
              type="button"
              onClick={() => setHandwritingOcrOpen(true)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>📸 استخراج خط اليد (AI)</span>
            </button>

            {/* Question Bank Launcher Button */}
            <button
              type="button"
              onClick={() => setQuestionBankOpen(true)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>📚 بنك الأسئلة</span>
            </button>

            {/* Header Metadata Edit Button */}
            <button
              type="button"
              onClick={() => setHeaderModalOpen(true)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>🏛️ ترويسة الامتحان</span>
            </button>

            {/* Typography Controls Button */}
            <button
              type="button"
              onClick={() => setTypographyOpen(prev => !prev)}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>🔤 الخطوط</span>
            </button>

            {/* Mobile View Toggle */}
            <div className="flex lg:hidden bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveMobileView('editor')}
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  activeMobileView === 'editor' ? 'bg-white dark:bg-slate-700 text-teal-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                تحرير
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileView('preview')}
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  activeMobileView === 'preview' ? 'bg-white dark:bg-slate-700 text-teal-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                معاينة
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Typography Toolbar */}
        {typographyOpen && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300">نوع الخط:</span>
              <button
                type="button"
                onClick={() => setTypography(t => ({ ...t, fontFamily: 'Amiri' }))}
                className={`min-h-[40px] px-3 py-1 rounded-lg font-amiri text-sm font-bold cursor-pointer ${
                  typography.fontFamily === 'Amiri' ? 'bg-teal-700 text-white' : 'bg-white border text-slate-700'
                }`}
              >
                الأميري (وزاري)
              </button>
              <button
                type="button"
                onClick={() => setTypography(t => ({ ...t, fontFamily: 'Tajawal' }))}
                className={`min-h-[40px] px-3 py-1 rounded-lg font-tajawal text-sm font-bold cursor-pointer ${
                  typography.fontFamily === 'Tajawal' ? 'bg-teal-700 text-white' : 'bg-white border text-slate-700'
                }`}
              >
                تجوّل (حديث)
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300">مقياس الحجم:</span>
              {(['small', 'medium', 'large'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTypography(t => ({ ...t, scale: s }))}
                  className={`min-h-[40px] px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    typography.scale === s ? 'bg-teal-700 text-white' : 'bg-white border text-slate-700'
                  }`}
                >
                  {s === 'small' ? 'مدمج' : s === 'medium' ? 'متوسط' : 'كبير'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={twoColumnLayout}
                  onChange={e => setTwoColumnLayout(e.target.checked)}
                  className="rounded text-teal-700 w-4 h-4 cursor-pointer"
                />
                <span>توزيع على عمودين (A4 Columns)</span>
              </label>
            </div>
          </div>
        )}
      </header>

      {/* Main Dual Workspace: Editor Area & Live A4 Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Editor (Desktop: flex-1; Mobile: conditional) */}
        <div
          className={`flex-1 flex flex-col overflow-y-auto p-3 sm:p-4 space-y-4 ${
            activeMobileView === 'preview' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {mode === 'structured' ? (
            /* Structured Tree Mode */
            <div className="space-y-4 max-w-3xl mx-auto w-full">
              {/* Question Cards Feed */}
              {ast.questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-all"
                >
                  {/* Card Header Toolbar */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-teal-800 dark:text-teal-300 font-exam-header text-base">
                        {q.headerLabel || `س${q.questionNumber}`}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        {q.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Marks Input */}
                      <div className="flex items-center gap-1">
                        <label htmlFor={`q-marks-${q.id}`} className="text-xs font-bold text-slate-500">درجة السؤال:</label>
                        <input
                          id={`q-marks-${q.id}`}
                          type="number"
                          min={0}
                          max={100}
                          value={q.marks || 0}
                          onChange={e =>
                            updateQuestion(qIdx, curr => ({ ...curr, marks: Number(e.target.value) }))
                          }
                          className="w-16 min-h-[40px] px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-center"
                        />
                      </div>

                      {/* Move Up/Down Buttons */}
                      <button
                        type="button"
                        disabled={qIdx === 0}
                        onClick={() => handleMoveQuestion(qIdx, 'up')}
                        title="تحريك لأعلى"
                        className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-xs font-bold cursor-pointer"
                      >
                        ⬆️
                      </button>
                      <button
                        type="button"
                        disabled={qIdx === ast.questions.length - 1}
                        onClick={() => handleMoveQuestion(qIdx, 'down')}
                        title="تحريك لأسفل"
                        className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-xs font-bold cursor-pointer"
                      >
                        ⬇️
                      </button>
                      {/* Delete Question */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(qIdx)}
                        title="حذف السؤال"
                        className="min-h-[40px] min-w-[40px] rounded-lg text-red-600 hover:bg-red-50 text-xs font-bold cursor-pointer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Instruction Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor={`q-instr-${q.id}`} className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        منطوق وتوجيه السؤال:
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setFormulaTarget({ qIdx });
                          setFormulaEditorOpen(true);
                        }}
                        className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>📐 إدراج معادلة</span>
                      </button>
                    </div>
                    <textarea
                      id={`q-instr-${q.id}`}
                      rows={2}
                      value={q.instruction || ''}
                      onChange={e =>
                        updateQuestion(qIdx, curr => ({
                          ...curr,
                          instruction: e.target.value,
                          header: `${curr.headerLabel}: ${e.target.value}`.trim(),
                        }))
                      }
                      placeholder="اكتب توجيه السؤال..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm leading-relaxed focus:outline-teal-700"
                    />
                  </div>

                  {/* Sub-Branches Section */}
                  <div className="space-y-2 pt-1 ps-2 border-s-2 border-teal-200 dark:border-teal-900">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        فروع السؤال ({q.branches.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddBranch(qIdx)}
                        className="min-h-[40px] px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold cursor-pointer"
                      >
                        + إضافة فرع
                      </button>
                    </div>

                    {q.branches.map((b, bIdx) => (
                      <div
                        key={b.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={b.label}
                            onChange={e =>
                              updateBranch(qIdx, bIdx, curr => ({ ...curr, label: e.target.value }))
                            }
                            className="w-16 min-h-[36px] px-2 py-0.5 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-xs font-bold text-center"
                            placeholder="أ"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={b.marks || 0}
                              onChange={e =>
                                updateBranch(qIdx, bIdx, curr => ({
                                  ...curr,
                                  marks: Number(e.target.value),
                                }))
                              }
                              className="w-14 min-h-[36px] px-2 py-0.5 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-xs font-bold text-center"
                              title="درجة الفرع"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormulaTarget({ qIdx, bIdx });
                                setFormulaEditorOpen(true);
                              }}
                              className="min-h-[36px] px-2 rounded-lg bg-teal-100 text-teal-900 text-xs font-bold cursor-pointer"
                              title="إدراج معادلة رياضية"
                            >
                              📐
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBranch(qIdx, bIdx)}
                              className="min-h-[36px] px-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={b.text}
                          onChange={e =>
                            updateBranch(qIdx, bIdx, curr => ({ ...curr, text: e.target.value }))
                          }
                          placeholder="نص الفرع..."
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-xs sm:text-sm leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Bottom Add Question Button */}
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full min-h-[48px] py-3 rounded-2xl border-2 border-dashed border-teal-300 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-slate-800 text-teal-800 dark:text-teal-200 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>➕ إضافة سؤال جديد للورقة الامتحانية</span>
              </button>
            </div>
          ) : (
            /* Natural Text Mode */
            <div className="flex-1 flex flex-col space-y-3 max-w-3xl mx-auto w-full">
              {/* Natural Text Syntax Helpers */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-500 ms-1">إدراج سريع:</span>
                <button
                  type="button"
                  onClick={() => handleInsertFormula('\nس: اكتب منطوق السؤال هنا: (20 درجة)\n')}
                  className="min-h-[40px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer"
                >
                  + سؤال (س)
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormula('\nفرع أ: نص الفرع (10 درجات)\n')}
                  className="min-h-[40px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer"
                >
                  + فرع (أ)
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormula(' (20 درجة)')}
                  className="min-h-[40px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer"
                >
                  + درجة (20)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormulaTarget(null);
                    setFormulaEditorOpen(true);
                  }}
                  className="min-h-[40px] px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>📐 محرر المعادلات</span>
                </button>
              </div>

              {/* Monospace Textarea */}
              <div className="flex-1 relative">
                <textarea
                  ref={naturalTextareaRef}
                  value={rawText}
                  onChange={e => handleNaturalTextChange(e.target.value)}
                  placeholder="الصق نص الامتحان هنا..."
                  className="w-full h-full min-h-[450px] p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-amiri leading-relaxed focus:outline-teal-700 resize-none shadow-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live A4 Exam Preview (Desktop: flex-1; Mobile: conditional) */}
        <div
          className={`flex-1 overflow-y-auto border-s border-slate-200 dark:border-slate-800 ${
            activeMobileView === 'editor' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <ExamPrintView
            ref={printSheetRef}
            paper={ast}
            twoColumnLayout={twoColumnLayout}
            onPrint={handleTriggerPrint}
            onExportPdf={handleExportPdf}
            onExportImage={handleExportImage}
            className="w-full"
          />
        </div>
      </div>

      {/* Header Metadata Modal */}
      {headerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-tajawal animate-in fade-in"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-teal-900 dark:text-teal-200">
                🏛️ بيانات ترويسة الامتحان الرسمية
              </h3>
              <button
                type="button"
                onClick={() => setHeaderModalOpen(false)}
                className="min-h-[44px] min-w-[44px] text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">البلد:</label>
                <input
                  type="text"
                  value={ast.header.country || 'جمهورية العراق'}
                  onChange={e =>
                    setAst(prev => ({ ...prev, header: { ...prev.header, country: e.target.value } }))
                  }
                  className="w-full min-h-[44px] p-2 rounded-xl border bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">الوزارة:</label>
                <input
                  type="text"
                  value={ast.header.ministry || 'وزارة التربية'}
                  onChange={e =>
                    setAst(prev => ({ ...prev, header: { ...prev.header, ministry: e.target.value } }))
                  }
                  className="w-full min-h-[44px] p-2 rounded-xl border bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">المديرية العامة:</label>
                <input
                  type="text"
                  value={ast.header.directorate || ''}
                  onChange={e =>
                    setAst(prev => ({ ...prev, header: { ...prev.header, directorate: e.target.value } }))
                  }
                  placeholder="المديرية العامة لتربية الكرخ..."
                  className="w-full min-h-[44px] p-2 rounded-xl border bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">اسم المدرسة:</label>
                <input
                  type="text"
                  value={ast.header.schoolName || ''}
                  onChange={e =>
                    setAst(prev => ({ ...prev, header: { ...prev.header, schoolName: e.target.value } }))
                  }
                  placeholder="ثانوية المتميزين للبنين..."
                  className="w-full min-h-[44px] p-2 rounded-xl border bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">عنوان الامتحان:</label>
                <input
                  type="text"
                  value={ast.header.examTitle || 'امتحانات نصف السنة'}
                  onChange={e =>
                    setAst(prev => ({ ...prev, header: { ...prev.header, examTitle: e.target.value } }))
                  }
                  className="w-full min-h-[44px] p-2 rounded-xl border bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">العام الدراسي:</label>
                <input
                  type="text"
                  value={ast.header.academicYear || '2026 - 2027'}
                  onChange={e =>
                    setAst(prev => ({ ...prev, header: { ...prev.header, academicYear: e.target.value } }))
                  }
                  className="w-full min-h-[44px] p-2 rounded-xl border bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">المادة:</label>
                <input
                  type="text"
                  value={ast.header.subject || ''}
                  onChange={e =>
                    setAst(prev => ({ ...prev, header: { ...prev.header, subject: e.target.value } }))
                  }
                  placeholder="الكيمياء..."
                  className="w-full min-h-[44px] p-2 rounded-xl border bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">الصف:</label>
                <input
                  type="text"
                  value={ast.header.grade || ''}
                  onChange={e =>
                    setAst(prev => ({ ...prev, header: { ...prev.header, grade: e.target.value } }))
                  }
                  placeholder="الخامس العلمي..."
                  className="w-full min-h-[44px] p-2 rounded-xl border bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300">الوقت المخصص:</label>
                <input
                  type="text"
                  value={ast.header.timeAllowed || 'ساعتان ونصف'}
                  onChange={e =>
                    setAst(prev => ({ ...prev, header: { ...prev.header, timeAllowed: e.target.value } }))
                  }
                  className="w-full min-h-[44px] p-2 rounded-xl border bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300">الملاحظة العامة:</label>
                <input
                  type="text"
                  value={ast.header.generalNote || ''}
                  onChange={e =>
                    setAst(prev => ({ ...prev, header: { ...prev.header, generalNote: e.target.value } }))
                  }
                  placeholder="الإجابة عن خمسة أسئلة فقط..."
                  className="w-full min-h-[44px] p-2 rounded-xl border bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setRawText(serializeExamPaperAST(ast));
                  setHeaderModalOpen(false);
                }}
                className="min-h-[48px] px-6 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs cursor-pointer"
              >
                حفظ وتطبيق الترويسة ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formula Editor Modal */}
      <MathFormulaEditor
        isOpen={formulaEditorOpen}
        onClose={() => setFormulaEditorOpen(false)}
        onInsert={handleInsertFormula}
      />

      {/* Question Bank Modal */}
      <QuestionBankModal
        isOpen={questionBankOpen}
        onClose={() => setQuestionBankOpen(false)}
        subject={teacherSubject}
        grade={teacherGrade}
        onInsertAsNewQuestion={handleInsertBankQuestion}
        onInsertAsSubBranch={handleInsertBankBranch}
      />

      {/* Handwriting OCR Modal */}
      {handwritingOcrOpen && (
        <HandwritingOcrModal
          isOpen={handwritingOcrOpen}
          onClose={() => setHandwritingOcrOpen(false)}
          subjectName={teacherSubject}
          onApplyQuestions={(extractedText) => {
            if (mode === 'natural') {
              const combined = rawText ? `${rawText}\n\n${extractedText}` : extractedText;
              handleNaturalTextChange(combined);
            } else {
              const newAST = parseExamPaperAST(extractedText);
              setAst(prev => {
                const combinedQuestions = [...prev.questions, ...newAST.questions];
                const renumbered = combinedQuestions.map((q, idx) => ({
                  ...q,
                  questionNumber: idx + 1,
                  headerLabel: `س${idx + 1}`,
                  header: `س${idx + 1}:`,
                }));
                const mergedAST = { ...prev, questions: renumbered };
                setRawText(serializeExamPaperAST(mergedAST));
                if (onSave) onSave(mergedAST);
                return mergedAST;
              });
            }
          }}
        />
      )}
    </div>
  );
};
