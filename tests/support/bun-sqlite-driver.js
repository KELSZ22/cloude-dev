import { Database } from 'bun:sqlite';

/** Desktop stand-in for the expo-sqlite driver. It runs the same SQL against Bun's bundled SQLite. */
export function openTestDatabase() {
  const db = new Database(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const executor = {
    exec: async (sql) => { db.exec(sql); },
    run: async (sql, params = []) => { db.query(sql).run(...params); },
    all: async (sql, params = []) => db.query(sql).all(...params),
    first: async (sql, params = []) => db.query(sql).get(...params) ?? null,
  };
  return {
    ...executor,
    transaction: async (task) => {
      db.exec('BEGIN');
      try { await task(executor); db.exec('COMMIT'); }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    close: async () => { db.close(); },
    raw: db,
  };
}
