export interface TextChunk {
  text: string;
  /** Character offsets into the original text; `text` equals `original.slice(offsetStart, offsetEnd)`. */
  offsetStart: number;
  offsetEnd: number;
}

export const DEFAULT_CHUNK_CHARS = 900;

/** Sentence or line ends. A period inside a number such as 2.5 is not followed by a space, so it stays whole. */
const BOUNDARY = /[.!?]+["')\]]*(?=\s)|\n+/g;

/**
 * Splits text into chunks of at most `maxChars`, breaking at sentence ends where possible so a
 * retrieved chunk reads as complete statements. Chunks do not overlap.
 */
export function chunkText(text: string, maxChars: number = DEFAULT_CHUNK_CHARS): TextChunk[] {
  if (!Number.isInteger(maxChars) || maxChars < 1) throw new Error('Chunk size must be a positive whole number.');
  const cuts: number[] = [];
  for (const match of text.matchAll(BOUNDARY)) cuts.push(match.index + match[0].length);
  if (cuts[cuts.length - 1] !== text.length) cuts.push(text.length);

  const chunks: TextChunk[] = [];
  const push = (from: number, to: number) => {
    const raw = text.slice(from, to);
    const body = raw.trim();
    if (!body) return;
    const offsetStart = from + raw.indexOf(body);
    chunks.push({ text: body, offsetStart, offsetEnd: offsetStart + body.length });
  };

  let start = 0;
  let end = 0;
  for (const cut of cuts) {
    if (cut - start <= maxChars) { end = cut; continue; }
    if (end > start) { push(start, end); start = end; }
    // A single sentence longer than the limit is split at the last space that fits.
    while (cut - start > maxChars) {
      const space = text.lastIndexOf(' ', start + maxChars);
      const split = space > start ? space : start + maxChars;
      push(start, split);
      start = split;
    }
    end = cut;
  }
  push(start, end);
  return chunks;
}
