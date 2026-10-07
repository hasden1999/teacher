/**
 * Typed Database Client Wrapper
 * Dispatches Promise-based RPC calls to the dedicated SQLite Web Worker with UUID request tracking.
 */

import type { WorkerRequest, WorkerResponse } from './types.js';

export type DbConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR'
  | 'BLOCKED_BY_LOCK';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: NodeJS.Timeout | number;
}

export interface DbClientOptions {
  timeoutMs?: number;
  workerInstance?: Worker | any;
  workerFactory?: () => Worker | any;
}

export class DbClient {
  private worker: Worker | any = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private status: DbConnectionStatus = 'DISCONNECTED';
  private listeners = new Set<(status: DbConnectionStatus) => void>();
  private timeoutMs: number;
  private workerFactory?: () => Worker | any;

  constructor(options: DbClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 15000;
    if (options.workerInstance) {
      this.setWorker(options.workerInstance);
    }
    this.workerFactory = options.workerFactory;
  }

  public setWorker(workerInstance: Worker | any): void {
    if (this.worker && typeof this.worker.terminate === 'function') {
      this.worker.terminate();
    }
    this.worker = workerInstance;
    if (this.worker) {
      this.worker.addEventListener('message', this.handleMessage.bind(this));
      if (typeof this.worker.addEventListener === 'function') {
        this.worker.addEventListener('error', (err: any) => {
          this.setStatus('ERROR');
          console.error('SQLite Worker Error:', err);
        });
      }
    }
  }

  public getStatus(): DbConnectionStatus {
    return this.status;
  }

  public onStatusChange(callback: (status: DbConnectionStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private setStatus(newStatus: DbConnectionStatus): void {
    this.status = newStatus;
    this.listeners.forEach((fn) => fn(newStatus));
  }

  /**
   * Connect and initialize SQLite Web Worker.
   */
  public async init(dbName: string = 'techeeer.sqlite3'): Promise<{ initialized: boolean; dbName: string }> {
    if (this.status === 'CONNECTED' && this.worker) {
      return { initialized: true, dbName };
    }

    this.setStatus('CONNECTING');

    if (!this.worker) {
      if (this.workerFactory) {
        this.setWorker(this.workerFactory());
      } else if (typeof Worker !== 'undefined') {
        const workerUrl = new URL('./sqlite.worker.js', import.meta.url);
        this.setWorker(new Worker(workerUrl, { type: 'module' }));
      } else {
        this.setStatus('ERROR');
        throw new Error('WORKER_UNSUPPORTED: Environment lacks Worker support');
      }
    }

    try {
      const res = await this.sendRequest<{ initialized: boolean; dbName: string }>({
        type: 'INIT',
        payload: { dbName },
      });
      this.setStatus('CONNECTED');
      return res;
    } catch (err: any) {
      if (err.message && err.message.includes('CONCURRENT_TAB_ACTIVE')) {
        this.setStatus('BLOCKED_BY_LOCK');
      } else {
        this.setStatus('ERROR');
      }
      throw err;
    }
  }

  /**
   * Execute single DDL / DML statement.
   */
  public async exec(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }> {
    return this.sendRequest<{ rowsAffected: number }>({
      type: 'EXEC',
      payload: { sql, params },
    });
  }

  /**
   * Query database for objects.
   */
  public async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.sendRequest<T[]>({
      type: 'QUERY',
      payload: { sql, params },
    });
  }

  /**
   * Run batch of statements sequentially in an atomic transaction.
   */
  public async transaction(
    statements: Array<{ sql: string; params?: unknown[] }>
  ): Promise<{ rowsAffected: number }> {
    return this.sendRequest<{ rowsAffected: number }>({
      type: 'TRANSACTION',
      payload: { statements },
    });
  }

  /**
   * Trigger backup snapshot creation.
   */
  public async createBackup(): Promise<{ timestamp: number; size: number; buffer?: ArrayBuffer }> {
    return this.sendRequest({
      type: 'BACKUP_CREATE',
      payload: {},
    });
  }

  /**
   * Restore database from backup buffer.
   */
  public async restoreBackup(backupData: ArrayBuffer): Promise<{ restored: boolean }> {
    return this.sendRequest<{ restored: boolean }>({
      type: 'BACKUP_RESTORE',
      payload: { backupData },
    });
  }

  /**
   * Export raw database binary buffer.
   */
  public async exportDb(): Promise<{ buffer: ArrayBuffer }> {
    return this.sendRequest<{ buffer: ArrayBuffer }>({
      type: 'EXPORT_DB',
      payload: {},
    });
  }

  /**
   * Send typed request message with UUID matching and timeout rejection.
   */
  private sendRequest<T>(reqWithoutId: Omit<WorkerRequest, 'id'>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.worker) {
        return reject(new Error('WORKER_NOT_SPAWNED: Call init() first'));
      }

      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`REQUEST_TIMEOUT: Request ${id} timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      const fullRequest: WorkerRequest = { id, ...reqWithoutId } as WorkerRequest;
      this.worker.postMessage(fullRequest);
    });
  }

  /**
   * Handle incoming message response from Web Worker.
   */
  private handleMessage(event: MessageEvent<WorkerResponse>): void {
    const res = event.data;
    if (!res || !res.id) return;

    const pending = this.pendingRequests.get(res.id);
    if (!pending) return;

    clearTimeout(pending.timer as any);
    this.pendingRequests.delete(res.id);

    if (res.success) {
      pending.resolve(res.data);
    } else {
      pending.reject(new Error(res.error));
    }
  }

  /**
   * Terminate worker and clear active requests.
   */
  public close(): void {
    if (this.worker && typeof this.worker.terminate === 'function') {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.forEach(({ reject, timer }) => {
      clearTimeout(timer as any);
      reject(new Error('WORKER_CLOSED'));
    });
    this.pendingRequests.clear();
    this.setStatus('DISCONNECTED');
  }
}

export const dbClient = new DbClient();
