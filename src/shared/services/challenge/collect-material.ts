import type { OnboardingTopicId } from "@/shared/stores/onboarding-store";
import type { OpenedReading, ReadingFigure } from "@/shared/types/offline-reading";

/** One saved article, reduced to the sentences a question can be written from. */
export interface ArticleMaterial {
  readingId: string;
  title: string;
  topic: OnboardingTopicId | null;
  /** The article's opening sentence, used for the describe-the-topic question. */
  lead: string;
  /** Body sentences that passed the quality filters, in reading order. */
  sentences: string[];
  /** The article picture to illustrate its questions with, if it saved one worth showing. */
  imageId: string | null;
}

const MIN_SENTENCE_CHARS = 40;
const MAX_SENTENCE_CHARS = 180;
const MIN_SENTENCE_WORDS = 6;

/** Openers that only make sense next to the sentence before them. */
const LEADING_PRONOUN =
  /^(it|this|these|those|they|he|she|there|such|both|many|other|another|its|their|his|her)\b/i;

const DISAMBIGUATION = /\bmay refer to\b|\bmay also refer to\b/i;
/** Wikipedia reference markers and editorial notes that survive extraction. */
const EDITORIAL = /\[\s*\d+\s*\]|\[(citation needed|clarification needed|sic)\]/i;

/** Sentences that point at something the reader cannot see state no fact of their own. */
const POINTS_ELSEWHERE =
  /\b(the (table|figure|chart|diagram|graph|image|list|section|article|following)|see also|as follows|shown (above|below)|listed (above|below))\b/i;

/** Glossary entries read as fragments once the term in front of the dash is taken away. */
const GLOSSARY_ENTRY = /^[^.?!]{1,60}\s[–—]\s/;

/** Splits on sentence ends, keeping abbreviations and decimals intact. */
export function splitSentences(paragraph: string): string[] {
  const text = paragraph.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const parts: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    if (!".!?".includes(text[index])) continue;
    const next = text[index + 1];
    if (next !== undefined && next !== " ") continue;
    const head = text.slice(start, index + 1);
    // "No." and "e.g." end in a period without ending a sentence.
    if (/\b([A-Z][a-z]{0,2}|[a-z])\.$/.test(head) && /\b[a-z]\.[a-z]\.$/i.test(head)) continue;
    parts.push(head.trim());
    start = index + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

/** A sentence can carry a question only if it stands on its own and states one fact plainly. */
export function usableSentence(sentence: string): boolean {
  const text = sentence.trim();
  if (text.length < MIN_SENTENCE_CHARS || text.length > MAX_SENTENCE_CHARS) return false;
  if (!/[.!?]$/.test(text)) return false;
  if (text.split(/\s+/).length < MIN_SENTENCE_WORDS) return false;
  if (LEADING_PRONOUN.test(text)) return false;
  if (DISAMBIGUATION.test(text) || EDITORIAL.test(text)) return false;
  if (POINTS_ELSEWHERE.test(text) || GLOSSARY_ENTRY.test(text)) return false;
  // Lists, tables and coordinate dumps read badly as questions.
  if ((text.match(/,/g)?.length ?? 0) > 6) return false;
  if (/^\s*[-–•]/.test(text)) return false;
  return true;
}

/** Sentences from every section, deduplicated, in the order they are read. */
export function readingSentences(reading: Pick<OpenedReading, "sections">): string[] {
  const seen = new Set<string>();
  const sentences: string[] = [];
  for (const section of reading.sections) {
    for (const paragraph of section.paragraphs) {
      for (const sentence of splitSentences(paragraph)) {
        if (!usableSentence(sentence)) continue;
        const key = sentence.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        sentences.push(sentence);
      }
    }
  }
  return sentences;
}

/** The opening sentence, which states what the article is about. */
export function readingLead(reading: Pick<OpenedReading, "summary" | "sections">): string {
  const fromSummary = splitSentences(reading.summary)[0] ?? "";
  if (usableSentence(fromSummary)) return fromSummary;
  const firstParagraph = reading.sections[0]?.paragraphs.find((text) => text.trim()) ?? "";
  const fromBody = splitSentences(firstParagraph)[0] ?? "";
  return usableSentence(fromBody) ? fromBody : "";
}

/** Smaller than this is a logo or an icon rather than a picture of the subject. */
const MIN_IMAGE_EDGE = 200;

/**
 * The article's own illustration, preferring a landscape one because the question shows it in a
 * wide banner. The lead figure wins ties, since Wikipedia puts the most telling picture first.
 */
export function readingImageId(figures: readonly ReadingFigure[]): string | null {
  const usable = figures.filter(
    (figure) => figure.width >= MIN_IMAGE_EDGE && figure.height >= MIN_IMAGE_EDGE,
  );
  return (usable.find((figure) => figure.width >= figure.height) ?? usable[0])?.id ?? null;
}

type MaterialReading = Pick<
  OpenedReading,
  "id" | "title" | "summary" | "sections" | "figures"
>;

export function toMaterial(
  reading: MaterialReading,
  topic: OnboardingTopicId | null,
): ArticleMaterial {
  return {
    readingId: reading.id,
    title: reading.title.trim(),
    topic,
    lead: readingLead(reading),
    sentences: readingSentences(reading),
    imageId: readingImageId(reading.figures),
  };
}

export interface MaterialSource {
  get(id: string): Promise<MaterialReading | null>;
}

/**
 * Reads the saved articles one at a time. Phones hold a single article in memory at a time
 * elsewhere, so this keeps the same discipline rather than loading the whole library.
 */
export async function collectMaterial(
  source: MaterialSource,
  readingIds: readonly string[],
  topicOf: (readingId: string) => OnboardingTopicId | null,
  signal?: AbortSignal,
): Promise<ArticleMaterial[]> {
  const material: ArticleMaterial[] = [];
  for (const id of readingIds) {
    if (signal?.aborted) break;
    let reading;
    try {
      reading = await source.get(id);
    } catch {
      continue;
    }
    if (!reading) continue;
    const item = toMaterial(reading, topicOf(id));
    if (!item.title || (!item.lead && !item.sentences.length)) continue;
    material.push(item);
  }
  return material;
}
