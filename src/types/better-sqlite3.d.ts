declare module 'better-sqlite3' {
  export interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface Statement {
    run(params?: unknown): RunResult;
    get(params?: unknown): unknown;
    all(params?: unknown): unknown[];
  }

  export interface Database {
    prepare(sql: string): Statement;
  }

  interface BetterSqlite3Constructor {
    new(filename: string): Database;
  }

  const BetterSqlite3: BetterSqlite3Constructor;
  export = BetterSqlite3;
}
