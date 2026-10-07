/**
 * useBatchRollback - State hook for atomic batch operations with 8-second linear undo
 * Integrates directly with ToastContext (undoDurationMs: 8000) and tracks mutations for rotating backup.
 */

import { useCallback, useRef } from 'react';
import { useToast } from '../common/Toast.js';
import type { BatchSnapshot } from './BatchFillModal.js';

export interface UseBatchRollbackOptions {
  onApplyUpdates: (updates: Array<{ studentId: string; newValue: number | null }>) => Promise<void> | void;
  onRecordMutations?: (count: number) => void;
}

export function useBatchRollback({ onApplyUpdates, onRecordMutations }: UseBatchRollbackOptions) {
  const { showUndoToast, showToast } = useToast();
  const activeSnapshotRef = useRef<BatchSnapshot | null>(null);

  const executeBatchWithUndo = useCallback(
    async ({
      snapshot,
      updatedRows,
      columnLabel,
    }: {
      snapshot: BatchSnapshot;
      updatedRows: Array<{ studentId: string; newValue: number | null }>;
      columnLabel: string;
    }) => {
      // 1. Store snapshot reference
      activeSnapshotRef.current = snapshot;

      // 2. Apply updates
      await onApplyUpdates(updatedRows);

      // 3. Record mutations for OPFS backup threshold check (T3.05)
      if (onRecordMutations) {
        onRecordMutations(snapshot.affectedCount);
      }

      // 4. Trigger 8-second countdown Toast (T1.14.2)
      showUndoToast({
        message: `تمت تعبئة ${columnLabel} لـ ${snapshot.affectedCount} طالباً`,
        undoDurationMs: 8000,
        onUndo: async () => {
          const snap = activeSnapshotRef.current;
          if (!snap) return;

          // Instant rollback to previous snapshot values (T1.14.3)
          const rollbackUpdates = snap.previousRows.map((r) => ({
            studentId: r.studentId,
            newValue: r.value,
          }));

          await onApplyUpdates(rollbackUpdates);

          if (onRecordMutations) {
            onRecordMutations(snap.affectedCount);
          }

          activeSnapshotRef.current = null;
          showToast({
            message: 'تم التراجع عن التعديل الجماعي بنجاح',
            type: 'info',
            durationMs: 3000,
          });
        },
        onExpire: () => {
          // Invalidate and discard snapshot memory on expiration (T1.14.4)
          activeSnapshotRef.current = null;
        },
      });
    },
    [onApplyUpdates, onRecordMutations, showUndoToast, showToast]
  );

  return {
    executeBatchWithUndo,
    getActiveSnapshot: () => activeSnapshotRef.current,
  };
}
