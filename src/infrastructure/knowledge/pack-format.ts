/** Seekora knowledge-pack format, version 1. Plain JSON, so a pack can be bundled or imported from a file. */
export const PACK_FORMAT = 'seekora-pack/1';

export interface PackPassage { id: string; text: string }
export interface PackSection { id: string; number: string; title: string; passages: PackPassage[] }
export interface PackChapter { id: string; number: string; title: string; sections: PackSection[] }

export interface KnowledgePackFile {
  format: typeof PACK_FORMAT;
  id: string;
  title: string;
  version: string;
  description: string;
  language: string;
  author: string;
  publisher: string;
  /** Provenance in words, for example "Written for Seekora". */
  source: string;
  sourceUrls: string[];
  license: string;
  /** ISO date the content was captured or last revised. */
  snapshotDate: string;
  chapters: PackChapter[];
}

export class PackFormatError extends Error {}

export const PACK_LIMITS = { chapters: 200, sectionsPerChapter: 200, passagesPerSection: 500, passageChars: 8000 } as const;

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function fail(path: string, problem: string): never {
  throw new PackFormatError(`Invalid knowledge pack: ${path} ${problem}.`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, max: number): string {
  if (typeof value !== 'string') fail(path, 'must be text');
  const trimmed = value.trim();
  if (!trimmed) fail(path, 'must not be empty');
  if (trimmed.length > max) fail(path, `must be at most ${max} characters`);
  return trimmed;
}

function id(value: unknown, path: string, seen: Set<string>): string {
  if (typeof value !== 'string' || !ID.test(value)) fail(path, 'must use lowercase letters, digits, and hyphens');
  if (seen.has(value)) fail(path, `repeats the identifier "${value}"`);
  seen.add(value);
  return value;
}

function list(value: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(value) || !value.length) fail(path, 'must be a non-empty list');
  if (value.length > max) fail(path, `must have at most ${max} entries`);
  return value;
}

/** Validates untrusted pack data and returns a normalized copy with a fixed key order. */
export function parsePack(value: unknown): KnowledgePackFile {
  const pack = record(value, 'pack');
  if (pack.format !== PACK_FORMAT) fail('format', `must be "${PACK_FORMAT}"`);
  if (typeof pack.id !== 'string' || !ID.test(pack.id)) fail('id', 'must use lowercase letters, digits, and hyphens');
  if (typeof pack.snapshotDate !== 'string' || !DATE.test(pack.snapshotDate)) fail('snapshotDate', 'must be a YYYY-MM-DD date');
  if (!Array.isArray(pack.sourceUrls) || pack.sourceUrls.some((url) => typeof url !== 'string' || !/^https:\/\/\S+$/.test(url))) {
    fail('sourceUrls', 'must be a list of https links');
  }
  const chapterIds = new Set<string>();
  const sectionIds = new Set<string>();
  const passageIds = new Set<string>();
  const chapters = list(pack.chapters, 'chapters', PACK_LIMITS.chapters).map((rawChapter, c): PackChapter => {
    const chapter = record(rawChapter, `chapters[${c}]`);
    return {
      id: id(chapter.id, `chapters[${c}].id`, chapterIds),
      number: text(chapter.number, `chapters[${c}].number`, 16),
      title: text(chapter.title, `chapters[${c}].title`, 200),
      sections: list(chapter.sections, `chapters[${c}].sections`, PACK_LIMITS.sectionsPerChapter).map((rawSection, s): PackSection => {
        const at = `chapters[${c}].sections[${s}]`;
        const section = record(rawSection, at);
        return {
          id: id(section.id, `${at}.id`, sectionIds),
          number: text(section.number, `${at}.number`, 16),
          title: text(section.title, `${at}.title`, 200),
          passages: list(section.passages, `${at}.passages`, PACK_LIMITS.passagesPerSection).map((rawPassage, p): PackPassage => {
            const passage = record(rawPassage, `${at}.passages[${p}]`);
            return {
              id: id(passage.id, `${at}.passages[${p}].id`, passageIds),
              text: text(passage.text, `${at}.passages[${p}].text`, PACK_LIMITS.passageChars),
            };
          }),
        };
      }),
    };
  });
  return {
    format: PACK_FORMAT,
    id: pack.id,
    title: text(pack.title, 'title', 200),
    version: text(pack.version, 'version', 32),
    description: text(pack.description, 'description', 1000),
    language: text(pack.language, 'language', 16),
    author: text(pack.author, 'author', 200),
    publisher: text(pack.publisher, 'publisher', 200),
    source: text(pack.source, 'source', 500),
    sourceUrls: pack.sourceUrls as string[],
    license: text(pack.license, 'license', 200),
    snapshotDate: pack.snapshotDate,
    chapters,
  };
}
