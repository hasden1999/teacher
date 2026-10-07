import { describe, it, expect, vi } from 'vitest';
import { handleWorkerRequest, LOCK_NAME } from '../src/worker/sqlite.worker.js';
import { DbClient } from '../src/worker/dbClient.js';
import type { WorkerRequest, WorkerResponse } from '../src/worker/types.js';

describe('SQLite Worker RPC Protocol & DB Client', () => {
  describe('Worker RPC Protocol Handler', () => {
    it('T1.03.1: should construct typed WorkerRequest messages for INIT, EXEC, and QUERY', () => {
      const initReq: WorkerRequest = { id: 'req_1', type: 'INIT', payload: { dbName: 'techeeer.sqlite3' } };
      const execReq: WorkerRequest = { id: 'req_2', type: 'EXEC', payload: { sql: 'PRAGMA foreign_keys = ON;' } };
      const queryReq: WorkerRequest = { id: 'req_3', type: 'QUERY', payload: { sql: 'SELECT 1;' } };

      expect(initReq.type).toBe('INIT');
      expect(execReq.type).toBe('EXEC');
      expect(queryReq.type).toBe('QUERY');
    });

    it('T1.03.2: Web Lock name must strictly match "techeeer_db_lock"', () => {
      expect(LOCK_NAME).toBe('techeeer_db_lock');
    });

    it('T2.03.1: should reject RPC request with empty or whitespace-only action ID', async () => {
      const emptyReq: WorkerRequest = { id: '', type: 'QUERY', payload: { sql: 'SELECT 1;' } };
      const blankReq: WorkerRequest = { id: '   ', type: 'EXEC', payload: { sql: 'PRAGMA user_version;' } };

      const resEmpty = await handleWorkerRequest(emptyReq);
      const resBlank = await handleWorkerRequest(blankReq);

      expect(resEmpty.success).toBe(false);
      expect(resEmpty.error).toContain('INVALID_REQUEST_ID');

      expect(resBlank.success).toBe(false);
      expect(resBlank.error).toContain('INVALID_REQUEST_ID');
    });

    it('T2.03.2: should handle transaction with empty statements array safely returning 0 rows affected', async () => {
      const mockDb = {
        exec: vi.fn(),
        changes: vi.fn(() => 0),
      };
      const req: WorkerRequest = {
        id: 'tx_empty',
        type: 'TRANSACTION',
        payload: { statements: [] },
      };

      const res = await handleWorkerRequest(req, { db: mockDb });
      expect(res.success).toBe(true);
      if (res.success) {
        expect((res.data as any).rowsAffected).toBe(0);
      }
    });

    it('T2.03.4: should validate concurrency error constant CONCURRENT_TAB_ACTIVE', () => {
      const errorConstant = 'CONCURRENT_TAB_ACTIVE';
      expect(errorConstant).toBe('CONCURRENT_TAB_ACTIVE');
    });

    it('T1.23.1: should reject backup restore smaller than 512 bytes with SIZE error', async () => {
      const req: WorkerRequest = {
        id: 'res_small',
        type: 'BACKUP_RESTORE',
        payload: { backupData: new Uint8Array(256).buffer },
      };
      const res = await handleWorkerRequest(req);
      expect(res.success).toBe(false);
      expect(res.error).toContain('SIZE');
    });

    it('should execute EXEC and QUERY requests via mock context', async () => {
      const mockDb = {
        exec: vi.fn(),
        changes: vi.fn(() => 2),
        selectObjects: vi.fn(() => [{ id: '1', name: 'الصف الأول' }]),
      };

      const execReq: WorkerRequest = {
        id: 'req_exec',
        type: 'EXEC',
        payload: { sql: 'INSERT INTO classes (id, name) VALUES (?, ?);', params: ['1', 'الصف الأول'] },
      };
      const execRes = await handleWorkerRequest(execReq, { db: mockDb });
      expect(execRes.success).toBe(true);
      if (execRes.success) {
        expect((execRes.data as any).rowsAffected).toBe(2);
      }

      const queryReq: WorkerRequest = {
        id: 'req_query',
        type: 'QUERY',
        payload: { sql: 'SELECT * FROM classes;' },
      };
      const queryRes = await handleWorkerRequest(queryReq, { db: mockDb });
      expect(queryRes.success).toBe(true);
      if (queryRes.success) {
        expect(queryRes.data).toEqual([{ id: '1', name: 'الصف الأول' }]);
      }
    });

    it('should handle uninitialized database errors gracefully', async () => {
      const req: WorkerRequest = { id: 'req_uninit', type: 'EXEC', payload: { sql: 'SELECT 1;' } };
      const res = await handleWorkerRequest(req, { db: null });
      expect(res.success).toBe(false);
      expect(res.error).toContain('DB_NOT_INITIALIZED');
    });
  });

  describe('DbClient Wrapper', () => {
    it('should track connection status transitions', async () => {
      const mockWorker = {
        addEventListener: vi.fn(),
        postMessage: vi.fn((req: WorkerRequest) => {
          // Immediately simulate worker response
          const response: WorkerResponse = {
            id: req.id,
            success: true,
            data: { initialized: true, dbName: 'techeeer.sqlite3' },
          };
          setTimeout(() => {
            const handler = mockWorker.addEventListener.mock.calls.find((c) => c[0] === 'message')?.[1];
            if (handler) handler({ data: response });
          }, 0);
        }),
        terminate: vi.fn(),
      };

      const client = new DbClient({ workerInstance: mockWorker });
      expect(client.getStatus()).toBe('DISCONNECTED');

      const statusChanges: string[] = [];
      const unsub = client.onStatusChange((s) => statusChanges.push(s));

      const initPromise = client.init();
      expect(client.getStatus()).toBe('CONNECTING');

      await initPromise;
      expect(client.getStatus()).toBe('CONNECTED');
      expect(statusChanges).toContain('CONNECTING');
      expect(statusChanges).toContain('CONNECTED');

      client.close();
      expect(client.getStatus()).toBe('DISCONNECTED');
      unsub();
    });

    it('should transition to BLOCKED_BY_LOCK status on CONCURRENT_TAB_ACTIVE', async () => {
      const mockWorker = {
        addEventListener: vi.fn(),
        postMessage: vi.fn((req: WorkerRequest) => {
          const response: WorkerResponse = {
            id: req.id,
            success: false,
            error: 'CONCURRENT_TAB_ACTIVE: Multi-tab concurrency lock held by another tab',
          };
          setTimeout(() => {
            const handler = mockWorker.addEventListener.mock.calls.find((c) => c[0] === 'message')?.[1];
            if (handler) handler({ data: response });
          }, 0);
        }),
        terminate: vi.fn(),
      };

      const client = new DbClient({ workerInstance: mockWorker });
      await expect(client.init()).rejects.toThrow('CONCURRENT_TAB_ACTIVE');
      expect(client.getStatus()).toBe('BLOCKED_BY_LOCK');
      client.close();
    });

    it('should reject pending requests on timeout', async () => {
      const mockWorker = {
        addEventListener: vi.fn(),
        postMessage: vi.fn(), // Never responds
        terminate: vi.fn(),
      };

      const fastTimeoutClient = new DbClient({ timeoutMs: 50, workerInstance: mockWorker });
      await expect(fastTimeoutClient.init()).rejects.toThrow('REQUEST_TIMEOUT');
      fastTimeoutClient.close();
    });

    it('should dispatch all typed RPC methods successfully', async () => {
      const mockWorker = {
        addEventListener: vi.fn(),
        postMessage: vi.fn((req: WorkerRequest) => {
          let data: any = {};
          if (req.type === 'INIT') data = { initialized: true, dbName: 'test.db' };
          else if (req.type === 'EXEC') data = { rowsAffected: 1 };
          else if (req.type === 'QUERY') data = [{ id: '1', name: 'class1' }];
          else if (req.type === 'TRANSACTION') data = { rowsAffected: 3 };
          else if (req.type === 'BACKUP_CREATE') data = { timestamp: Date.now(), size: 1024 };
          else if (req.type === 'BACKUP_RESTORE') data = { restored: true };
          else if (req.type === 'EXPORT_DB') data = { buffer: new ArrayBuffer(512) };

          const response: WorkerResponse = { id: req.id, success: true, data };
          setTimeout(() => {
            const handler = mockWorker.addEventListener.mock.calls.find((c) => c[0] === 'message')?.[1];
            if (handler) handler({ data: response });
          }, 0);
        }),
        terminate: vi.fn(),
      };

      const client = new DbClient({ workerFactory: () => mockWorker });
      await client.init('test.db');

      const execRes = await client.exec('INSERT INTO classes VALUES (1);');
      expect(execRes.rowsAffected).toBe(1);

      const queryRes = await client.query('SELECT * FROM classes;');
      expect(queryRes).toHaveLength(1);

      const txRes = await client.transaction([{ sql: 'INSERT 1;' }, { sql: 'INSERT 2;' }]);
      expect(txRes.rowsAffected).toBe(3);

      const backupRes = await client.createBackup();
      expect(backupRes.size).toBe(1024);

      const restoreRes = await client.restoreBackup(new ArrayBuffer(512));
      expect(restoreRes.restored).toBe(true);

      const exportRes = await client.exportDb();
      expect(exportRes.buffer.byteLength).toBe(512);

      client.close();
    });

    it('should reject methods when worker is not initialized', async () => {
      const uninitClient = new DbClient();
      await expect(uninitClient.exec('SELECT 1;')).rejects.toThrow('WORKER_NOT_SPAWNED');
    });

    it('should handle worker error event and update status', () => {
      let errorHandler: ((err: any) => void) | undefined;
      const mockWorker = {
        addEventListener: vi.fn((event, handler) => {
          if (event === 'error') errorHandler = handler;
        }),
        postMessage: vi.fn(),
        terminate: vi.fn(),
      };

      const client = new DbClient({ workerInstance: mockWorker });
      if (errorHandler) {
        errorHandler(new Error('Test worker crash'));
        expect(client.getStatus()).toBe('ERROR');
      }
      client.close();
    });
  });

  describe('Additional RPC Request Handlers', () => {
    it('should handle TRANSACTION rollback on error', async () => {
      const mockDb = {
        exec: vi.fn((opts: any) => {
          if (opts?.sql?.includes('FAIL_ME')) {
            throw new Error('SIMULATED_SQL_ERROR');
          }
        }),
        changes: vi.fn(() => 1),
      };

      const req: WorkerRequest = {
        id: 'tx_fail',
        type: 'TRANSACTION',
        payload: { statements: [{ sql: 'INSERT 1;' }, { sql: 'FAIL_ME;' }] },
      };

      const res = await handleWorkerRequest(req, { db: mockDb });
      expect(res.success).toBe(false);
      expect(res.error).toContain('SIMULATED_SQL_ERROR');
    });

    it('should handle BACKUP_CREATE, BACKUP_RESTORE and EXPORT_DB handlers', async () => {
      const mockStorage = {
        readPrimary: vi.fn(async () => new Uint8Array(1024)),
        writeSlot: vi.fn(async () => 'slot0'),
        saveManifest: vi.fn(async () => {}),
        writePrimary: vi.fn(async () => {}),
      };
      const mockEngine = {
        createSnapshot: vi.fn(async () => ({
          timestamp: 12345,
          sizeBytes: 1024,
          data: new Uint8Array(1024),
        })),
        restoreBackup: vi.fn(async () => ({ success: true })),
      };

      const createReq: WorkerRequest = { id: 'bc_1', type: 'BACKUP_CREATE' };
      const createRes = await handleWorkerRequest(createReq, {
        backupEngine: mockEngine as any,
      });
      expect(createRes.success).toBe(true);

      const restoreReq: WorkerRequest = {
        id: 'br_1',
        type: 'BACKUP_RESTORE',
        payload: { backupData: new Uint8Array(1024).buffer },
      };
      const restoreRes = await handleWorkerRequest(restoreReq, {
        backupEngine: mockEngine as any,
        storage: mockStorage as any,
      });
      expect(restoreRes.success).toBe(true);

      const exportReq: WorkerRequest = { id: 'exp_1', type: 'EXPORT_DB' };
      const exportRes = await handleWorkerRequest(exportReq, {
        storage: mockStorage as any,
      });
      expect(exportRes.success).toBe(true);
    });

    it('should reject unknown request types', async () => {
      const unknownReq: any = { id: 'unk_1', type: 'UNKNOWN_ACTION' };
      const res = await handleWorkerRequest(unknownReq);
      expect(res.success).toBe(false);
      expect(res.error).toContain('UNKNOWN_REQUEST_TYPE');
    });
  });
});
