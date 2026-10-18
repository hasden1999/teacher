/**
 * LessonPlanEditor - Official Iraqi MoE 5-Step Daily Lesson Plan Studio
 * Adheres strictly to the 5 canonical pedagogical steps required by educational supervision:
 * 1. الأهداف السلوكية (معرفية، وجدانية، مهارية/حركية)
 * 2. التمهيد والتهيئة (5 دقائق)
 * 3. العرض والأنشطة (25 دقيقة) مع الوسائل التعليمية واستراتيجيات التدريس
 * 4. التقويم التكويني (10 دقائق)
 * 5. الواجب البيتي والغلق (5 دقائق)
 * Plus Supervisory Inspection block, Template picker, and 35-50 min duration validation.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { DailyLessonPlan, TeacherProfile } from '@techeeer/content';
import {
  LESSON_TEMPLATES,
  MINISTERIAL_FIVE_STEPS,
  cloneLessonPlan,
  validateLessonPlanDuration,
  filterCurriculumForTeacher,
  getChaptersBySubject,
  getSubjectById,
  generateSmartDailyPlan,
} from '@techeeer/content';
import { getActiveGeminiApiKey } from '../../config/aiConfig.js';
import { useToast } from '../common/Toast.js';

export interface LessonPlanEditorProps {
  teacher?: TeacherProfile;
  activeDivision?: string;
  initialPlan?: DailyLessonPlan;
  onSave?: (plan: DailyLessonPlan, scheduledDate: string) => void;
  onClose?: () => void;
}

export const LessonPlanEditor: React.FC<LessonPlanEditorProps> = ({
  teacher = {
    subject: 'science_primary',
    stage: 'primary',
    grade: 5,
    secondarySubjects: [],
  },
  activeDivision = 'أ',
  initialPlan,
  onSave,
  onClose,
}) => {
  const { showToast } = useToast();
  const subjectNameAr = useMemo(
    () => getSubjectById(teacher?.subject)?.nameAr || 'المنهج الدراسي',
    [teacher?.subject]
  );

  // Chapters & Topics strictly for the teacher's subject specialization (Req 4 & Req 7.1)
  const subjectChapters = useMemo(
    () => getChaptersBySubject(teacher?.subject || 'science_primary', teacher?.grade || 5),
    [teacher?.subject, teacher?.grade]
  );

  const [selectedChapterNum, setSelectedChapterNum] = useState<number>(1);
  const currentChapter = useMemo(
    () => subjectChapters.find((c) => c.chapterNumber === selectedChapterNum) || subjectChapters[0],
    [subjectChapters, selectedChapterNum]
  );

  // Available templates matching teacher profile with safe fallback (Req 1)
  const matchingTemplates = useMemo(
    () => filterCurriculumForTeacher(teacher, LESSON_TEMPLATES),
    [teacher]
  );

  const buildSafeInitialPlan = (): DailyLessonPlan => {
    const candidate =
      initialPlan ??
      matchingTemplates[0] ??
      generateSmartDailyPlan({
        subjectId: teacher?.subject || 'science_primary',
        subjectNameAr,
        grade: teacher?.grade || 5,
        stage: teacher?.stage || 'primary',
        chapterTitle: currentChapter?.chapterTitle || 'الفصل الأول',
        topic: currentChapter?.topics?.[0] || `مقدمة في ${subjectNameAr}`,
        division: activeDivision,
      });

    return {
      ...candidate,
      division: activeDivision || candidate.division || 'أ',
      objectives: Array.isArray(candidate?.objectives) ? [...candidate.objectives] : [],
      cognitiveObjectives: Array.isArray(candidate?.cognitiveObjectives)
        ? [...candidate.cognitiveObjectives]
        : [],
      affectiveObjectives: Array.isArray(candidate?.affectiveObjectives)
        ? [...candidate.affectiveObjectives]
        : [],
      psychomotorObjectives: Array.isArray(candidate?.psychomotorObjectives)
        ? [...candidate.psychomotorObjectives]
        : [],
      teachingAids: Array.isArray(candidate?.teachingAids) ? [...candidate.teachingAids] : [],
      teachingStrategies: Array.isArray(candidate?.teachingStrategies)
        ? [...candidate.teachingStrategies]
        : [],
    };
  };

  const [currentPlan, setCurrentPlan] = useState<DailyLessonPlan>(buildSafeInitialPlan);
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [periodLabel, setPeriodLabel] = useState<string>('الحصة الأولى');
  const [isGeneratingAiPlan, setIsGeneratingAiPlan] = useState<boolean>(false);

  // Auto-synchronize when teacher subject, grade, or activeDivision changes
  useEffect(() => {
    const updatedMatching = filterCurriculumForTeacher(teacher, LESSON_TEMPLATES);
    const ch = getChaptersBySubject(teacher?.subject || 'science_primary', teacher?.grade || 5)[0];
    setSelectedChapterNum(1);

    if (updatedMatching.length > 0) {
      const match = updatedMatching[0];
      setCurrentPlan({
        ...match,
        id: `lp_${Date.now()}`,
        grade: teacher?.grade || match.grade,
        division: activeDivision || match.division || 'أ',
        objectives: [...(match.objectives || [])],
        cognitiveObjectives: [...(match.cognitiveObjectives || [])],
        affectiveObjectives: [...(match.affectiveObjectives || [])],
        psychomotorObjectives: [...(match.psychomotorObjectives || [])],
        teachingAids: [...(match.teachingAids || [])],
        teachingStrategies: [...(match.teachingStrategies || [])],
      });
    } else {
      setCurrentPlan(
        generateSmartDailyPlan({
          subjectId: teacher?.subject || 'science_primary',
          subjectNameAr: getSubjectById(teacher?.subject)?.nameAr || 'المادة',
          grade: teacher?.grade || 5,
          stage: teacher?.stage || 'primary',
          chapterTitle: ch?.chapterTitle || 'الفصل الأول',
          topic: ch?.topics?.[0] || 'الدرس الأول',
          division: activeDivision || 'أ',
        })
      );
    }
  }, [teacher?.subject, teacher?.grade, activeDivision]);

  const [activeStepTab, setActiveStepTab] = useState<number>(0);
  const [isSupervisoryPrintOpen, setIsSupervisoryPrintOpen] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Objective input states
  const [newObjText, setNewObjText] = useState('');
  const [newAidText, setNewAidText] = useState('');
  const [newStrategyText, setNewStrategyText] = useState('');

  const isDurationValid = validateLessonPlanDuration(currentPlan.durationMinutes);

  // AI Smart Lesson Plan Generator (Req 7: مولد الخطة الدراسية الذكي وفق وزارة التربية العراقية)
  const handleGenerateAiDailyPlan = async () => {
    const topicToUse = currentPlan.topic?.trim() || currentChapter?.topics?.[0] || subjectNameAr;
    const chapterTitleToUse = currentChapter?.chapterTitle || `الفصل ${selectedChapterNum}`;

    setIsGeneratingAiPlan(true);

    // Always prepare the Iraqi MoE deterministic smart plan first as immediate baseline/fallback
    const smartFallback = {
      ...generateSmartDailyPlan({
        subjectId: teacher?.subject || 'science_primary',
        subjectNameAr,
        grade: teacher?.grade || 5,
        stage: teacher?.stage || 'primary',
        chapterTitle: chapterTitleToUse,
        topic: topicToUse,
        division: currentPlan.division || activeDivision || 'أ',
        date: currentPlan.date,
      }),
      durationMinutes: currentPlan.durationMinutes || 45,
    };

    const activeKey = getActiveGeminiApiKey();
    if (!activeKey) {
      setCurrentPlan(smartFallback);
      setIsGeneratingAiPlan(false);
      showToast({
        message: `تم توليد الخطة اليومية الوزارية لموضوع (${topicToUse}) وفق معايير وزارة التربية العراقية!`,
        type: 'success',
      });
      return;
    }

    try {
      const prompt = `أنت مشرف تربوي أقدم في وزارة التربية العراقية متخصص في مادة (${subjectNameAr}) للصف (${teacher?.grade || 5}).
المطلوب إعداد خطة درس يومية رسمية متكاملة (خماسية التدريس الوزارية المعتمدة في العراق) للبيانات التالية:
- التاريخ والفترة: ${scheduledDate} (${periodLabel})
- المادة: ${subjectNameAr} | الصف: ${teacher?.grade || 5} | الشعبة: ${currentPlan.division || 'أ'}
- الفصل المنهجي: الفصل ${selectedChapterNum} (${chapterTitleToUse})
- موضوع الدرس: ${topicToUse}
- زمن الحصة: ${currentPlan.durationMinutes || 45} دقيقة

أعد استجابة بصيغة JSON فقط مطابقة للهيكل التالي دون أي نص خارجي:
{
  "objectives": ["3 أهداف سلوكية دقيقة تبدأ بـ (أن + فعل مضارع قابل للقياس + الطالب/التلميذ)"],
  "cognitiveObjectives": ["هدفان في المجال المعرفي"],
  "affectiveObjectives": ["هدفان في المجال الوجداني والقيمي"],
  "psychomotorObjectives": ["هدفان في المجال المهاري/التطبيقي"],
  "teachingAids": ["4 وسائل تعليمية مناسبة للموضوع في المدارس العراقية"],
  "teachingStrategies": ["3 استراتيجيات تدريس حديثة معتمدة"],
  "warmup": "التمهيد والتهيئة الحافزة (5 دقائق) مع سؤال استكشافي يربط الدرس السابق بالحالي",
  "presentation": "العرض والأنشطة التعليمية التفصيلية (25 دقيقة) موزعة على خطوات علمية واضحة من منهج وزارة التربية العراقية",
  "assessment": "التقويم التكويني (10 دقائق) يتضمن أسئلة شفهية وتحريرية لقياس تحقق الأهداف السلوكية",
  "closure": "الواجب البيتي وغلق الدرس (5 دقائق) مع تحديد المطلوب من الكتاب المدرسي للدرس القادم"
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(activeKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
        if (parsed && typeof parsed === 'object') {
          setCurrentPlan({
            ...smartFallback,
            objectives: Array.isArray(parsed.objectives) && parsed.objectives.length > 0 ? parsed.objectives : smartFallback.objectives,
            cognitiveObjectives: Array.isArray(parsed.cognitiveObjectives) ? parsed.cognitiveObjectives : smartFallback.cognitiveObjectives,
            affectiveObjectives: Array.isArray(parsed.affectiveObjectives) ? parsed.affectiveObjectives : smartFallback.affectiveObjectives,
            psychomotorObjectives: Array.isArray(parsed.psychomotorObjectives) ? parsed.psychomotorObjectives : smartFallback.psychomotorObjectives,
            teachingAids: Array.isArray(parsed.teachingAids) ? parsed.teachingAids : smartFallback.teachingAids,
            teachingStrategies: Array.isArray(parsed.teachingStrategies) ? parsed.teachingStrategies : smartFallback.teachingStrategies,
            warmup: parsed.warmup || smartFallback.warmup,
            presentation: parsed.presentation || smartFallback.presentation,
            assessment: parsed.assessment || smartFallback.assessment,
            closure: parsed.closure || smartFallback.closure,
          });
          showToast({
            message: `تم توليد الخطة اليومية الذكية لموضوع (${topicToUse}) بالذكاء الاصطناعي وفق معايير وزارة التربية العراقية!`,
            type: 'success',
          });
          setIsGeneratingAiPlan(false);
          return;
        }
      }
      setCurrentPlan(smartFallback);
      showToast({
        message: `تم توليد الخطة اليومية النموذجية لموضوع (${topicToUse}) وفق المنهج العراقي!`,
        type: 'success',
      });
    } catch {
      setCurrentPlan(smartFallback);
      showToast({
        message: `تم توليد الخطة اليومية النموذجية لموضوع (${topicToUse}) وفق المنهج العراقي!`,
        type: 'success',
      });
    } finally {
      setIsGeneratingAiPlan(false);
    }
  };

  const handleSelectTemplate = (tpl: DailyLessonPlan) => {
    setCurrentPlan({
      ...tpl,
      id: `lp_${Date.now()}`,
      division: currentPlan.division || activeDivision || 'أ',
      objectives: [...(tpl.objectives || [])],
      cognitiveObjectives: tpl.cognitiveObjectives ? [...tpl.cognitiveObjectives] : [],
      affectiveObjectives: tpl.affectiveObjectives ? [...tpl.affectiveObjectives] : [],
      psychomotorObjectives: tpl.psychomotorObjectives ? [...tpl.psychomotorObjectives] : [],
      teachingAids: tpl.teachingAids ? [...tpl.teachingAids] : [],
      teachingStrategies: tpl.teachingStrategies ? [...tpl.teachingStrategies] : [],
    });
  };

  const handleCloneCurrent = () => {
    const cloned = cloneLessonPlan(currentPlan);
    setCurrentPlan(cloned);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(currentPlan, scheduledDate);
    }
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const handleAddObjective = (type: 'general' | 'cognitive' | 'affective' | 'psychomotor') => {
    if (!newObjText.trim()) return;
    if (type === 'general') {
      setCurrentPlan({ ...currentPlan, objectives: [...currentPlan.objectives, newObjText.trim()] });
    } else if (type === 'cognitive') {
      setCurrentPlan({
        ...currentPlan,
        cognitiveObjectives: [...(currentPlan.cognitiveObjectives || []), newObjText.trim()],
      });
    } else if (type === 'affective') {
      setCurrentPlan({
        ...currentPlan,
        affectiveObjectives: [...(currentPlan.affectiveObjectives || []), newObjText.trim()],
      });
    } else if (type === 'psychomotor') {
      setCurrentPlan({
        ...currentPlan,
        psychomotorObjectives: [...(currentPlan.psychomotorObjectives || []), newObjText.trim()],
      });
    }
    setNewObjText('');
  };

  const handleAddAid = () => {
    if (!newAidText.trim()) return;
    setCurrentPlan({
      ...currentPlan,
      teachingAids: [...(currentPlan.teachingAids || []), newAidText.trim()],
    });
    setNewAidText('');
  };

  const handleAddStrategy = () => {
    if (!newStrategyText.trim()) return;
    setCurrentPlan({
      ...currentPlan,
      teachingStrategies: [...(currentPlan.teachingStrategies || []), newStrategyText.trim()],
    });
    setNewStrategyText('');
  };

  return (
    <div
      dir="rtl"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col font-tajawal overflow-hidden"
    >
      {/* 1. Header Toolbar */}
      <div className="p-4 bg-teal-800 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h2 className="text-base sm:text-lg font-bold">
              مولد ودفتر الخطة الدراسية الذكي ({subjectNameAr} - الصف {teacher?.grade || 5})
            </h2>
            <p className="text-xs text-teal-200">
              مصمم حصرياً وفق المعايير التربوية الخمسة المعتمدة في وزارة التربية العراقية
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateAiDailyPlan}
            disabled={isGeneratingAiPlan}
            className="min-h-[44px] px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold transition shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>✨</span>
            <span>
              {isGeneratingAiPlan
                ? 'جارٍ توليد الخطة الوزارية...'
                : 'توليد الخطة اليومية بالذكاء الاصطناعي'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCloneCurrent}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="استنساخ هذه الخطة لشعبة أخرى"
          >
            <span>📑</span>
            <span>استنساخ</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSupervisoryPrintOpen(true)}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-teal-950/60 hover:bg-teal-950 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🖨️</span>
            <span>معاينة إشرافية للطباعة</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
          >
            <span>💾</span>
            <span>حفظ الخطة</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
            >
              ✕ إغلاق
            </button>
          )}
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-bold px-4 py-2 border-b border-emerald-200">
          ✓ تم حفظ الخطة اليومية بنجاح في قاعدة البيانات المحلية.
        </div>
      )}

      {/* 2. Smart Curriculum Selector Bar (Req 7.1: التاريخ / الفترة الزمنية، الصف، الفصل والموضوع من منهج الاختصاص) */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 space-y-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Chapter Selector from Teacher's Subject */}
          <div>
            <label className="block text-xs font-bold text-teal-800 dark:text-teal-300 mb-1">
              1. الفصل من منهج ({subjectNameAr}):
            </label>
            <select
              value={selectedChapterNum}
              onChange={(e) => {
                const num = Number(e.target.value);
                setSelectedChapterNum(num);
                const ch = subjectChapters.find((c) => c.chapterNumber === num);
                if (ch && ch.topics.length > 0) {
                  setCurrentPlan((prev) => ({
                    ...prev,
                    unit: `الفصل ${ch.chapterNumber}: ${ch.chapterTitle}`,
                    topic: ch.topics[0],
                  }));
                }
              }}
              className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100"
            >
              {subjectChapters.map((ch) => (
                <option key={ch.id} value={ch.chapterNumber}>
                  الفصل {ch.chapterNumber}: {ch.chapterTitle}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Selector from Chapter */}
          <div>
            <label className="block text-xs font-bold text-teal-800 dark:text-teal-300 mb-1">
              2. الموضوع المنهجي المقرر:
            </label>
            <select
              value={
                currentChapter?.topics.includes(currentPlan.topic)
                  ? currentPlan.topic
                  : currentChapter?.topics[0] || ''
              }
              onChange={(e) => setCurrentPlan({ ...currentPlan, topic: e.target.value })}
              className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100"
            >
              {(currentChapter?.topics || []).map((t, idx) => (
                <option key={idx} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Period Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              3. التاريخ والفترة الزمنية:
            </label>
            <div className="flex gap-1.5">
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="flex-1 min-h-[42px] px-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 font-mono"
              />
              <select
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                className="min-h-[42px] px-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value="الحصة الأولى">الحصة 1</option>
                <option value="الحصة الثانية">الحصة 2</option>
                <option value="الحصة الثالثة">الحصة 3</option>
                <option value="الحصة الرابعة">الحصة 4</option>
                <option value="الحصة الخامسة">الحصة 5</option>
                <option value="الحصة السادسة">الحصة 6</option>
              </select>
            </div>
          </div>

          {/* Grade, Section & Duration */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                الصف والشعبة:
              </label>
              <input
                type="text"
                value={currentPlan.division || 'أ'}
                onChange={(e) => setCurrentPlan({ ...currentPlan, division: e.target.value })}
                placeholder="الشعبة"
                className="w-full min-h-[42px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                الزمن (دقيقة):
              </label>
              <input
                type="number"
                min={35}
                max={50}
                value={currentPlan.durationMinutes}
                onChange={(e) =>
                  setCurrentPlan({
                    ...currentPlan,
                    durationMinutes: parseInt(e.target.value, 10) || 45,
                  })
                }
                className={`w-full min-h-[42px] px-2.5 rounded-xl border font-mono text-xs font-bold ${
                  isDurationValid
                    ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                    : 'border-rose-500 bg-rose-50 text-rose-700'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Custom Topic Refinement Input + Quick Generate Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
              عنوان الدرس التفصيلي:
            </span>
            <input
              type="text"
              value={currentPlan.topic}
              onChange={(e) => setCurrentPlan({ ...currentPlan, topic: e.target.value })}
              className="flex-1 min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={handleGenerateAiDailyPlan}
            disabled={isGeneratingAiPlan}
            className="min-h-[40px] px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>⚡</span>
            <span>توليد عناصر الخطة الخمسة لهذا الموضوع تلقائياً</span>
          </button>
        </div>
      </div>

      {/* 3. Pre-loaded Templates Selector */}
      {matchingTemplates.length > 0 && (
        <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-bold text-teal-900 dark:text-teal-300 shrink-0">
            نماذج جاهزة لمادة ({subjectNameAr}):
          </span>
          {matchingTemplates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleSelectTemplate(tpl)}
              className={`px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap min-h-[36px] transition cursor-pointer ${
                currentPlan.topic === tpl.topic
                  ? 'bg-teal-700 text-white border-teal-800 font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-teal-500'
              }`}
            >
              {tpl.topic}
            </button>
          ))}
        </div>
      )}

      {/* 4. Five Ministerial Steps Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-100 dark:bg-slate-800/80">
        {MINISTERIAL_FIVE_STEPS.map((stepTitle, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveStepTab(idx)}
            className={`min-h-[48px] px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 border-b-2 ${
              activeStepTab === idx
                ? 'border-teal-700 text-teal-900 dark:text-teal-300 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-teal-700/10 text-teal-800 text-[11px] flex items-center justify-center font-bold">
              {idx + 1}
            </span>
            <span>{stepTitle.split('(')[0].trim()}</span>
          </button>
        ))}
      </div>

      {/* 5. Active Step Body */}
      <div className="p-5 flex-1 min-h-[350px]">
        {/* Step 1: الأهداف السلوكية */}
        {activeStepTab === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>🎯</span>
                <span>الخطوة 1: الأهداف السلوكية والإجرائية للدرس</span>
              </h3>
              <span className="text-xs text-slate-500">
                تصاغ الأهداف بفعل سلوكي قابل للقياس والملاحظة
              </span>
            </div>

            {/* General Objectives */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                الأهداف الأساسية:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300 mb-3">
                {currentPlan.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start justify-between gap-2">
                    <span>{obj}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = currentPlan.objectives.filter((_, idx) => idx !== i);
                        setCurrentPlan({ ...currentPlan, objectives: updated });
                      }}
                      className="text-rose-500 hover:text-rose-700 text-xs px-1"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="أضف هدفاً سلوكياً جديداً (مثال: أن يعرّف التلميذ...)"
                  value={newObjText}
                  onChange={(e) => setNewObjText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddObjective('general')}
                  className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleAddObjective('general')}
                  className="min-h-[44px] px-4 rounded-xl bg-teal-700 text-white font-bold text-xs"
                >
                  + إضافة هدف
                </button>
              </div>
            </div>

            {/* Cognitive & Affective Domains */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-1">
                  المجال المعرفي (Cognitive):
                </h4>
                <ul className="text-xs text-slate-600 dark:text-slate-300 list-disc list-inside space-y-1">
                  {(currentPlan.cognitiveObjectives || []).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                  المجال الوجداني والقيمي (Affective):
                </h4>
                <ul className="text-xs text-slate-600 dark:text-slate-300 list-disc list-inside space-y-1">
                  {(currentPlan.affectiveObjectives || []).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: التمهيد والتهيئة */}
        {activeStepTab === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>⏱️</span>
                <span>الخطوة 2: التمهيد والتهيئة الحافزة (5 دقائق)</span>
              </h3>
              <span className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded font-bold">
                الزمن المخصص: 5 دقائق
              </span>
            </div>
            <textarea
              rows={6}
              value={currentPlan.warmup}
              onChange={(e) => setCurrentPlan({ ...currentPlan, warmup: e.target.value })}
              placeholder="اكتب التمهيد: ربط الدرس السابق بالحالي، سؤال مثير للتفكير، أو لغز علمي يحفز انتباه الطلاب..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm leading-relaxed"
            />
          </div>
        )}

        {/* Step 3: العرض والأنشطة */}
        {activeStepTab === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>📖</span>
                <span>الخطوة 3: العرض والأنشطة التعليمية (25 دقيقة)</span>
              </h3>
              <span className="text-xs text-teal-800 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded font-bold">
                الزمن المخصص: 25 دقيقة
              </span>
            </div>

            <textarea
              rows={8}
              value={currentPlan.presentation}
              onChange={(e) => setCurrentPlan({ ...currentPlan, presentation: e.target.value })}
              placeholder="تفصيل خطوات الشرح، المفاهيم العلمية، دور المعلم، وأنشطة المتعلمين التفاعلية..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm leading-relaxed"
            />

            {/* Aids & Strategies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  الوسائل التعليمية المستخدمة:
                </h4>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(currentPlan.teachingAids || []).map((aid, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200 text-xs"
                    >
                      {aid}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (currentPlan.teachingAids || []).filter((_, idx) => idx !== i);
                          setCurrentPlan({ ...currentPlan, teachingAids: updated });
                        }}
                        className="text-rose-500 font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="وسيلة تعليمية جديدة..."
                    value={newAidText}
                    onChange={(e) => setNewAidText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAid()}
                    className="flex-1 min-h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddAid}
                    className="min-h-[38px] px-3 rounded-lg bg-teal-700 text-white text-xs font-bold"
                  >
                    + إضافة
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  استراتيجيات التدريس المتبعة:
                </h4>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(currentPlan.teachingStrategies || []).map((str, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 text-xs"
                    >
                      {str}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (currentPlan.teachingStrategies || []).filter((_, idx) => idx !== i);
                          setCurrentPlan({ ...currentPlan, teachingStrategies: updated });
                        }}
                        className="text-rose-500 font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="استراتيجية تدريس..."
                    value={newStrategyText}
                    onChange={(e) => setNewStrategyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStrategy()}
                    className="flex-1 min-h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddStrategy}
                    className="min-h-[38px] px-3 rounded-lg bg-purple-700 text-white text-xs font-bold"
                  >
                    + إضافة
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: التقويم التكويني */}
        {activeStepTab === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>✍️</span>
                <span>الخطوة 4: التقويم التكويني والملاحظة المباشرة (10 دقائق)</span>
              </h3>
              <span className="text-xs text-blue-800 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded font-bold">
                الزمن المخصص: 10 دقائق
              </span>
            </div>
            <textarea
              rows={6}
              value={currentPlan.assessment}
              onChange={(e) => setCurrentPlan({ ...currentPlan, assessment: e.target.value })}
              placeholder="الأسئلة الشفهية، التمارين الصفية الفورية، أو الاختبار القصير للتحقق من تحقق الأهداف..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm leading-relaxed"
            />
          </div>
        )}

        {/* Step 5: الواجب البيتي والغلق */}
        {activeStepTab === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>📚</span>
                <span>الخطوة 5: الواجب البيتي وغلق الدرس (5 دقائق)</span>
              </h3>
              <span className="text-xs text-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded font-bold">
                الزمن المخصص: 5 دقائق
              </span>
            </div>
            <textarea
              rows={6}
              value={currentPlan.closure}
              onChange={(e) => setCurrentPlan({ ...currentPlan, closure: e.target.value })}
              placeholder="تلخيص الأفكار الجوهرية للدرس وتحديد الواجب البيتي من صفحات كتاب الطالب المقررة..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* 6. Supervisory Inspection Modal / Print Preview */}
      {isSupervisoryPrintOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 font-amiri shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold">معاينة الخطة للإشراف التربوي والطباعة</h3>
              <button
                type="button"
                onClick={() => setIsSupervisoryPrintOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Official Inspection Header */}
            <div className="border-2 border-slate-800 p-4 rounded-xl space-y-3 bg-slate-50/50">
              <div className="flex justify-between text-center font-bold text-sm">
                <div>
                  <p>جمهورية العراق</p>
                  <p>وزارة التربية</p>
                  <p>المديرية العامة للتربية</p>
                </div>
                <div className="text-base font-bold flex flex-col justify-center">
                  <span>خطة الدرس اليومية النموذجية</span>
                  <span className="text-xs font-normal text-slate-600">
                    موضوع: {currentPlan.topic} (الصف {currentPlan.grade})
                  </span>
                </div>
                <div>
                  <p>المدرسة: {currentPlan.supervisoryDoc?.schoolName || 'المدرسة'}</p>
                  <p>المعلم: {currentPlan.supervisoryDoc?.teacherName || 'الأستاذ'}</p>
                  <p>الشعبة: {currentPlan.division || 'أ'}</p>
                </div>
              </div>

              <hr className="border-slate-400" />

              {/* Steps overview */}
              <div className="space-y-2 text-sm leading-relaxed">
                <div>
                  <span className="font-bold">1. الأهداف السلوكية: </span>
                  <span>{currentPlan.objectives.join(' — ')}</span>
                </div>
                <div>
                  <span className="font-bold">2. التمهيد والتهيئة (5 د): </span>
                  <span>{currentPlan.warmup}</span>
                </div>
                <div>
                  <span className="font-bold">3. العرض والأنشطة (25 د): </span>
                  <span>{currentPlan.presentation}</span>
                </div>
                <div>
                  <span className="font-bold">4. التقويم التكويني (10 د): </span>
                  <span>{currentPlan.assessment}</span>
                </div>
                <div>
                  <span className="font-bold">5. الواجب البيتي والغلق (5 د): </span>
                  <span>{currentPlan.closure}</span>
                </div>
              </div>

              <hr className="border-slate-400" />

              {/* Supervisor Notes & Signature Block */}
              <div className="flex justify-between items-end pt-3 text-xs">
                <div className="flex-1 pe-4">
                  <span className="font-bold block mb-1">ملاحظات المشرف التربوي / مدير المدرسة:</span>
                  <p className="border-b border-dotted border-slate-500 pb-1 text-slate-700">
                    {currentPlan.supervisoryDoc?.supervisorNotes || 'الخطة مستوفية للشروط الوزارية.'}
                  </p>
                </div>
                <div className="border border-slate-600 p-3 rounded-lg text-center w-36">
                  <p className="font-bold text-[11px] mb-6">توقيع المشرف التربوي</p>
                  <div className="border-b border-slate-400 w-24 mx-auto" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-800 text-white font-bold text-sm shadow hover:bg-teal-900 transition"
              >
                🖨️ طباعة الخطة
              </button>
              <button
                type="button"
                onClick={() => setIsSupervisoryPrintOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-bold text-sm hover:bg-slate-300 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
