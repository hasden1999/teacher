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

import React, { useState } from 'react';
import type { DailyLessonPlan, TeacherProfile } from '@techeeer/content';
import {
  LESSON_TEMPLATES,
  MINISTERIAL_FIVE_STEPS,
  cloneLessonPlan,
  validateLessonPlanDuration,
  filterCurriculumForTeacher,
} from '@techeeer/content';

export interface LessonPlanEditorProps {
  teacher?: TeacherProfile;
  initialPlan?: DailyLessonPlan;
  onSave?: (plan: DailyLessonPlan, scheduledDate: string) => void;
  onClose?: () => void;
}

export const LessonPlanEditor: React.FC<LessonPlanEditorProps> = ({
  teacher = {
    subject: 'science_primary',
    stage: 'primary',
    grade: 5,
    secondarySubjects: ['physics_scientific', 'chemistry_scientific'],
  },
  initialPlan,
  onSave,
  onClose,
}) => {
  // Available templates matching teacher profile
  const matchingTemplates = filterCurriculumForTeacher(teacher, LESSON_TEMPLATES);
  const defaultPlan = initialPlan ?? matchingTemplates[0] ?? LESSON_TEMPLATES[0];

  const [currentPlan, setCurrentPlan] = useState<DailyLessonPlan>({
    ...defaultPlan,
    objectives: [...defaultPlan.objectives],
    cognitiveObjectives: defaultPlan.cognitiveObjectives ? [...defaultPlan.cognitiveObjectives] : [],
    affectiveObjectives: defaultPlan.affectiveObjectives ? [...defaultPlan.affectiveObjectives] : [],
    psychomotorObjectives: defaultPlan.psychomotorObjectives ? [...defaultPlan.psychomotorObjectives] : [],
    teachingAids: defaultPlan.teachingAids ? [...defaultPlan.teachingAids] : [],
    teachingStrategies: defaultPlan.teachingStrategies ? [...defaultPlan.teachingStrategies] : [],
  });

  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeStepTab, setActiveStepTab] = useState<number>(0);
  const [isSupervisoryPrintOpen, setIsSupervisoryPrintOpen] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Objective input states
  const [newObjText, setNewObjText] = useState('');
  const [newAidText, setNewAidText] = useState('');
  const [newStrategyText, setNewStrategyText] = useState('');

  const isDurationValid = validateLessonPlanDuration(currentPlan.durationMinutes);

  const handleSelectTemplate = (tpl: DailyLessonPlan) => {
    setCurrentPlan({
      ...tpl,
      id: `lp_${Date.now()}`,
      objectives: [...tpl.objectives],
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
            <h2 className="text-lg font-bold">دفتر الخطة اليومية الوزارية (خماسية التدريس)</h2>
            <p className="text-xs text-teal-200">
              متوافق مع المعايير الخمسة للإشراف التربوي لوزارة التربية العراقية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCloneCurrent}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition flex items-center gap-1.5"
            title="استنساخ هذه الخطة لشعبة أخرى"
          >
            <span>📑</span>
            <span>استنساخ الخطة</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSupervisoryPrintOpen(true)}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>معاينة إشرافية للطباعة</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow flex items-center gap-1.5"
          >
            <span>💾</span>
            <span>حفظ الخطة في SQLite</span>
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

      {/* 2. Metadata Bar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            موضوع الدرس:
          </label>
          <input
            type="text"
            value={currentPlan.topic}
            onChange={(e) => setCurrentPlan({ ...currentPlan, topic: e.target.value })}
            className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            الشعبة:
          </label>
          <input
            type="text"
            value={currentPlan.division || 'أ'}
            onChange={(e) => setCurrentPlan({ ...currentPlan, division: e.target.value })}
            className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            زمن الحصة (دقيقة):
          </label>
          <div className="relative">
            <input
              type="number"
              min={35}
              max={50}
              value={currentPlan.durationMinutes}
              onChange={(e) =>
                setCurrentPlan({ ...currentPlan, durationMinutes: parseInt(e.target.value, 10) || 45 })
              }
              className={`w-full min-h-[44px] px-3 rounded-xl border font-mono font-bold ${
                isDurationValid
                  ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  : 'border-rose-500 bg-rose-50 text-rose-700'
              }`}
            />
            {!isDurationValid && (
              <span className="text-[10px] text-rose-600 absolute start-1 -bottom-4">
                الحصة الوزارية: 35-50 دقيقة
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            تاريخ التنفيذ المجدول:
          </label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
          />
        </div>
      </div>

      {/* 3. Pre-loaded Templates Selector */}
      {matchingTemplates.length > 0 && (
        <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-bold text-teal-900 dark:text-teal-300 shrink-0">
            نماذج المناهج المعتمدة لمادتك:
          </span>
          {matchingTemplates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleSelectTemplate(tpl)}
              className={`px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap min-h-[36px] transition ${
                currentPlan.topic === tpl.topic
                  ? 'bg-teal-700 text-white border-teal-800 font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-teal-500'
              }`}
            >
              {tpl.topic} (الصف {tpl.grade})
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
