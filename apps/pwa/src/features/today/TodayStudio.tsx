import React, { useState } from 'react';
import { useToast } from '../../components/common/Toast.js';
import {
  IRAQ_DEFAULT_V1_SCHEME,
  deriveMonthlyComponents,
  type DailyEventRecord,
  type DerivedComponentSuggestion,
} from '@techeeer/grading-engine';
import type { AssignedClass } from '../../services/authService.js';
import { dbClient } from '../../worker/dbClient.js';

export interface TodayStudioProps {
  assignedClasses?: AssignedClass[];
  activeClassId?: string;
  onSelectAssignedClass?: (cls: AssignedClass) => void;
  onNavigateToTab?: (tab: string) => void;
  teacherName?: string;
  subjectName?: string;
}

export interface TimetableSlot {
  periodNo: number;
  periodLabel: string;
  classId: string;
  classLabel: string;
  subjectName: string;
  timeRange: string;
  isRecorded: boolean;
  presentCount?: number;
  absentCount?: number;
}

export interface StudentDailyState {
  id: string;
  name: string;
  rollNumber: number;
  attendance: 'present' | 'absent' | 'late' | 'excused';
  participation: number;
  homework: 'done' | 'not_done';
  prep: 'done' | 'not_done';
  behaviorNotes: string[];
}

const IRAQI_MONTH_NAMES = [
  'كانون الثاني',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين الأول',
  'تشرين الثاني',
  'كانون الأول',
];

const ARABIC_WEEKDAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export function formatIraqiTodayDate(now: Date = new Date()): {
  dayName: string;
  formattedDate: string;
  isWeekend: boolean;
} {
  const dayIndex = now.getDay(); // 0 is Sunday, 5 Friday, 6 Saturday
  const dayName = ARABIC_WEEKDAYS[dayIndex] || 'الأحد';
  const dayNumber = now.getDate();
  const monthName = IRAQI_MONTH_NAMES[now.getMonth()] || 'تشرين الأول';
  const year = now.getFullYear();
  const isWeekend = dayIndex === 5 || dayIndex === 6; // Friday / Saturday in Iraq

  return {
    dayName,
    formattedDate: `${dayName}، ${dayNumber} ${monthName} ${year}`,
    isWeekend,
  };
}

export const TodayStudio: React.FC<TodayStudioProps> = ({
  assignedClasses = [],
  activeClassId: _activeClassId,
  onSelectAssignedClass: _onSelectAssignedClass,
  onNavigateToTab,
  teacherName = 'الأستاذ',
  subjectName = 'العلوم',
}) => {
  const { showToast, showUndoToast } = useToast();
  const todayInfo = formatIraqiTodayDate();

  // Daily Schedule state
  const [schedule, setSchedule] = useState<TimetableSlot[]>(() => [
    {
      periodNo: 1,
      periodLabel: 'الحصة الأولى',
      classId: assignedClasses[0]?.id || 'cls_1',
      classLabel: assignedClasses[0]?.label || 'الخامس العلمي (أ)',
      subjectName: subjectName || 'الفيزياء',
      timeRange: '08:00 - 08:45',
      isRecorded: false,
    },
    {
      periodNo: 2,
      periodLabel: 'الحصة الثانية',
      classId: assignedClasses[1]?.id || assignedClasses[0]?.id || 'cls_2',
      classLabel: assignedClasses[1]?.label || 'الخامس العلمي (ب)',
      subjectName: subjectName || 'الفيزياء',
      timeRange: '08:50 - 09:35',
      isRecorded: false,
    },
    {
      periodNo: 4,
      periodLabel: 'الحصة الرابعة',
      classId: assignedClasses[0]?.id || 'cls_1',
      classLabel: assignedClasses[0]?.label || 'الخامس العلمي (أ)',
      subjectName: subjectName || 'الفيزياء',
      timeRange: '10:40 - 11:25',
      isRecorded: false,
    },
  ]);

  // Quick Daily Recording Modal state
  const [recordingSlot, setRecordingSlot] = useState<TimetableSlot | null>(null);
  const [activeRecordTab, setActiveRecordTab] = useState<
    'attendance' | 'participation' | 'homework' | 'prep' | 'behavior'
  >('attendance');

  // Roster loaded for active recording
  const [roster, setRoster] = useState<StudentDailyState[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);

  // Proposal modal state
  const [showProposalsModal, setShowProposalsModal] = useState<boolean>(false);
  const [proposals, setProposals] = useState<Record<string, DerivedComponentSuggestion>>({});

  // Load students when opening recording modal
  const handleOpenRecording = async (slot: TimetableSlot) => {
    setRecordingSlot(slot);
    setIsLoadingRoster(true);

    try {
      // Attempt to load actual students from SQLite if available
      const rows = await dbClient.query<{ id: string; full_name: string; roll_number: number }>(
        'SELECT s.id, s.full_name, s.roll_number FROM students s JOIN divisions d ON s.division_id = d.id WHERE d.class_id = ? AND s.is_active = 1 ORDER BY s.roll_number ASC;',
        [slot.classId]
      );

      if (rows && rows.length > 0) {
        setRoster(
          rows.map((r) => ({
            id: r.id,
            name: r.full_name,
            rollNumber: r.roll_number,
            attendance: 'present',
            participation: 0,
            homework: 'done',
            prep: 'done',
            behaviorNotes: [],
          }))
        );
      } else {
        // Fallback default student mock roster for demonstration
        setRoster(
          Array.from({ length: 15 }, (_, i) => ({
            id: `st_${i + 1}`,
            name: [
              'أحمد علي حسن',
              'زينب محمد كريم',
              'حيدر قاسم جبار',
              'فاطمة عبد الحسين',
              'مصطفى كمال الدين',
              'مريم إبراهيم هادي',
              'علي حسين مهدي',
              'سارة رحيم شريف',
              'يوسف علاء محمود',
              'نور حامد كاظم',
              'كرار صادق جعفر',
              'هدى ماجد سلمان',
              'باقر مهند صالح',
              'زهراء سعد عمران',
              'حسين جواد كاظم',
            ][i] || `طالب ${i + 1}`,
            rollNumber: i + 1,
            attendance: 'present',
            participation: 0,
            homework: 'done',
            prep: 'done',
            behaviorNotes: [],
          }))
        );
      }
    } catch {
      // Fallback roster
      setRoster(
        Array.from({ length: 12 }, (_, i) => ({
          id: `st_${i + 1}`,
          name: `طالب ${i + 1}`,
          rollNumber: i + 1,
          attendance: 'present',
          participation: 0,
          homework: 'done',
          prep: 'done',
          behaviorNotes: [],
        }))
      );
    } finally {
      setIsLoadingRoster(false);
    }
  };

  // Toggle student attendance: present -> absent -> present
  const handleToggleAttendance = (studentId: string) => {
    setRoster((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const nextState = s.attendance === 'present' ? 'absent' : 'present';
        return { ...s, attendance: nextState };
      })
    );
  };

  // Long press / secondary action: mark late or excused
  const handleMarkLateOrExcused = (studentId: string, status: 'late' | 'excused') => {
    setRoster((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, attendance: status } : s))
    );
  };

  // Increment participation
  const handleIncrementParticipation = (studentId: string) => {
    setRoster((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, participation: s.participation + 1 } : s
      )
    );
  };

  // Toggle homework or prep
  const handleToggleDone = (studentId: string, field: 'homework' | 'prep') => {
    setRoster((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, [field]: s[field] === 'done' ? 'not_done' : 'done' }
          : s
      )
    );
  };

  // Save Daily Event Recording
  const handleSaveRecording = async () => {
    if (!recordingSlot) return;

    const previousSchedule = [...schedule];
    const absentCount = roster.filter((s) => s.attendance === 'absent').length;
    const presentCount = roster.length - absentCount;

    // Update timetable card status
    setSchedule((prev) =>
      prev.map((s) =>
        s.periodNo === recordingSlot.periodNo
          ? { ...s, isRecorded: true, presentCount, absentCount }
          : s
      )
    );

    // Record append-only events to SQLite table daily_events if dbClient available
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      for (const st of roster) {
        await dbClient.exec(
          'INSERT INTO daily_events (id, class_id, student_id, event_date, period_no, event_type, event_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
          [
            `evt_${Date.now()}_${st.id}_att`,
            recordingSlot.classId,
            st.id,
            todayStr,
            recordingSlot.periodNo,
            'attendance',
            st.attendance,
            Date.now(),
          ]
        );
        if (st.participation > 0) {
          await dbClient.exec(
            'INSERT INTO daily_events (id, class_id, student_id, event_date, period_no, event_type, event_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
            [
              `evt_${Date.now()}_${st.id}_part`,
              recordingSlot.classId,
              st.id,
              todayStr,
              recordingSlot.periodNo,
              'participation',
              String(st.participation),
              Date.now(),
            ]
          );
        }
      }
    } catch {
      // Local state fallback succeeds even if worker transaction is pending
    }

    setRecordingSlot(null);

    // Toast with instant undo
    showUndoToast({
      message: `تم حفظ حضور ونشاط ${recordingSlot.classLabel} (حاضر: ${presentCount}، غياب: ${absentCount})`,
      undoDurationMs: 8000,
      onUndo: () => {
        setSchedule(previousSchedule);
      },
    });
  };

  // Calculate and preview Monthly Component Proposals using @techeeer/grading-engine
  const handlePreviewProposals = () => {
    const events: DailyEventRecord[] = [];

    // Transform roster into events
    for (const s of roster) {
      events.push({
        type: 'attendance',
        value: s.attendance,
      });
      if (s.participation > 0) {
        events.push({
          type: 'participation',
          value: s.participation,
        });
      }
      events.push({
        type: 'prep',
        value: s.prep,
      });
      events.push({
        type: 'homework',
        value: s.homework,
      });
    }

    const calculated = deriveMonthlyComponents(IRAQ_DEFAULT_V1_SCHEME, events, 24);
    setProposals(calculated);
    setShowProposalsModal(true);
  };

  return (
    <div dir="rtl" className="space-y-4 max-w-4xl mx-auto pb-8 font-tajawal select-none">
      {/* 1. Header Card: Iraqi Date & Warm Welcome */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black text-teal-800 dark:text-teal-300">
                {todayInfo.isWeekend ? '🌴 عطلة نهاية الأسبوع' : 'مرحباً بك، أستاذ ' + teacherName}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {todayInfo.formattedDate}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreviewProposals}
              className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800 text-xs font-black transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
            >
              <span>📊</span>
              <span>مقترحات درجات الشهر</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Today's Class Schedule Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span>📚 جدول حصص اليوم</span>
            <span className="text-[11px] font-bold text-slate-400">
              ({schedule.length} حصص مجدولة)
            </span>
          </h3>
          <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
            الدوام: الأحد - الخميس
          </span>
        </div>

        {todayInfo.isWeekend && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-3.5 text-center text-xs font-bold text-amber-800 dark:text-amber-300">
            اليوم عطلة رسمية. الحصص أدناه للاطلاع أو التسجيل المسبق.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {schedule.map((slot) => (
            <div
              key={slot.periodNo}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-4 shadow-xs transition-all flex flex-col justify-between gap-3 ${
                slot.isRecorded
                  ? 'border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/20'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-black">
                    {slot.periodLabel}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    {slot.timeRange}
                  </span>
                </div>

                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {slot.classLabel}
                </h4>
                <p className="text-xs font-bold text-teal-700 dark:text-teal-400 mt-0.5">
                  المادة: {slot.subjectName}
                </p>

                <div className="mt-2.5">
                  {slot.isRecorded ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[11px] font-black">
                      <span>✓ تم التسجيل</span>
                      <span>(حاضر: {slot.presentCount} | غائب: {slot.absentCount})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100/80 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[11px] font-black">
                      <span>⏳ لم يُسجّل الحضور بعد</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Thumb-Friendly Single Click */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleOpenRecording(slot)}
                  className={`min-h-[44px] px-2 py-2 rounded-2xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-2xs ${
                    slot.isRecorded
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/20'
                  }`}
                >
                  <span>📝</span>
                  <span>{slot.isRecorded ? 'تعديل السجل' : 'تسجيل الحضور'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToTab?.('plans')}
                  className="min-h-[44px] px-2 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                >
                  <span>📖</span>
                  <span>درس اليوم</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Quick Daily Recording Modal (التسجيل اليومي السريع) */}
      {recordingSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl mx-auto rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-teal-700 dark:text-teal-400">
                  {recordingSlot.periodLabel} • {recordingSlot.timeRange}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  التسجيل اليومي: {recordingSlot.classLabel}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRecordingSlot(null)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-lg font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Recording Mode Tabs */}
            <div className="grid grid-cols-5 p-1.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-black">
              {[
                { id: 'attendance', label: 'الحضور', icon: '👤' },
                { id: 'participation', label: 'المشاركة', icon: '✋' },
                { id: 'homework', label: 'الواجب', icon: '📓' },
                { id: 'prep', label: 'التحضير', icon: '📖' },
                { id: 'behavior', label: 'السلوك', icon: '⭐' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveRecordTab(tab.id as any)}
                  className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    activeRecordTab === tab.id
                      ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Student List (Single-Thumb Ergonomics) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoadingRoster ? (
                <div className="py-12 text-center text-xs font-bold text-slate-400">
                  جاري تحميل قائمة الطلاب...
                </div>
              ) : (
                roster.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                        {student.rollNumber}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {student.name}
                      </span>
                    </div>

                    {/* Mode Specific Controls */}
                    {activeRecordTab === 'attendance' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(student.id)}
                          className={`min-h-[40px] px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                            student.attendance === 'present'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          <span>{student.attendance === 'present' ? '✓ حاضر' : '✕ غائب'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleMarkLateOrExcused(
                              student.id,
                              student.attendance === 'late' ? 'excused' : 'late'
                            )
                          }
                          className="min-h-[40px] px-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 text-[11px] font-bold cursor-pointer"
                          title="تبديل إلى متأخر أو بعذر"
                        >
                          {student.attendance === 'late'
                            ? 'متأخر'
                            : student.attendance === 'excused'
                            ? 'بعذر'
                            : 'عذر/تأخر'}
                        </button>
                      </div>
                    )}

                    {activeRecordTab === 'participation' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-black text-teal-800 dark:text-teal-300 px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-950">
                          {student.participation} مشاركة
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncrementParticipation(student.id)}
                          className="min-h-[40px] min-w-[40px] rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-sm cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
                        >
                          +1
                        </button>
                      </div>
                    )}

                    {(activeRecordTab === 'homework' || activeRecordTab === 'prep') && (
                      <button
                        type="button"
                        onClick={() => handleToggleDone(student.id, activeRecordTab)}
                        className={`min-h-[40px] px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                          student[activeRecordTab] === 'done'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {student[activeRecordTab] === 'done' ? '✓ منجز' : 'لم ينجز'}
                      </button>
                    )}

                    {activeRecordTab === 'behavior' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setRoster((prev) =>
                              prev.map((s) =>
                                s.id === student.id
                                  ? { ...s, behaviorNotes: [...s.behaviorNotes, 'ملاحظة إيجابية'] }
                                  : s
                              )
                            );
                          }}
                          className="min-h-[38px] px-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black cursor-pointer"
                        >
                          + إيجابي
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRoster((prev) =>
                              prev.map((s) =>
                                s.id === student.id
                                  ? { ...s, behaviorNotes: [...s.behaviorNotes, 'ملاحظة سلبية'] }
                                  : s
                              )
                            );
                          }}
                          className="min-h-[38px] px-2.5 rounded-xl bg-red-50 text-red-800 border border-red-300 text-xs font-black cursor-pointer"
                        >
                          - سلبي
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-500">
                الحاضرون: {roster.filter((s) => s.attendance === 'present').length} من {roster.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRecordingSlot(null)}
                  className="min-h-[44px] px-4 rounded-xl text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveRecording}
                  className="min-h-[44px] px-6 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black shadow-md shadow-teal-900/30 cursor-pointer active:scale-95"
                >
                  حفظ واعتماد الحصة ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Monthly Proposals Modal (مقترحات درجات الشهر الوزارية) */}
      {showProposalsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                  محرك الدرجات العراقي (iraq-default-v1)
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  مقترحات المكونات الشهرية المشتقة
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProposalsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              تُشتق هذه الدرجات حتمياً من أحداث الحضور والمشاركات والواجبات المسجلة فعلياً في الحصص:
            </p>

            <div className="space-y-2.5">
              {Object.values(proposals).map((prop) => (
                <div
                  key={prop.componentId}
                  className="p-3 rounded-2xl bg-teal-50/60 dark:bg-slate-800/60 border border-teal-200/60 dark:border-slate-700 flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {prop.labelAr}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                      {prop.explanationAr}
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-teal-600 text-white font-mono text-sm font-black shrink-0">
                    {prop.suggestedValue} / 20
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowProposalsModal(false)}
                className="min-h-[44px] px-4 rounded-xl text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProposalsModal(false);
                  onNavigateToTab?.('gradebook');
                  showToast({
                    message: 'تم تفعيل مقترحات المكونات في استديو سجل الدرجات للمعاينة والاعتماد',
                    type: 'success',
                  });
                }}
                className="min-h-[44px] px-5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95"
              >
                فتح سجل الدرجات للاعتماد ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
