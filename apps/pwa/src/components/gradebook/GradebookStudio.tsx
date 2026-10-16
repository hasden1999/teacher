/**
 * GradebookStudio - Complete Gradebook Management Studio
 * Connects VirtualGradebookTable, BatchFillModal, StudentCardModal, Excel Service, and WhatsApp Service.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { VirtualGradebookTable } from './VirtualGradebookTable.js';
import { BatchFillModal } from './BatchFillModal.js';
import { StudentCardModal } from './StudentCardModal.js';
import { useBatchRollback } from './useBatchRollback.js';
import { useToast } from '../common/Toast.js';
import { excelService } from '../../services/excelService.js';
import { gradebookDbService } from '../../services/gradebookDbService.js';
import { authService } from '../../services/authService.js';
import type {
  StudentRowItem,
  GradeColumnDef,
  GradebookMatrix,
} from './types.js';
import { CANONICAL_GRADE_COLUMNS } from './types.js';

import {
  decomposeSimplifiedScore,
  calculateSemesterGrade,
  calculateAnnualEffort,
  calculateFinalResult,
} from '@techeeer/core';
import { VoiceGradeEntryModal } from './VoiceGradeEntryModal.js';
import { MobileStudentCardsView } from './MobileStudentCardsView.js';

// Sample Seed for empty initial run (clearly designated as SAMPLE_SEED)
export const SAMPLE_SEED_STUDENTS: StudentRowItem[] = [
  { id: 'std_demo_01', fullName: 'أحمد علي حسن', rollNumber: 1, gender: 'male', guardianPhone: '07701234567' },
  { id: 'std_demo_02', fullName: 'كرار حسين مهدي', rollNumber: 2, gender: 'male', guardianPhone: '07801234567' },
  { id: 'std_demo_03', fullName: 'زينب محمد جعفر', rollNumber: 3, gender: 'female', guardianPhone: '07901234567' },
  { id: 'std_demo_04', fullName: 'فاطمة حيدر كاظم', rollNumber: 4, gender: 'female', guardianPhone: '07501234567' },
  { id: 'std_demo_05', fullName: 'علي مصطفى جاسم', rollNumber: 5, gender: 'male', guardianPhone: '07712345678' },
  { id: 'std_demo_06', fullName: 'حسين علاء رضا', rollNumber: 6, gender: 'male', guardianPhone: '07812345678' },
  { id: 'std_demo_07', fullName: 'مريم سعد عبد الزهرة', rollNumber: 7, gender: 'female', guardianPhone: '07912345678' },
  { id: 'std_demo_08', fullName: 'يوسف رعد فاضل', rollNumber: 8, gender: 'male', guardianPhone: '07512345678' },
  { id: 'std_demo_09', fullName: 'عباس سلام نوري', rollNumber: 9, gender: 'male', guardianPhone: '07723456789' },
  { id: 'std_demo_10', fullName: 'زهراء قاسم جواد', rollNumber: 10, gender: 'female', guardianPhone: '07823456789' },
];

export const SAMPLE_SEED_GRADES: GradebookMatrix = {
  std_demo_01: {
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
  std_demo_02: {
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
  std_demo_03: {
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
  const [students, setStudents] = useState<StudentRowItem[]>([]);
  const [grades, setGrades] = useState<GradebookMatrix>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeMode, setActiveMode] = useState<'detailed' | 'simplified'>('detailed');
  const [activeDivision, setActiveDivision] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('techeeer_active_division') || 'شعبة أ';
    }
    return 'شعبة أ';
  });
  const [activeMobileColumnKey, setActiveMobileColumnKey] = useState<string>('component_oral');
  const [viewType, setViewType] = useState<'cards' | 'table'>('cards');

  const divisionIdMap: Record<string, string> = {
    'شعبة أ': 'div_1',
    'شعبة ب': 'div_2',
    'شعبة ج': 'div_3',
  };
  const divisionId = divisionIdMap[activeDivision] || 'div_1';

  // Modals state
  const [batchModalColumn, setBatchModalColumn] = useState<GradeColumnDef | null>(null);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<StudentRowItem | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  const { showToast } = useToast();

  const loadRosterData = useCallback(async () => {
    setIsLoading(true);
    try {
      await gradebookDbService.ensureDefaultStructure();
      if (divisionId === 'div_1') {
        await gradebookDbService.seedSampleStudentsIfEmpty(
          'div_1',
          SAMPLE_SEED_STUDENTS.map((s) => ({
            id: s.id,
            division_id: 'div_1',
            full_name: s.fullName,
            gender: s.gender || 'male',
            roll_number: s.rollNumber,
            guardian_phone: s.guardianPhone || null,
            notes: null,
            is_active: 1,
          })),
          SAMPLE_SEED_GRADES
        );
      }

      const dbStudents = await gradebookDbService.getStudentsByDivision(divisionId, true);
      const dbMatrix = await gradebookDbService.loadMatrix(divisionId);

      setStudents(
        dbStudents.map((s) => ({
          id: s.id,
          fullName: s.full_name,
          rollNumber: s.roll_number,
          gender: s.gender,
          guardianPhone: s.guardian_phone || undefined,
          notes: s.notes || undefined,
        }))
      );
      setGrades(dbMatrix);
    } catch (err: any) {
      console.warn('Failed to load gradebook from SQLite:', err);
    } finally {
      setIsLoading(false);
    }
  }, [divisionId]);

  useEffect(() => {
    loadRosterData();
  }, [loadRosterData]);

  // Synchronize on focus/storage in case students were modified in ClassesStudio
  useEffect(() => {
    const handleSync = () => {
      const storedDiv = localStorage.getItem('techeeer_active_division');
      if (storedDiv && storedDiv !== activeDivision) {
        setActiveDivision(storedDiv);
      } else {
        loadRosterData();
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [activeDivision, loadRosterData]);

  const handleDivisionChange = (newDiv: string) => {
    setActiveDivision(newDiv);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('techeeer_active_division', newDiv);
    }
  };

  const handleClearSampleData = async () => {
    if (window.confirm('هل أنت متأكد من مسح البيانات التجريبية والبدء بسجل فارغ؟')) {
      await gradebookDbService.clearSampleData(divisionId);
      setStudents([]);
      setGrades({});
      showToast({ message: 'تم مسح البيانات التجريبية بنجاح', type: 'info' });
    }
  };

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
            next[studentId] = computeStudentDerivedGrades(next[studentId]);
          }
        });
        gradebookDbService.persistMatrix(divisionId, next).catch((err) => {
          console.warn('Failed to persist batch updates:', err);
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

  const computeStudentDerivedGrades = (
    studentGrades: Record<string, { score: number | null; isAbsent: boolean }>
  ): Record<string, { score: number | null; isAbsent: boolean }> => {
    const res = { ...studentGrades };

    // 1. Calculate semester 1 average
    const m1 = res.month_1?.score;
    const m2 = res.month_2?.score;
    if (typeof m1 === 'number' && typeof m2 === 'number') {
      res.semester_1_avg = { score: calculateSemesterGrade(m1, m2), isAbsent: false };
    } else if (typeof m1 === 'number') {
      res.semester_1_avg = { score: m1, isAbsent: false };
    } else if (typeof m2 === 'number') {
      res.semester_1_avg = { score: m2, isAbsent: false };
    }

    // 2. Calculate semester 2 average
    const m3 = res.month_3?.score;
    const m4 = res.month_4?.score;
    if (typeof m3 === 'number' && typeof m4 === 'number') {
      res.semester_2_avg = { score: calculateSemesterGrade(m3, m4), isAbsent: false };
    } else if (typeof m3 === 'number') {
      res.semester_2_avg = { score: m3, isAbsent: false };
    } else if (typeof m4 === 'number') {
      res.semester_2_avg = { score: m4, isAbsent: false };
    }

    // 3. Calculate annual effort
    const s1 = res.semester_1_avg?.score;
    const mid = res.mid_term?.score;
    const s2 = res.semester_2_avg?.score;
    if (typeof s1 === 'number' && typeof mid === 'number' && typeof s2 === 'number') {
      res.annual_effort = { score: calculateAnnualEffort(s1, mid, s2), isAbsent: false };
    } else if (typeof s1 === 'number' && typeof mid === 'number') {
      res.annual_effort = { score: Math.round((s1 + mid) / 2), isAbsent: false };
    }

    // 4. Final result
    const effort = res.annual_effort?.score;
    const finalExam = res.final_exam?.score;
    if (typeof effort === 'number' && typeof finalExam === 'number') {
      res.final_status = { score: calculateFinalResult(effort, finalExam), isAbsent: false };
    }

    return res;
  };

  const handleGradeChange = (
    studentId: string,
    columnKey: string,
    score: number | null,
    isAbsent: boolean
  ) => {
    setGrades((prev) => {
      let studentGrades = { ...(prev[studentId] || {}) };
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

      studentGrades = computeStudentDerivedGrades(studentGrades);

      const nextMatrix = { ...prev, [studentId]: studentGrades };
      gradebookDbService.persistMatrix(divisionId, nextMatrix).catch((err) => {
        console.warn('Failed to persist grade:', err);
      });
      return nextMatrix;
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

        next[studentId] = computeStudentDerivedGrades(studentGrades);
      });
      gradebookDbService.persistMatrix(divisionId, next).catch((err) => {
        console.warn('Failed to persist voice updates:', err);
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
            onChange={(e) => handleDivisionChange(e.target.value)}
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

          {/* Mobile View Switcher (Cards vs Table) */}
          <div className="flex md:hidden items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewType('cards')}
              className={`min-h-[38px] px-3 py-1 rounded-lg text-xs font-bold transition ${
                viewType === 'cards'
                  ? 'bg-teal-700 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              📱 بطاقات
            </button>
            <button
              type="button"
              onClick={() => setViewType('table')}
              className={`min-h-[38px] px-3 py-1 rounded-lg text-xs font-bold transition ${
                viewType === 'table'
                  ? 'bg-teal-700 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              📊 جدول
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="hidden md:flex min-h-[44px] px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition items-center gap-1.5 shadow"
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

          <button
            type="button"
            onClick={handleClearSampleData}
            title="مسح البيانات التجريبية للشعبة الحالية"
            className="min-h-[44px] px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-bold transition flex items-center gap-1"
          >
            <span>🗑️</span>
            <span>مسح البيانات التجريبية</span>
          </button>
        </div>
      </div>

      {/* Main View: Loading State, Empty State, or Data Tables */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-16 flex flex-col items-center justify-center text-slate-500">
          <span className="text-4xl animate-spin mb-4">⏳</span>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            جاري تحميل سجل الدرجات من قاعدة البيانات المحلية...
          </p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center flex flex-col items-center justify-center">
          <span className="text-5xl mb-4">👥</span>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">
            لا يوجد طلاب في {activeDivision}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
            لم يتم العثور على أي طلاب مسجلين في هذه الشعبة. يمكنك استيراد قائمة الطلاب من ملف Excel عبر قسم «الفصول والشعب» أو إعادة تعيين العينة التجريبية.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#classes';
              }}
              className="min-h-[40px] px-4 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow"
            >
              الانتقال لإدارة الفصول والطلاب 📋
            </button>
            <button
              type="button"
              onClick={async () => {
                if (typeof localStorage !== 'undefined') {
                  localStorage.removeItem('techeeer_sample_seed_cleared');
                }
                await loadRosterData();
                showToast({ message: 'تم تحميل البيانات التجريبية بنجاح', type: 'success' });
              }}
              className="min-h-[40px] px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
            >
              إعادة تحميل بيانات العينة (Sample Seed)
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main View: Mobile Cards or Virtual Table */}
          {viewType === 'cards' ? (
            <div className="md:hidden pb-28">
              <MobileStudentCardsView
                students={students}
                grades={grades}
                columns={CANONICAL_GRADE_COLUMNS}
                activeColumnKey={activeMobileColumnKey}
                onColumnChange={setActiveMobileColumnKey}
                onGradeChange={handleGradeChange}
                onStudentSelect={(std) => setSelectedStudentForCard(std)}
                onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              />
            </div>
          ) : null}

          <div className={`${viewType === 'cards' ? 'hidden md:block' : 'block'} bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[500px]`}>
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
        </>
      )}

      {/* Floating Action Button (FAB) for Instant AI Voice Entry on Mobile */}
      <div className="md:hidden fixed bottom-20 start-4 z-40">
        <button
          type="button"
          onClick={() => setIsVoiceModalOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-teal-800 to-emerald-600 hover:from-teal-700 hover:to-emerald-500 text-white shadow-2xl flex items-center justify-center text-2xl active:scale-95 transition-all ring-4 ring-white dark:ring-slate-900 shadow-teal-900/30 cursor-pointer"
          aria-label="رصد الدرجات بالصوت الذكي"
        >
          🎙️
        </button>
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
      {selectedStudentForCard && (() => {
        const profile = authService.getTeacherProfile();
        return (
          <StudentCardModal
            isOpen={true}
            onClose={() => setSelectedStudentForCard(null)}
            student={{
              id: selectedStudentForCard.id,
              division_id: divisionId,
              full_name: selectedStudentForCard.fullName,
              gender: selectedStudentForCard.gender || 'male',
              roll_number: selectedStudentForCard.rollNumber,
              is_active: 1,
              guardian_phone: selectedStudentForCard.guardianPhone || null,
              notes: selectedStudentForCard.notes || null,
              created_at: Date.now(),
            }}
            grades={grades[selectedStudentForCard.id]}
            className={profile?.stage ? `${profile.stage === 'primary' ? 'المرحلة الابتدائية' : profile.stage === 'intermediate' ? 'المرحلة المتوسطة' : 'المرحلة الإعدادية'} - الصف ${profile.grade}` : 'الصف الدراسي'}
            divisionName={activeDivision}
            subjectName={profile?.subject || 'المادة'}
            academicYear="2026-2027"
            schoolName={profile?.schoolName || 'المدرسة'}
            teacherName={profile?.fullName || 'الأستاذ'}
          />
        );
      })()}

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
