import { beforeEach, describe, expect, test } from 'bun:test';

import samplePack from '../assets/knowledge-packs/algebra-starter-sample.json';
import { extractQueryTerms, matchAny } from '../src/infrastructure/database/fts-query';
import { assertFts5, migrate, migrations } from '../src/infrastructure/database/migrations';
import { SqliteKnowledgeRepository } from '../src/infrastructure/database/sqlite-knowledge-repository';
import { parsePack } from '../src/infrastructure/knowledge/pack-format';
import { openTestDatabase } from './support/bun-sqlite-driver.js';

const algebra = parsePack(samplePack);
const fixedNow = () => new Date('2026-10-09T00:00:00.000Z');

async function library() {
  const db = openTestDatabase();
  await migrate(db);
  const repository = new SqliteKnowledgeRepository(db, fixedNow);
  await repository.installPack(algebra);
  return { db, repository };
}
const topPassage = async (repository, query) => (await repository.search({ query, limit: 3, offset: 0 }))[0]?.chunk.passageId;

describe('migrations', () => {
  test('this SQLite build supports FTS5', async () => {
    await expect(assertFts5(openTestDatabase())).resolves.toBeUndefined();
  });
  test('reports a missing FTS5 build clearly', async () => {
    const db = { first: async () => ({ enabled: 0 }) };
    await expect(assertFts5(db)).rejects.toThrow('FTS5');
  });
  test('creates the schema once and records the version', async () => {
    const db = openTestDatabase();
    expect(await migrate(db)).toEqual({ from: 0, to: migrations.length });
    expect(await migrate(db)).toEqual({ from: migrations.length, to: migrations.length });
    expect((await db.first('PRAGMA user_version')).user_version).toBe(migrations.length);
    const tables = (await db.all("SELECT name FROM sqlite_master WHERE type = 'table'")).map((row) => row.name);
    for (const table of ['knowledge_packs', 'documents', 'document_chunks', 'chunks_fts']) expect(tables).toContain(table);
  });
  test('applies only the migrations that are still pending', async () => {
    const db = openTestDatabase();
    await migrate(db);
    const next = [...migrations, { version: migrations.length + 1, name: 'test', sql: 'CREATE TABLE added_later (id INTEGER PRIMARY KEY);' }];
    expect(await migrate(db, next)).toEqual({ from: migrations.length, to: migrations.length + 1 });
    expect(await db.first("SELECT name FROM sqlite_master WHERE name = 'added_later'")).not.toBeNull();
  });
  test('a failing migration rolls back and leaves the version unchanged', async () => {
    const db = openTestDatabase();
    await migrate(db);
    const broken = [...migrations, { version: migrations.length + 1, name: 'broken', sql: 'CREATE TABLE half_done (id INTEGER); THIS IS NOT SQL;' }];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect((await db.first('PRAGMA user_version')).user_version).toBe(migrations.length);
    expect(await db.first("SELECT name FROM sqlite_master WHERE name = 'half_done'")).toBeNull();
  });
  test('refuses a database from a newer app and misnumbered migrations', async () => {
    const db = openTestDatabase();
    await db.exec('PRAGMA user_version = 99');
    await expect(migrate(db)).rejects.toThrow('newer version');
    await expect(migrate(openTestDatabase(), [{ version: 2, name: 'gap', sql: '' }])).rejects.toThrow('numbered');
  });
});

describe('pack import and indexing', () => {
  test('imports every passage with pack, chapter, and section metadata', async () => {
    const db = openTestDatabase();
    await migrate(db);
    const repository = new SqliteKnowledgeRepository(db, fixedNow);
    expect(await repository.installPack(algebra)).toEqual({ status: 'installed', packId: 'seekora-algebra-sample', chunks: 32 });
    expect(await repository.countChunks()).toBe(32);
    const [pack] = await repository.listPacks();
    expect(pack).toMatchObject({ id: algebra.id, name: algebra.title, author: algebra.author, license: algebra.license,
      source: algebra.source, version: '1.0.0', installedAt: '2026-10-09T00:00:00.000Z' });
    expect(pack.checksum).toMatch(/^[0-9a-f]{64}$/);
    const chunk = await repository.getChunk('seekora-algebra-sample:quad-formula:0');
    expect(chunk).toMatchObject({ passageId: 'quad-formula', heading: 'Quadratic Equations', chunkIndex: 0 });
    const document = await repository.getDocument(chunk.documentId);
    expect(document).toMatchObject({ packId: algebra.id, title: 'The quadratic formula and the discriminant',
      chapter: '2. Quadratic Equations', section: '2.2', license: 'MIT', kind: 'article' });
    expect(document.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });
  test('stored text is exactly the pack text, in reading order', async () => {
    const { repository } = await library();
    const section = algebra.chapters[1].sections[1];
    const chunks = await repository.getDocumentChunks(`${algebra.id}:${section.id}`, 50, 0);
    expect(chunks.map((chunk) => chunk.text)).toEqual(section.passages.map((passage) => passage.text));
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual([0, 1, 2]);
    expect((await repository.getDocumentChunks(`${algebra.id}:${section.id}`, 1, 1))[0].passageId).toBe(section.passages[1].id);
  });
  test('installing the same pack again changes nothing', async () => {
    const { repository } = await library();
    expect(await repository.installPack(algebra)).toEqual({ status: 'unchanged', packId: algebra.id, chunks: 32 });
    expect(await repository.countChunks()).toBe(32);
  });
  test('a new version replaces the old content and its index entries', async () => {
    const { db, repository } = await library();
    const updated = JSON.parse(JSON.stringify(algebra));
    updated.version = '1.1.0';
    updated.chapters = [updated.chapters[0]];
    updated.chapters[0].sections[0].passages[0].text = 'A zebrafinch is a small bird used only to prove that the index was rebuilt.';
    expect((await repository.installPack(updated)).status).toBe('updated');
    expect(await repository.countChunks()).toBe(9);
    expect((await db.first('SELECT count(*) AS total FROM chunks_fts')).total).toBe(9);
    expect(await topPassage(repository, 'zebrafinch')).toBe('lin-solve-definition');
    expect(await repository.search({ query: 'discriminant', limit: 5, offset: 0 })).toEqual([]);
    expect((await repository.listPacks()).map((pack) => pack.version)).toEqual(['1.1.0']);
  });
  test('long passages are split into linked chunks that are all searchable', async () => {
    const { repository } = await library();
    const sentences = Array.from({ length: 40 }, (_, n) => `Statement ${n} about the heliotrope plant fills space.`);
    sentences[35] = 'Near the end the word marigold appears exactly once.';
    const pack = parsePack({ ...JSON.parse(JSON.stringify(algebra)), id: 'long-pack', title: 'Long pack',
      chapters: [{ id: 'c', number: '1', title: 'Plants', sections: [{ id: 's', number: '1.1', title: 'Flowers',
        passages: [{ id: 'long-one', text: sentences.join(' ') }] }] }] });
    const result = await repository.installPack(pack);
    expect(result.chunks).toBeGreaterThan(1);
    const chunks = await repository.getDocumentChunks('long-pack:s', 50, 0);
    expect(chunks.every((chunk) => chunk.passageId === 'long-one' && chunk.text.length <= 900)).toBe(true);
    expect(chunks.map((chunk) => chunk.text).join(' ')).toBe(sentences.join(' '));
    const [hit] = await repository.search({ query: 'marigold', limit: 1, offset: 0 });
    expect(hit.chunk.chunkIndex).toBeGreaterThan(0);
    expect(hit.chunk.text).toContain('marigold');
  });
  test('removing a pack removes its documents, chunks, and index entries', async () => {
    const { db, repository } = await library();
    await repository.removePack(algebra.id);
    expect(await repository.countChunks()).toBe(0);
    expect(await repository.listPacks()).toEqual([]);
    expect((await db.first('SELECT count(*) AS total FROM documents')).total).toBe(0);
    expect((await db.first('SELECT count(*) AS total FROM chunks_fts')).total).toBe(0);
    expect(await repository.search({ query: 'quadratic formula', limit: 5, offset: 0 })).toEqual([]);
    expect(await repository.getChunk('seekora-algebra-sample:quad-formula:0')).toBeNull();
  });
  test('a failed install leaves the previous library intact', async () => {
    const { repository } = await library();
    const broken = JSON.parse(JSON.stringify(algebra));
    broken.version = '2.0.0';
    broken.chapters[3].sections[0].passages[1].id = broken.chapters[3].sections[0].passages[0].id;
    await expect(repository.installPack(broken)).rejects.toThrow();
    expect(await repository.countChunks()).toBe(32);
    expect((await repository.listPacks())[0].version).toBe('1.0.0');
    expect(await topPassage(repository, 'quadratic formula')).toBe('quad-formula');
  });
});

describe('query terms', () => {
  test('keeps content words and drops question words, single characters, and duplicates', () => {
    expect(extractQueryTerms('How do I solve a quadratic equation by factoring?')).toEqual(['solve', 'quadratic', 'equation', 'factoring']);
    expect(extractQueryTerms('What is x to the zero power?')).toEqual(['zero', 'power']);
    expect(extractQueryTerms('Slope slope SLOPE')).toEqual(['slope']);
    expect(extractQueryTerms('what is the')).toEqual([]);
  });
  test('produces a quoted expression that cannot carry FTS5 syntax', () => {
    const terms = extractQueryTerms('slope" OR text:* NEAR(a b) -- (x^2) AND NOT y');
    expect(terms.every((term) => /^[\p{L}\p{N}]+$/u.test(term))).toBe(true);
    expect(matchAny(['slope', 'near'])).toBe('"slope" OR "near"');
  });
  test('bounds the number of terms and the query length', () => {
    const words = Array.from({ length: 300 }, (_, n) => `term${n}`).join(' ');
    expect(extractQueryTerms(words).length).toBe(12);
  });
});

describe('keyword retrieval and ranking', () => {
  const expectations = [
    ['How do I solve a quadratic equation by factoring?', 'quad-factoring'],
    ['What is the quadratic formula?', 'quad-formula'],
    ['What does the discriminant tell me?', 'quad-discriminant'],
    ['What is slope-intercept form?', 'lin-slope-intercept'],
    ['How do I find the domain of a function?', 'func-domain-range'],
    ['What is an inverse function?', 'func-inverse'],
    ['What happens when you multiply powers with the same base?', 'exp-product-quotient'],
    ['What does a negative exponent mean?', 'exp-zero-negative'],
    ['How do I find the vertex of a parabola?', 'quad-vertex'],
    ['How does the elimination method work?', 'lin-system-elimination'],
    ['completing the square', 'quad-completing-square'],
    ['fractional exponents', 'exp-rational'],
  ];
  let repository;
  beforeEach(async () => { ({ repository } = await library()); });

  for (const [query, passageId] of expectations) {
    test(`"${query}" ranks ${passageId} first`, async () => {
      expect(await topPassage(repository, query)).toBe(passageId);
    });
  }
  test('the passage with the worked answer is among the top results', async () => {
    const hits = await repository.search({ query: 'How do you solve 2x + 3 = 11?', limit: 3, offset: 0 });
    expect(hits.map((hit) => hit.chunk.passageId)).toContain('lin-solve-steps');
    const slope = await repository.search({ query: 'How do I find the slope of a line through two points?', limit: 3, offset: 0 });
    expect(slope.map((hit) => hit.chunk.passageId)).toContain('lin-slope-definition');
  });
  test('word forms match through stemming', async () => {
    expect(await topPassage(repository, 'factor quadratics')).toBe('quad-factoring');
    expect(await topPassage(repository, 'inverses of functions')).toBe('func-inverse');
  });
  test('passages covering more query terms come first, then bm25', async () => {
    const hits = await repository.search({ query: 'find the vertex of a parabola', limit: 10, offset: 0 });
    for (let i = 1; i < hits.length; i++) {
      const [previous, current] = [hits[i - 1], hits[i]];
      expect(previous.matchedTerms).toBeGreaterThanOrEqual(current.matchedTerms);
      if (previous.matchedTerms === current.matchedTerms) expect(previous.rank).toBeLessThanOrEqual(current.rank);
    }
    expect(hits[0]).toMatchObject({ matchedTerms: 3, queryTerms: 3 });
    expect(hits.at(-1).matchedTerms).toBeLessThan(3);
  });
  test('every hit carries its document, excerpt, pack name, and a chunk that exists', async () => {
    const hits = await repository.search({ query: 'exponent rules', limit: 5, offset: 0 });
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      expect(hit.packName).toBe('Algebra Starter (Sample)');
      expect(hit.excerpt.length).toBeGreaterThan(0);
      expect(hit.document.id).toBe(hit.chunk.documentId);
      expect(await repository.getChunk(hit.chunkId)).toEqual(hit.chunk);
    }
  });
  test('topics outside the library return nothing', async () => {
    for (const query of ['What is the capital of France?', 'Explain photosynthesis in plants', '', '   ', '? ! *']) {
      expect(await repository.search({ query, limit: 5, offset: 0 })).toEqual([]);
    }
  });
  test('hostile input is treated as plain words', async () => {
    for (const query of ['" OR 1=1 --', 'slope" NEAR("line', 'text:slope*', "'; DROP TABLE documents; --", 'AND OR NOT', '((((', '^slope']) {
      await expect(repository.search({ query, limit: 5, offset: 0 })).resolves.toBeDefined();
    }
    expect(await repository.countChunks()).toBe(32);
  });
  test('limit, offset, and the document kind filter are applied', async () => {
    const all = await repository.search({ query: 'equation', limit: 6, offset: 0 });
    expect(all.length).toBe(6);
    const page = await repository.search({ query: 'equation', limit: 3, offset: 3 });
    expect(page.map((hit) => hit.chunkId)).toEqual(all.slice(3).map((hit) => hit.chunkId));
    expect(await repository.search({ query: 'equation', kind: 'book', limit: 5, offset: 0 })).toEqual([]);
    expect((await repository.search({ query: 'equation', kind: 'article', limit: 5, offset: 0 })).length).toBe(5);
    expect(await repository.search({ query: 'equation', limit: 0, offset: 0 })).toEqual([]);
  });
  test('a cancelled search rejects', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(repository.search({ query: 'slope', limit: 5, offset: 0, signal: controller.signal })).rejects.toThrow('cancelled');
  });
});
