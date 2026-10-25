/**
 * @techeeer/contracts
 * Shared data entities, Outbox Sync contracts (Section 7 & 13), and AI schemas (Section 11).
 */
export * from './ai.js';
export type SyncEntityType = 'AcademicYear' | 'Class' | 'Student' | 'GradeCell' | 'PeriodLock' | 'DailyEvent' | 'Timetable' | 'LessonPlan' | 'Question' | 'Exam' | 'MarkEntry';
export type OutboxOperationType = 'upsert' | 'delete' | 'append';
export interface OutboxOperation<TPayload = Record<string, unknown>> {
    opId: string;
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
export declare function computeSyncIndicatorStatus(pendingOpsCount: number, oldestUnsyncedTimestampMs: number | null, nowMs?: number, amberDays?: number, redDays?: number): {
    color: SyncHealthStatus;
    pendingOpsCount: number;
    daysUnsynced: number;
};
//# sourceMappingURL=index.d.ts.map