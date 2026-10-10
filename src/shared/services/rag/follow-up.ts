/**
 * Turns a follow-up into a question that stands on its own.
 *
 * The library is searched with the words of the question, so "why?" or "tell me more" matches
 * nothing and the reader is told their library has no passage on it. Carrying the previous
 * question forward makes the search work and gives the model the subject it is missing, without
 * putting a conversation inside a prompt that is built for grounded answers.
 */
import { extractQueryTerms } from '@/infrastructure/database/fts-query';

import { RAG_LIMITS } from './context-builder';

export interface AskedTurn {
  question: string;
  /** Empty when that turn produced no answer; it still shows what was being discussed. */
  answer: string;
}

/** Words that point back at something already said rather than naming a subject. */
const REFERS_BACK = /\b(?:it|its|it's|that|this|these|those|they|them|their|there|the same|the above|the former|the latter)\b/i;

/** Words that ask for more of the same subject. */
const CONTINUES = /\b(?:more|again|further|elaborate|expand|continue|go on|why|why not|how so|simpler|shorter|example|examples|instead|else|other)\b/i;

/** "What about…" and "And…" open a follow-up even when a subject is named. */
const OPENS_FOLLOW_UP = /^(?:and|but|so|then|what about|how about|ok(?:ay)?,?\s+(?:and|so|what))\b/i;

/**
 * A question needs the previous one when it names no subject of its own, or when it points back
 * at one while naming almost nothing. Two or more content terms with no backward reference is
 * treated as a fresh question, so "What is slope?" is never merged into something unrelated.
 */
export function isFollowUp(question: string): boolean {
  const asked = question.trim();
  if (!asked) return false;
  const terms = extractQueryTerms(asked);
  if (terms.length === 0) return true;
  if (terms.length > 2) return false;
  return OPENS_FOLLOW_UP.test(asked) || REFERS_BACK.test(asked) || CONTINUES.test(asked);
}

/** Keeps whole words, so the carried question never ends mid-word. */
function clipWords(text: string, maxChars: number): string {
  const flat = text.trim().replace(/\s+/g, ' ');
  if (flat.length <= maxChars) return flat;
  if (maxChars <= 0) return '';
  const head = flat.slice(0, maxChars);
  const cut = head.lastIndexOf(' ');
  return cut > 0 ? head.slice(0, cut) : '';
}

/**
 * The question to search and answer with. For a follow-up this is the previous question followed
 * by the new one, which reads as one request and carries the terms retrieval needs. The new
 * question is never shortened; the carried one gives way to it.
 */
export function resolveFollowUp(question: string, history: readonly AskedTurn[]): string {
  const asked = question.trim().replace(/\s+/g, ' ');
  if (!asked || !history.length || !isFollowUp(asked)) return asked;

  // The most recent question that named a subject is what the follow-up is about; a chain of
  // follow-ups all refer back to it.
  const subject = [...history].reverse().find((turn) => !isFollowUp(turn.question));
  if (!subject) return asked;

  const carried = clipWords(subject.question, RAG_LIMITS.questionChars - asked.length - 1);
  if (!carried) return asked;
  return `${carried.replace(/[?.!]+$/, '')}? ${asked}`;
}
