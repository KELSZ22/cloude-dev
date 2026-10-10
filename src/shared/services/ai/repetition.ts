/**
 * Whether a reply only says again what the assistant already said. A small model often repeats
 * its last answer when a question is rephrased, so both assistants check for it and ask again.
 */

/** Case, spacing and punctuation carry no meaning here, so two replies that differ only in those repeat. */
export function normalizeAnswer(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function repeatsAnswer(reply: string, earlier: readonly string[]): boolean {
  const said = normalizeAnswer(reply);
  if (!said) return false;
  return earlier.some((answer) => normalizeAnswer(answer) === said);
}
