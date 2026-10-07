/**
 * Ambient type declarations for @sqlite.org/sqlite-wasm
 */

declare module '@sqlite.org/sqlite-wasm' {
  export interface Sqlite3InitConfig {
    print?: (msg: string) => void;
    printErr?: (msg: string) => void;
  }

  export interface SqliteDatabase {
    pointer?: any;
    exec(options: string | { sql: string; bind?: unknown[]; callback?: (row: any[]) => void }): any;
    selectObjects(sql: string, bind?: unknown[]): any[];
    changes?(): number;
    close(): void;
  }

  export interface Sqlite3Instance {
    oo1: {
      DB: new (path: string, mode?: string) => SqliteDatabase;
      OpfsDb?: new (path: string) => SqliteDatabase;
    };
    capi: {
      sqlite3_js_db_export(dbPointer: any): Uint8Array;
    };
    installOpfsSAHPoolVfs?: (options: {
      name: string;
      directory: string;
      clearOnInit?: boolean;
      initialCapacity?: number;
    }) => Promise<{
      OpfsSAHPoolDb: new (path: string) => SqliteDatabase;
    }>;
  }

  export default function sqlite3InitModule(config?: Sqlite3InitConfig): Promise<Sqlite3Instance>;
}
