import { describe, expect, test } from 'bun:test';

import samplePack from '../assets/knowledge-packs/algebra-starter-sample.json';
import { chunkText } from '../src/infrastructure/knowledge/chunker';
import { PACK_FORMAT, PackFormatError, parsePack } from '../src/infrastructure/knowledge/pack-format';

const clone = (value) => JSON.parse(JSON.stringify(value));
function minimalPack(overrides = {}) {
  return {
    format: PACK_FORMAT, id: 'test-pack', title: 'Test pack', version: '1.0.0', description: 'A pack for tests.', language: 'en',
    author: 'Tester', publisher: 'Tests', source: 'Written for tests.', sourceUrls: [], license: 'MIT', snapshotDate: '2026-01-01',
    chapters: [{ id: 'c1', number: '1', title: 'Chapter', sections: [{ id: 's1', number: '1.1', title: 'Section',
      passages: [{ id: 'p1', text: 'First passage.' }, { id: 'p2', text: 'Second passage.' }] }] }],
    ...overrides,
  };
}

describe('knowledge pack format', () => {
  test('the bundled algebra pack is valid and carries attribution', () => {
    const pack = parsePack(samplePack);
    expect(pack.format).toBe('seekora-pack/1');
    for (const field of ['title', 'source', 'author', 'license', 'publisher', 'version']) expect(pack[field].length).toBeGreaterThan(0);
    expect(pack.chapters.map((chapter) => chapter.title)).toEqual(['Linear Equations', 'Quadratic Equations', 'Functions', 'Exponents']);
    const passages = pack.chapters.flatMap((chapter) => chapter.sections.flatMap((section) => section.passages));
    expect(passages.length).toBe(32);
    expect(new Set(passages.map((passage) => passage.id)).size).toBe(passages.length);
  });
  test('normalizes text and ignores unknown fields', () => {
    const pack = parsePack(minimalPack({ title: '  Padded  ', unexpected: { nested: true } }));
    expect(pack.title).toBe('Padded');
    expect('unexpected' in pack).toBe(false);
  });
  test('rejects values that are not a pack at all', () => {
    for (const value of [null, 'text', 42, [], {}]) expect(() => parsePack(value)).toThrow(PackFormatError);
  });
  test('rejects an unknown format version', () => {
    expect(() => parsePack(minimalPack({ format: 'seekora-pack/2' }))).toThrow('format');
  });
  test('requires title, source, author, and license', () => {
    for (const field of ['title', 'source', 'author', 'license']) {
      expect(() => parsePack(minimalPack({ [field]: '   ' }))).toThrow(field);
      const missing = minimalPack(); delete missing[field];
      expect(() => parsePack(missing)).toThrow(field);
    }
  });
  test('rejects duplicate passage, section, and chapter identifiers', () => {
    const passages = minimalPack(); passages.chapters[0].sections[0].passages[1].id = 'p1';
    expect(() => parsePack(passages)).toThrow('repeats the identifier "p1"');
    const sections = minimalPack(); sections.chapters[0].sections.push(clone(sections.chapters[0].sections[0]));
    expect(() => parsePack(sections)).toThrow('repeats');
    const chapters = minimalPack(); chapters.chapters.push(clone(chapters.chapters[0]));
    expect(() => parsePack(chapters)).toThrow('repeats');
  });
  test('rejects unsafe identifiers, empty passages, and oversized passages', () => {
    const unsafe = minimalPack(); unsafe.chapters[0].sections[0].passages[0].id = '../etc/passwd';
    expect(() => parsePack(unsafe)).toThrow('lowercase');
    const empty = minimalPack(); empty.chapters[0].sections[0].passages[0].text = '';
    expect(() => parsePack(empty)).toThrow('must not be empty');
    const huge = minimalPack(); huge.chapters[0].sections[0].passages[0].text = 'x'.repeat(8001);
    expect(() => parsePack(huge)).toThrow('at most 8000');
    expect(() => parsePack(minimalPack({ chapters: [] }))).toThrow('non-empty');
  });
  test('rejects source links that are not https', () => {
    expect(() => parsePack(minimalPack({ sourceUrls: ['http://example.com'] }))).toThrow('https');
    expect(() => parsePack(minimalPack({ sourceUrls: ['javascript:alert(1)'] }))).toThrow('https');
    expect(parsePack(minimalPack({ sourceUrls: ['https://example.com/a'] })).sourceUrls).toEqual(['https://example.com/a']);
  });
});

describe('text chunking', () => {
  test('keeps short text as one chunk with exact offsets', () => {
    const text = 'A linear equation has one solution.';
    expect(chunkText(text)).toEqual([{ text, offsetStart: 0, offsetEnd: text.length }]);
  });
  test('splits at sentence ends and never exceeds the limit', () => {
    const text = Array.from({ length: 12 }, (_, n) => `Sentence number ${n} explains one small idea about algebra.`).join(' ');
    const chunks = chunkText(text, 120);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(120);
      expect(chunk.text.endsWith('.')).toBe(true);
      expect(text.slice(chunk.offsetStart, chunk.offsetEnd)).toBe(chunk.text);
    }
    expect(chunks.map((chunk) => chunk.text).join(' ')).toBe(text);
  });
  test('does not split decimals or drop any words', () => {
    const text = 'The value is 2.5 and the slope is 0.75. Then x = 4.';
    const chunks = chunkText(text, 45);
    expect(chunks.map((chunk) => chunk.text)).toEqual(['The value is 2.5 and the slope is 0.75.', 'Then x = 4.']);
  });
  test('splits one overlong sentence at a space', () => {
    const text = Array.from({ length: 60 }, (_, n) => `word${n}`).join(' ');
    const chunks = chunkText(text, 50);
    for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(50);
    expect(chunks.map((chunk) => chunk.text).join(' ')).toBe(text);
  });
  test('handles empty text, blank text, and paragraphs', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  ')).toEqual([]);
    expect(chunkText('First paragraph\n\nSecond paragraph', 20).map((chunk) => chunk.text)).toEqual(['First paragraph', 'Second paragraph']);
  });
  test('rejects a non-positive chunk size', () => {
    expect(() => chunkText('text', 0)).toThrow('positive');
  });
});
