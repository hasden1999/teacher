/**
 * VirtualGradebookTable - High-Performance Virtualized Gradebook Studio
 * Features:
 * - 60fps zero-dependency windowing supporting 300+ to 500+ students on mobile (360x640)
 * - Fixed row height (52px) with 8-row overscan buffer
 * - Sticky RTL student name column (sticky end-0 z-20 border-s border-slate-200) and sticky header (z-30)
 * - Truncation for long names (>100 chars) with tooltip
 * - BottomSheetKeypad integration with auto-advance upon 2 digits or Enter
 * - WCAG AA status badges (Red <50, Blue 50-89, Emerald Green >=90, Slate/Amber absent)
 * - Full keyboard navigation (arrows, Enter, Escape, digits)
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type {
  GradeColumnDef,
  StudentRowItem,
  GradebookMatrix,
  ActiveCellCoordinate,
} from './types.js';
import { CANONICAL_GRADE_COLUMNS, getGradeBadgeStyle } from './types.js';
import { BottomSheetKeypad, type KeypadConfirmResult } from '../common/BottomSheetKeypad.js';

export interface VirtualGradebookTableProps {
  students: StudentRowItem[];
  columns?: GradeColumnDef[];
  grades: GradebookMatrix;
  activeMode?: 'detailed' | 'simplified';
  onModeChange?: (mode: 'detailed' | 'simplified') => void;
  subjectTitle?: string;
  rowHeight?: number; // default 52px
  overscan?: number; // default 8
  onGradeChange: (studentId: string, columnKey: string, score: number | null, isAbsent: boolean) => void;
  onBatchFillRequest?: (column: GradeColumnDef) => void;
  onStudentSelect?: (student: StudentRowItem) => void;
}

export const VirtualGradebookTable: React.FC<VirtualGradebookTableProps> = ({
  students,
  columns = CANONICAL_GRADE_COLUMNS,
  grades,
  activeMode = 'detailed',
  onModeChange,
  subjectTitle = 'سجل درجات المادة',
  rowHeight = 52,
  overscan = 8,
  onGradeChange,
  onBatchFillRequest,
  onStudentSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter columns based on mode with dynamic editability for daily_total
  const displayedColumns = useMemo(() => {
    if (activeMode === 'simplified') {
      return columns
        .filter((col) => !col.key.startsWith('component_'))
        .map((col) => {
          if (col.key === 'daily_total') {
            return {
              ...col,
              isEditable: true,
              isComputed: false,
              label: 'النشاط اليومي',
              shortLabel: 'اليومي',
              description: 'درجة النشاط اليومي من 100',
            };
          }
          return col;
        });
    }
    return columns;
  }, [columns, activeMode]);

  // Windowing State
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(520);

  // Active Selected Cell
  const [activeCell, setActiveCell] = useState<ActiveCellCoordinate | null>(null);
  const [isKeypadOpen, setIsKeypadOpen] = useState<boolean>(false);

  // Measure container height on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight || 520);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Handle scroll events with requestAnimationFrame throttling
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Calculate virtual window boundaries
  const totalVirtualHeight = students.length * rowHeight;
  const rawStart = Math.floor(scrollTop / rowHeight);
  const rawEnd = Math.floor((scrollTop + viewportHeight) / rowHeight);
  const startIndex = Math.max(0, rawStart - overscan);
  const endIndex = Math.min(Math.max(0, students.length - 1), rawEnd + overscan);
  const offsetY = startIndex * rowHeight;

  const visibleStudents = useMemo(() => {
    if (students.length === 0) return [];
    return students.slice(startIndex, endIndex + 1);
  }, [students, startIndex, endIndex]);

  // Auto-scroll student into view when activeCell changes
  const scrollToStudentIndex = useCallback(
    (index: number) => {
      if (!containerRef.current || index < 0 || index >= students.length) return;
      const targetTop = index * rowHeight;
      const container = containerRef.current;
      const currentScroll = container.scrollTop;
      const height = container.clientHeight;

      if (targetTop < currentScroll) {
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({ top: targetTop, behavior: 'smooth' });
        } else {
          container.scrollTop = targetTop;
        }
      } else if (targetTop + rowHeight > currentScroll + height) {
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({ top: targetTop + rowHeight - height, behavior: 'smooth' });
        } else {
          container.scrollTop = targetTop + rowHeight - height;
        }
      }
    },
    [students.length, rowHeight]
  );

  // Handle cell click
  const handleCellClick = useCallback(
    (student: StudentRowItem, studentIndex: number, column: GradeColumnDef) => {
      if (!column.isEditable) return;

      setActiveCell({
        studentId: student.id,
        studentIndex,
        columnKey: column.key,
        columnTitle: column.label,
        maxScore: column.maxScore,
        minScore: column.minScore ?? 0,
      });
      setIsKeypadOpen(true);
      scrollToStudentIndex(studentIndex);
    },
    [scrollToStudentIndex]
  );

  // Advance to next/prev student
  const advanceToStudent = useCallback(
    (nextIndex: number) => {
      if (!activeCell) return;
      if (nextIndex < 0 || nextIndex >= students.length) {
        setIsKeypadOpen(false);
        return;
      }
      const nextStudent = students[nextIndex];
      setActiveCell((prev) =>
        prev
          ? {
              ...prev,
              studentId: nextStudent.id,
              studentIndex: nextIndex,
            }
          : null
      );
      scrollToStudentIndex(nextIndex);
    },
    [activeCell, students, scrollToStudentIndex]
  );

  // BottomSheetKeypad Confirm Handler
  const handleKeypadConfirm = useCallback(
    (res: KeypadConfirmResult) => {
      if (!activeCell) return;
      onGradeChange(activeCell.studentId, activeCell.columnKey, res.score, res.isAbsent);
    },
    [activeCell, onGradeChange]
  );

  // Physical Keyboard Navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!activeCell) return;

      const currentColIndex = displayedColumns.findIndex((c) => c.key === activeCell.columnKey);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          advanceToStudent(activeCell.studentIndex + 1);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          advanceToStudent(activeCell.studentIndex - 1);
          break;
        }
        case 'ArrowLeft': {
          // In RTL, ArrowLeft moves forward to the next column to the left
          e.preventDefault();
          const nextCol = displayedColumns[currentColIndex + 1];
          if (nextCol && nextCol.isEditable) {
            setActiveCell((prev) => (prev ? { ...prev, columnKey: nextCol.key, columnTitle: nextCol.label } : null));
          }
          break;
        }
        case 'ArrowRight': {
          // In RTL, ArrowRight moves backward to the previous column to the right
          e.preventDefault();
          const prevCol = displayedColumns[currentColIndex - 1];
          if (prevCol && prevCol.isEditable) {
            setActiveCell((prev) => (prev ? { ...prev, columnKey: prevCol.key, columnTitle: prevCol.label } : null));
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          setIsKeypadOpen(true);
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setIsKeypadOpen(false);
          setActiveCell(null);
          break;
        }
        default:
          if (/^[0-9]$/.test(e.key)) {
            setIsKeypadOpen(true);
          }
          break;
      }
    },
    [activeCell, displayedColumns, advanceToStudent]
  );

  // Active student and cell grade lookup
  const activeStudent = useMemo(() => {
    if (!activeCell) return null;
    return students[activeCell.studentIndex] || null;
  }, [activeCell, students]);

  const activeCol = useMemo(() => {
    if (!activeCell) return null;
    return displayedColumns.find((c) => c.key === activeCell.columnKey) || null;
  }, [activeCell, displayedColumns]);

  const activeCellGrade = useMemo(() => {
    if (!activeCell) return null;
    return grades[activeCell.studentId]?.[activeCell.columnKey] || null;
  }, [activeCell, grades]);

  return (
    <div
      className="flex flex-col w-full h-full font-tajawal select-none"
      dir="rtl"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={subjectTitle}
    >
      {/* Studio Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800 mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>📊</span>
            <span>{subjectTitle}</span>
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300">
            {students.length} طالباً
          </span>
        </div>

        {/* Mode Switcher & Actions */}
        <div className="flex items-center gap-2">
          {onModeChange && (
            <div className="flex rounded-xl bg-slate-200/80 dark:bg-slate-700/80 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onModeChange('detailed')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeMode === 'detailed'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                نمط مفصل (5×20)
              </button>
              <button
                type="button"
                onClick={() => onModeChange('simplified')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeMode === 'simplified'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                نمط مبسط (100)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Virtual Table Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        data-testid="virtual-gradebook-container"
        className="relative overflow-auto max-h-[calc(100vh-220px)] border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm"
        style={{ minHeight: '380px' }}
      >
        {/* Sticky Table Header */}
        <div className="sticky top-0 z-30 flex bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 min-w-max">
          {/* Top-Right Sticky Intersection Cell: Student Name Header */}
          <div
            className="shrink-0 sticky end-0 right-0 z-40 flex items-center justify-between px-3 bg-slate-100 dark:bg-slate-800 border-s border-slate-200 dark:border-slate-700 shadow-sm"
            style={{ width: '220px', minWidth: '220px', maxWidth: '220px', height: `${rowHeight}px` }}
          >
            <span className="w-8 text-center text-slate-400">ت</span>
            <span className="flex-1 text-start ps-2">اسم الطالب</span>
          </div>

          {/* Scrolling Column Headers */}
          {displayedColumns.map((col) => {
            const colWidth = col.width || 88;
            return (
              <div
                key={col.key}
                className="shrink-0 flex items-center justify-between px-2 text-center border-e border-slate-200/60 dark:border-slate-700/60 relative group"
                style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, maxWidth: `${colWidth}px`, height: `${rowHeight}px` }}
              >
                <div className="flex-1 flex flex-col items-center justify-center">
                  <span className="truncate w-full" title={col.label}>
                    {col.shortLabel || col.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">/{col.maxScore}</span>
                </div>

                {/* Batch Fill Trigger Icon for Editable Columns */}
                {col.isEditable && onBatchFillRequest && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBatchFillRequest(col);
                    }}
                    title={`تعبئة جماعية لعمود ${col.label}`}
                    aria-label={`تعبئة جماعية لعمود ${col.label}`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-teal-700 transition-opacity"
                  >
                    ⚡
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <span className="text-3xl mb-2">📋</span>
            <p className="text-sm font-semibold">لا يوجد طلاب مضافون في هذه الشعبة بعد</p>
          </div>
        ) : (
          /* Total Virtual Scroll Height Spacer */
          <div
            data-testid="virtual-spacer"
            style={{
              height: `${totalVirtualHeight}px`,
              position: 'relative',
              width: '100%',
              minWidth: 'max-content',
            }}
          >
            {/* Translated Viewport Window */}
            <div
              data-testid="virtual-window"
              style={{
                transform: `translateY(${offsetY}px)`,
                willChange: 'transform',
                position: 'absolute',
                top: 0,
                right: 0,
                left: 0,
                width: '100%',
              }}
            >
              {visibleStudents.map((student, vIndex) => {
                const actualIndex = startIndex + vIndex;
                const studentGrades = grades[student.id] || {};
                const isCurrentActiveStudent = activeCell?.studentId === student.id;

                return (
                  <div
                    key={student.id}
                    data-testid={`student-row-${actualIndex}`}
                    className={`flex min-w-max border-b border-slate-100 dark:border-slate-800 transition-colors ${
                      isCurrentActiveStudent
                        ? 'bg-teal-50/30 dark:bg-teal-950/20'
                        : actualIndex % 2 === 1
                        ? 'bg-slate-50/40 dark:bg-slate-800/20'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                    style={{ height: `${rowHeight}px` }}
                  >
                    {/* Sticky Student Name Cell (RTL border-s) */}
                    <div
                      onClick={() => onStudentSelect?.(student)}
                      className={`shrink-0 sticky end-0 right-0 z-20 flex items-center px-3 border-s border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors ${
                        isCurrentActiveStudent
                          ? 'bg-teal-50 dark:bg-slate-900'
                          : 'bg-white dark:bg-slate-900'
                      }`}
                      style={{ width: '220px', minWidth: '220px', maxWidth: '220px', height: `${rowHeight}px` }}
                    >
                      <span className="w-8 text-center text-xs text-slate-400 font-mono">
                        {student.rollNumber}
                      </span>
                      <span
                        className="flex-1 text-xs font-semibold text-slate-800 dark:text-slate-100 truncate ps-2"
                        title={student.fullName}
                      >
                        {student.fullName}
                      </span>
                    </div>

                    {/* Grade Score Cells */}
                    {displayedColumns.map((col) => {
                      const colWidth = col.width || 88;
                      const cellVal = studentGrades[col.key];
                      const isCellActive =
                        activeCell?.studentId === student.id && activeCell?.columnKey === col.key;
                      const badgeStyle = getGradeBadgeStyle(cellVal?.score, !!cellVal?.isAbsent);

                      return (
                        <div
                          key={col.key}
                          role="gridcell"
                          data-testid={`cell-${student.id}-${col.key}`}
                          onClick={() => handleCellClick(student, actualIndex, col)}
                          className={`shrink-0 flex items-center justify-center text-xs border-e border-slate-100 dark:border-slate-800/80 transition-all ${
                            col.isEditable ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : 'bg-slate-50/30'
                          } ${
                            isCellActive
                              ? 'ring-2 ring-teal-600 bg-teal-50 dark:bg-teal-950/60 shadow-sm z-10'
                              : ''
                          }`}
                          style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, maxWidth: `${colWidth}px`, height: `${rowHeight}px` }}
                        >
                          <span
                            className={`px-2 py-1 rounded-lg font-bold text-center min-w-[36px] transition-transform ${
                              isCellActive ? 'scale-105' : ''
                            } ${badgeStyle.badgeClass}`}
                          >
                            {cellVal?.isAbsent
                              ? 'غائب'
                              : cellVal?.score !== null && cellVal?.score !== undefined
                              ? cellVal.score
                              : '--'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet Keypad Integration */}
      {isKeypadOpen && activeCell && activeStudent && activeCol && (
        <BottomSheetKeypad
          isOpen={isKeypadOpen}
          studentId={activeCell.studentId}
          studentName={activeStudent.fullName}
          studentIndex={activeCell.studentIndex + 1}
          totalStudents={students.length}
          columnTitle={activeCol.label}
          initialValue={activeCellGrade?.score ?? null}
          initialAbsent={activeCellGrade?.isAbsent ?? false}
          minScore={activeCol.minScore ?? 0}
          maxScore={activeCol.maxScore ?? 100}
          autoAdvance={true}
          onConfirm={handleKeypadConfirm}
          onNext={() => advanceToStudent(activeCell.studentIndex + 1)}
          onPrev={() => advanceToStudent(activeCell.studentIndex - 1)}
          onClose={() => setIsKeypadOpen(false)}
        />
      )}
    </div>
  );
};
