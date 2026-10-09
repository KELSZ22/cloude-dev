import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { SqlDriver, SqlExecutor } from './sql-driver';

export const DATABASE_NAME = 'seekora.db';

function executor(db: SQLiteDatabase): SqlExecutor {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => { await db.runAsync(sql, [...params]); },
    all: (sql, params = []) => db.getAllAsync(sql, [...params]),
    first: (sql, params = []) => db.getFirstAsync(sql, [...params]),
  };
}

export async function openKnowledgeDatabase(): Promise<SqlDriver> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const direct = executor(db);

  // expo-sqlite transactions on one connection are not exclusive, so calls wait their turn here.
  let tail: Promise<unknown> = Promise.resolve();
  const queued = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation, operation);
    tail = result.catch(() => undefined);
    return result;
  };

  return {
    exec: (sql) => queued(() => direct.exec(sql)),
    run: (sql, params) => queued(() => direct.run(sql, params)),
    all: (sql, params) => queued(() => direct.all(sql, params)),
    first: (sql, params) => queued(() => direct.first(sql, params)),
    transaction: (task) => queued(() => db.withTransactionAsync(() => task(direct))),
    close: () => queued(() => db.closeAsync()),
  };
}
