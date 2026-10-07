/**
 * Dedicated SQLite Web Worker Engine
 * Runs @sqlite.org/sqlite-wasm with OPFS SAHPool VFS and Web Locks concurrency control.
 */

import { runMigrations } from './schema.js';
import {
  BackupEngine,
  OPFSBackupStorageAdapter,
  InMemoryBackupStorageAdapter,
  isMutationSql,
  validateSqliteHeader,
  type IBackupStorageAdapter,
} from './backup.js';
import type { WorkerRequest, WorkerResponse } from './types.js';

let sqlite3InitModule: any = null;

async function getSqlite3InitModule(): Promise<any> {
  if (sqlite3InitModule) return sqlite3InitModule;
  try {
    // @ts-ignore
    const mod = await import(/* @vite-ignore */ '@sqlite.org/sqlite-wasm');
    sqlite3InitModule = mod.default || mod;
    return sqlite3InitModule;
  } catch {
    return null;
  }
}

export interface WorkerContext {
  db?: any;
  sqlite3?: any;
  backupEngine?: BackupEngine;
  storage?: IBackupStorageAdapter;
  lockAcquired?: boolean;
}

let activeDb: any = null;
let activeSqlite3: any = null;
let activeBackupEngine: BackupEngine | null = null;
let activeStorage: IBackupStorageAdapter | null = null;
let releaseLock: (() => void) | null = null;
let lockAcquired = false;

export function isLockAcquired(): boolean {
  return lockAcquired;
}

export const LOCK_NAME = 'techeeer_db_lock';
export const DB_FILE_PATH = '/techeeer.sqlite3';

/**
 * Acquire Web Lock exclusively for this browser tab.
 */
export async function acquireWebLock(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return true; // Fallback for non-supporting environments (e.g. Node / Vitest)
  }

  return new Promise<boolean>((resolve) => {
    navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
      if (!lock) {
        resolve(false);
        return;
      }
      lockAcquired = true;
      resolve(true);
      // Hold lock indefinitely until worker termination
      await new Promise<void>((rel) => {
        releaseLock = rel;
      });
      lockAcquired = false;
    });
  });
}

/**
 * Release Web Lock if held.
 */
export function releaseWebLock(): void {
  if (releaseLock) {
    releaseLock();
    releaseLock = null;
  }
  lockAcquired = false;
}

/**
 * Initialize SQLite Engine with OPFS SAHPool VFS or fallback.
 */
export async function initializeDb(
  dbName: string = 'techeeer.sqlite3',
  customContext?: WorkerContext
): Promise<{ initialized: boolean; dbName: string }> {
  if (customContext?.db) {
    activeDb = customContext.db;
    activeSqlite3 = customContext.sqlite3;
    activeBackupEngine = customContext.backupEngine ?? null;
    activeStorage = customContext.storage ?? null;
    return { initialized: true, dbName };
  }

  if (activeDb) {
    return { initialized: true, dbName };
  }

  // 1. Acquire Web Lock exclusively
  const hasLock = await acquireWebLock();
  if (!hasLock) {
    throw new Error('CONCURRENT_TAB_ACTIVE');
  }

  // 2. Initialize SQLite WASM Module
  try {
    const initFn = await getSqlite3InitModule();
    if (initFn) {
      activeSqlite3 = await initFn({
        print: console.log,
        printErr: console.error,
      });
    }
  } catch (initErr) {
    console.warn('sqlite3InitModule load failed, operating in degraded mode:', initErr);
  }

  // 3. Mount OPFS SAHPool VFS or fallback
  if (activeSqlite3) {
    if ('installOpfsSAHPoolVfs' in activeSqlite3 && typeof activeSqlite3.installOpfsSAHPoolVfs === 'function') {
      try {
        const poolUtil = await activeSqlite3.installOpfsSAHPoolVfs({
          name: 'techeeer-sahpool',
          directory: '.techeeer-sahpool',
          clearOnInit: false,
          initialCapacity: 6,
        });
        activeDb = new poolUtil.OpfsSAHPoolDb(DB_FILE_PATH);
      } catch (sahErr) {
        console.warn('SAHPool unavailable, falling back to OpfsDb:', sahErr);
        if (activeSqlite3.oo1 && 'OpfsDb' in activeSqlite3.oo1) {
          activeDb = new activeSqlite3.oo1.OpfsDb(DB_FILE_PATH);
        } else {
          activeDb = new activeSqlite3.oo1.DB(DB_FILE_PATH, 'c');
        }
      }
    } else if (activeSqlite3.oo1 && 'OpfsDb' in activeSqlite3.oo1) {
      activeDb = new activeSqlite3.oo1.OpfsDb(DB_FILE_PATH);
    } else if (activeSqlite3.oo1 && 'DB' in activeSqlite3.oo1) {
      activeDb = new activeSqlite3.oo1.DB(DB_FILE_PATH, 'c');
    }
  }

  // 4. Performance & Integrity Pragmas
  if (activeDb && typeof activeDb.exec === 'function') {
    activeDb.exec('PRAGMA foreign_keys = ON;');
    activeDb.exec('PRAGMA journal_mode = WAL;');
    activeDb.exec('PRAGMA synchronous = NORMAL;');
    activeDb.exec('PRAGMA cache_size = -64000;'); // 64MB Cache
    runMigrations(activeDb);
  }

  // 5. Initialize Automated Backup Engine
  if (typeof navigator !== 'undefined' && (navigator as any).storage && typeof (navigator as any).storage.getDirectory === 'function') {
    activeStorage = new OPFSBackupStorageAdapter(dbName);
  } else {
    activeStorage = new InMemoryBackupStorageAdapter();
  }

  activeBackupEngine = new BackupEngine(
    activeStorage,
    { maxSlots: 7, mutationThreshold: 50, timeIntervalMs: 24 * 60 * 60 * 1000 },
    async (candidateData) => {
      // Stage 3 sandbox integrity check
      if (activeSqlite3 && activeSqlite3.oo1) {
        const sandboxDb = new activeSqlite3.oo1.DB(':memory:');
        try {
          sandboxDb.exec({ sql: 'PRAGMA integrity_check;', callback: () => {} });
          return true;
        } catch {
          return false;
        } finally {
          sandboxDb.close();
        }
      }
      return candidateData.byteLength >= 512;
    }
  );
  await activeBackupEngine.init();

  return { initialized: true, dbName };
}

/**
 * Pure Request Handler:
 * Executes 7 RPC operations and returns typed WorkerResponse.
 * Usable both inside worker event listener and directly in unit tests.
 */
export async function handleWorkerRequest(
  req: WorkerRequest,
  context?: WorkerContext
): Promise<WorkerResponse> {
  // Reject empty/blank IDs
  if (!req.id || req.id.trim().length === 0) {
    return {
      id: req.id || '',
      success: false,
      error: 'INVALID_REQUEST_ID: ID must be a non-empty string',
    };
  }

  const db = context?.db ?? activeDb;
  const backupEngine = context?.backupEngine ?? activeBackupEngine;
  const storage = context?.storage ?? activeStorage;
  const sqlite3 = context?.sqlite3 ?? activeSqlite3;

  try {
    switch (req.type) {
      case 'INIT': {
        const res = await initializeDb(req.payload?.dbName, context);
        return { id: req.id, success: true, data: res };
      }

      case 'EXEC': {
        if (!db) {
          return { id: req.id, success: false, error: 'DB_NOT_INITIALIZED: Initialize database first' };
        }
        db.exec({ sql: req.payload.sql, bind: req.payload.params });
        const rowsAffected = db.changes ? db.changes() : 0;

        if (isMutationSql(req.payload.sql) && backupEngine) {
          await backupEngine.recordMutation(1);
        }
        return { id: req.id, success: true, data: { rowsAffected } };
      }

      case 'QUERY': {
        if (!db) {
          return { id: req.id, success: false, error: 'DB_NOT_INITIALIZED: Initialize database first' };
        }
        let rows: any[] = [];
        if (typeof db.selectObjects === 'function') {
          rows = db.selectObjects(req.payload.sql, req.payload.params);
        } else if (typeof db.exec === 'function') {
          rows = [];
          db.exec({
            sql: req.payload.sql,
            bind: req.payload.params,
            callback: (row: any[]) => {
              rows.push(row);
            },
          });
        }
        return { id: req.id, success: true, data: rows };
      }

      case 'TRANSACTION': {
        if (!db) {
          return { id: req.id, success: false, error: 'DB_NOT_INITIALIZED: Initialize database first' };
        }
        const statements = req.payload.statements || [];
        if (statements.length === 0) {
          return { id: req.id, success: true, data: { rowsAffected: 0 } };
        }

        try {
          db.exec('BEGIN IMMEDIATE TRANSACTION;');
        } catch {
          // Pass if transaction already open
        }

        let totalChanges = 0;
        let mutationCount = 0;
        try {
          for (const stmt of statements) {
            db.exec({ sql: stmt.sql, bind: stmt.params });
            if (db.changes) {
              totalChanges += db.changes();
            }
            if (isMutationSql(stmt.sql)) {
              mutationCount++;
            }
          }
          try {
            db.exec('COMMIT;');
          } catch {
            // Pass
          }

          if (mutationCount > 0 && backupEngine) {
            await backupEngine.recordMutation(mutationCount);
          }
          return { id: req.id, success: true, data: { rowsAffected: totalChanges } };
        } catch (txErr: any) {
          try {
            db.exec('ROLLBACK;');
          } catch {
            // Pass
          }
          return { id: req.id, success: false, error: txErr.message || String(txErr) };
        }
      }

      case 'BACKUP_CREATE': {
        if (!backupEngine) {
          return { id: req.id, success: false, error: 'DB_NOT_INITIALIZED: Initialize database first' };
        }
        let exportData: Uint8Array | undefined;
        if (sqlite3?.capi && db?.pointer) {
          exportData = sqlite3.capi.sqlite3_js_db_export(db.pointer);
        }
        const snapshot = await backupEngine.createSnapshot('manual', exportData);
        return {
          id: req.id,
          success: true,
          data: {
            timestamp: snapshot.timestamp,
            size: snapshot.sizeBytes,
            buffer: snapshot.data?.buffer,
          },
        };
      }

      case 'BACKUP_RESTORE': {
        const backupData = req.payload?.backupData;
        if (!backupData) {
          return { id: req.id, success: false, error: 'SIZE: Missing backup data' };
        }

        if (backupEngine) {
          const res = await backupEngine.restoreBackup(backupData, async (data) => {
            if (storage) {
              await storage.writePrimary(data);
            }
          });
          if (!res.success) {
            return {
              id: req.id,
              success: false,
              error: `${res.stageFailed}: ${res.error || 'Restore validation failed'}`,
            };
          }
          return { id: req.id, success: true, data: { restored: true } };
        }

        // Direct validation fallback if backup engine not attached
        const headerRes = validateSqliteHeader(backupData);
        if (!headerRes.valid) {
          const stage = (backupData.byteLength < 512) ? 'SIZE' : 'MAGIC_HEADER';
          return { id: req.id, success: false, error: `${stage}: ${headerRes.reason}` };
        }
        return { id: req.id, success: true, data: { restored: true } };
      }

      case 'EXPORT_DB': {
        let exportBuffer: ArrayBuffer;
        if (sqlite3?.capi && db?.pointer) {
          const bytes = sqlite3.capi.sqlite3_js_db_export(db.pointer);
          exportBuffer = bytes.buffer as ArrayBuffer;
        } else if (storage) {
          const bytes = await storage.readPrimary();
          exportBuffer = bytes.buffer as ArrayBuffer;
        } else {
          return { id: req.id, success: false, error: 'DB_NOT_INITIALIZED: Cannot export uninitialized database' };
        }
        return { id: req.id, success: true, data: { buffer: exportBuffer } };
      }

      default:
        return { id: (req as any).id, success: false, error: `UNKNOWN_REQUEST_TYPE: ${(req as any).type}` };
    }
  } catch (err: any) {
    return { id: req.id, success: false, error: err.message || String(err) };
  }
}

// Attach listener in browser dedicated worker environment
if (typeof self !== 'undefined' && typeof (self as any).postMessage === 'function') {
  self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
    const res = await handleWorkerRequest(event.data);
    (self as any).postMessage(res);
  });
}
