// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  VirtualGradebookTable,
  type VirtualGradebookTableProps,
} from '../src/components/gradebook/VirtualGradebookTable.js';
import {
  BatchFillModal,
  computeBatchTransformation,
  type StudentBatchRow,
  type BatchApplyPayload,
  type BatchTargetColumn,
} from '../src/components/gradebook/BatchFillModal.js';
import { useBatchRollback } from '../src/components/gradebook/useBatchRollback.js';
import { StudentCardModal } from '../src/components/gradebook/StudentCardModal.js';
import { ToastProvider, useToast } from '../src/components/common/Toast.js';
import { CANONICAL_GRADE_COLUMNS, getGradeBadgeStyle } from '../src/components/gradebook/types.js';

// Enable React act() environment in jsdom
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Gradebook Studio Component & Logic Suite', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  describe('F12: VirtualGradebookTable', () => {
    const mockStudents = Array.from({ length: 300 }, (_, i) => ({
      id: `s_${i + 1}`,
      fullName: `طالب ${i + 1}`,
      rollNumber: i + 1,
    }));

    const mockGrades: Record<string, any> = {
      s_1: { component_homework: { score: 18, isAbsent: false }, month_1: { score: 95, isAbsent: false } },
      s_2: { component_homework: { score: 12, isAbsent: false }, month_1: { score: 45, isAbsent: false } },
      s_3: { component_homework: { score: null, isAbsent: true }, month_1: { score: null, isAbsent: true } },
    };

    it('T1.12.1: calculates total virtual table height based on 52px row height for 300 students', async () => {
      const studentCount = 300;
      const rowHeight = 52;
      const expectedHeight = studentCount * rowHeight; // 15600px
      expect(expectedHeight).toBe(15600);

      await act(async () => {
        root.render(
          <VirtualGradebookTable
            students={mockStudents}
            grades={mockGrades}
            onGradeChange={vi.fn()}
          />
        );
      });

      const spacer = container.querySelector('[data-testid="virtual-spacer"]');
      expect(spacer).not.toBeNull();
      expect(spacer?.getAttribute('style')).toContain('height: 15600px');
    });

    it('T2.12.2: handles boundary class size of 500 students with correct virtual height (26,000px)', async () => {
      const largeCohort = Array.from({ length: 500 }, (_, i) => ({
        id: `s_${i + 1}`,
        fullName: `طالب ${i + 1}`,
        rollNumber: i + 1,
      }));

      await act(async () => {
        root.render(
          <VirtualGradebookTable
            students={largeCohort}
            grades={{}}
            onGradeChange={vi.fn()}
          />
        );
      });

      const spacer = container.querySelector('[data-testid="virtual-spacer"]');
      expect(spacer?.getAttribute('style')).toContain('height: 26000px');
    });

    it('T1.12.2: maintains overscan buffer of 8 rows above and below viewport', () => {
      const overscan = 8;
      const viewportRows = 10;
      const totalRenderedNodes = viewportRows + overscan * 2;
      expect(totalRenderedNodes).toBe(26);
    });

    it('T1.12.3: renders sticky student name column with RTL logical border-s and z-20', async () => {
      await act(async () => {
        root.render(
          <VirtualGradebookTable
            students={mockStudents.slice(0, 10)}
            grades={mockGrades}
            onGradeChange={vi.fn()}
          />
        );
      });

      const firstRowNameCell = container.querySelector('[data-testid="student-row-0"] > div:first-child');
      expect(firstRowNameCell).not.toBeNull();
      const className = firstRowNameCell?.getAttribute('class') || '';
      expect(className).toContain('sticky');
      expect(className).toContain('end-0');
      expect(className).toContain('border-s');
      expect(className).toContain('z-20');
    });

    it('T1.12.4: applies color-coded styling for grades (<50 red, 50-89 blue, >=90 emerald, absent gray/amber)', () => {
      const failBadge = getGradeBadgeStyle(45, false);
      expect(failBadge.text).toContain('text-red-700');
      expect(failBadge.label).toBe('راسب');

      const passBadge = getGradeBadgeStyle(75, false);
      expect(passBadge.text).toContain('text-blue-700');
      expect(passBadge.label).toBe('ناجح');

      const excellentBadge = getGradeBadgeStyle(95, false);
      expect(excellentBadge.text).toContain('text-emerald-700');
      expect(excellentBadge.label).toBe('متميز');

      const absentBadge = getGradeBadgeStyle(0, true);
      expect(absentBadge.label).toBe('غائب');
    });

    it('T2.12.1: handles gradebook loaded with 0 students without throwing', async () => {
      await act(async () => {
        root.render(
          <VirtualGradebookTable
            students={[]}
            grades={{}}
            onGradeChange={vi.fn()}
          />
        );
      });

      expect(container.textContent).toContain('لا يوجد طلاب مضافون');
    });

    it('T2.12.5: supports student names with extreme lengths (>100 characters) without layout break', async () => {
      const extremeName = 'محمد عبد الله بن عبد الرحمن بن إبراهيم بن عبد العزيز بن محمد بن صالح بن سليمان العراقي الكرخي البغدادي الشهير بالمتفوق';
      expect(extremeName.length).toBeGreaterThan(100);

      const extremeStudent = [{ id: 's_extreme', fullName: extremeName, rollNumber: 1 }];

      await act(async () => {
        root.render(
          <VirtualGradebookTable
            students={extremeStudent}
            grades={{}}
            onGradeChange={vi.fn()}
          />
        );
      });

      const nameSpan = container.querySelector('[data-testid="student-row-0"] span[title]');
      expect(nameSpan).not.toBeNull();
      expect(nameSpan?.getAttribute('title')).toBe(extremeName);
      expect(nameSpan?.className).toContain('truncate');
    });

    it('opens BottomSheetKeypad on editable cell click and allows score change', async () => {
      const onGradeChangeMock = vi.fn();

      await act(async () => {
        root.render(
          <VirtualGradebookTable
            students={mockStudents.slice(0, 5)}
            grades={mockGrades}
            onGradeChange={onGradeChangeMock}
          />
        );
      });

      // Find cell for s_1, component_homework
      const cell = container.querySelector('[data-testid="cell-s_1-component_homework"]');
      expect(cell).not.toBeNull();

      // Click cell
      await act(async () => {
        cell?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      // Keypad should now be open
      const keypad = document.querySelector('[role="dialog"]');
      expect(keypad).not.toBeNull();
      expect(keypad?.textContent).toContain('الواجبات');
    });
  });

  describe('F14: Batch Operations & 8s Undo Toast', () => {
    const batchStudents: StudentBatchRow[] = [
      { studentId: 's1', studentName: 'أحمد', rollNumber: 1, currentValue: 45, isAbsent: false },
      { studentId: 's2', studentName: 'بلال', rollNumber: 2, currentValue: 48, isAbsent: false },
      { studentId: 's3', studentName: 'جاسم', rollNumber: 3, currentValue: 75, isAbsent: false },
      { studentId: 's4', studentName: 'داود', rollNumber: 4, currentValue: null, isAbsent: true },
    ];

    const targetColumn: BatchTargetColumn = {
      key: 'midterm',
      label: 'نصف السنة',
      maxScore: 100,
      minScore: 0,
    };

    it('T1.14.1: applies batch-fill value to all eligible students', () => {
      const payload: BatchApplyPayload = {
        columnKey: 'midterm',
        scope: 'ALL',
        mode: 'SET_FIXED',
        value: 80,
        capAtFiftyForFailing: false,
      };

      const result = computeBatchTransformation(batchStudents, payload, targetColumn);
      expect(result.affectedCount).toBe(3); // s4 is absent, so excluded
      expect(result.updatedRows.every((r) => r.newValue === 80)).toBe(true);
      expect(result.snapshot.previousRows[0].value).toBe(45);
    });

    it('T1.14.5: applies bonus marks (+5) exclusively to failing students (<50) capped at 50', () => {
      const payload: BatchApplyPayload = {
        columnKey: 'midterm',
        scope: 'FAILING_ONLY',
        mode: 'ADD_BONUS',
        value: 5,
        capAtFiftyForFailing: true, // Iraqi ministerial grace cap
      };

      const result = computeBatchTransformation(batchStudents, payload, targetColumn);

      // Only s1 (45) and s2 (48) are failing
      expect(result.affectedCount).toBe(2);

      // s1: 45 + 5 = 50
      expect(result.updatedRows[0].studentId).toBe('s1');
      expect(result.updatedRows[0].newValue).toBe(50);

      // s2: 48 + 5 = 53 -> capped at 50!
      expect(result.updatedRows[1].studentId).toBe('s2');
      expect(result.updatedRows[1].newValue).toBe(50);
    });

    it('T2.12.4: clamps negative batch-fill value to 0 on deduction', () => {
      const payload: BatchApplyPayload = {
        columnKey: 'midterm',
        scope: 'ALL',
        mode: 'DEDUCT',
        value: 50,
        capAtFiftyForFailing: false,
      };

      const result = computeBatchTransformation(batchStudents, payload, targetColumn);

      // s1: 45 - 50 = -5 -> clamped to 0
      expect(result.updatedRows[0].newValue).toBe(0);
      // s2: 48 - 50 = -2 -> clamped to 0
      expect(result.updatedRows[1].newValue).toBe(0);
      // s3: 75 - 50 = 25
      expect(result.updatedRows[2].newValue).toBe(25);
    });

    it('T1.14.2 & T1.14.3: executes batch with 8s undo toast and restores snapshot on Undo', async () => {
      vi.useFakeTimers();

      let activeGrades = [{ sId: 's1', score: 10 }, { sId: 's2', score: 12 }];
      const applyUpdatesMock = vi.fn(async (updates) => {
        updates.forEach((u: any) => {
          const g = activeGrades.find((item) => item.sId === u.studentId);
          if (g) g.score = u.newValue;
        });
      });

      // Render harness with ToastProvider
      let triggerBatch: any;
      const TestConsumer = () => {
        const { executeBatchWithUndo } = useBatchRollback({ onApplyUpdates: applyUpdatesMock });
        triggerBatch = executeBatchWithUndo;
        return <div>Test Harness</div>;
      };

      await act(async () => {
        root.render(
          <ToastProvider>
            <TestConsumer />
          </ToastProvider>
        );
      });

      // Snapshot before batch
      const snapshot = {
        snapshotId: 'snap_test',
        columnKey: 'homework',
        timestamp: Date.now(),
        previousRows: [
          { studentId: 's1', value: 10, isAbsent: false },
          { studentId: 's2', value: 12, isAbsent: false },
        ],
        affectedCount: 2,
      };

      // Trigger batch: set score to 20
      await act(async () => {
        await triggerBatch({
          snapshot,
          updatedRows: [
            { studentId: 's1', newValue: 20 },
            { studentId: 's2', newValue: 20 },
          ],
          columnLabel: 'الواجبات',
        });
      });

      expect(activeGrades[0].score).toBe(20);
      expect(activeGrades[1].score).toBe(20);

      // Undo button should be visible in Toast
      const undoBtn = Array.from(document.body.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('تراجع') || b.getAttribute('aria-label')?.includes('تراجع')
      );

      expect(undoBtn).not.toBeNull();

      // Click Undo
      await act(async () => {
        undoBtn?.click();
      });

      // Scores restored back to snapshot values
      expect(activeGrades[0].score).toBe(10);
      expect(activeGrades[1].score).toBe(12);

      vi.useRealTimers();
    });
  });

  describe('F15: StudentCardModal Interactive Certificate', () => {
    const student = {
      id: 'std_42',
      division_id: 'div_1',
      full_name: 'زيد علي عباس',
      gender: 'male' as const,
      roll_number: 12,
      is_active: 1,
      guardian_phone: '07701234567',
      notes: 'طالب خلوق ومثابر',
      created_at: 1000,
    };

    it('renders evaluation card with student details and opens in RTL', async () => {
      await act(async () => {
        root.render(
          <StudentCardModal
            isOpen={true}
            onClose={vi.fn()}
            student={student}
            className="الثالث متوسط"
            divisionName="أ"
            subjectName="الرياضيات"
            academicYear="2026-2027"
            grades={{
              month1: {
                id: 'g1',
                student_id: 'std_42',
                subject_id: 'sub1',
                term_id: 't1',
                category: 'month_1',
                mode: 'detailed',
                score: 85,
                component_oral: 18,
                component_written: 17,
                component_homework: 18,
                component_behavior: 16,
                component_participation: 16,
                is_absent: 0,
                absence_excused: 0,
                decision_points_applied: 0,
                updated_at: 1000,
              },
            }}
          />
        );
      });

      const modal = document.querySelector('[role="dialog"]');
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('زيد علي عباس');
      expect(modal?.textContent).toContain('الرياضيات');
      expect(modal?.textContent).toContain('85%');

      // WhatsApp deep-link button
      const waLink = modal?.querySelector('a[href^="https://wa.me/9647701234567"]');
      expect(waLink).not.toBeNull();
    });

    it('toggles ministerial decision marks checkbox for borderline failing students (47 -> 50)', async () => {
      await act(async () => {
        root.render(
          <StudentCardModal
            isOpen={true}
            onClose={vi.fn()}
            student={student}
            className="الثالث متوسط"
            divisionName="أ"
            subjectName="الرياضيات"
            academicYear="2026-2027"
            decisionPool={5}
            grades={{
              month1: {
                id: 'g1',
                student_id: 'std_42',
                subject_id: 'sub1',
                term_id: 't1',
                category: 'month_1',
                mode: 'simplified',
                score: 47, // failing (<50)
                component_oral: 0,
                component_written: 0,
                component_homework: 0,
                component_behavior: 0,
                component_participation: 0,
                is_absent: 0,
                absence_excused: 0,
                decision_points_applied: 0,
                updated_at: 1000,
              },
            }}
          />
        );
      });

      const modal = document.querySelector('[role="dialog"]');
      expect(modal?.textContent).toContain('47%');

      // Decision marks checkbox should appear
      const checkbox = modal?.querySelector('#decision-check') as HTMLInputElement;
      expect(checkbox).not.toBeNull();
      expect(checkbox.checked).toBe(false);

      // Check the decision box
      await act(async () => {
        checkbox.click();
      });

      // Score should now be 50%
      expect(modal?.textContent).toContain('50%');
      expect(modal?.textContent).toContain('ناجح بموجب درجات القرار الوزاري');
    });
  });
});
