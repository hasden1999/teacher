/**
 * BatchFillModal - Column Batch Operations & Grace Mark Management
 * Features:
 * - Constant mark assignment, bonus addition (+1, +2, +5, +10), or deductions
 * - Filtering by scope: All students, failing only (<50), empty only, present only
 * - Iraqi Ministerial Decision cap: clamps bonus marks to 50 for failing students (T1.14.5)
 * - Negative values clamped to 0 (T2.12.4)
 * - Snapshot generation for instant 8-second Undo rollback
 */

import React, { useState, useMemo } from 'react';

export type BatchTargetScope = 'ALL' | 'FAILING_ONLY' | 'EMPTY_ONLY' | 'PRESENT_ONLY';

export type BatchOperationMode = 'SET_FIXED' | 'ADD_BONUS' | 'DEDUCT';

export interface BatchTargetColumn {
  key: string;
  label: string;
  maxScore: number;
  minScore?: number;
}

export interface StudentBatchRow {
  studentId: string;
  studentName: string;
  rollNumber: number;
  currentValue: number | null;
  isAbsent: boolean;
}

export interface BatchApplyPayload {
  columnKey: string;
  scope: BatchTargetScope;
  mode: BatchOperationMode;
  value: number;
  capAtFiftyForFailing: boolean;
}

export interface BatchSnapshot {
  snapshotId: string;
  columnKey: string;
  timestamp: number;
  previousRows: Array<{
    studentId: string;
    value: number | null;
    isAbsent: boolean;
  }>;
  affectedCount: number;
}

export interface BatchTransformationResult {
  updatedRows: Array<{ studentId: string; newValue: number | null }>;
  snapshot: BatchSnapshot;
  affectedCount: number;
}

/**
 * Pure calculation and clamping function for batch operations.
 */
export function computeBatchTransformation(
  students: StudentBatchRow[],
  payload: BatchApplyPayload,
  column: BatchTargetColumn
): BatchTransformationResult {
  const min = column.minScore ?? 0;
  const max = column.maxScore;

  // Filter affected students based on scope (absent students are never modified)
  const targetStudents = students.filter((student) => {
    if (student.isAbsent) return false;

    switch (payload.scope) {
      case 'ALL':
      case 'PRESENT_ONLY':
        return true;
      case 'FAILING_ONLY':
        return student.currentValue !== null && student.currentValue !== undefined && student.currentValue < 50;
      case 'EMPTY_ONLY':
        return student.currentValue === null || student.currentValue === undefined;
      default:
        return true;
    }
  });

  const updatedRows: Array<{ studentId: string; newValue: number | null }> = [];
  const previousRows: BatchSnapshot['previousRows'] = [];

  for (const student of targetStudents) {
    const current = student.currentValue ?? 0;
    let computed: number;

    if (payload.mode === 'SET_FIXED') {
      computed = Math.min(max, Math.max(min, payload.value));
    } else if (payload.mode === 'ADD_BONUS') {
      if (payload.scope === 'FAILING_ONLY' && payload.capAtFiftyForFailing) {
        // Iraqi ministerial grace marks invariant: clamp at 50 (T1.14.5)
        computed = Math.min(50, Math.max(min, current + payload.value));
      } else {
        computed = Math.min(max, Math.max(min, current + payload.value));
      }
    } else {
      // DEDUCT: Clamped to 0 (T2.12.4)
      computed = Math.max(0, current - payload.value);
    }

    previousRows.push({
      studentId: student.studentId,
      value: student.currentValue,
      isAbsent: student.isAbsent,
    });

    updatedRows.push({
      studentId: student.studentId,
      newValue: computed,
    });
  }

  const snapshot: BatchSnapshot = {
    snapshotId: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    columnKey: payload.columnKey,
    timestamp: Date.now(),
    previousRows,
    affectedCount: updatedRows.length,
  };

  return { updatedRows, snapshot, affectedCount: updatedRows.length };
}

export interface BatchFillModalProps {
  isOpen: boolean;
  targetColumn: BatchTargetColumn;
  students: StudentBatchRow[];
  onClose: () => void;
  onCommitBatch: (
    payload: BatchApplyPayload,
    snapshot: BatchSnapshot,
    updatedRows: Array<{ studentId: string; newValue: number | null }>
  ) => Promise<void> | void;
}

export const BatchFillModal: React.FC<BatchFillModalProps> = ({
  isOpen,
  targetColumn,
  students,
  onClose,
  onCommitBatch,
}) => {
  if (!isOpen) return null;

  const [scope, setScope] = useState<BatchTargetScope>('ALL');
  const [mode, setMode] = useState<BatchOperationMode>('ADD_BONUS');
  const [inputValue, setInputValue] = useState<number>(mode === 'ADD_BONUS' ? 5 : targetColumn.maxScore);
  const [capAtFifty, setCapAtFifty] = useState<boolean>(true);

  // Calculate live preview counts
  const failingCount = useMemo(
    () => students.filter((s) => !s.isAbsent && s.currentValue !== null && s.currentValue < 50).length,
    [students]
  );
  const emptyCount = useMemo(
    () => students.filter((s) => !s.isAbsent && (s.currentValue === null || s.currentValue === undefined)).length,
    [students]
  );
  const presentCount = useMemo(() => students.filter((s) => !s.isAbsent).length, [students]);

  const targetCount = useMemo(() => {
    switch (scope) {
      case 'FAILING_ONLY':
        return failingCount;
      case 'EMPTY_ONLY':
        return emptyCount;
      case 'ALL':
      case 'PRESENT_ONLY':
      default:
        return presentCount;
    }
  }, [scope, failingCount, emptyCount, presentCount]);

  // Presets based on column type and mode
  const presets = useMemo(() => {
    if (mode === 'ADD_BONUS') {
      return [1, 2, 5, 10];
    }
    if (mode === 'DEDUCT') {
      return [1, 2, 5];
    }
    return targetColumn.maxScore === 20 ? [20, 18, 15, 10] : [100, 90, 80, 50];
  }, [mode, targetColumn.maxScore]);

  const handleApply = async () => {
    const payload: BatchApplyPayload = {
      columnKey: targetColumn.key,
      scope,
      mode,
      value: Math.max(0, Number(inputValue) || 0),
      capAtFiftyForFailing: capAtFifty,
    };

    const { updatedRows, snapshot } = computeBatchTransformation(students, payload, targetColumn);
    await onCommitBatch(payload, snapshot, updatedRows);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-tajawal"
      dir="rtl"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Mobile Drag Handle */}
        <div className="pt-1 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 id="batch-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              التعبئة والتعديل الجماعي للدرجات
            </h2>
            <span className="text-xs text-teal-700 dark:text-teal-400 font-semibold">
              العمود المستهدف: {targetColumn.label} (الدرجة العظمى: {targetColumn.maxScore})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scope Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            نطاق تطبيق التعديل:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'ALL', label: 'جميع الطلاب', count: presentCount },
              { id: 'FAILING_ONLY', label: 'الراسبون (<50)', count: failingCount },
              { id: 'EMPTY_ONLY', label: 'الخانات الفارغة', count: emptyCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id as BatchTargetScope)}
                className={`min-h-[48px] p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center border transition-all ${
                  scope === tab.id
                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-75 font-normal">({tab.count} طالباً)</span>
              </button>
            ))}
          </div>
        </div>

        {/* Operation Mode Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            نوع العملية:
          </label>
          <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[
              { id: 'ADD_BONUS', label: 'إضافة درجات (+)' },
              { id: 'SET_FIXED', label: 'درجة ثابتة' },
              { id: 'DEDUCT', label: 'خصم درجات (-)' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id as BatchOperationMode);
                  if (m.id === 'ADD_BONUS') setInputValue(5);
                  else if (m.id === 'SET_FIXED') setInputValue(targetColumn.maxScore);
                  else setInputValue(2);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === m.id
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Numeric Value Input & Presets */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            مقدار الدرجة:
          </label>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1.5 flex-1">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInputValue(preset)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    inputValue === preset
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {mode === 'ADD_BONUS' ? `+${preset}` : mode === 'DEDUCT' ? `-${preset}` : preset}
                </button>
              ))}
            </div>

            <div className="w-24">
              <input
                type="number"
                min="0"
                max={targetColumn.maxScore}
                value={inputValue}
                onChange={(e) => setInputValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-center text-sm font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Iraqi Ministerial Grace Cap Option (T1.14.5) */}
        {scope === 'FAILING_ONLY' && mode === 'ADD_BONUS' && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
            <label htmlFor="grace-cap-check" className="text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer">
              تقييد الإضافة بسقف النجاح الوزاري (50 كحد أقصى)
            </label>
            <input
              id="grace-cap-check"
              type="checkbox"
              checked={capAtFifty}
              onChange={(e) => setCapAtFifty(e.target.checked)}
              className="w-5 h-5 accent-teal-600 rounded cursor-pointer"
            />
          </div>
        )}

        {/* Summary Info */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-400">
          سيتم تطبيق التعديل على <span className="font-bold text-teal-700 dark:text-teal-300">{targetCount}</span> طالباً.
          يمكنك التراجع الفوري خلال <span className="font-bold">8 ثوانٍ</span> بعد التطبيق.
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={targetCount === 0}
            className="flex-1 min-h-[48px] rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            تطبيق التعديل الجماعي
          </button>
        </div>
      </div>
    </div>
  );
};
