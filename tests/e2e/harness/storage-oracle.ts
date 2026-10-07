/**
 * Authoritative Storage & Backup Oracle
 * Models Dedicated Web Worker RPC Protocol, 16-byte SQLite magic header verification,
 * and 7-snapshot rolling backup / 4-stage safe restore pipeline.
 */

export type WorkerRequest =
  | { id: string; type: 'INIT'; payload: { dbName?: string } }
  | { id: string; type: 'EXEC'; payload: { sql: string; params?: unknown[] } }
  | { id: string; type: 'QUERY'; payload: { sql: string; params?: unknown[] } }
  | { id: string; type: 'TRANSACTION'; payload: { statements: Array<{ sql: string; params?: unknown[] }> } }
  | { id: string; type: 'BACKUP_CREATE'; payload?: Record<string, unknown> }
  | { id: string; type: 'BACKUP_RESTORE'; payload: { backupData: ArrayBuffer } }
  | { id: string; type: 'EXPORT_DB'; payload?: Record<string, unknown> };

export type WorkerResponse =
  | { id: string; success: true; data: unknown }
  | { id: string; success: false; error: string };

/**
 * Validates SQLite 3 16-byte magic header: "SQLite format 3\000"
 */
export function validateSqliteHeader(buffer: ArrayBuffer | Uint8Array): {
  valid: boolean;
  reason?: string;
} {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (bytes.byteLength < 512) {
    return { valid: false, reason: 'File smaller than minimum SQLite page size (512 bytes)' };
  }

  // Exact 16-byte ASCII header: "SQLite format 3\0"
  const expectedMagic = [
    0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66,
    0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00,
  ];

  for (let i = 0; i < 16; i++) {
    if (bytes[i] !== expectedMagic[i]) {
      return { valid: false, reason: 'Invalid SQLite 16-byte magic header' };
    }
  }

  return { valid: true };
}

/**
 * Creates a valid mock SQLite 3 binary file buffer for testing
 */
export function createMockSqliteBuffer(sizeBytes: number = 4096, customMagic?: number[]): Uint8Array {
  const buf = new Uint8Array(Math.max(512, sizeBytes));
  const magic = customMagic || [
    0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66,
    0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00,
  ];
  for (let i = 0; i < magic.length; i++) {
    buf[i] = magic[i];
  }
  return buf;
}

/**
 * In-memory Rolling Snapshot Backup Simulator
 * Maintains max 7 snapshots, deletes older snapshots when new ones arrive.
 */
export class RotatingBackupSimulator {
  private snapshots: Array<{ filename: string; timestamp: number; data: Uint8Array; mutations: number }> = [];
  private mutationCounter: number = 0;
  private snapshotCounter: number = 0;
  private readonly maxSnapshots: number = 7;
  private readonly mutationThreshold: number = 50;

  recordMutation(): boolean {
    this.mutationCounter++;
    if (this.mutationCounter >= this.mutationThreshold) {
      this.createSnapshot(createMockSqliteBuffer(4096));
      this.mutationCounter = 0;
      return true; // triggered automated backup
    }
    return false;
  }

  createSnapshot(data: Uint8Array): string {
    this.snapshotCounter++;
    const ts = Date.now();
    const filename = `techeeer_backup_${ts}_s${this.snapshotCounter}_m${this.mutationCounter}.sqlite3`;
    this.snapshots.push({
      filename,
      timestamp: ts,
      data,
      mutations: this.mutationCounter,
    });

    // Enforce 7-snapshot rolling retention (delete oldest)
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.splice(0, this.snapshots.length - this.maxSnapshots);
    }

    return filename;
  }

  getSnapshots() {
    return [...this.snapshots];
  }

  getSnapshotCount(): number {
    return this.snapshots.length;
  }

  getMutationCount(): number {
    return this.mutationCounter;
  }

  /**
   * 4-Stage Safe Restore Simulation
   */
  simulateRestore(backupData: ArrayBuffer): {
    success: boolean;
    stageFailed?: 'SIZE' | 'MAGIC_HEADER' | 'INTEGRITY_CHECK' | 'HOT_SWAP';
    error?: string;
  } {
    // Stage 1: Size validation (>= 512 bytes)
    if (backupData.byteLength < 512) {
      return { success: false, stageFailed: 'SIZE', error: 'File size below 512 bytes' };
    }

    // Stage 2: 16-byte magic header validation
    const headerCheck = validateSqliteHeader(backupData);
    if (!headerCheck.valid) {
      return { success: false, stageFailed: 'MAGIC_HEADER', error: headerCheck.reason };
    }

    // Stage 3: Sandboxed integrity check simulation
    // Reject if special test corruption byte is found at offset 16
    const view = new Uint8Array(backupData);
    if (view[16] === 0xFF) {
      return { success: false, stageFailed: 'INTEGRITY_CHECK', error: 'PRAGMA integrity_check failed' };
    }

    // Stage 4: Atomic Hot-Swap
    return { success: true };
  }
}
