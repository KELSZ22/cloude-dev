import type { SqlDriver } from './sql-driver';

export interface Migration { version: number; name: string; sql: string }

/** Append only. Never edit a released migration; add the next version instead. */
export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'knowledge library and full-text index',
    sql: `
      CREATE TABLE knowledge_packs (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        description TEXT NOT NULL,
        language TEXT NOT NULL,
        author TEXT NOT NULL,
        publisher TEXT NOT NULL,
        source TEXT NOT NULL,
        source_urls TEXT NOT NULL,
        license TEXT NOT NULL,
        checksum TEXT NOT NULL,
        installed_at TEXT NOT NULL
      );
      CREATE TABLE documents (
        id TEXT PRIMARY KEY NOT NULL,
        pack_id TEXT REFERENCES knowledge_packs(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        title TEXT NOT NULL,
        chapter TEXT,
        section TEXT,
        author TEXT,
        source_url TEXT,
        license TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('article', 'book', 'document')),
        local_uri TEXT,
        language TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        indexed_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX documents_by_pack ON documents(pack_id, position);
      CREATE TABLE document_chunks (
        seq INTEGER PRIMARY KEY,
        id TEXT NOT NULL UNIQUE,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        passage_id TEXT,
        chunk_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        page_number INTEGER,
        heading TEXT,
        offset_start INTEGER,
        offset_end INTEGER,
        UNIQUE (document_id, chunk_index)
      );
      CREATE VIRTUAL TABLE chunks_fts USING fts5(
        title, heading, text, tokenize = 'porter unicode61 remove_diacritics 2'
      );
      CREATE TRIGGER document_chunks_after_insert AFTER INSERT ON document_chunks BEGIN
        INSERT INTO chunks_fts(rowid, title, heading, text)
        VALUES (new.seq, (SELECT title FROM documents WHERE id = new.document_id), new.heading, new.text);
      END;
      CREATE TRIGGER document_chunks_after_delete AFTER DELETE ON document_chunks BEGIN
        DELETE FROM chunks_fts WHERE rowid = old.seq;
      END;
      CREATE TRIGGER document_chunks_after_update AFTER UPDATE ON document_chunks BEGIN
        DELETE FROM chunks_fts WHERE rowid = old.seq;
        INSERT INTO chunks_fts(rowid, title, heading, text)
        VALUES (new.seq, (SELECT title FROM documents WHERE id = new.document_id), new.heading, new.text);
      END;
    `,
  },
];

/** The library cannot work without FTS5, so fail with a clear message instead of a syntax error. */
export async function assertFts5(db: SqlDriver): Promise<void> {
  const row = await db.first<{ enabled: number }>("SELECT sqlite_compileoption_used('ENABLE_FTS5') AS enabled");
  if (!row?.enabled) throw new Error('This SQLite build has no FTS5 full-text search. Rebuild the app with expo-sqlite enableFTS.');
}

export async function migrate(db: SqlDriver, list: readonly Migration[] = migrations): Promise<{ from: number; to: number }> {
  list.forEach((migration, index) => {
    if (migration.version !== index + 1) throw new Error('Migrations must be numbered 1, 2, 3 with no gaps.');
  });
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  if (from > list.length) {
    throw new Error(`This library was created by a newer version of the app (schema ${from}). Update the app to open it.`);
  }
  for (const migration of list.slice(from)) {
    // The version bump shares the transaction, so a failed migration leaves the schema untouched.
    await db.transaction(async (tx) => {
      await tx.exec(migration.sql);
      await tx.exec(`PRAGMA user_version = ${migration.version}`);
    });
  }
  return { from, to: list.length };
}
