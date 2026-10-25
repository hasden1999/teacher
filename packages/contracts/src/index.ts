/**
 * @techeeer/contracts
 * Shared data entities, Outbox Sync contracts (Section 7 & 13), and AI schemas (Section 11).
 */

export * from './ai.js';

export type SyncEntityType =
  | 'AcademicYear'
  | 'Class'
  | 'Student'
  | 'GradeCell'
  | 'PeriodLock'
  | 'DailyEvent'
  | 'Timetable'
  | 'LessonPlan'
  | 'Question'
  | 'Exam'
  | 'MarkEntry';

export type OutboxOperationType = 'upsert' | 'delete' | 'append';

export interface OutboxOperation<TPayload = Record<string, unknown>> {
  opId: string; // UUID v4 idempotency key
  entityType: SyncEntityType;
  entityId: string;
  opType: OutboxOperationType;
  payload: TPayload;
  deviceId: string;
  opVersion: number;
  createdAt: number;
}

export interface SyncPushRequest {
  appVersion: string;
  schemaVersion: number;
  deviceId: string;
  operations: OutboxOperation[];
}

export interface SyncPushResponse {
  acceptedOpIds: string[];
  conflicts: Array<{
    opId: string;
    entityType: SyncEntityType;
    entityId: string;
    serverValue: unknown;
    clientValue: unknown;
    resolvedAt: number;
  }>;
  serverCursor: string;
}

export type SyncHealthStatus = 'green' | 'amber' | 'red';

/**
 * Section 7.4: Computes sync health indicator color from days of unsynced changes.
 * < 3 days -> green, 3..6 days -> amber, >= 7 days -> red.
 */
export function computeSyncIndicatorStatus(
  pendingOpsCount: number,
  oldestUnsyncedTimestampMs: number | null,
  nowMs: number = Date.now(),
  amberDays = 3,
  redDays = 7
): { color: SyncHealthStatus; pendingOpsCount: number; daysUnsynced: number } {
  if (pendingOpsCount <= 0 || oldestUnsyncedTimestampMs === null) {
    return { color: 'green', pendingOpsCount: 0, daysUnsynced: 0 };
  }
  const diffMs = Math.max(0, nowMs - oldestUnsyncedTimestampMs);
  const daysUnsynced = diffMs / (1000 * 60 * 60 * 24);
  if (daysUnsynced >= redDays) {
    return { color: 'red', pendingOpsCount, daysUnsynced: Number(daysUnsynced.toFixed(1)) };
  }
  if (daysUnsynced >= amberDays) {
    return { color: 'amber', pendingOpsCount, daysUnsynced: Number(daysUnsynced.toFixed(1)) };
  }
  return { color: 'green', pendingOpsCount, daysUnsynced: Number(daysUnsynced.toFixed(1)) };
}
