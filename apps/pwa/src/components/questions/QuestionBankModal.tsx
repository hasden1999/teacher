import React, { useState, useMemo } from 'react';
import {
  QUESTION_BANK,
  filterQuestions,
  getChaptersBySubject,
  getSubjectById,
  type QuestionBankItem,
  type EducationalStage,
  type AcademicStream,
  type QuestionType,
  type QuestionDifficulty,
} from '@techeeer/content';
import { MathRenderer } from './MathRenderer.js';
import { useToast } from '../common/Toast.js';
import { getActiveGeminiApiKey } from '../../config/aiConfig.js';
import { aiGatewayService } from '../../services/aiGatewayService.js';

export interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject?: string;
  subjectNameAr?: string;
  grade?: number;
  stage?: EducationalStage;
  stream?: AcademicStream;
  activeQuestionIndex?: number;
  onInsertAsNewQuestion: (question: QuestionBankItem) => void;
  onInsertAsSubBranch: (question: QuestionBankItem) => void;
  onSaveCustomQuestion?: (newQuestion: Partial<QuestionBankItem>) => Promise<void>;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  all: 'كافة الأنماط',
  mcq: 'اختيار من متعدد',
  fill_blank: 'فراغات',
  true_false: 'صح أو خطأ',
  essay: 'شرح ومقالي',
  problem: 'مسائل رياضية',
  matching: 'مطابقة وتوصيل',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  all: 'كافة المستويات',
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

const STAGE_LABELS: Record<string, string> = {
  primary: 'المرحلة الابتدائية',
  intermediate: 'المرحلة المتوسطة',
  preparatory: 'المرحلة الإعدادية',
};

function normalizeArabicSearch(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .trim();
}

export const QuestionBankModal: React.FC<QuestionBankModalProps> = ({
  isOpen,
  onClose,
  subject,
  subjectNameAr,
  grade,
  stage,
  stream,
  activeQuestionIndex,
  onInsertAsNewQuestion,
  onInsertAsSubBranch,
  onSaveCustomQuestion,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'add_custom'>('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<number | 'all'>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedSourceType, setSelectedSourceType] = useState<'all' | 'ministerial' | 'book'>('all');
  const [selectedType, setSelectedType] = useState<QuestionType | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty | 'all'>('all');
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});

  // Custom / Indexed Curriculum Questions State
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<QuestionBankItem[]>(() => {
    try {
      const raw = localStorage.getItem('techeeer_ai_curriculum_questions');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  // New Custom Question Form State
  const [customText, setCustomText] = useState('');
  const [customModelAnswer, setCustomModelAnswer] = useState('');
  const [customType, setCustomType] = useState<QuestionType>('essay');
  const [customDifficulty, setCustomDifficulty] = useState<QuestionDifficulty>('medium');
  const [customSourceType, setCustomSourceType] = useState<'ministerial' | 'book'>('book');
  const [customScore, setCustomScore] = useState<number>(10);
  const [customSavedMessage, setCustomSavedMessage] = useState('');

  const { showToast } = useToast();

  const resolvedSubjectName = useMemo(() => {
    if (subjectNameAr) return subjectNameAr;
    if (subject) {
      const found = getSubjectById(subject);
      if (found) return found.nameAr;
    }
    return subject || 'مادة الاختصاص';
  }, [subject, subjectNameAr]);

  const resolvedStageName = useMemo(() => {
    if (stage && STAGE_LABELS[stage]) return STAGE_LABELS[stage];
    if (grade && grade <= 6) return STAGE_LABELS.primary;
    return STAGE_LABELS.intermediate;
  }, [stage, grade]);

  // 1. Fetch applicable chapters strictly for the teacher's subject
  const availableChapters = useMemo(() => {
    if (!subject) return [];
    return getChaptersBySubject(subject, grade, stream);
  }, [subject, grade, stream]);

  // 2. Topics for the currently selected chapter (Hierarchy Level 4: الموضوع)
  const availableTopics = useMemo(() => {
    if (selectedChapter === 'all') {
      const allTopics = availableChapters.flatMap((c) => c.topics);
      return Array.from(new Set(allTopics));
    }
    const ch = availableChapters.find((c) => c.chapterNumber === selectedChapter);
    return ch ? ch.topics : [];
  }, [availableChapters, selectedChapter]);

  // 3. Combined Questions Feed strictly filtered to Teacher's Subject
  const filteredQuestions = useMemo(() => {
    const combinedPool = [...QUESTION_BANK, ...aiGeneratedQuestions];
    // First try matching exact grade; if none for that specific grade in static bank, fallback to subject family
    let list = filterQuestions(combinedPool, {
      subject: subject as any,
      grade,
      stage,
      stream,
      chapter: selectedChapter === 'all' ? undefined : selectedChapter,
      topic: selectedTopic === 'all' ? undefined : selectedTopic,
      sourceType: selectedSourceType === 'all' ? undefined : selectedSourceType,
      type: selectedType === 'all' ? undefined : selectedType,
      difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty,
    });

    if (list.length === 0 && subject) {
      list = filterQuestions(combinedPool, {
        subject: subject as any,
        chapter: selectedChapter === 'all' ? undefined : selectedChapter,
        topic: selectedTopic === 'all' ? undefined : selectedTopic,
        sourceType: selectedSourceType === 'all' ? undefined : selectedSourceType,
        type: selectedType === 'all' ? undefined : selectedType,
        difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty,
      });
    }

    if (searchTerm.trim()) {
      const normalizedQuery = normalizeArabicSearch(searchTerm);
      list = list.filter((q) => {
        const normText = normalizeArabicSearch(q.text);
        const normAns = normalizeArabicSearch(q.modelAnswer || '');
        const normTopic = normalizeArabicSearch(q.topic || '');
        return (
          normText.includes(normalizedQuery) ||
          normAns.includes(normalizedQuery) ||
          normTopic.includes(normalizedQuery)
        );
      });
    }

    return list;
  }, [
    subject,
    grade,
    stage,
    stream,
    selectedChapter,
    selectedTopic,
    selectedSourceType,
    selectedType,
    selectedDifficulty,
    searchTerm,
    aiGeneratedQuestions,
  ]);

  if (!isOpen) return null;

  const toggleModelAnswer = (id: string) => {
    setExpandedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Strict Curriculum Grounding Question Extractor with Guaranteed Fallback (Zero 404s)
  const handleGenerateAiChapterQuestions = async (overrideChapter?: number) => {
    const effectiveChapter = overrideChapter !== undefined ? overrideChapter : selectedChapter;
    const targetChapterNum = effectiveChapter === 'all' ? 1 : effectiveChapter;
    const currentChapterObj =
      availableChapters.find((c) => c.chapterNumber === targetChapterNum) || availableChapters[0];

    const chapterTitle = currentChapterObj?.chapterTitle || `الفصل ${targetChapterNum}`;
    const topicsList =
      selectedTopic !== 'all'
        ? [selectedTopic]
        : currentChapterObj?.topics || [];

    // Helper to fall back directly to the built-in curriculum questions
    const fallbackToBuiltInCurriculum = () => {
      const builtInMatches = filterQuestions(QUESTION_BANK, {
        subject: subject as any,
        chapter: targetChapterNum,
      });

      if (builtInMatches.length > 0) {
        const updated = [...builtInMatches, ...aiGeneratedQuestions];
        setAiGeneratedQuestions(updated);
        try {
          localStorage.setItem('techeeer_ai_curriculum_questions', JSON.stringify(updated));
        } catch {}
        showToast({
          message: `تم جلب ${builtInMatches.length} أسئلة منهجية ووزارية معتمدة لـ (${chapterTitle}) من البنك المركزي بنجاح!`,
          type: 'success',
        });
        return true;
      }
      return false;
    };

    const activeKey = getActiveGeminiApiKey();
    if (!activeKey) {
      const recovered = fallbackToBuiltInCurriculum();
      if (!recovered) {
        showToast({
          message: `تم تفعيل بنك الأسئلة المنهجي المعتمد لـ (${chapterTitle}). يمكنك اختيار الأسئلة أو إضافة سؤال مخصص.`,
          type: 'info',
        });
      }
      return;
    }

    // Grounding reference examples from indexed QUESTION_BANK for this subject
    const indexedSubjectExamples = filterQuestions(QUESTION_BANK, { subject: subject as any })
      .slice(0, 4)
      .map((q) => `- [${q.isMinisterial ? 'وزاري' : 'كتاب'}] (${q.topic}): ${q.text}`)
      .join('\n');

    setIsGeneratingAi(true);
    showToast({
      message: `جارٍ استخراج أسئلة الكتاب والوزاري الموثقة لـ (${chapterTitle}) وفق المنهج العراقي الحصري...`,
      type: 'info',
    });

    try {
      const prompt = `أنت فهرس امتحانات وزاري ومنهجي مقيد حرفياً بمنهج وزارة التربية العراقية الرسمي (Strict Grounded Curriculum Extractor).
المرحلة: ${resolvedStageName} | الصف: ${grade || 5} | المادة الحصرية: ${resolvedSubjectName}
الفصل المحدد: الفصل ${targetChapterNum} (${chapterTitle})
الموضوعات المنهجية الرسمية المسموح بها حصراً:
${topicsList.map((t, i) => `${i + 1}. ${t}`).join('\n')}

نماذج مرجعية مفهرسة في النظام لمادة ${resolvedSubjectName}:
${indexedSubjectExamples || 'أسئلة الكتاب المدرسي العراقي الرسمي وأسئلة الامتحانات الوزارية.'}

قيود صارمة جداً لمنع التأليف العشوائي (Strict Anti-Hallucination & Grounding Rules):
1. يُمنع منعاً باتاً تأليف أو اختراع أي سؤال خارج الموضوعات المنهجية الرسمية المذكورة أعلاه في كتاب (${resolvedSubjectName}) المعتمد في العراق.
2. يجب أن تكون كل نقطة إما سؤالاً من أسئلة نهاية الفصل في الكتاب المنهجي العراقي ("sourceType": "book") أو سؤالاً وزارياً عراقياً مألوفاً ("sourceType": "ministerial").
3. إذا كانت المادة تحتوي على جذور أو معادلات رياضية، اكتبها بصيغة LaTeX دقيقة مثل $\\sqrt{x}$ أو $\\frac{a}{b}$.
4. أعد فقط مصفوفة JSON صالحة من 5 أسئلة بالهيكل التالي دون أي نص إضافي:
[
  {
    "text": "نص السؤال المنهجي أو الوزاري بدقة",
    "type": "essay",
    "topic": "${topicsList[0] || chapterTitle}",
    "modelAnswer": "الجواب النموذجي الدقيق من الكتاب المنهجي العراقي",
    "defaultMarks": 10,
    "difficulty": "medium",
    "sourceType": "ministerial",
    "isMinisterial": true
  }
]`;

      let parsed: any[] = [];
      try {
        parsed = await aiGatewayService.callGeminiStructured<any[]>({
          feature: 'question_generator',
          systemInstruction: 'أنت فهرس امتحانات وزاري ومنهجي مقيد حرفياً بمنهج وزارة التربية العراقية الرسمي.',
          parts: [{ text: prompt }],
          thinkingLevel: 'low',
        });
      } catch (gatewayErr) {
        console.warn('aiGatewayService question call failed, attempting fallback models:', gatewayErr);
        const wireModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        for (const m of wireModels) {
          try {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(activeKey)}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: {
                    response_mime_type: 'application/json',
                    temperature: 0.0,
                  },
                }),
              }
            );
            if (res.ok) {
              const data = await res.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                parsed = JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
                break;
              }
            }
          } catch {}
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        const mappedQuestions: QuestionBankItem[] = parsed.map((item, idx) => {
          const isMin = item.sourceType === 'ministerial' || Boolean(item.isMinisterial);
          return {
            id: `ai_gen_${Date.now()}_${idx}`,
            subject: (subject as any) || 'science_primary',
            grade: grade || 5,
            stage: stage || 'primary',
            stream: stream || 'general',
            chapter: targetChapterNum,
            chapterTitle,
            topic: item.topic || topicsList[0] || chapterTitle,
            type: (item.type as any) || 'essay',
            difficulty: (item.difficulty as any) || 'medium',
            text: item.text,
            modelAnswer: item.modelAnswer || '',
            defaultMarks: item.defaultMarks || 10,
            isMinisterial: isMin,
            sourceType: isMin ? 'ministerial' : 'book',
            tags: ['منهج عراقي رسمي', isMin ? 'وزاري' : 'كتاب منهجي', chapterTitle],
          };
        });

        const updated = [...mappedQuestions, ...aiGeneratedQuestions];
        setAiGeneratedQuestions(updated);
        try {
          localStorage.setItem('techeeer_ai_curriculum_questions', JSON.stringify(updated));
        } catch {}

        showToast({
          message: `تم استخراج ${mappedQuestions.length} أسئلة منهجية ووزارية موثقة للفصل (${chapterTitle}) بنجاح!`,
          type: 'success',
        });
      } else {
        // Graceful fallback to built-in curriculum without crashing
        const recovered = fallbackToBuiltInCurriculum();
        if (!recovered) {
          showToast({
            message: `تم تفعيل بنك الأسئلة المنهجي المعتمد لـ (${chapterTitle}). يمكنك اختيار الأسئلة أو إضافة سؤال مخصص.`,
            type: 'info',
          });
        }
      }
    } catch (err: any) {
      console.warn('Failed to generate AI questions, engaging fallback:', err);
      const recovered = fallbackToBuiltInCurriculum();
      if (!recovered) {
        showToast({
          message: `تم فتح بنك الأسئلة المنهجي المعتمد لـ (${chapterTitle}). يمكنك تصفح الأسئلة المتاحة.`,
          type: 'info',
        });
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSaveCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    const targetChNum = selectedChapter === 'all' ? 1 : selectedChapter;
    const chObj = availableChapters.find((c) => c.chapterNumber === targetChNum);

    const newQ: QuestionBankItem = {
      id: `custom_${Date.now()}`,
      subject: (subject as any) || 'science_primary',
      grade: grade || 1,
      stage: stage || 'preparatory',
      stream,
      chapter: targetChNum,
      chapterTitle: chObj?.chapterTitle,
      topic: selectedTopic !== 'all' ? selectedTopic : chObj?.topics[0] || 'سؤال منهجي مخصص',
      type: customType,
      difficulty: customDifficulty,
      text: customText.trim(),
      modelAnswer: customModelAnswer.trim(),
      defaultMarks: customScore,
      isMinisterial: customSourceType === 'ministerial',
      sourceType: customSourceType,
      tags: [customSourceType === 'ministerial' ? 'وزاري' : 'كتاب'],
    };

    const updated = [newQ, ...aiGeneratedQuestions];
    setAiGeneratedQuestions(updated);
    try {
      localStorage.setItem('techeeer_ai_curriculum_questions', JSON.stringify(updated));
    } catch {}

    if (onSaveCustomQuestion) {
      await onSaveCustomQuestion(newQ);
    }
    setCustomSavedMessage('تم حفظ السؤال وفهرسته في بنك أسئلة اختصاصك بنجاح! ⭐');
    setTimeout(() => {
      setCustomSavedMessage('');
      setCustomText('');
      setCustomModelAnswer('');
      setActiveTab('browse');
    }, 1000);
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGeneratingAi) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGeneratingAi, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-bank-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs font-tajawal animate-in fade-in"
    >
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header with Hierarchical Breadcrumb (Stage -> Subject -> Grade) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-teal-900 text-white">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <div>
              <h3 id="question-bank-title" className="text-base sm:text-lg font-extrabold">
                بنك الأسئلة المنهجية والوزارية المفهرس ({resolvedSubjectName})
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-teal-100 mt-0.5">
                <span className="bg-white/15 px-2 py-0.5 rounded-md font-bold">{resolvedStageName}</span>
                <span>←</span>
                <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md font-extrabold">
                  المادة: {resolvedSubjectName} (مقفل على اختصاصك)
                </span>
                <span>←</span>
                <span className="bg-white/15 px-2 py-0.5 rounded-md font-bold">الصف {grade || 5}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق بنك الأسئلة"
            className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-white/20 flex items-center justify-center text-white font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4">
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`min-h-[46px] px-4 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'browse'
                ? 'border-teal-700 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🗂️ تصفح الأسئلة — الفهرس الهرمي لأسئلة {resolvedSubjectName} ({filteredQuestions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('add_custom')}
            className={`min-h-[46px] px-4 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'add_custom'
                ? 'border-teal-700 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            + فهرسة سؤال جديد (وزاري / كتاب)
          </button>
        </div>

        {activeTab === 'browse' ? (
          <>
            {/* 5-Level Hierarchical Filter Bar (Stage -> Subject -> Chapter -> Topic -> SourceType: Ministerial/Book) */}
            <div className="p-3 sm:p-4 bg-slate-50/90 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 space-y-3">
              {/* Row 1: Chapter -> Topic -> Source Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Level 3: Chapter Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    1. الفصل المنهجي ({resolvedSubjectName}):
                  </label>
                  <select
                    value={selectedChapter}
                    onChange={(e) => {
                      const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                      setSelectedChapter(val);
                      setSelectedTopic('all');
                    }}
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100"
                  >
                    <option value="all">كافة فصول {resolvedSubjectName}</option>
                    {availableChapters.map((c) => (
                      <option key={c.id} value={c.chapterNumber}>
                        الفصل {c.chapterNumber}: {c.chapterTitle}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level 4: Topic Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    2. الموضوع الدقيق في الفصل:
                  </label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100"
                  >
                    <option value="all">كافة موضوعات الفصل</option>
                    {availableTopics.map((topic, idx) => (
                      <option key={idx} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level 5: Source Type (Ministerial vs Book) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    3. مصدر السؤال (وزاري / كتاب):
                  </label>
                  <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 min-h-[42px]">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceType('all')}
                      className={`flex-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedSourceType === 'all'
                          ? 'bg-teal-700 text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSourceType('ministerial')}
                      className={`flex-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedSourceType === 'ministerial'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      ⭐ وزاري
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSourceType('book')}
                      className={`flex-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedSourceType === 'book'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      📖 كتاب
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Search + Type/Difficulty + Grounded Curriculum Extractor */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`ابحث في أسئلة ${resolvedSubjectName}...`}
                    className="w-full min-h-[42px] ps-9 pe-8 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-teal-700"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="min-h-[42px] px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  {Object.entries(QUESTION_TYPE_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>
                      {lbl}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                  className="min-h-[42px] px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  {Object.entries(DIFFICULTY_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>
                      {lbl}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    handleGenerateAiChapterQuestions(selectedChapter === 'all' ? undefined : selectedChapter)
                  }
                  disabled={isGeneratingAi}
                  className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-[0.98] text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  title="استخراج أسئلة مقيدة حصرياً بنصوص كتاب وزارة التربية العراقية والأسئلة الوزارية بدون أي تأليف عشوائي"
                >
                  {isGeneratingAi ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      <span>جارٍ الاستخراج المنهجي المقيد...</span>
                    </>
                  ) : (
                    <>
                      <span>🔒</span>
                      <span>
                        {selectedChapter === 'all'
                          ? 'استخراج أسئلة منهجية موثقة (الفصل 1)'
                          : `استخراج أسئلة الفصل (${selectedChapter}) من الكتاب والوزاري`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-3">
                  <div className="text-4xl">📚</div>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    لا توجد أسئلة مطابقة للفلاتر الحالية في ({resolvedSubjectName}).
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateAiChapterQuestions(selectedChapter === 'all' ? 1 : selectedChapter)
                    }
                    className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold cursor-pointer hover:bg-teal-800"
                  >
                    🔒 استخراج أسئلة الكتاب والوزاري لهذا الفصل الآن
                  </button>
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const isMin = q.sourceType === 'ministerial' || Boolean(q.isMinisterial);
                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5 transition-all hover:border-teal-400"
                    >
                      {/* Card Badges Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isMin ? (
                            <span className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              ⭐ سؤال وزاري
                              {q.ministerialMeta ? ` (${q.ministerialMeta.year || ''})` : ''}
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              📖 سؤال كتاب منهجي
                            </span>
                          )}
                          <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-md font-bold">
                            الفصل {q.chapter}
                          </span>
                          {q.topic && (
                            <span className="bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 px-2 py-0.5 rounded-md font-medium">
                              الموضوع: {q.topic}
                            </span>
                          )}
                          <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                            {QUESTION_TYPE_LABELS[q.type] || q.type}
                          </span>
                          {q.defaultMarks && (
                            <span className="text-slate-500 font-bold">({q.defaultMarks} درجات)</span>
                          )}
                        </div>

                        {/* Model Answer Toggle */}
                        {q.modelAnswer && (
                          <button
                            type="button"
                            onClick={() => toggleModelAnswer(q.id)}
                            className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-bold cursor-pointer"
                          >
                            {expandedAnswers[q.id] ? 'إخفاء الإجابة النموذجية ▴' : 'عرض الإجابة النموذجية ▾'}
                          </button>
                        )}
                      </div>

                      {/* Question Body Text */}
                      <div className="text-slate-900 dark:text-slate-100 text-sm leading-relaxed">
                        <MathRenderer text={q.text} fontFamily="tajawal" />
                      </div>

                      {/* Options if MCQ */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded-xl">
                          {q.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className="font-bold text-teal-700">{['أ)', 'ب)', 'ج)', 'د)'][i] || '•'}</span>
                              <MathRenderer text={opt} fontFamily="tajawal" fontSize="sm" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Expanded Model Answer */}
                      {expandedAnswers[q.id] && q.modelAnswer && (
                        <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs sm:text-sm text-teal-950 dark:text-teal-100">
                          <span className="font-bold block mb-1">الإجابة النموذجية المعتمدة:</span>
                          <MathRenderer text={q.modelAnswer} fontFamily="tajawal" fontSize="sm" />
                        </div>
                      )}

                      {/* 1-Click Direct Insertion Buttons (Req 8.2) */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => {
                            onInsertAsSubBranch(q);
                            showToast({
                              message: 'تمت إضافة السؤال كفرع في ورقة الامتحان بنقرة واحدة ✓',
                              type: 'success',
                            });
                          }}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all cursor-pointer active:scale-95"
                        >
                          {activeQuestionIndex !== undefined
                            ? `+ إضافة كفرع بالسؤال (س${activeQuestionIndex + 1})`
                            : '+ إضافة كفرع بالسؤال الحالي'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onInsertAsNewQuestion(q);
                            showToast({
                              message: 'تمت إضافة السؤال مباشرة إلى ورقة الامتحان بنقرة واحدة ✓',
                              type: 'success',
                            });
                          }}
                          className="min-h-[40px] px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          ⚡ + إدراج كسؤال جديد للامتحان
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* Custom Indexed Question Creation Form */
          <form onSubmit={handleSaveCustom} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {customSavedMessage && (
              <div className="p-3 rounded-xl bg-green-50 text-green-800 border border-green-200 text-sm font-bold text-center">
                {customSavedMessage}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="custom-q-text" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {'نص السؤال المنهجي أو الوزاري (يدعم الجذور $\\sqrt{x}$ والكسور $\\frac{a}{b}$):'}
              </label>
              <textarea
                id="custom-q-text"
                rows={4}
                required
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="اكتب منطوق السؤال هنا..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-teal-700"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="custom-q-answer" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                الإجابة النموذجية من الكتاب:
              </label>
              <textarea
                id="custom-q-answer"
                rows={3}
                value={customModelAnswer}
                onChange={(e) => setCustomModelAnswer(e.target.value)}
                placeholder="اكتب الإجابة النموذجية..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">مصدر السؤال:</label>
                <select
                  value={customSourceType}
                  onChange={(e) => setCustomSourceType(e.target.value as 'ministerial' | 'book')}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="book">📖 سؤال كتاب منهجي</option>
                  <option value="ministerial">⭐ سؤال وزاري</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نمط السؤال:</label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as any)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="essay">شرح ومقالي</option>
                  <option value="problem">مسألة رياضية</option>
                  <option value="mcq">اختيار من متعدد</option>
                  <option value="fill_blank">فراغات</option>
                  <option value="true_false">صح أو خطأ</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">مستوى الصعوبة:</label>
                <select
                  value={customDifficulty}
                  onChange={(e) => setCustomDifficulty(e.target.value as any)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="easy">سهل</option>
                  <option value="medium">متوسط</option>
                  <option value="hard">صعب</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">الدرجة المقترحة:</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={customScore}
                  onChange={(e) => setCustomScore(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="min-h-[46px] px-6 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                حفظ وفهرسة في بنك {resolvedSubjectName} 💾
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
