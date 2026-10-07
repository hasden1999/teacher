/**
 * Web Worker Message RPC Protocol Types
 * Strict 7-action contract matching PROJECT.md § Architecture & SQLite Web Worker RPC Protocol:
 * - INIT
 * - EXEC
 * - QUERY
 * - TRANSACTION
 * - BACKUP_CREATE
 * - BACKUP_RESTORE
 * - EXPORT_DB
 */

export type WorkerRequestType =
  | 'INIT'
  | 'EXEC'
  | 'QUERY'
  | 'TRANSACTION'
  | 'BACKUP_CREATE'
  | 'BACKUP_RESTORE'
  | 'EXPORT_DB';

export type WorkerRequest =
  | { id: string; type: 'INIT'; payload?: { dbName?: string } }
  | { id: string; type: 'EXEC'; payload: { sql: string; params?: unknown[] } }
  | { id: string; type: 'QUERY'; payload: { sql: string; params?: unknown[] } }
  | { id: string; type: 'TRANSACTION'; payload: { statements: Array<{ sql: string; params?: unknown[] }> } }
  | { id: string; type: 'BACKUP_CREATE'; payload?: Record<string, unknown> }
  | { id: string; type: 'BACKUP_RESTORE'; payload: { backupData: ArrayBuffer } }
  | { id: string; type: 'EXPORT_DB'; payload?: Record<string, unknown> };

export type WorkerResponse =
  | { id: string; success: true; data: unknown }
  | { id: string; success: false; error: string };
