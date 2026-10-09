/** Question and filler words that say nothing about the topic. Kept small and English-only for now. */
const STOPWORDS = new Set(`a about am an and any are as at be been being but by can could did do does doing each
for from get give had has have having how i if in into is it its just me mean means my of on or our out please
shall should show so some tell than that the their them then there these they this those through to up us use
using was we were what when where which who whom whose why will with would you your explain describe define`
  .split(/\s+/));

export const MAX_QUERY_CHARS = 500;
export const MAX_QUERY_TERMS = 12;

/**
 * Content terms of a natural-language question: lowercase letters and digits only, no stopwords,
 * no single characters, deduplicated. The split mirrors the unicode61 tokenizer used by the index.
 */
export function extractQueryTerms(query: string): string[] {
  const terms: string[] = [];
  for (const token of query.slice(0, MAX_QUERY_CHARS).toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (token.length < 2 || STOPWORDS.has(token) || terms.includes(token)) continue;
    terms.push(token);
    if (terms.length === MAX_QUERY_TERMS) break;
  }
  return terms;
}

/** Terms contain only letters and digits and are quoted, so user text cannot inject FTS5 syntax. */
export function matchAny(terms: readonly string[]): string {
  return terms.map((term) => `"${term}"`).join(' OR ');
}
