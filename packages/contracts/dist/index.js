/**
 * @techeeer/contracts
 * Shared data entities, Outbox Sync contracts (Section 7 & 13), and AI schemas (Section 11).
 */
export * from './ai.js';
/**
 * Section 7.4: Computes sync health indicator color from days of unsynced changes.
 * < 3 days -> green, 3..6 days -> amber, >= 7 days -> red.
 */
export function computeSyncIndicatorStatus(pendingOpsCount, oldestUnsyncedTimestampMs, nowMs = Date.now(), amberDays = 3, redDays = 7) {
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
//# sourceMappingURL=index.js.map