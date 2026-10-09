import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

import { chunkText } from '@/infrastructure/knowledge/chunker';
import type { KnowledgePackFile } from '@/infrastructure/knowledge/pack-format';
import type { DocumentChunk, DocumentKind, KnowledgeDocument, KnowledgePack } from '@/shared/types/knowledge';
import type { KnowledgePackStore, KnowledgeRepository, PackInstallResult, SearchHit, SearchRequest } from './contracts';
import { extractQueryTerms, matchAny } from './fts-query';
import type { SqlDriver, SqlExecutor, SqlValue } from './sql-driver';

/** Section title, chapter title, passage text. Titles count for more than body text. */
const BM25_WEIGHTS = '3.0, 2.0, 1.0';
/** Candidates fetched by bm25 before reordering by term coverage. */
const MIN_POOL = 24;
const MAX_POOL = 96;

interface DocumentRow {
  doc_id: string; pack_id: string | null; title: string; chapter: string | null; section: string | null;
  author: string | null; source_url: string | null; license: string; mime_type: string; kind: DocumentKind;
  local_uri: string | null; language: string; content_hash: string; indexed_at: string | null; created_at: string;
}
interface ChunkRow {
  seq: number; chunk_id: string; document_id: string; passage_id: string | null; chunk_index: number; text: string;
  page_number: number | null; heading: string | null; offset_start: number | null; offset_end: number | null;
}
interface PackRow {
  id: string; name: string; version: string; description: string; language: string; author: string; publisher: string;
  source: string; source_urls: string; license: string; checksum: string; installed_at: string;
}

const DOCUMENT_COLUMNS = `d.id AS doc_id, d.pack_id, d.title, d.chapter, d.section, d.author, d.source_url, d.license,
  d.mime_type, d.kind, d.local_uri, d.language, d.content_hash, d.indexed_at, d.created_at`;
const CHUNK_COLUMNS = `c.seq, c.id AS chunk_id, c.document_id, c.passage_id, c.chunk_index, c.text, c.page_number,
  c.heading, c.offset_start, c.offset_end`;

function toDocument(row: DocumentRow): KnowledgeDocument {
  return {
    id: row.doc_id, packId: row.pack_id, title: row.title, chapter: row.chapter, section: row.section, author: row.author,
    sourceUrl: row.source_url, license: row.license, mimeType: row.mime_type, kind: row.kind, localUri: row.local_uri,
    language: row.language, contentHash: row.content_hash, indexedAt: row.indexed_at, createdAt: row.created_at,
  };
}

function toChunk(row: ChunkRow): DocumentChunk {
  return {
    id: row.chunk_id, documentId: row.document_id, passageId: row.passage_id, chunkIndex: row.chunk_index, text: row.text,
    pageNumber: row.page_number, heading: row.heading, offsetStart: row.offset_start, offsetEnd: row.offset_end,
  };
}

function toPack(row: PackRow): KnowledgePack {
  return {
    id: row.id, name: row.name, version: row.version, description: row.description, language: row.language,
    author: row.author, publisher: row.publisher, source: row.source, license: row.license,
    sourceUrls: JSON.parse(row.source_urls) as string[], checksum: row.checksum, installedAt: row.installed_at,
  };
}

const hash = (value: string) => bytesToHex(sha256(utf8ToBytes(value)));

export class SqliteKnowledgeRepository implements KnowledgeRepository, KnowledgePackStore {
  constructor(private readonly db: SqlDriver, private readonly now: () => Date = () => new Date()) {}

  async search({ query, kind, limit, offset, signal }: SearchRequest): Promise<readonly SearchHit[]> {
    const terms = extractQueryTerms(query);
    if (!terms.length || limit < 1 || offset < 0) return [];
    const pool = Math.min(Math.max((offset + limit) * 3, MIN_POOL), MAX_POOL);
    const params: SqlValue[] = kind ? [matchAny(terms), kind, pool] : [matchAny(terms), pool];
    const rows = await this.db.all<DocumentRow & ChunkRow & { pack_name: string | null; score: number; excerpt: string }>(
      `SELECT ${DOCUMENT_COLUMNS}, ${CHUNK_COLUMNS}, p.name AS pack_name,
         bm25(chunks_fts, ${BM25_WEIGHTS}) AS score, snippet(chunks_fts, 2, '', '', '…', 28) AS excerpt
       FROM chunks_fts
       JOIN document_chunks c ON c.seq = chunks_fts.rowid
       JOIN documents d ON d.id = c.document_id
       LEFT JOIN knowledge_packs p ON p.id = d.pack_id
       WHERE chunks_fts MATCH ?${kind ? ' AND d.kind = ?' : ''}
       ORDER BY score LIMIT ?`, params);
    if (!rows.length) return [];

    // Ask the index itself which candidates contain each term, so coverage uses the same stemming as search.
    const matched = new Map<number, number>();
    const candidates = rows.map((row) => row.seq);
    const placeholders = candidates.map(() => '?').join(', ');
    for (const term of terms) {
      if (signal?.aborted) throw new Error('Search cancelled.');
      const containing = await this.db.all<{ seq: number }>(
        `SELECT rowid AS seq FROM chunks_fts WHERE chunks_fts MATCH ? AND rowid IN (${placeholders})`,
        [matchAny([term]), ...candidates]);
      for (const { seq } of containing) matched.set(seq, (matched.get(seq) ?? 0) + 1);
    }
    if (signal?.aborted) throw new Error('Search cancelled.');

    return rows
      .map((row): SearchHit => ({
        document: toDocument(row), chunkId: row.chunk_id, chunk: toChunk(row), excerpt: row.excerpt, packName: row.pack_name,
        rank: row.score, matchedTerms: matched.get(row.seq) ?? 0, queryTerms: terms.length,
      }))
      .sort((a, b) => b.matchedTerms - a.matchedTerms || a.rank - b.rank)
      .slice(offset, offset + limit);
  }

  async getDocument(id: string): Promise<KnowledgeDocument | null> {
    const row = await this.db.first<DocumentRow>(`SELECT ${DOCUMENT_COLUMNS} FROM documents d WHERE d.id = ?`, [id]);
    return row ? toDocument(row) : null;
  }

  async getChunk(id: string): Promise<DocumentChunk | null> {
    const row = await this.db.first<ChunkRow>(`SELECT ${CHUNK_COLUMNS} FROM document_chunks c WHERE c.id = ?`, [id]);
    return row ? toChunk(row) : null;
  }

  async getDocumentChunks(documentId: string, limit: number, offset: number): Promise<readonly DocumentChunk[]> {
    const rows = await this.db.all<ChunkRow>(
      `SELECT ${CHUNK_COLUMNS} FROM document_chunks c WHERE c.document_id = ? ORDER BY c.chunk_index LIMIT ? OFFSET ?`,
      [documentId, limit, offset]);
    return rows.map(toChunk);
  }

  async listPacks(): Promise<readonly KnowledgePack[]> {
    return (await this.db.all<PackRow>('SELECT * FROM knowledge_packs ORDER BY name')).map(toPack);
  }

  async countChunks(): Promise<number> {
    return (await this.db.first<{ total: number }>('SELECT count(*) AS total FROM document_chunks'))?.total ?? 0;
  }

  async installPack(pack: KnowledgePackFile): Promise<PackInstallResult> {
    const checksum = hash(JSON.stringify(pack));
    const existing = await this.db.first<{ checksum: string }>('SELECT checksum FROM knowledge_packs WHERE id = ?', [pack.id]);
    if (existing?.checksum === checksum) {
      const row = await this.db.first<{ total: number }>(
        'SELECT count(*) AS total FROM document_chunks c JOIN documents d ON d.id = c.document_id WHERE d.pack_id = ?', [pack.id]);
      return { status: 'unchanged', packId: pack.id, chunks: row?.total ?? 0 };
    }
    const timestamp = this.now().toISOString();
    let chunks = 0;
    await this.db.transaction(async (tx) => {
      await this.deletePack(tx, pack.id);
      await tx.run(
        `INSERT INTO knowledge_packs (id, name, version, description, language, author, publisher, source, source_urls,
           license, checksum, installed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [pack.id, pack.title, pack.version, pack.description, pack.language, pack.author, pack.publisher, pack.source,
          JSON.stringify(pack.sourceUrls), pack.license, checksum, timestamp]);
      let position = 0;
      for (const chapter of pack.chapters) {
        for (const section of chapter.sections) {
          const documentId = `${pack.id}:${section.id}`;
          await tx.run(
            `INSERT INTO documents (id, pack_id, position, title, chapter, section, author, source_url, license, mime_type,
               kind, local_uri, language, content_hash, indexed_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'text/plain', 'article', NULL, ?, ?, ?, ?)`,
            [documentId, pack.id, position++, section.title, `${chapter.number}. ${chapter.title}`, section.number, pack.author,
              pack.sourceUrls[0] ?? null, pack.license, pack.language,
              hash(section.passages.map((passage) => passage.text).join('\n\n')), timestamp, timestamp]);
          let chunkIndex = 0;
          for (const passage of section.passages) {
            for (const [part, chunk] of chunkText(passage.text).entries()) {
              await tx.run(
                `INSERT INTO document_chunks (id, document_id, passage_id, chunk_index, text, heading, offset_start, offset_end)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [`${pack.id}:${passage.id}:${part}`, documentId, passage.id, chunkIndex++, chunk.text, chapter.title,
                  chunk.offsetStart, chunk.offsetEnd]);
              chunks++;
            }
          }
        }
      }
    });
    return { status: existing ? 'updated' : 'installed', packId: pack.id, chunks };
  }

  async removePack(packId: string): Promise<void> {
    await this.db.transaction((tx) => this.deletePack(tx, packId));
  }

  /** Deletes children explicitly so the index stays in sync even if foreign-key enforcement is off. */
  private async deletePack(tx: SqlExecutor, packId: string): Promise<void> {
    await tx.run('DELETE FROM document_chunks WHERE document_id IN (SELECT id FROM documents WHERE pack_id = ?)', [packId]);
    await tx.run('DELETE FROM documents WHERE pack_id = ?', [packId]);
    await tx.run('DELETE FROM knowledge_packs WHERE id = ?', [packId]);
  }
}
