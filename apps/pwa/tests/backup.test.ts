import { describe, it, expect } from 'vitest';
import {
  validateSqliteHeader,
  SQLITE_MAGIC_HEADER,
  isMutationSql,
  MutationTracker,
  BackupEngine,
  InMemoryBackupStorageAdapter,
  formatSlotFilename,
} from '../src/worker/backup.js';

function createValidSqliteBuffer(size = 1024): Uint8Array {
  const buf = new Uint8Array(size);
  buf.set(SQLITE_MAGIC_HEADER, 0);
  buf[16] = 0x10; // 4096 page size high byte
  buf[17] = 0x00;
  return buf;
}

describe('Automated 7-Snapshot Backup & 4-Stage Safe Restore Engine', () => {
  describe('Stage 1 & 2: Header Validation & Magic Bytes', () => {
    it('T2.13.1: should reject buffer smaller than 512 bytes with SIZE error', () => {
      const smallBuf = new Uint8Array(511);
      smallBuf.set(SQLITE_MAGIC_HEADER, 0);
      const res = validateSqliteHeader(smallBuf);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('512 bytes');
    });

    it('T2.13.2: should accept valid 512-byte buffer with exact SQLite magic header', () => {
      const validBuf = createValidSqliteBuffer(512);
      const res = validateSqliteHeader(validBuf);
      expect(res.valid).toBe(true);
      expect(res.pageSize).toBeDefined();
    });

    it('T2.13.3: should reject corrupted 16th byte with MAGIC_HEADER error', () => {
      const corruptedBuf = createValidSqliteBuffer(1024);
      corruptedBuf[15] = 0x01; // corrupted null terminator
      const res = validateSqliteHeader(corruptedBuf);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('magic header');
    });

    it('T2.13.4: should reject zeroed first byte with MAGIC_HEADER error', () => {
      const corruptedBuf = createValidSqliteBuffer(1024);
      corruptedBuf[0] = 0x00; // was 0x53 ('S')
      const res = validateSqliteHeader(corruptedBuf);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('magic header');
    });
  });

  describe('MutationTracker & Automated Triggers', () => {
    it('T2.21.1: 49 mutations should NOT trigger automated backup', () => {
      const tracker = new MutationTracker(50);
      const triggered = tracker.recordMutation(49);
      expect(triggered).toBe(false);
      expect(tracker.getMutationCount()).toBe(49);
    });

    it('T2.21.2: 50th mutation triggers backup and resets counter to 0', () => {
      const tracker = new MutationTracker(50);
      tracker.recordMutation(49);
      const triggered = tracker.recordMutation(1);
      expect(triggered).toBe(true);
      expect(tracker.getMutationCount()).toBe(0);
    });

    it('should trigger on 24 hours elapsed time check', () => {
      const tracker = new MutationTracker(50, 86400000);
      const pastTime = Date.now() - 90000000; // > 24 hours ago
      tracker.setLastBackupTimestamp(pastTime);

      const triggered = tracker.checkTimeElapsed(Date.now());
      expect(triggered).toBe(true);
    });

    it('should identify mutating SQL statements accurately', () => {
      expect(isMutationSql('INSERT INTO students (id) VALUES ("s1");')).toBe(true);
      expect(isMutationSql('UPDATE students SET full_name = "Ali";')).toBe(true);
      expect(isMutationSql('DELETE FROM students WHERE id = "s1";')).toBe(true);
      expect(isMutationSql('CREATE TABLE temp (id TEXT);')).toBe(true);
      expect(isMutationSql('DROP TABLE temp;')).toBe(true);
      expect(isMutationSql('ALTER TABLE students ADD COLUMN age INTEGER;')).toBe(true);

      // Non-mutating
      expect(isMutationSql('SELECT * FROM students;')).toBe(false);
      expect(isMutationSql('PRAGMA integrity_check;')).toBe(false);
    });
  });

  describe('Rotating 7-Snapshot Backup Rotation & FIFO Retention', () => {
    it('T2.21.4: should retain exactly 7 snapshots with FIFO purge when 8th snapshot is added', async () => {
      const storage = new InMemoryBackupStorageAdapter();
      const engine = new BackupEngine(storage, { maxSlots: 7, mutationThreshold: 50 });
      await engine.init();

      // Create 8 snapshots
      for (let i = 0; i < 8; i++) {
        const dummyData = createValidSqliteBuffer(1024 + i * 10);
        await engine.createSnapshot('manual', dummyData);
      }

      const snapshots = engine.getSnapshots();
      expect(snapshots).toHaveLength(7); // Capped at 7
      expect(engine.getSnapshotCount()).toBe(7);

      // Slot filenames should be formatted correctly
      expect(snapshots.every((s) => s.filename.startsWith('techeeer_backup_'))).toBe(true);
      expect(snapshots.every((s) => s.filename.endsWith('.sqlite3'))).toBe(true);
    });

    it('T2.21.5: manual backup creation does NOT alter or reset mutation counter', async () => {
      const storage = new InMemoryBackupStorageAdapter();
      const engine = new BackupEngine(storage, { maxSlots: 7, mutationThreshold: 50 });
      await engine.init();

      // Record 30 mutations
      await engine.recordMutation(30);
      expect(engine.getMutationCount()).toBe(30);

      // Trigger manual snapshot
      await engine.createSnapshot('manual');

      // Mutation count must remain 30!
      expect(engine.getMutationCount()).toBe(30);
    });

    it('should format slot filenames canonically', () => {
      for (let i = 0; i < 7; i++) {
        expect(formatSlotFilename(i)).toBe(`techeeer_backup_${i}.sqlite3`);
      }
    });
  });

  describe('4-Stage Safe Restore Pipeline', () => {
    it('T2.22.1: should fail Stage 3 INTEGRITY_CHECK on test corruption marker 0xFF at offset 16', async () => {
      const storage = new InMemoryBackupStorageAdapter();
      const engine = new BackupEngine(storage);
      await engine.init();

      const candidate = createValidSqliteBuffer(1024);
      candidate[16] = 0xff; // Oracle corruption test byte

      const result = await engine.restoreBackup(candidate);
      expect(result.success).toBe(false);
      expect(result.stageFailed).toBe('INTEGRITY_CHECK');
    });

    it('should complete full 4-stage restore successfully on valid candidate and reset tracker', async () => {
      const storage = new InMemoryBackupStorageAdapter();
      const engine = new BackupEngine(storage);
      await engine.init();

      await engine.recordMutation(25);
      expect(engine.getMutationCount()).toBe(25);

      const candidate = createValidSqliteBuffer(2048);
      const result = await engine.restoreBackup(candidate);

      expect(result.success).toBe(true);
      expect(result.stageFailed).toBeUndefined();
      expect(engine.getMutationCount()).toBe(0); // Reset on successful restore
    });

    it('should roll back safely if Stage 4 hot-swap fails', async () => {
      const storage = new InMemoryBackupStorageAdapter();
      const initialPrimary = createValidSqliteBuffer(1024);
      await storage.writePrimary(initialPrimary);

      const engine = new BackupEngine(storage);
      await engine.init();

      const candidate = createValidSqliteBuffer(2048);
      const failingHotSwap = async () => {
        throw new Error('DISK_LOCKED: Simulated hot-swap failure');
      };

      const result = await engine.restoreBackup(candidate, failingHotSwap);
      expect(result.success).toBe(false);
      expect(result.stageFailed).toBe('HOT_SWAP');
      expect(result.error).toContain('DISK_LOCKED');

      // Primary must have been restored from rollback!
      const primaryData = await storage.readPrimary();
      expect(primaryData.byteLength).toBe(1024);
    });
  });

  describe('Storage Adapter Methods & Manifest Persistence', () => {
    it('should test InMemoryBackupStorageAdapter slot reading, manifest, and listing', async () => {
      const storage = new InMemoryBackupStorageAdapter();
      await storage.init();

      expect(await storage.slotExists(0)).toBe(false);
      const testData = createValidSqliteBuffer(512);
      await storage.writeSlot(0, testData);
      expect(await storage.slotExists(0)).toBe(true);

      const readBack = await storage.readSlot(0);
      expect(readBack.byteLength).toBe(512);

      const files = await storage.listSlotFiles();
      expect(files).toContain('techeeer_backup_0.sqlite3');

      // Manifest
      expect(await storage.loadManifest()).toBeNull();
      await storage.saveManifest({
        version: 1,
        currentSlot: 0,
        mutationCounter: 10,
        lastBackupTimestamp: 123456,
        snapshots: [],
      });
      const loaded = await storage.loadManifest();
      expect(loaded?.currentSlot).toBe(0);
      expect(loaded?.mutationCounter).toBe(10);

      // Rollback delete
      await storage.deleteRollback();
    });

    it('should check periodic trigger in BackupEngine', async () => {
      const storage = new InMemoryBackupStorageAdapter();
      const engine = new BackupEngine(storage, { timeIntervalMs: 100 });
      await engine.init();

      // Immediately after init, no periodic trigger
      const noTrigger = await engine.checkPeriodicTrigger();
      expect(noTrigger).toBeNull();
    });
  });
});
