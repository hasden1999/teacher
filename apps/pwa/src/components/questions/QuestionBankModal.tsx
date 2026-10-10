import React, { useState, useMemo } from 'react';
import {
  QUESTION_BANK,
  filterQuestions,
  getChaptersBySubject,
  type QuestionBankItem,
  type EducationalStage,
  type AcademicStream,
  type QuestionType,
  type QuestionDifficulty,
} from '@techeeer/content';
import { MathRenderer } from './MathRenderer.js';
import { useToast } from '../common/Toast.js';
import { getActiveGeminiApiKey } from '../../config/aiConfig.js';

export interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject?: string;
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

function normalizeArabicSearch(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Remove Arabic tashkeel, dagger alif, and tatweel
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
  const [selectedType, setSelectedType] = useState<QuestionType | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty | 'all'>('all');
  const [ministerialOnly, setMinisterialOnly] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});

  // AI Curriculum Questions State
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<QuestionBankItem[]>(() => {
    try {
      const raw = localStorage.getItem('techeeer_ai_curriculum_questions');
      return raw ? JSON.parse(raw) : [];
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
  const [customScore, setCustomScore] = useState<number>(10);
  const [customSavedMessage, setCustomSavedMessage] = useState('');

  const { showToast } = useToast();

  // Fetch applicable chapters from content package
  const availableChapters = useMemo(() => {
    if (!subject) return [];
    return getChaptersBySubject(subject, grade, stream);
  }, [subject, grade, stream]);

  // Combined Questions Feed (Static + AI Generated Curriculum Questions)
  const filteredQuestions = useMemo(() => {
    const combinedPool = [...QUESTION_BANK, ...aiGeneratedQuestions];
    let list = filterQuestions(combinedPool, {
      subject: subject as any,
      grade,
      stage,
      stream,
      chapter: selectedChapter === 'all' ? undefined : selectedChapter,
      type: selectedType === 'all' ? undefined : selectedType,
      difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty,
      isMinisterial: ministerialOnly ? true : undefined,
    });

    if (searchTerm.trim()) {
      const normalizedQuery = normalizeArabicSearch(searchTerm);
      list = list.filter(q => {
        const normText = normalizeArabicSearch(q.text);
        const normAns = normalizeArabicSearch(q.modelAnswer || '');
        const normTopic = normalizeArabicSearch(q.topic || '');
        return normText.includes(normalizedQuery) || normAns.includes(normalizedQuery) || normTopic.includes(normalizedQuery);
      });
    }

    return list;
  }, [subject, grade, stage, stream, selectedChapter, selectedType, selectedDifficulty, ministerialOnly, searchTerm, aiGeneratedQuestions]);

  if (!isOpen) return null;

  const toggleModelAnswer = (id: string) => {
    setExpandedAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Generate Questions for the selected chapter strictly from official Iraqi curriculum
  const handleGenerateAiChapterQuestions = async (overrideChapter?: number) => {
    const activeKey = getActiveGeminiApiKey();
    if (!activeKey) {
      showToast({ message: 'مفتاح الذكاء الاصطناعي المركزي غير مضبوط في لوحة الإدارة', type: 'error' });
      return;
    }

    const effectiveChapter = overrideChapter !== undefined ? overrideChapter : selectedChapter;
    const targetChapterNum = effectiveChapter === 'all' ? 1 : effectiveChapter;
    const currentChapterObj = availableChapters.find(c => c.chapterNumber === targetChapterNum) || availableChapters[0];

    const chapterTitle = currentChapterObj?.chapterTitle || `الفصل ${targetChapterNum}`;
    const topicsList = currentChapterObj?.topics || [];

    setIsGeneratingAi(true);
    showToast({ message: `جاري استخراج وتوليد الأسئلة المنهجية للفصل (${chapterTitle}) عبر الذكاء الاصطناعي...`, type: 'info' });

    try {
      const prompt = `أنت موجه تربوي وخبير امتحانات معتمد من وزارة التربية العراقية لمادة (${subject || 'العلوم'}) للصف (${grade || 5}).
المطلوب توليد 5 إلى 7 أسئلة امتحانية وزارية نموذجية حصرية ومباشرة من كتاب وزارة التربية العراقية الرسمي المعتمد للفصل: "${chapterTitle}" وموضوعاته الرسمية:
${topicsList.length > 0 ? topicsList.join('، ') : 'مفردات ومواضيع هذا الفصل في المنهج العراقي الرسمي'}

تعليمات صارمة لمنع التأليف أو الاختلاق (Strict Anti-Hallucination Rules):
1. اعتمد فقط وحصراً على المنهج العراقي الرسمي المعتمد والمصطلحات الدقيقة دون أي تأليف خارج الكتاب.
2. نوع في الأنماط: تعاريف (essay)، تعاليل (essay)، فراغات (fill_blank)، اختيار من متعدد (mcq)، ومسائل أو مقارنات (problem).
3. أعد فقط مصفوفة JSON صالحة بالهيكل التالي دون أي نص إضافي:
[
  {
    "text": "نص السؤال الوزاري بدقة",
    "type": "essay",
    "topic": "${chapterTitle}",
    "modelAnswer": "الجواب النموذجي الدقيق المعتمد في المنهج العراقي",
    "defaultMarks": 5,
    "difficulty": "medium",
    "isMinisterial": true
  }
]`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(activeKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`خطأ في استجابة الخادم (${response.status})`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());

      if (Array.isArray(parsed) && parsed.length > 0) {
        const mappedQuestions: QuestionBankItem[] = parsed.map((item, idx) => ({
          id: `ai_gen_${Date.now()}_${idx}`,
          subject: (subject as any) || 'science_primary',
          grade: grade || 5,
          stage: stage || 'primary',
          stream: stream || 'general',
          chapter: targetChapterNum,
          topic: item.topic || chapterTitle,
          type: (item.type as any) || 'essay',
          difficulty: (item.difficulty as any) || 'medium',
          text: item.text,
          modelAnswer: item.modelAnswer || '',
          defaultMarks: item.defaultMarks || 5,
          isMinisterial: true,
          tags: ['منهج عراقي رسمي', 'توليد ذكي', chapterTitle],
        }));

        const updated = [...mappedQuestions, ...aiGeneratedQuestions];
        setAiGeneratedQuestions(updated);
        try {
          localStorage.setItem('techeeer_ai_curriculum_questions', JSON.stringify(updated));
        } catch {}

        showToast({
          message: `تم بنجاح توليد ${mappedQuestions.length} أسئلة وزارية معتمدة للفصل (${chapterTitle})!`,
          type: 'success',
        });
      } else {
        showToast({ message: 'لم يتم استخراج أسئلة كافية، يرجى المحاولة مرة أخرى', type: 'warning' });
      }
    } catch (err: any) {
      console.error('Failed to generate AI questions:', err);
      showToast({ message: `تعذر توليد الأسئلة: ${err.message || 'خطأ غير متوقع'}`, type: 'error' });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSaveCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    const newQ: Partial<QuestionBankItem> = {
      id: `custom_${Date.now()}`,
      subject: subject || 'general',
      grade: grade || 1,
      stage: stage || 'preparatory',
      stream,
      chapter: selectedChapter === 'all' ? 1 : selectedChapter,
      topic: 'سؤال مخصص للمعلم',
      type: customType,
      difficulty: customDifficulty,
      text: customText.trim(),
      modelAnswer: customModelAnswer.trim(),
      defaultMarks: customScore,
      isMinisterial: false,
      tags: ['مخصص'],
    };

    if (onSaveCustomQuestion) {
      await onSaveCustomQuestion(newQ);
    }
    setCustomSavedMessage('تم حفظ السؤال بنجاح في بنك الأسئلة المحلي! ⭐');
    setTimeout(() => {
      setCustomSavedMessage('');
      setCustomText('');
      setCustomModelAnswer('');
      setActiveTab('browse');
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-bank-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs font-tajawal animate-in fade-in"
    >
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <div>
              <h3 id="question-bank-title" className="text-base sm:text-lg font-bold text-teal-900 dark:text-teal-200">
                بنك الأسئلة المنهجية والوزارية
              </h3>
              <p className="text-xs text-slate-500">
                {subject ? `المادة: ${subject}` : 'كافة المواد'}
                {grade ? ` | الصف: ${grade}` : ''}
                {stream ? ` | الفرع: ${stream}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق بنك الأسئلة"
            className="min-h-[48px] min-w-[48px] rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4">
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`min-h-[48px] px-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'browse'
                ? 'border-teal-700 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            تصفح الأسئلة ({filteredQuestions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('add_custom')}
            className={`min-h-[48px] px-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'add_custom'
                ? 'border-teal-700 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            + إضافة سؤال مخصص للبنك
          </button>
        </div>

        {activeTab === 'browse' ? (
          <>
            {/* Filter and Search Bar */}
            <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search Input */}
                <div className="relative flex-1">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="ابحث في نص السؤال أو الإجابة (تجريد التشكيل تلقائياً)..."
                    className="w-full min-h-[48px] ps-9 pe-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-teal-700"
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

                {/* Chapter Dropdown */}
                {availableChapters.length > 0 && (
                  <select
                    value={selectedChapter}
                    onChange={e => setSelectedChapter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100"
                  >
                    <option value="all">كافة الفصول المنهجية</option>
                    {availableChapters.map(c => (
                      <option key={c.id} value={c.chapterNumber}>
                        الفصل {c.chapterNumber}: {c.chapterTitle}
                      </option>
                    ))}
                  </select>
                )}

                {/* AI Chapter Question Generation Button */}
                <button
                  type="button"
                  onClick={() => handleGenerateAiChapterQuestions(selectedChapter === 'all' ? undefined : selectedChapter)}
                  disabled={isGeneratingAi}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-900/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                  title="توليد أسئلة نموذجية وزارية معتمدة من كتاب وزارة التربية العراقية للفصل المختار"
                >
                  {isGeneratingAi ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      <span>جارٍ التوليد من المنهج العراقي...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>
                        {selectedChapter === 'all'
                          ? 'توليد أسئلة للمنهج كاملاً'
                          : `توليد أسئلة الفصل (${selectedChapter}) بالذكاء الاصطناعي`}
                      </span>
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">🇮🇶 وزاري</span>
                    </>
                  )}
                </button>
              </div>

              {/* Filters Chips Row */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Ministerial Toggle */}
                <button
                  type="button"
                  onClick={() => setMinisterialOnly(prev => !prev)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    ministerialOnly
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>⭐ الأسئلة الوزارية فقط</span>
                </button>

                {/* Question Type Filter */}
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value as any)}
                  className="min-h-[40px] px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  {Object.entries(QUESTION_TYPE_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>

                {/* Difficulty Filter */}
                <select
                  value={selectedDifficulty}
                  onChange={e => setSelectedDifficulty(e.target.value as any)}
                  className="min-h-[40px] px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  {Object.entries(DIFFICULTY_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <div className="text-4xl">🔍</div>
                  <p className="text-sm font-medium">لا توجد أسئلة مطابقة للبحث والفلاتر المختارة.</p>
                </div>
              ) : (
                filteredQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3 transition-all hover:border-teal-300"
                  >
                    {/* Card Badges Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {q.isMinisterial && (
                          <span className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            ⭐ وزاري
                            {q.ministerialMeta && ` ${q.ministerialMeta.year || ''}`}
                          </span>
                        )}
                        {q.tags?.includes('توليد ذكي') && (
                          <span className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            🇮🇶 موثق من المنهج
                          </span>
                        )}
                        <span className="bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 px-2 py-0.5 rounded-md font-medium">
                          {QUESTION_TYPE_LABELS[q.type] || q.type}
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-md">
                          الفصل {q.chapter}
                        </span>
                        {q.defaultMarks && (
                          <span className="text-slate-500 font-medium">
                            ({q.defaultMarks} درجات)
                          </span>
                        )}
                      </div>

                      {/* Model Answer Toggle */}
                      {q.modelAnswer && (
                        <button
                          type="button"
                          onClick={() => toggleModelAnswer(q.id)}
                          className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-bold"
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
                        <span className="font-bold block mb-1">الإجابة النموذجية الوزارية:</span>
                        <MathRenderer text={q.modelAnswer} fontFamily="tajawal" fontSize="sm" />
                      </div>
                    )}

                    {/* Action Insertion Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          onInsertAsSubBranch(q);
                          onClose();
                        }}
                        className="min-h-[48px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all cursor-pointer"
                      >
                        {activeQuestionIndex !== undefined
                          ? `+ إدراج كفرع بالسؤال (س${activeQuestionIndex + 1})`
                          : '+ إدراج كفرع بالسؤال الحالي'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onInsertAsNewQuestion(q);
                          onClose();
                        }}
                        className="min-h-[48px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        + إدراج كسؤال جديد
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Custom Question Creation Form */
          <form onSubmit={handleSaveCustom} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {customSavedMessage && (
              <div className="p-3 rounded-xl bg-green-50 text-green-800 border border-green-200 text-sm font-bold text-center">
                {customSavedMessage}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="custom-q-text" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {'نص السؤال (يدعم صيغ الرياضيات $..$ وصيغ الكيمياء \\ce{..}):'}
              </label>
              <textarea
                id="custom-q-text"
                rows={4}
                required
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="اكتب منطوق السؤال هنا..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-teal-700"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="custom-q-answer" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                الإجابة النموذجية:
              </label>
              <textarea
                id="custom-q-answer"
                rows={3}
                value={customModelAnswer}
                onChange={e => setCustomModelAnswer(e.target.value)}
                placeholder="اكتب الإجابة النموذجية..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نمط السؤال:</label>
                <select
                  value={customType}
                  onChange={e => setCustomType(e.target.value as any)}
                  className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
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
                  onChange={e => setCustomDifficulty(e.target.value as any)}
                  className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
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
                  onChange={e => setCustomScore(Number(e.target.value))}
                  className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="min-h-[48px] px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
              >
                حفظ في البنك المحلي 💾
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
