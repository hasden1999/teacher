/**
 * GradebookStudio - Complete Gradebook Management Studio
 * Connects VirtualGradebookTable, BatchFillModal, StudentCardModal, Excel Service, and WhatsApp Service.
 */

import React, { useState } from 'react';
import { VirtualGradebookTable } from './VirtualGradebookTable.js';
import { BatchFillModal } from './BatchFillModal.js';
import { StudentCardModal } from './StudentCardModal.js';
import { useBatchRollback } from './useBatchRollback.js';
import { useToast } from '../common/Toast.js';
import { excelService } from '../../services/excelService.js';
import type {
  StudentRowItem,
  GradeColumnDef,
  GradebookMatrix,
} from './types.js';
import { CANONICAL_GRADE_COLUMNS } from './types.js';

import { decomposeSimplifiedScore } from '@techeeer/core';
import { VoiceGradeEntryModal } from './VoiceGradeEntryModal.js';

// Default initial demo dataset (representative Iraqi students roster)
const INITIAL_DEMO_STUDENTS: StudentRowItem[] = [
  { id: 'std_01', fullName: 'أحمد علي حسن', rollNumber: 1, gender: 'male', guardianPhone: '07701234567' },
  { id: 'std_02', fullName: 'كرار حسين مهدي', rollNumber: 2, gender: 'male', guardianPhone: '07801234567' },
  { id: 'std_03', fullName: 'زينب محمد جعفر', rollNumber: 3, gender: 'female', guardianPhone: '07901234567' },
  { id: 'std_04', fullName: 'فاطمة حيدر كاظم', rollNumber: 4, gender: 'female', guardianPhone: '07501234567' },
  { id: 'std_05', fullName: 'علي مصطفى جاسم', rollNumber: 5, gender: 'male', guardianPhone: '07712345678' },
  { id: 'std_06', fullName: 'حسين علاء رضا', rollNumber: 6, gender: 'male', guardianPhone: '07812345678' },
  { id: 'std_07', fullName: 'مريم سعد عبد الزهرة', rollNumber: 7, gender: 'female', guardianPhone: '07912345678' },
  { id: 'std_08', fullName: 'يوسف رعد فاضل', rollNumber: 8, gender: 'male', guardianPhone: '07512345678' },
  { id: 'std_09', fullName: 'عباس سلام نوري', rollNumber: 9, gender: 'male', guardianPhone: '07723456789' },
  { id: 'std_10', fullName: 'زهراء قاسم جواد', rollNumber: 10, gender: 'female', guardianPhone: '07823456789' },
];

const INITIAL_DEMO_GRADES: GradebookMatrix = {
  std_01: {
    component_oral: { score: 18, isAbsent: false },
    component_written: { score: 19, isAbsent: false },
    component_homework: { score: 20, isAbsent: false },
    component_behavior: { score: 20, isAbsent: false },
    component_participation: { score: 18, isAbsent: false },
    daily_total: { score: 95, isAbsent: false },
    month_1: { score: 92, isAbsent: false },
    month_2: { score: 95, isAbsent: false },
    mid_term: { score: 90, isAbsent: false },
    annual_effort: { score: 92, isAbsent: false },
    final_status: { score: 92, isAbsent: false },
  },
  std_02: {
    component_oral: { score: 12, isAbsent: false },
    component_written: { score: 10, isAbsent: false },
    component_homework: { score: 14, isAbsent: false },
    component_behavior: { score: 16, isAbsent: false },
    component_participation: { score: 12, isAbsent: false },
    daily_total: { score: 64, isAbsent: false },
    month_1: { score: 45, isAbsent: false },
    month_2: { score: 48, isAbsent: false },
    mid_term: { score: 47, isAbsent: false },
    annual_effort: { score: 47, isAbsent: false },
    final_status: { score: 47, isAbsent: false },
  },
  std_03: {
    component_oral: { score: 20, isAbsent: false },
    component_written: { score: 20, isAbsent: false },
    component_homework: { score: 20, isAbsent: false },
    component_behavior: { score: 20, isAbsent: false },
    component_participation: { score: 20, isAbsent: false },
    daily_total: { score: 100, isAbsent: false },
    month_1: { score: 98, isAbsent: false },
    month_2: { score: 100, isAbsent: false },
    mid_term: { score: 99, isAbsent: false },
    annual_effort: { score: 99, isAbsent: false },
    final_status: { score: 99, isAbsent: false },
  },
};

export const GradebookStudio: React.FC = () => {
  const [students] = useState<StudentRowItem[]>(INITIAL_DEMO_STUDENTS);
  const [grades, setGrades] = useState<GradebookMatrix>(INITIAL_DEMO_GRADES);
  const [activeMode, setActiveMode] = useState<'detailed' | 'simplified'>('detailed');
  const [activeDivision, setActiveDivision] = useState<string>('شعبة أ');

  // Modals state
  const [batchModalColumn, setBatchModalColumn] = useState<GradeColumnDef | null>(null);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<StudentRowItem | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  const { showToast } = useToast();

  const { executeBatchWithUndo } = useBatchRollback({
    onApplyUpdates: (updates) => {
      setGrades((prev) => {
        const next = { ...prev };
        updates.forEach(({ studentId, newValue }) => {
          if (!next[studentId]) next[studentId] = {};
          if (batchModalColumn) {
            next[studentId][batchModalColumn.key] = {
              score: newValue,
              isAbsent: false,
            };
          }
        });
        return next;
      });
    },
  });

  const COMPONENT_KEYS = [
    'component_oral',
    'component_written',
    'component_homework',
    'component_behavior',
    'component_participation',
  ];

  const handleGradeChange = (
    studentId: string,
    columnKey: string,
    score: number | null,
    isAbsent: boolean
  ) => {
    setGrades((prev) => {
      const studentGrades = { ...(prev[studentId] || {}) };
      studentGrades[columnKey] = { score, isAbsent };

      // 1. If modifying a sub-component of daily activity, compute the daily_total (out of 100) automatically
      if (columnKey.startsWith('component_')) {
        let sum = 0;
        let hasAnyEntry = false;
        let allAbsent = true;

        for (const k of COMPONENT_KEYS) {
          const entry = studentGrades[k];
          if (entry && !entry.isAbsent && typeof entry.score === 'number') {
            sum += entry.score;
            hasAnyEntry = true;
            allAbsent = false;
          } else if (entry && entry.score !== null) {
            hasAnyEntry = true;
          }
        }

        if (hasAnyEntry) {
          studentGrades['daily_total'] = {
            score: Math.min(100, Math.max(0, Math.round(sum))),
            isAbsent: allAbsent && COMPONENT_KEYS.every((k) => studentGrades[k]?.isAbsent),
          };
        }
      }

      // 2. If modifying daily_total directly in simplified mode, decompose losslessly to the 5 components
      if (columnKey === 'daily_total') {
        if (score !== null && !isAbsent) {
          try {
            const decomposed = decomposeSimplifiedScore(score);
            studentGrades.component_oral = { score: decomposed.oral, isAbsent: false };
            studentGrades.component_written = { score: decomposed.written, isAbsent: false };
            studentGrades.component_homework = { score: decomposed.homework, isAbsent: false };
            studentGrades.component_behavior = { score: decomposed.behavior, isAbsent: false };
            studentGrades.component_participation = { score: decomposed.participation, isAbsent: false };
          } catch {
            const part = Math.round(score / 5);
            studentGrades.component_oral = { score: part, isAbsent: false };
            studentGrades.component_written = { score: part, isAbsent: false };
            studentGrades.component_homework = { score: part, isAbsent: false };
            studentGrades.component_behavior = { score: part, isAbsent: false };
            studentGrades.component_participation = { score: part, isAbsent: false };
          }
        } else if (isAbsent) {
          for (const k of COMPONENT_KEYS) {
            studentGrades[k] = { score: null, isAbsent: true };
          }
        }
      }

      return { ...prev, [studentId]: studentGrades };
    });
  };

  const handleApplyVoiceGrades = (
    updates: Array<{ studentId: string; columnKey: string; score: number | null; isAbsent: boolean }>
  ) => {
    setGrades((prev) => {
      const next = { ...prev };
      updates.forEach(({ studentId, columnKey, score, isAbsent }) => {
        const studentGrades = { ...(next[studentId] || {}) };
        studentGrades[columnKey] = { score, isAbsent };

        if (columnKey.startsWith('component_')) {
          let sum = 0;
          let hasAny = false;
          for (const k of COMPONENT_KEYS) {
            const entry = studentGrades[k];
            if (entry && !entry.isAbsent && typeof entry.score === 'number') {
              sum += entry.score;
              hasAny = true;
            }
          }
          if (hasAny) {
            studentGrades['daily_total'] = {
              score: Math.min(100, Math.max(0, Math.round(sum))),
              isAbsent: false,
            };
          }
        }

        if (columnKey === 'daily_total' && score !== null && !isAbsent) {
          try {
            const decomposed = decomposeSimplifiedScore(score);
            studentGrades.component_oral = { score: decomposed.oral, isAbsent: false };
            studentGrades.component_written = { score: decomposed.written, isAbsent: false };
            studentGrades.component_homework = { score: decomposed.homework, isAbsent: false };
            studentGrades.component_behavior = { score: decomposed.behavior, isAbsent: false };
            studentGrades.component_participation = { score: decomposed.participation, isAbsent: false };
          } catch {}
        }

        next[studentId] = studentGrades;
      });
      return next;
    });
  };

  const handleExportExcel = () => {
    try {
      const exportData = students.map((std) => {
        const row: Record<string, any> = {
          'الرقم': std.rollNumber,
          'اسم الطالب': std.fullName,
        };
        CANONICAL_GRADE_COLUMNS.forEach((col) => {
          const val = grades[std.id]?.[col.key];
          row[col.label] = val?.isAbsent ? 'غائب' : val?.score ?? '';
        });
        return row;
      });

      excelService.exportToCsv(exportData, `سجل_الدرجات_${activeDivision}`);
      showToast({ message: 'تم تصدير سجل الدرجات بنجاح بصيغة CSV', type: 'success' });
    } catch (err: any) {
      showToast({ message: `فشل التصدير: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div dir="rtl" className="max-w-7xl mx-auto space-y-4 font-tajawal">
      {/* Top Controls Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              سجل الدرجات الوزاري الإلكتروني
            </h2>
            <p className="text-xs text-slate-500">
              معادلات السعي والقرار الوزاري المعتمدة وفق ضوابط وزارة التربية
            </p>
          </div>
        </div>

        {/* Division Selector & Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeDivision}
            onChange={(e) => setActiveDivision(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
          >
            <option value="شعبة أ">الخامس العلمي - شعبة أ</option>
            <option value="شعبة ب">الخامس العلمي - شعبة ب</option>
            <option value="شعبة ج">الخامس العلمي - شعبة ج</option>
          </select>

          {/* Mode toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveMode('detailed')}
              className={`min-h-[38px] px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeMode === 'detailed'
                  ? 'bg-teal-700 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              مفصل (5×20)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('simplified')}
              className={`min-h-[38px] px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeMode === 'simplified'
                  ? 'bg-teal-700 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              مبسط (درجة 100)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <span>🎙️</span>
            <span>إدخال الدرجات بالصوت</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <span>📥</span>
            <span>تصدير Excel/CSV</span>
          </button>
        </div>
      </div>

      {/* Virtualized Student Gradebook Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[500px]">
        <VirtualGradebookTable
          students={students}
          grades={grades}
          activeMode={activeMode}
          onModeChange={setActiveMode}
          onGradeChange={handleGradeChange}
          onBatchFillRequest={(col) => setBatchModalColumn(col)}
          onStudentSelect={(std) => setSelectedStudentForCard(std)}
        />
      </div>

      {/* Batch Fill Modal */}
      {batchModalColumn && (
        <BatchFillModal
          isOpen={true}
          targetColumn={{
            key: batchModalColumn.key,
            label: batchModalColumn.label,
            maxScore: batchModalColumn.maxScore,
            minScore: batchModalColumn.minScore ?? 0,
          }}
          students={students.map((s) => ({
            studentId: s.id,
            studentName: s.fullName,
            rollNumber: s.rollNumber,
            currentValue: grades[s.id]?.[batchModalColumn.key]?.score ?? null,
            isAbsent: grades[s.id]?.[batchModalColumn.key]?.isAbsent ?? false,
          }))}
          onClose={() => setBatchModalColumn(null)}
          onCommitBatch={async (_payload, snapshot, updatedRows) => {
            await executeBatchWithUndo({
              snapshot,
              updatedRows,
              columnLabel: batchModalColumn.label,
            });
            setBatchModalColumn(null);
          }}
        />
      )}

      {/* Student Evaluation Card Modal */}
      {selectedStudentForCard && (
        <StudentCardModal
          isOpen={true}
          onClose={() => setSelectedStudentForCard(null)}
          student={{
            id: selectedStudentForCard.id,
            division_id: 'div_1',
            full_name: selectedStudentForCard.fullName,
            gender: selectedStudentForCard.gender || 'male',
            roll_number: selectedStudentForCard.rollNumber,
            is_active: 1,
            guardian_phone: selectedStudentForCard.guardianPhone || null,
            notes: selectedStudentForCard.notes || null,
            created_at: Date.now(),
          }}
          className="الخامس العلمي"
          divisionName={activeDivision}
          subjectName="العلوم"
          academicYear="2026-2027"
          schoolName="مدرسة الأمل"
          teacherName="الأستاذ"
        />
      )}

      {/* Voice Grade Entry Modal */}
      {isVoiceModalOpen && (
        <VoiceGradeEntryModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          students={students}
          columns={CANONICAL_GRADE_COLUMNS}
          activeColumnKey={activeMode === 'simplified' ? 'daily_total' : 'component_oral'}
          onApplyGrades={(updates) => {
            handleApplyVoiceGrades(updates);
            showToast({ message: `تم تحديث درجات ${updates.length} طالباً بنجاح!`, type: 'success' });
          }}
        />
      )}
    </div>
  );
};
