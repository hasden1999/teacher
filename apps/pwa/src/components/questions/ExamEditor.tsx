import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
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
  teacherSubjectId?: string;
  teacherGrade?: number;
  teacherStage?: string;
  teacherDivision?: string;
  className?: string;
}

function buildDefaultSubjectRawText(subjectName: string, grade: number, division?: string): string {
  const gradeLabel = division ? `الصف ${grade} (شعبة ${division})` : `الصف ${grade}`;
  const isMath = subjectName.includes('رياضيات');
  const isArabic = subjectName.includes('عربي');
  const isEnglish = subjectName.includes('إنكليزي') || subjectName.includes('إنجليزي');
  const isBiology = subjectName.includes('أحياء');

  if (isMath) {
    return `جمهورية العراق
وزارة التربية
المديرية العامة للتربية
امتحان نصف السنة للعام الدراسي 2026 - 2027
المادة: ${subjectName} | الصف: ${gradeLabel} | الوقت: ساعتان
ملاحظة: الإجابة عن خمسة أسئلة فقط ولكل سؤال 20 درجة

س1: أجب عما يأتي: (20 درجة)
فرع أ: بسط الجملة العددية الآتية باستعمال ترتيب العمليات: $\\sqrt{12} - \\sqrt{18} \\times \\sqrt{2}$ (10 درجات)
فرع ب: جد مجموعة حل المعادلة: $x^2 - 5x + 6 = 0$ (10 درجات)

س2: جد ناتج ما يأتي: (20 درجة)
فرع أ: جد الجذر التربيعي والتكعيبي للمقدار: $\\sqrt[3]{-27} + \\sqrt{25}$ (10 درجات)
فرع ب: اكتب الحد العشرين من المتتابعة الحسابية $\{6, 1, -4, -9, ...\}$ (10 درجات)`;
  }

  if (isArabic) {
    return `جمهورية العراق
وزارة التربية
المديرية العامة للتربية
امتحان نصف السنة للعام الدراسي 2026 - 2027
المادة: ${subjectName} | الصف: ${gradeLabel} | الوقت: ساعتان
ملاحظة: الإجابة عن خمسة أسئلة فقط ولكل سؤال 20 درجة

س1: قواعد اللغة العربية: (20 درجة)
فرع أ: زن أربعة من الكلمات الآتية بالميزان الصرفي: (بعثر، قُلْ، استغفر، سَارَ، جعفر) (10 درجات)
فرع ب: هات اسم الفاعل من الأفعال الآتية مع بيان السبب: (كتب، استخرج، صام) (10 درجات)

س2: الأدب والنصوص: (20 درجة)
فرع أ: ما المقصود بالأدب؟ وما قسماه الرئيسان؟ (10 درجات)
فرع ب: انسب المؤلفات الأدبية الآتية إلى أصحابها (10 درجات)`;
  }

  if (isBiology) {
    return `جمهورية العراق
وزارة التربية
المديرية العامة للتربية
امتحان نصف السنة للعام الدراسي 2026 - 2027
المادة: ${subjectName} | الصف: ${gradeLabel} | الوقت: ساعتان
ملاحظة: الإجابة عن خمسة أسئلة فقط ولكل سؤال 20 درجة

س1: عرف ما يأتي: (20 درجة)
فرع أ: بيوت الطاقة (المايتوكوندريا) (10 درجات)
فرع ب: التمثيل الغذائي (الأيض) (10 درجات)

س2: علل ما يأتي: (20 درجة)
فرع أ: تسمية كريات الدم البيض بهذا الاسم (10 درجات)
فرع ب: وجود غضاريف في جدار القصبة الهوائية (10 درجات)`;
  }

  if (isEnglish) {
    return `جمهورية العراق
وزارة التربية
المديرية العامة للتربية
امتحان نصف السنة للعام الدراسي 2026 - 2027
المادة: ${subjectName} | الصف: ${gradeLabel} | الوقت: ساعتان
ملاحظة: الإجابة عن كافة الأسئلة

س1: Grammar and Functions: (20 درجة)
فرع أ: Put the verb in the Past Continuous or Past Simple (10 درجات)
فرع ب: Rewrite the sentence politely (10 درجات)

س2: Vocabulary and Textbook Passages: (20 درجة)
فرع أ: Fill in the blanks with the suitable words from the list (10 درجات)
فرع ب: Answer the comprehension questions from your textbook (10 درجات)`;
  }

  return `جمهورية العراق
وزارة التربية
المديرية العامة للتربية
امتحان نصف السنة للعام الدراسي 2026 - 2027
المادة: ${subjectName} | الصف: ${gradeLabel} | الوقت: ساعتان
ملاحظة: الإجابة عن خمسة أسئلة فقط ولكل سؤال 20 درجة

س1: عرف ما يأتي: (20 درجة)
فرع أ: اكتب المصطلح الأول هنا (10 درجات)
فرع ب: اكتب المصطلح الثاني هنا (10 درجات)

س2: علل ما يأتي: (20 درجة)
فرع أ: اكتب التعليل الأول هنا (10 درجات)
فرع ب: اكتب التعليل الثاني هنا (10 درجات)

س3: اختر الإجابة الصحيحة من بين الأقواس: (20 درجة)
فرع أ: النقطة الأولى للاختيار (10 درجات)
فرع ب: النقطة الثانية للاختيار (10 درجات)`;
}

/**
 * Normalizes and formalizes exam question instructions and punctuation
 * into the official Iraqi Ministry of Education ministerial standard style.
 */
export function formatFormalExamText(text: string): string {
  if (!text) return '';
  let res = text.trim();

  // Normalize punctuation to Arabic standard
  res = res.replace(/\?/g, '؟');
  res = res.replace(/;/g, '؛');
  res = res.replace(/,/g, '،');

  // Fix spacing around punctuation
  res = res.replace(/\s*:\s*/g, ': ');
  res = res.replace(/\s*؛\s*/g, '؛ ');
  res = res.replace(/\s*،\s*/g, '، ');
  res = res.replace(/\s*؟\s*/g, '؟ ');

  // Formal Iraqi ministerial exam phrasings (expands shorthand inputs without duplicate phrasing)
  res = res.replace(/^(عرف|عرّف)(\s*:)?$/i, 'عرف ما يأتي:');
  res = res.replace(/^(علل)(\s*:)?$/i, 'علل ما يأتي:');
  res = res.replace(/^(قارن)(\s*:)?$/i, 'قارن بين كل مما يأتي:');
  res = res.replace(/^(املا|املأ)\s+(الفراغ|الفراغات)(\s*:)?$/i, 'املأ الفراغات الآتية بما يناسبها:');
  res = res.replace(/^(اختر|إختر)\s+(الاجابة|الإجابة)(\s*:)?$/i, 'اختر الإجابة الصحيحة من بين الأقواس:');
  res = res.replace(/^(ما هو|ما هي)(\s*:)?$/i, 'ما المقصود بكل مما يأتي:');
  res = res.replace(/^(اجب|أجب)\s+(عن|عما)\s+(يلي|الاتي)(\s*:)?$/i, 'أجب عما يأتي:');

  // Clean consecutive spaces
  res = res.replace(/[ \t]+/g, ' ');
  return res.trim();
}

/**
 * Ensures complete structural integrity of ExamPaperAST, protecting against corrupted
 * localStorage drafts or partial objects where branches or text fields might be undefined.
 */
export function sanitizeAST(astCandidate: any, fallbackSubject?: string, fallbackGrade?: string): ExamPaperAST {
  if (!astCandidate || typeof astCandidate !== 'object') {
    return {
      header: {
        country: 'جمهورية العراق',
        ministry: 'وزارة التربية',
        subject: fallbackSubject || 'العلوم',
        grade: fallbackGrade || 'الصف 5',
      },
      questions: [],
      rawText: '',
    };
  }

  const rawQuestions = Array.isArray(astCandidate.questions) ? astCandidate.questions : [];
  const safeQuestions: ExamQuestionAST[] = rawQuestions.map((q: any, idx: number) => {
    const qNum = typeof q?.questionNumber === 'number' ? q.questionNumber : idx + 1;
    const rawBranches = Array.isArray(q?.branches) ? q.branches : (Array.isArray(q?.subItems) ? q.subItems : []);
    const safeBranches: ExamBranchAST[] = rawBranches.map((b: any, bIdx: number) => {
      const defaultLabel = ['أ', 'ب', 'ج', 'د', 'هـ'][bIdx] || `${bIdx + 1}`;
      return {
        id: b?.id ? String(b.id) : `br_${qNum}_${bIdx}_${Date.now()}`,
        label: b?.label ? String(b.label) : defaultLabel,
        text: b?.text !== undefined && b?.text !== null ? String(b.text) : '',
        marks: typeof b?.marks === 'number' ? b.marks : undefined,
      };
    });

    return {
      id: q?.id ? String(q.id) : `q_${qNum}_${Date.now()}`,
      questionNumber: qNum,
      headerLabel: q?.headerLabel ? String(q.headerLabel) : `س${qNum}`,
      header: q?.header ? String(q.header) : `س${qNum}:`,
      type: q?.type || 'GENERAL',
      instruction: q?.instruction ? String(q.instruction) : '',
      mainText: q?.mainText ? String(q.mainText) : undefined,
      branches: safeBranches,
      subItems: safeBranches.map((b) => ({ label: b.label, text: b.text, marks: b.marks })),
      marks: typeof q?.marks === 'number' ? q.marks : 20,
    };
  });

  return {
    header: {
      country: astCandidate.header?.country || 'جمهورية العراق',
      ministry: astCandidate.header?.ministry || 'وزارة التربية',
      directorate: astCandidate.header?.directorate || '',
      schoolName: astCandidate.header?.schoolName || '',
      examTitle: astCandidate.header?.examTitle || 'امتحانات نصف السنة',
      academicYear: astCandidate.header?.academicYear || '2026 - 2027',
      subject: fallbackSubject || astCandidate.header?.subject || '',
      grade: fallbackGrade || astCandidate.header?.grade || '',
      timeAllowed: astCandidate.header?.timeAllowed || 'ساعتان',
      generalNote: astCandidate.header?.generalNote || '',
    },
    questions: safeQuestions,
    rawText: typeof astCandidate.rawText === 'string' ? astCandidate.rawText : '',
  };
}

export const ExamEditor: React.FC<ExamEditorProps> = ({
  initialText,
  initialAST,
  onSave,
  teacherSubject = 'العلوم',
  teacherSubjectId,
  teacherGrade = 5,
  teacherStage,
  teacherDivision,
  className = '',
}) => {
  const defaultRawTextForSubject = useMemo(
    () => buildDefaultSubjectRawText(teacherSubject, teacherGrade, teacherDivision),
    [teacherSubject, teacherGrade, teacherDivision]
  );

  const fallbackGradeStr = teacherDivision
    ? `الصف ${teacherGrade} (شعبة ${teacherDivision})`
    : `الصف ${teacherGrade}`;

  // Initialize AST state with safe validation and sanitization against corrupted localStorage
  const [ast, setAst] = useState<ExamPaperAST>(() => {
    if (initialAST && initialAST.header && Array.isArray(initialAST.questions)) {
      return sanitizeAST(initialAST, teacherSubject, fallbackGradeStr);
    }
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('techeeer_exam_draft_ast');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && parsed.header && Array.isArray(parsed.questions)) {
            return sanitizeAST(parsed, teacherSubject || parsed.header?.subject, fallbackGradeStr);
          }
        } catch {}
      }
    }
    return sanitizeAST(parseExamPaperAST(initialText || defaultRawTextForSubject), teacherSubject, fallbackGradeStr);
  });

  const [rawText, setRawText] = useState<string>(() => {
    if (initialText) return initialText;
    if (initialAST) return serializeExamPaperAST(sanitizeAST(initialAST, teacherSubject, fallbackGradeStr));
    if (typeof localStorage !== 'undefined') {
      const savedAst = localStorage.getItem('techeeer_exam_draft_ast');
      if (savedAst) {
        try {
          const parsed = JSON.parse(savedAst);
          if (parsed && typeof parsed === 'object' && parsed.header && Array.isArray(parsed.questions)) {
            return serializeExamPaperAST(sanitizeAST(parsed, teacherSubject, fallbackGradeStr));
          }
        } catch {}
      }
    }
    return defaultRawTextForSubject;
  });

  // Reactive sync when teacher switches active class/division or subject specialization
  useEffect(() => {
    const targetGradeStr = teacherDivision
      ? `الصف ${teacherGrade} (شعبة ${teacherDivision})`
      : `الصف ${teacherGrade}`;
    setAst((prev) => {
      const safePrev = sanitizeAST(prev, teacherSubject, targetGradeStr);
      if (safePrev.header.subject === teacherSubject && safePrev.header.grade === targetGradeStr) {
        return safePrev;
      }
      const next = sanitizeAST({
        ...safePrev,
        header: {
          ...safePrev.header,
          subject: teacherSubject,
          grade: targetGradeStr,
        },
      }, teacherSubject, targetGradeStr);
      setRawText(serializeExamPaperAST(next));
      return next;
    });
  }, [teacherSubject, teacherGrade, teacherDivision]);

  // Auto-save exam draft to local storage so teacher work is never lost
  useEffect(() => {
    if (typeof localStorage !== 'undefined' && ast) {
      try {
        localStorage.setItem('techeeer_exam_draft_ast', JSON.stringify(ast));
      } catch {}
    }
  }, [ast]);

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

  // Live Marks Calculation with null safety
  const marksSummary: ExamMarksSummary = useMemo(() => {
    return calculateExamTotalMarks(Array.isArray(ast?.questions) ? ast.questions : []);
  }, [ast?.questions]);

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

  const commitAstChange = (nextAST: ExamPaperAST) => {
    setAst(nextAST);
    setRawText(serializeExamPaperAST(nextAST));
    if (onSave) onSave(nextAST);
  };

  // Update a question in structured mode
  const updateQuestion = (qIndex: number, updater: (q: ExamQuestionAST) => ExamQuestionAST) => {
    const nextQuestions = [...ast.questions];
    if (!nextQuestions[qIndex]) return;
    nextQuestions[qIndex] = updater(nextQuestions[qIndex]);
    const nextAST = { ...ast, questions: nextQuestions };
    commitAstChange(nextAST);
  };

  // Format a specific question and its branches into official ministerial Arabic style
  const formatQuestion = (qIndex: number) => {
    updateQuestion(qIndex, q => {
      const branches = Array.isArray(q.branches) ? q.branches : [];
      return {
        ...q,
        instruction: formatFormalExamText(q.instruction || ''),
        header: `${q.headerLabel || `س${q.questionNumber}`}: ${formatFormalExamText(q.instruction || '')}`.trim(),
        branches: branches.map(b => ({
          ...b,
          text: formatFormalExamText(b.text || ''),
        })),
        subItems: branches.map(b => ({
          label: b.label || 'أ',
          text: formatFormalExamText(b.text || ''),
          marks: b.marks,
        })),
      };
    });
  };

  // Add a new question
  const handleAddQuestion = () => {
    const nextNum = ast.questions.length + 1;
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
    const nextAST = { ...ast, questions: [...ast.questions, newQ] };
    commitAstChange(nextAST);
  };

  // Quick 1-click question type generator with automatic numbering & formal branches (Req 5.1)
  const handleQuickAddQuestionType = (
    preset: 'define' | 'explain' | 'mcq' | 'blanks' | 'compare' | 'math' | 'tf'
  ) => {
    const nextNum = ast.questions.length + 1;
    const presets: Record<
      typeof preset,
      { instruction: string; branches: Array<{ label: string; text: string; marks: number }> }
    > = {
      define: {
        instruction: 'عرف ما يأتي:',
        branches: [
          { label: 'أولاً', text: 'اكتب المصطلح الأول هنا...', marks: 10 },
          { label: 'ثانياً', text: 'اكتب المصطلح الثاني هنا...', marks: 10 },
        ],
      },
      explain: {
        instruction: 'علل ما يأتي:',
        branches: [
          { label: 'أولاً', text: 'اكتب التعليل الأول هنا...', marks: 10 },
          { label: 'ثانياً', text: 'اكتب التعليل الثاني هنا...', marks: 10 },
        ],
      },
      mcq: {
        instruction: 'اختر الإجابة الصحيحة من بين الأقواس لكل مما يأتي:',
        branches: [
          { label: '1', text: 'العبارة الأولى (الخيار أ ، الخيار ب ، الخيار ج)', marks: 10 },
          { label: '2', text: 'العبارة الثانية (الخيار أ ، الخيار ب ، الخيار ج)', marks: 10 },
        ],
      },
      blanks: {
        instruction: 'املأ الفراغات الآتية بما يناسبها:',
        branches: [
          { label: '1', text: '.................... هو ....................', marks: 10 },
          { label: '2', text: 'تتكون .................... من ....................', marks: 10 },
        ],
      },
      compare: {
        instruction: 'قارن بين كل مما يأتي:',
        branches: [
          { label: 'أ', text: 'المقارنة الأولى (من حيث الوظيفة والتركيب)', marks: 20 },
        ],
      },
      math: {
        instruction: 'جد ناتج ما يأتي:',
        branches: [
          { label: 'أ', text: 'بسط المقدار الجبري: $\\sqrt{x^2 + 1}$', marks: 10 },
          { label: 'ب', text: 'جد مجموعة حل المعادلة: $\\frac{x+1}{2} = 5$', marks: 10 },
        ],
      },
      tf: {
        instruction: 'ضع كلمة (صح) أمام العبارة الصحيحة وكلمة (خطأ) أمام العبارة غير الصحيحة:',
        branches: [
          { label: '1', text: 'العبارة الأولى ( )', marks: 10 },
          { label: '2', text: 'العبارة الثانية ( )', marks: 10 },
        ],
      },
    };

    const chosen = presets[preset];
    const mappedBranches: ExamBranchAST[] = chosen.branches.map((b, idx) => ({
      id: `br_${nextNum}_${idx}_${Date.now()}`,
      label: b.label,
      text: b.text,
      marks: b.marks,
    }));

    const newQ: ExamQuestionAST = {
      id: `q_${nextNum}_${Date.now()}`,
      questionNumber: nextNum,
      headerLabel: `س${nextNum}`,
      header: `س${nextNum}: ${chosen.instruction}`,
      type: 'GENERAL',
      instruction: chosen.instruction,
      subItems: mappedBranches.map((b) => ({ label: b.label, text: b.text, marks: b.marks })),
      branches: mappedBranches,
      marks: 20,
    };

    const nextAST = { ...ast, questions: [...ast.questions, newQ] };
    commitAstChange(nextAST);
  };

  // Clear all branches from a question (revert to direct question)
  const handleClearBranches = (qIndex: number) => {
    updateQuestion(qIndex, q => ({
      ...q,
      branches: [],
      subItems: [],
    }));
  };

  // Delete a question
  const handleDeleteQuestion = (qIndex: number) => {
    const nextQuestions = ast.questions.filter((_, i) => i !== qIndex).map((q, idx) => ({
      ...q,
      questionNumber: idx + 1,
      headerLabel: `س${idx + 1}`,
    }));
    const nextAST = { ...ast, questions: nextQuestions };
    commitAstChange(nextAST);
  };

  // Move Question Up/Down
  const handleMoveQuestion = (qIndex: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? qIndex - 1 : qIndex + 1;
    if (targetIdx < 0 || targetIdx >= ast.questions.length) return;

    const nextQuestions = [...ast.questions];
    const temp = nextQuestions[qIndex];
    nextQuestions[qIndex] = nextQuestions[targetIdx];
    nextQuestions[targetIdx] = temp;

    // Re-number
    const renumbered = nextQuestions.map((q, idx) => ({
      ...q,
      questionNumber: idx + 1,
      headerLabel: `س${idx + 1}`,
    }));

    const nextAST = { ...ast, questions: renumbered };
    commitAstChange(nextAST);
  };

  // Add Branch to a Question
  const handleAddBranch = (qIndex: number) => {
    updateQuestion(qIndex, q => {
      const branches = Array.isArray(q.branches) ? q.branches : [];
      const branchLabels = ['أ', 'ب', 'ج', 'د', 'هـ'];
      const nextLabel = branchLabels[branches.length] || `فرع ${branches.length + 1}`;
      const newBranch: ExamBranchAST = {
        id: `br_${q.questionNumber}_${nextLabel}_${Date.now()}`,
        label: nextLabel,
        text: 'نص الفرع الجديد...',
        marks: 10,
      };
      const nextBranches = [...branches, newBranch];
      return {
        ...q,
        branches: nextBranches,
        subItems: nextBranches.map(b => ({ label: b.label, text: b.text, marks: b.marks })),
      };
    });
  };

  // Delete Branch
  const handleDeleteBranch = (qIndex: number, bIndex: number) => {
    updateQuestion(qIndex, q => {
      const branches = (Array.isArray(q.branches) ? q.branches : []).filter((_, i) => i !== bIndex);
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
      const branches = Array.isArray(q.branches) ? [...q.branches] : [];
      if (!branches[bIndex]) return q;
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
        {/* Page Title & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📝</span>
            <div>
              <h1 className="text-base sm:text-lg font-black text-teal-900 dark:text-teal-200 tracking-tight">
                استوديو الأسئلة وإعداد الامتحانات
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {ast.header.subject ? `${ast.header.subject}` : 'الامتحان الرسمي'} | {ast.header.grade || 'كافة الصفوف'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Marks Status Indicator */}
            <div
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-xs ${
                marksSummary.isStandard100
                  ? 'bg-green-50 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
              }`}
              title={marksSummary.isStandard100 ? 'المجموع 100 درجة (مطابق للضوابط الوزارية)' : 'تنبيه: المجموع لا يطابق معيار 100 درجة'}
            >
              <span>{marksSummary.isStandard100 ? '✓' : '⚠️'}</span>
              <span>المجموع: {marksSummary.totalMarks} / 100 درجة</span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => handleSwitchMode('structured')}
                className={`min-h-[36px] px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
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
                className={`min-h-[36px] px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  mode === 'natural'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                📄 النص الطبيعي واللصق
              </button>
            </div>

            {/* Mobile View Toggle */}
            <div className="flex lg:hidden bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveMobileView('editor')}
                className={`min-h-[36px] px-3 py-1 rounded-lg font-bold cursor-pointer transition ${
                  activeMobileView === 'editor' ? 'bg-white dark:bg-slate-700 text-teal-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                ✏️ تحرير
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileView('preview')}
                className={`min-h-[36px] px-3 py-1 rounded-lg font-bold cursor-pointer transition ${
                  activeMobileView === 'preview' ? 'bg-white dark:bg-slate-700 text-teal-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                👁️ معاينة
              </button>
            </div>
          </div>
        </div>

        {/* Evenly Arranged Action Buttons Grid (Designed for Mobile & Desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 w-full pt-2.5">
          <button
            type="button"
            onClick={handleAddQuestion}
            className="min-h-[44px] px-2.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 text-center"
          >
            <span>➕ إضافة سؤال</span>
          </button>

          <button
            type="button"
            onClick={() => setHandwritingOcrOpen(true)}
            className="min-h-[44px] px-2.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 text-center"
          >
            <span>📸 مسح الأسئلة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormulaTarget(null);
              setFormulaEditorOpen(true);
            }}
            className="min-h-[44px] px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 text-center"
          >
            <span>📐 الرموز والمعادلات</span>
          </button>

          <button
            type="button"
            onClick={() => setQuestionBankOpen(true)}
            className="min-h-[44px] px-2.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 text-center"
          >
            <span>📚 بنك الأسئلة</span>
          </button>

          <button
            type="button"
            onClick={() => setHeaderModalOpen(true)}
            className="min-h-[44px] px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 text-center"
          >
            <span>🏛️ ترويسة الامتحان</span>
          </button>

          <button
            type="button"
            onClick={() => setTypographyOpen(prev => !prev)}
            className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 text-center ${
              typographyOpen
                ? 'bg-teal-700 text-white border-teal-800'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            <span>🔤 حجم ونمط الخط</span>
          </button>
        </div>

        {/* Collapsible Typography & Font Controls Toolbar */}
        {typographyOpen && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl animate-in slide-in-from-top-2 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">نوع الخط:</span>
              <button
                type="button"
                onClick={() => setTypography(t => ({ ...t, fontFamily: 'Amiri' }))}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl font-amiri text-sm font-bold cursor-pointer transition ${
                  typography.fontFamily === 'Amiri' ? 'bg-teal-700 text-white shadow-xs' : 'bg-white border text-slate-700'
                }`}
              >
                الأميري (وزاري رسمي)
              </button>
              <button
                type="button"
                onClick={() => setTypography(t => ({ ...t, fontFamily: 'Tajawal' }))}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl font-tajawal text-sm font-bold cursor-pointer transition ${
                  typography.fontFamily === 'Tajawal' ? 'bg-teal-700 text-white shadow-xs' : 'bg-white border text-slate-700'
                }`}
              >
                تجوّل (عصري)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">حجم الخط:</span>
              {(['small', 'medium', 'large'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTypography(t => ({ ...t, scale: s }))}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl font-bold cursor-pointer transition ${
                    typography.scale === s ? 'bg-teal-700 text-white shadow-xs' : 'bg-white border text-slate-700'
                  }`}
                >
                  {s === 'small' ? 'مدمج (صغير)' : s === 'medium' ? 'متوسط (معياري)' : 'كبير (واضح)'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={twoColumnLayout}
                  onChange={e => setTwoColumnLayout(e.target.checked)}
                  className="rounded text-teal-700 w-4 h-4 cursor-pointer"
                />
                <span>توزيع الورقة على عمودين (A4)</span>
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
              {/* Quick Question Type Shortcuts Bar (Req 5.1: اختصارات سريعة لنوع السؤال وترقيم تلقائي) */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>إدراج سريع لنوع السؤال (ترقيم وزاري تلقائي س{ast.questions.length + 1}):</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickAddQuestionType('define')}
                    className="min-h-[36px] px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-bold cursor-pointer transition active:scale-95"
                  >
                    + عرّف ما يأتي
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddQuestionType('explain')}
                    className="min-h-[36px] px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-bold cursor-pointer transition active:scale-95"
                  >
                    + علل ما يأتي
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddQuestionType('mcq')}
                    className="min-h-[36px] px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-bold cursor-pointer transition active:scale-95"
                  >
                    + اختر الإجابة
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddQuestionType('blanks')}
                    className="min-h-[36px] px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-bold cursor-pointer transition active:scale-95"
                  >
                    + املأ الفراغات
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddQuestionType('compare')}
                    className="min-h-[36px] px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-bold cursor-pointer transition active:scale-95"
                  >
                    + قارن بين
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddQuestionType('math')}
                    className="min-h-[36px] px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 font-bold cursor-pointer transition active:scale-95"
                  >
                    {'+ مسألة / جذر (√x)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddQuestionType('tf')}
                    className="min-h-[36px] px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold cursor-pointer transition active:scale-95"
                  >
                    + صح أم خطأ
                  </button>
                </div>
              </div>

              {/* Question Cards Feed */}
              {ast.questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-all"
                >
                  {/* Card Header Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    {/* Editable Question Header Label */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={q.headerLabel || `س${q.questionNumber}`}
                        onChange={e =>
                          updateQuestion(qIdx, curr => ({
                            ...curr,
                            headerLabel: e.target.value,
                            header: `${e.target.value}: ${curr.instruction || ''}`.trim(),
                          }))
                        }
                        className="w-20 min-h-[36px] px-2 py-1 rounded-lg border border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-slate-800 font-bold text-teal-900 dark:text-teal-200 text-sm text-center"
                        title="اسم وعنوان السؤال"
                      />
                      <span className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        {(q.branches?.length || 0) > 0 ? `${q.branches?.length || 0} فروع` : 'سؤال مباشر'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Question Marks Input */}
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <label htmlFor={`q-marks-${q.id}`} className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          الدرجة:
                        </label>
                        <input
                          id={`q-marks-${q.id}`}
                          type="number"
                          min={0}
                          max={100}
                          value={q.marks || 0}
                          onChange={e =>
                            updateQuestion(qIdx, curr => ({ ...curr, marks: Number(e.target.value) }))
                          }
                          className="w-14 min-h-[32px] px-1.5 py-0.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-center"
                        />
                      </div>

                      {/* Format to Formal Ministerial Style Button */}
                      <button
                        type="button"
                        onClick={() => formatQuestion(qIdx)}
                        title="معالجة النص وتحويله إلى صيغة رسمية مرتبة"
                        className="min-h-[38px] px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold cursor-pointer transition flex items-center gap-1 border border-teal-200"
                      >
                        <span>✨</span>
                        <span className="hidden sm:inline">تنسيق رسمي</span>
                      </button>

                      {/* Move Up/Down Buttons */}
                      <button
                        type="button"
                        disabled={qIdx === 0}
                        onClick={() => handleMoveQuestion(qIdx, 'up')}
                        title="تحريك لأعلى"
                        className="min-h-[38px] min-w-[38px] rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-xs font-bold cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-700"
                      >
                        ⬆️
                      </button>
                      <button
                        type="button"
                        disabled={qIdx === ast.questions.length - 1}
                        onClick={() => handleMoveQuestion(qIdx, 'down')}
                        title="تحريك لأسفل"
                        className="min-h-[38px] min-w-[38px] rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-xs font-bold cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-700"
                      >
                        ⬇️
                      </button>

                      {/* Delete Question */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(qIdx)}
                        title="حذف السؤال"
                        className="min-h-[38px] min-w-[38px] rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold cursor-pointer flex items-center justify-center border border-red-200"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Main Question Instruction Input with onBlur auto-formatting */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor={`q-instr-${q.id}`} className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
                        <span>📐 إدراج رمز أو معادلة</span>
                      </button>
                    </div>
                    <textarea
                      id={`q-instr-${q.id}`}
                      rows={2}
                      value={q.instruction || ''}
                      onBlur={() => formatQuestion(qIdx)}
                      onChange={e =>
                        updateQuestion(qIdx, curr => ({
                          ...curr,
                          instruction: e.target.value,
                          header: `${curr.headerLabel || `س${curr.questionNumber}`}: ${e.target.value}`.trim(),
                        }))
                      }
                      placeholder="اكتب توجيه السؤال (مثال: عرّف ما يأتي، علل ما يأتي، أجب عما يأتي)..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm leading-relaxed focus:outline-teal-700"
                    />
                  </div>

                  {/* Branching Section: Optional branches with add branch button and renameable labels */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    {(!q.branches || q.branches.length === 0) ? (
                      /* Question without branches */
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700">
                        <span className="text-xs text-slate-500 font-medium">
                          هذا السؤال مباشر بدون أفرع. هل يحتوي السؤال على فروع (أ، ب...)؟
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddBranch(qIdx)}
                          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200 text-xs font-bold border border-teal-300 dark:border-teal-700 transition cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
                        >
                          <span>+ إضافة فرع</span>
                        </button>
                      </div>
                    ) : (
                      /* Question with branches */
                      <div className="space-y-2.5 ps-2 border-s-2 border-teal-400 dark:border-teal-700">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            فروع السؤال ({q.branches?.length || 0}):
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAddBranch(qIdx)}
                              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold cursor-pointer transition flex items-center gap-1"
                            >
                              <span>+ إضافة فرع</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClearBranches(qIdx)}
                              className="min-h-[36px] px-2 py-1 rounded-lg text-slate-500 hover:text-red-600 text-xs font-medium cursor-pointer transition"
                              title="إلغاء الأفرع وتحويله لسؤال مباشر"
                            >
                              إلغاء الأفرع
                            </button>
                          </div>
                        </div>

                        {(q.branches || []).map((b, bIdx) => (
                          <div
                            key={b.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {/* Editable Branch Label/Name */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-500">اسم الفرع:</span>
                                <input
                                  type="text"
                                  value={b.label}
                                  onChange={e =>
                                    updateBranch(qIdx, bIdx, curr => ({ ...curr, label: e.target.value }))
                                  }
                                  className="w-20 min-h-[36px] px-2 py-0.5 rounded-lg border border-teal-300 bg-white dark:bg-slate-800 text-xs font-bold text-center"
                                  placeholder="أ"
                                  title="يمكنك تغيير اسم الفرع (مثال: أ، ب، أولاً، مسألة...)"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Branch Marks Input */}
                                <div className="flex items-center gap-1">
                                  <label className="text-[11px] font-bold text-slate-500">الدرجة:</label>
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
                                    className="w-14 min-h-[34px] px-1.5 py-0.5 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-xs font-bold text-center"
                                    title="درجة هذا الفرع"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormulaTarget({ qIdx, bIdx });
                                    setFormulaEditorOpen(true);
                                  }}
                                  className="min-h-[34px] px-2 rounded-lg bg-teal-100 text-teal-900 text-xs font-bold cursor-pointer"
                                  title="إدراج معادلة أو رمز"
                                >
                                  📐
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteBranch(qIdx, bIdx)}
                                  className="min-h-[34px] px-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold cursor-pointer"
                                  title="حذف هذا الفرع"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            <textarea
                              rows={2}
                              value={b.text}
                              onBlur={() => formatQuestion(qIdx)}
                              onChange={e =>
                                updateBranch(qIdx, bIdx, curr => ({ ...curr, text: e.target.value }))
                              }
                              placeholder="نص الفرع ومطلوبه..."
                              className="w-full p-2 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-xs sm:text-sm leading-relaxed"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Bottom Add Question Button */}
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full min-h-[50px] py-3 rounded-2xl border-2 border-dashed border-teal-400 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-slate-800 text-teal-900 dark:text-teal-200 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
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
            typography={typography}
            onPrint={handleTriggerPrint}
            onExportPdf={handleExportPdf}
            onExportImage={handleExportImage}
            onQuickEditQuestion={(qIdx, newInstruction) => {
              updateQuestion(qIdx, (curr) => ({
                ...curr,
                instruction: formatFormalExamText(newInstruction),
                header: `${curr.headerLabel || `س${curr.questionNumber}`}: ${formatFormalExamText(newInstruction)}`.trim(),
              }));
            }}
            onQuickEditBranch={(qIdx, bIdx, newText) => {
              updateBranch(qIdx, bIdx, (curr) => ({
                ...curr,
                text: formatFormalExamText(newText),
              }));
            }}
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
        subject={teacherSubjectId || teacherSubject}
        subjectNameAr={teacherSubject}
        grade={teacherGrade}
        stage={teacherStage as any}
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
                const safePrev = sanitizeAST(prev, teacherSubject, fallbackGradeStr);
                const safeNew = sanitizeAST(newAST, teacherSubject, fallbackGradeStr);
                const combinedQuestions = [...safePrev.questions, ...safeNew.questions];
                const renumbered = combinedQuestions.map((q, idx) => {
                  const branches = Array.isArray(q.branches) ? q.branches : [];
                  const label = `س${idx + 1}`;
                  return {
                    ...q,
                    questionNumber: idx + 1,
                    headerLabel: label,
                    header: q.instruction ? `${label}: ${q.instruction}` : `${label}:`,
                    branches,
                    subItems: branches.map(b => ({ label: b.label, text: b.text, marks: b.marks })),
                  };
                });
                const mergedAST = sanitizeAST({ ...safePrev, questions: renumbered }, teacherSubject, fallbackGradeStr);
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
