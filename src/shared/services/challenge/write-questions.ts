import { topicIcon } from "@/shared/constants/topics";
import type { MessageKey } from "@/shared/i18n";

import type { ArticleMaterial } from "./collect-material";
import type { WrittenQuestion } from "./question";

export const DECK_SIZE = 10;
/** Four options means four distinct article titles to choose between. */
export const MIN_ARTICLES = 4;
/** A smaller library writes a shorter challenge rather than falling back to samples. */
export const MIN_DECK = 5;
const MAX_PER_ARTICLE = 2;
const BLANK = "_____";

const GENERIC_ICON = { ios: "book", android: "menu_book", web: "menu_book" } as const;

/** Deterministic PRNG so the same library always rebuilds the same deck. */
export function seededRandom(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The part of a title that reads as its subject: "Outline of physical science" keeps the whole. */
function titlePattern(title: string) {
  const base = title.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return base || title;
}

/** Replaces the article's own name so the excerpt does not give the answer away. */
export function maskTitle(sentence: string, title: string): string | null {
  const subject = titlePattern(title);
  if (subject.length < 3) return null;
  const pattern = new RegExp(escapeRegExp(subject), "gi");
  if (!pattern.test(sentence)) return null;
  const masked = sentence.replace(pattern, BLANK).replace(/(_____)(\s+\1)+/g, BLANK);
  // A sentence that is mostly blank says nothing to answer from.
  return masked.replace(/_+/g, "").trim().split(/\s+/).length >= 6 ? masked : null;
}

interface Figure {
  text: string;
  value: number;
  decimals: number;
  grouped: boolean;
  suffix: string;
}

const FIGURE = /(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?\s*(%|percent)?/g;

/** The first number in the sentence that a question can be built around. */
export function findFigure(sentence: string): Figure | null {
  FIGURE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FIGURE.exec(sentence)) !== null) {
    const [whole, integer, fraction, unit] = match;
    const grouped = integer.includes(",");
    const value = Number(`${integer.replace(/,/g, "")}.${fraction ?? 0}`);
    if (!Number.isFinite(value) || value <= 1) continue;
    // Ordinals and in-text references read oddly with alternatives.
    const after = sentence.slice(match.index + whole.length, match.index + whole.length + 2);
    if (/^(st|nd|rd|th)/i.test(after)) continue;
    // A number inside a power or a range is only half of the quantity it belongs to.
    const before = sentence.slice(Math.max(0, match.index - 4), match.index);
    if (/[−\-^]$|\d\s?[×x]\s?$/.test(before) || /^\s?[−^]/.test(after)) continue;
    return {
      text: whole.trim(),
      value,
      decimals: fraction?.length ?? 0,
      grouped,
      suffix: unit ? whole.slice(whole.indexOf(unit) - (whole.includes(" ") ? 1 : 0)) : "",
    };
  }
  return null;
}

function formatFigure(value: number, figure: Figure) {
  const rounded = value.toFixed(figure.decimals);
  const [integer, fraction] = rounded.split(".");
  const grouped = figure.grouped ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : integer;
  return `${fraction ? `${grouped}.${fraction}` : grouped}${figure.suffix}`;
}

/** Wrong answers of the same shape and scale, so none stands out as the odd one. */
export function figureDistractors(figure: Figure): string[] {
  const year = figure.decimals === 0 && figure.value >= 1400 && figure.value <= 2200;
  const percent = /%|percent/i.test(figure.suffix);
  const factors = year
    ? [figure.value - 12, figure.value + 9, figure.value - 31]
    : [figure.value * 0.5, figure.value * 1.3, figure.value * 2, figure.value * 0.75];
  const answer = formatFigure(figure.value, figure);
  const seen = new Set([answer]);
  const options: string[] = [];
  for (const candidate of factors) {
    if (options.length === 3) break;
    if (candidate <= 0) continue;
    // A share over the whole gives itself away as the wrong answer.
    if (percent && candidate > 100) continue;
    const rounded = figure.decimals === 0 ? Math.round(candidate) : candidate;
    const text = formatFigure(rounded, figure);
    if (seen.has(text)) continue;
    seen.add(text);
    options.push(text);
  }
  return options;
}

type Candidate = Omit<WrittenQuestion, "id" | "answer" | "options" | "excerpt"> & {
  excerpt: string;
  correct: string;
  distractors: string[];
};

function iconFor(material: ArticleMaterial) {
  return material.topic ? topicIcon[material.topic] : GENERIC_ICON;
}

/** Identify-the-subject questions, built from sentences that name what the article is about. */
function subjectCandidates(
  material: ArticleMaterial,
  otherTitles: readonly string[],
  askKey: MessageKey,
  sentences: readonly string[],
): Candidate[] {
  if (otherTitles.length < 3) return [];
  return sentences.flatMap((sentence) => {
    const excerpt = maskTitle(sentence, material.title);
    if (!excerpt) return [];
    return [{
      promptKey: askKey,
      excerpt,
      source: material.title,
      readingId: material.readingId,
      icon: iconFor(material),
      writtenBy: "library" as const,
      correct: material.title,
      distractors: otherTitles.slice(0, 3),
    }];
  });
}

/** Fill-in-the-figure questions, built from sentences that state a number. */
function figureCandidates(material: ArticleMaterial): Candidate[] {
  return material.sentences.flatMap((sentence) => {
    const figure = findFigure(sentence);
    if (!figure) return [];
    const distractors = figureDistractors(figure);
    if (distractors.length < 3) return [];
    const excerpt = sentence.replace(figure.text, BLANK);
    if (!excerpt.includes(BLANK)) return [];
    // A sentence that restates the figure answers itself.
    if (findFigure(excerpt)?.value === figure.value) return [];
    return [{
      promptKey: "challenge.askFigure",
      excerpt,
      source: material.title,
      readingId: material.readingId,
      icon: iconFor(material),
      writtenBy: "library" as const,
      correct: formatFigure(figure.value, figure),
      distractors: distractors.slice(0, 3),
    }];
  });
}

/**
 * Orders one article's possible questions so the deck mixes shapes: the opening line first,
 * because it describes the subject most clearly, then a figure, then another body line.
 */
function candidatesFor(
  material: ArticleMaterial,
  titles: readonly string[],
  random: () => number,
): Candidate[] {
  const others = shuffle(titles.filter((title) => title !== material.title), random);
  const lead = material.lead
    ? subjectCandidates(material, others, "challenge.askTopic", [material.lead])
    : [];
  const body = subjectCandidates(material, others, "challenge.askLine", material.sentences);
  const figures = figureCandidates(material);
  return [lead[0], figures[0], body[0], figures[1], body[1]].filter(
    (candidate): candidate is Candidate => candidate !== undefined,
  );
}

function finish(candidate: Candidate, index: number, random: () => number): WrittenQuestion {
  const options = shuffle([candidate.correct, ...candidate.distractors], random);
  const { correct, distractors: _distractors, ...rest } = candidate;
  return {
    ...rest,
    id: `${candidate.readingId}-${index}`,
    options,
    answer: options.indexOf(correct),
  };
}

/**
 * Writes the deck from the saved articles alone. Articles take turns so ten questions come from
 * at least five of them, and no article is asked about more than twice.
 */
export function writeQuestions(
  material: readonly ArticleMaterial[],
  seed: string,
  size: number = DECK_SIZE,
): WrittenQuestion[] {
  const usable = material.filter((item) => item.title);
  if (usable.length < MIN_ARTICLES) return [];
  const random = seededRandom(seed);
  const titles = usable.map((item) => item.title);
  const pools = shuffle(usable, random).map((item) => candidatesFor(item, titles, random));

  const questions: WrittenQuestion[] = [];
  const used = new Set<string>();
  for (let round = 0; round < MAX_PER_ARTICLE; round++) {
    for (const pool of pools) {
      if (questions.length >= size) break;
      const candidate = pool.find((item) => !used.has(item.excerpt.toLowerCase()));
      if (!candidate) continue;
      used.add(candidate.excerpt.toLowerCase());
      questions.push(finish(candidate, questions.length, random));
    }
    if (questions.length >= size) break;
  }
  return questions;
}
