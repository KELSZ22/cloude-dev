import type { RagSource } from './context-builder';

export interface CheckedAnswer {
  /** The answer with every marker that does not point at a supplied source removed. */
  text: string;
  /** Sources the model actually referred to, in order of first mention. */
  cited: RagSource[];
  invalidMarkers: number;
}

/** Matches [1], [1, 2] and [1][2]. Anything else in brackets is left alone. */
const MARKER = /\[\s*\d+(?:\s*,\s*\d+)*\s*\]/g;

/**
 * Source numbers are the only link between model text and stored passages. A number is kept only
 * if it was one of the sources in the prompt, so the model cannot introduce a reference.
 */
export function checkCitations(answer: string, sources: readonly RagSource[]): CheckedAnswer {
  const byLabel = new Map(sources.map((source) => [source.label, source]));
  const cited: RagSource[] = [];
  let invalidMarkers = 0;
  const text = answer.replace(MARKER, (marker) => {
    const kept: number[] = [];
    for (const label of marker.match(/\d+/g)!.map(Number)) {
      const source = byLabel.get(label);
      if (!source) { invalidMarkers++; continue; }
      if (!kept.includes(label)) kept.push(label);
      if (!cited.includes(source)) cited.push(source);
    }
    return kept.map((label) => `[${label}]`).join('');
  });
  // Removing a marker can leave a space before punctuation or a doubled space.
  return { text: text.replace(/[ \t]+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim(), cited, invalidMarkers };
}
