declare module 'better-sqlite3' {
  export interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface Statement {
    run(...params: Array<unknown>): RunResult;
    get(...params: Array<unknown>): unknown;
    all(...params: Array<unknown>): Array<unknown>;
  }

  export interface Database {
    readonly name: string;
    readonly inTransaction: boolean;
    prepare(sql: string): Statement;
    pragma(source: string): unknown;
    exec(source: string): this;
    transaction<T>(operation: () => T): {(): T; immediate(): T};
    close(): this;
  }

  interface BetterSqlite3Constructor {
    new(filename: string, options?: {readonly?: boolean; fileMustExist?: boolean}): Database;
  }

  const BetterSqlite3: BetterSqlite3Constructor;
  export = BetterSqlite3;
}
