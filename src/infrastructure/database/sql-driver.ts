export type SqlValue = string | number | null;

export interface SqlExecutor {
  /** Runs one or more statements without parameters. Never pass user input. */
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
}

/** The small SQLite surface the repositories need, so the same SQL runs on device and in desktop tests. */
export interface SqlDriver extends SqlExecutor {
  /** Commits when `task` resolves and rolls back when it throws. Statements must use the supplied executor. */
  transaction(task: (tx: SqlExecutor) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

export class DatabaseUnavailableError extends Error {}
