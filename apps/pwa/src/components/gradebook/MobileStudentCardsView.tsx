/**
 * MobileStudentCardsView.tsx - Native Mobile-First Student Cards Gradebook
 * Designed specifically for smartphones (360px - 430px) for one-handed classroom grading.
 * Features:
 * - Search by student name or roll number
 * - Filter pills (All, Graded, Ungraded, Absent)
 * - Tap score badge to open BottomSheetKeypad with auto-advance across students
 * - Quick score steppers (- / +) with >= 44px touch targets
 * - Tap to open detailed evaluation card
 * - Touch-friendly touch targets (>= 48px / 44px)
 */

import React, { useState, useMemo } from 'react';
import type { StudentRowItem, GradeColumnDef, GradebookMatrix } from './types.js';
import { BottomSheetKeypad, type KeypadConfirmResult } from '../common/BottomSheetKeypad.js';
import { IconMicrophone, IconSearch, IconClose } from '../common/Icons.js';
import { ExplainGradeModal } from './ExplainGradeModal.js';

export interface MobileStudentCardsViewProps {
  students: StudentRowItem[];
  grades: GradebookMatrix;
  columns: GradeColumnDef[];
  activeColumnKey: string;
  onColumnChange: (columnKey: string) => void;
  onGradeChange: (studentId: string, columnKey: string, score: number | null, isAbsent: boolean) => void;
  onStudentSelect: (student: StudentRowItem) => void;
  onOpenVoiceModal: () => void;
}

type FilterMode = 'all' | 'graded' | 'ungraded' | 'absent';

export const MobileStudentCardsView: React.FC<MobileStudentCardsViewProps> = ({
  students,
  grades,
  columns,
  activeColumnKey,
  onColumnChange,
  onGradeChange,
  onStudentSelect,
  onOpenVoiceModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // Keypad Modal State for fast sequential grading
  const [keypadStudentIndex, setKeypadStudentIndex] = useState<number | null>(null);
  const [explainStudent, setExplainStudent] = useState<{ name: string; id: string } | null>(null);

  const activeCol = columns.find((c) => c.key === activeColumnKey) || columns[0];
  const maxScore = activeCol?.maxScore || 20;

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((std) => {
      // 1. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = std.fullName.toLowerCase().includes(query);
        const matchesRoll = std.rollNumber.toString() === query;
        if (!matchesName && !matchesRoll) return false;
      }

      // 2. Filter mode
      const entry = grades[std.id]?.[activeColumnKey];
      const hasScore = entry && typeof entry.score === 'number' && !entry.isAbsent;
      const isAbsent = !!entry?.isAbsent;

      if (filterMode === 'graded') return hasScore;
      if (filterMode === 'ungraded') return !hasScore && !isAbsent;
      if (filterMode === 'absent') return isAbsent;

      return true;
    });
  }, [students, grades, activeColumnKey, searchQuery, filterMode]);

  // Active student for keypad
  const keypadStudent = keypadStudentIndex !== null && filteredStudents[keypadStudentIndex]
    ? filteredStudents[keypadStudentIndex]
    : null;

  // Keypad Handlers
  const handleKeypadConfirm = (result: KeypadConfirmResult) => {
    onGradeChange(result.studentId, activeColumnKey, result.score, result.isAbsent);
  };

  const handleKeypadNext = () => {
    if (keypadStudentIndex !== null && keypadStudentIndex < filteredStudents.length - 1) {
      setKeypadStudentIndex(keypadStudentIndex + 1);
    } else {
      setKeypadStudentIndex(null); // Finished all students
    }
  };

  const handleKeypadPrev = () => {
    if (keypadStudentIndex !== null && keypadStudentIndex > 0) {
      setKeypadStudentIndex(keypadStudentIndex - 1);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    let gradedCount = 0;
    let absentCount = 0;
    students.forEach((s) => {
      const e = grades[s.id]?.[activeColumnKey];
      if (e?.isAbsent) absentCount++;
      else if (typeof e?.score === 'number') gradedCount++;
    });
    return {
      total: students.length,
      graded: gradedCount,
      absent: absentCount,
      remaining: students.length - gradedCount - absentCount,
    };
  }, [students, grades, activeColumnKey]);

  return (
    <div dir="rtl" className="space-y-3 font-tajawal pb-24">
      {/* Mobile Sticky Selector & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-xs border border-slate-200 dark:border-slate-800 space-y-2.5">
        
        {/* Column & Evaluation Picker */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
              التقييم الحالي:
            </label>
            <select
              value={activeColumnKey}
              onChange={(e) => onColumnChange(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-teal-900 dark:text-teal-300 shadow-xs focus:ring-2 focus:ring-teal-500"
            >
              {columns
                .filter((col) => col.isEditable || col.key.startsWith('component_') || col.key === 'daily_total')
                .map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label} ({col.shortLabel}) - {col.maxScore} درجة
                  </option>
                ))}
            </select>
          </div>

          {/* Quick Voice Trigger */}
          <button
            type="button"
            onClick={onOpenVoiceModal}
            className="self-end min-h-[44px] px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            aria-label="رصد الدرجات بالصوت"
          >
            <IconMicrophone size={16} />
            <span className="whitespace-nowrap">رصد صوتي</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الطالب أو رقمه..."
            className="w-full min-h-[48px] px-9 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span className="absolute start-3 top-3.5 text-slate-400">
            <IconSearch size={16} />
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute end-3 top-3 text-slate-400 hover:text-slate-600 p-1"
              aria-label="مسح البحث"
            >
              <IconClose size={16} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`min-h-[38px] px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              filterMode === 'all'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>الكل</span>
            <span className="text-[10px] opacity-80">({stats.total})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('graded')}
            className={`min-h-[38px] px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              filterMode === 'graded'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
            }`}
          >
            <span>تم الرصد</span>
            <span className="text-[10px] opacity-80">({stats.graded})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('ungraded')}
            className={`min-h-[38px] px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              filterMode === 'ungraded'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
            }`}
          >
            <span>متبقي</span>
            <span className="text-[10px] opacity-80">({stats.remaining})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('absent')}
            className={`min-h-[38px] px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              filterMode === 'absent'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
            }`}
          >
            <span>غياب</span>
            <span className="text-[10px] opacity-80">({stats.absent})</span>
          </button>
        </div>
      </div>

      {/* Student Cards List */}
      <div className="space-y-2">
        {filteredStudents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-500 space-y-2 border border-slate-200 dark:border-slate-800">
            <span className="text-3xl block">🔍</span>
            <p className="text-xs font-bold">لا توجد نتائج مطابقة لبحثك</p>
          </div>
        ) : (
          filteredStudents.map((std, index) => {
            const entry = grades[std.id]?.[activeColumnKey];
            const currentScore = entry?.score;
            const isAbsent = !!entry?.isAbsent;
            const isGraded = typeof currentScore === 'number' && !isAbsent;

            return (
              <div
                key={std.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5 transition-transform active:scale-[0.99]"
              >
                {/* Student Avatar & Info */}
                <div
                  onClick={() => onStudentSelect(std)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-xs flex-shrink-0 ${
                      isAbsent
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                        : isGraded
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {std.rollNumber}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                        {std.fullName}
                      </h4>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExplainStudent({ name: std.fullName, id: std.id });
                        }}
                        aria-label={`شرح احتساب درجات ${std.fullName}`}
                        title="شرح احتساب درجات الطالب (iraq-default-v1)"
                        className="w-5 h-5 rounded-md bg-teal-50 hover:bg-teal-100 dark:bg-slate-800 text-teal-800 dark:text-teal-300 text-[10px] font-black flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        ℹ
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {std.guardianPhone ? `هاتف: ${std.guardianPhone}` : `الرقم التسلسلي: ${std.rollNumber}`}
                    </p>
                  </div>
                </div>

                {/* Score Controls - Touch ergonomic */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Score Stepper */}
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800">
                    <button
                      type="button"
                      disabled={isAbsent || (currentScore ?? 0) <= 0}
                      onClick={() => {
                        const newScore = Math.max(0, (currentScore ?? 0) - 1);
                        onGradeChange(std.id, activeColumnKey, newScore, false);
                      }}
                      aria-label={`إنقاص درجة ${std.fullName}`}
                      className="w-9 h-11 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 text-base font-bold disabled:opacity-30 active:bg-slate-200 dark:active:bg-slate-700 cursor-pointer"
                    >
                      -
                    </button>

                    {/* Score display: click to open fast numeric keypad */}
                    <button
                      type="button"
                      onClick={() => setKeypadStudentIndex(index)}
                      title="انقر لفتح لوحة المفاتيح الرقمية"
                      aria-label={`تعديل درجة ${std.fullName}`}
                      className={`w-14 h-11 text-center text-xs font-black border-x border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer transition-colors ${
                        isAbsent
                          ? 'bg-rose-50 text-rose-700 font-bold dark:bg-rose-950/40'
                          : isGraded
                          ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-black'
                          : 'bg-white dark:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {isAbsent ? 'غائب' : currentScore !== undefined && currentScore !== null ? currentScore : '-'}
                    </button>

                    <button
                      type="button"
                      disabled={isAbsent || (currentScore ?? 0) >= maxScore}
                      onClick={() => {
                        const newScore = Math.min(maxScore, (currentScore ?? 0) + 1);
                        onGradeChange(std.id, activeColumnKey, newScore, false);
                      }}
                      aria-label={`زيادة درجة ${std.fullName}`}
                      className="w-9 h-11 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 text-base font-bold disabled:opacity-30 active:bg-slate-200 dark:active:bg-slate-700 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Absent Toggle Button - 44px min target */}
                  <button
                    type="button"
                    onClick={() => {
                      onGradeChange(std.id, activeColumnKey, isAbsent ? 15 : null, !isAbsent);
                    }}
                    aria-label={`تسجيل غياب أو حضور ${std.fullName}`}
                    className={`min-h-[44px] min-w-[40px] px-2.5 py-1 rounded-xl text-xs font-black transition flex items-center justify-center cursor-pointer ${
                      isAbsent
                        ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-200 dark:ring-rose-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    غ
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Integrated BottomSheetKeypad for Sequential Grading on Mobile */}
      {keypadStudent && (
        <BottomSheetKeypad
          isOpen={true}
          studentId={keypadStudent.id}
          studentName={keypadStudent.fullName}
          studentIndex={(keypadStudentIndex ?? 0) + 1}
          totalStudents={filteredStudents.length}
          columnTitle={activeCol.label}
          initialValue={grades[keypadStudent.id]?.[activeColumnKey]?.score ?? null}
          initialAbsent={!!grades[keypadStudent.id]?.[activeColumnKey]?.isAbsent}
          minScore={0}
          maxScore={maxScore}
          autoAdvance={true}
          onConfirm={handleKeypadConfirm}
          onNext={handleKeypadNext}
          onPrev={handleKeypadPrev}
          onClose={() => setKeypadStudentIndex(null)}
        />
      )}

      {/* Grade Calculation Explanation Modal (Section 6.2) */}
      {explainStudent && (
        <ExplainGradeModal
          isOpen={Boolean(explainStudent)}
          onClose={() => setExplainStudent(null)}
          studentName={explainStudent.name}
          nodeId={
            activeColumnKey === 'annual_effort'
              ? 'annualSaee'
              : activeColumnKey === 'semester_1_avg'
              ? 'term1'
              : activeColumnKey === 'semester_2_avg'
              ? 'term2'
              : activeColumnKey === 'month_1'
              ? 'm1'
              : activeColumnKey === 'month_2'
              ? 'm2'
              : activeColumnKey
          }
          studentGrades={grades[explainStudent.id] || {}}
        />
      )}
    </div>
  );
};
