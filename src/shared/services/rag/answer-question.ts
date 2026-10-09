import type { KnowledgeRepository, SearchHit } from '@/infrastructure/database';
import type { GenerationRequest } from '@/infrastructure/llm';
import type { SourceCitation } from '@/shared/types/knowledge';
import { checkCitations } from './citations';
import { buildPagePrompt, buildRagPrompt, RAG_LIMITS, type RagSource } from './context-builder';

/** Room for a four-sentence paragraph. The engine allows at most 256. */
export const ANSWER_MAX_TOKENS = 192;
/** Enough for "YES" or "NO". */
export const CHECK_MAX_TOKENS = 4;
/** Candidates fetched before the evidence check; only the best few reach the model. */
const RETRIEVAL_LIMIT = 6;

export type InsufficientReason =
  /** Nothing in the library mentions the question's terms. */
  | 'no-match'
  /** Passages mention some terms, but too few to count as support. */
  | 'weak-match'
  /** The model read the passages and judged that they do not answer the question, or wrote nothing. */
  | 'model-declined';

export type GroundedAnswer =
  | {
    status: 'answered';
    text: string;
    citations: SourceCitation[];
    /** False when the model named no source and the passages it was given are listed instead. */
    citedByModel: boolean;
  }
  | { status: 'insufficient-evidence'; reason: InsufficientReason; citations: [] };

export interface Evidence {
  sufficient: true;
  hits: SearchHit[];
  /** The best passage contains every content term of the question. */
  complete: boolean;
}
export type EvidenceResult = Evidence | { sufficient: false; reason: 'no-match' | 'weak-match' };

type Generate = (request: GenerationRequest) => Promise<string>;

/** A passage supports a question only if it contains most of the question's content terms. */
export function requiredTerms(queryTerms: number): number {
  return Math.ceil(queryTerms * 0.6);
}

export async function retrieveEvidence(
  repository: Pick<KnowledgeRepository, 'search'>, question: string, signal?: AbortSignal,
): Promise<EvidenceResult> {
  const hits = await repository.search({ query: question, limit: RETRIEVAL_LIMIT, offset: 0, signal });
  if (!hits.length) return { sufficient: false, reason: 'no-match' };
  const supporting = hits.filter((hit) => hit.matchedTerms >= requiredTerms(hit.queryTerms));
  if (!supporting.length) return { sufficient: false, reason: 'weak-match' };
  return {
    sufficient: true, hits: supporting.slice(0, RAG_LIMITS.maxSources),
    complete: supporting[0].matchedTerms === supporting[0].queryTerms,
  };
}

/** A citation is shown only if its passage can still be read back from local storage. */
export async function resolveCitations(
  repository: Pick<KnowledgeRepository, 'getChunk'>, sources: readonly RagSource[],
): Promise<SourceCitation[]> {
  const citations: SourceCitation[] = [];
  for (const source of sources) {
    const chunk = await repository.getChunk(source.chunkId);
    if (!chunk || chunk.documentId !== source.documentId) continue;
    citations.push({
      sourceId: String(source.label), documentId: chunk.documentId, chunkId: chunk.id, title: source.title, pageNumber: chunk.pageNumber,
    });
  }
  return citations;
}

/** Keeps the first paragraph and drops a last sentence that the token limit cut off. */
export function tidyAnswer(raw: string): string {
  const paragraph = raw.trim().split('\n')[0].trim();
  if (/[.!?\])]$/.test(paragraph)) return paragraph;
  const end = Math.max(...['. ', '! ', '? ', '] '].map((mark) => paragraph.lastIndexOf(mark)));
  return end > 0 ? paragraph.slice(0, end + 1) : paragraph;
}

/**
 * Asks for one paragraph and stops the model when it starts a second. A small model often repeats
 * itself after finishing, and on a phone every extra token costs time and battery.
 */
export async function generateParagraph(generate: Generate, request: GenerationRequest): Promise<string> {
  const controller = new AbortController();
  const forward = () => controller.abort();
  if (request.signal?.aborted) controller.abort();
  request.signal?.addEventListener('abort', forward, { once: true });
  let streamed = '';
  let finished = false;
  try {
    const text = await generate({
      ...request,
      signal: controller.signal,
      onToken: (token) => {
        if (finished) return;
        streamed += token;
        if (streamed.trimStart().includes('\n')) { finished = true; controller.abort(); return; }
        request.onToken?.(token);
      },
    });
    return tidyAnswer(text);
  } catch (error) {
    if (finished) return tidyAnswer(streamed);
    throw error;
  } finally {
    request.signal?.removeEventListener('abort', forward);
  }
}

/**
 * Retrieval decides whether the model is asked at all. The model receives only retrieved passages,
 * and its answer keeps only citations that resolve to those stored passages.
 */
export async function answerQuestion(
  deps: { repository: Pick<KnowledgeRepository, 'search' | 'getChunk'>; generate: Generate },
  request: { question: string; onToken?: (token: string) => void; signal?: AbortSignal },
): Promise<GroundedAnswer> {
  const question = request.question.trim();
  if (!question) throw new Error('Type a question first.');
  const evidence = await retrieveEvidence(deps.repository, question, request.signal);
  if (!evidence.sufficient) return { status: 'insufficient-evidence', reason: evidence.reason, citations: [] };

  // A passage that misses part of the question may be about something else. A small model answers
  // anyway if simply asked to, so it is first asked a yes/no question it handles more reliably.
  let needsCheck = !evidence.complete;
  let raw = '';
  let sources: RagSource[] = [];
  for (let count = evidence.hits.length; count >= 1; count--) {
    const built = buildRagPrompt(question, evidence.hits, count);
    sources = built.sources;
    try {
      if (needsCheck) {
        const verdict = await deps.generate({ prompt: built.checkPrompt, maxTokens: CHECK_MAX_TOKENS, signal: request.signal });
        if (!/^\W*yes\b/i.test(verdict)) return { status: 'insufficient-evidence', reason: 'model-declined', citations: [] };
        needsCheck = false;
      }
      raw = await generateParagraph(deps.generate,
        { prompt: built.prompt, maxTokens: ANSWER_MAX_TOKENS, onToken: request.onToken, signal: request.signal });
      break;
    } catch (error) {
      // The engine counts tokens exactly; if the prompt is too long for the context, retry with fewer passages.
      const tooLong = error instanceof Error && error.message.includes('context budget');
      if (!tooLong || count === 1) throw error;
    }
  }

  const checked = checkCitations(raw, sources);
  if (!checked.text) return { status: 'insufficient-evidence', reason: 'model-declined', citations: [] };
  const citedByModel = checked.cited.length > 0;
  const citations = await resolveCitations(deps.repository, citedByModel ? checked.cited : sources);
  if (!citations.length) return { status: 'insufficient-evidence', reason: 'no-match', citations: [] };
  return { status: 'answered', text: checked.text, citations, citedByModel };
}

/** Answers from the article on screen. The page is the only source, so nothing is retrieved. */
export async function answerFromPage(
  generate: Generate,
  request: { question: string; title: string; pageText: string; onToken?: (token: string) => void; signal?: AbortSignal },
): Promise<GroundedAnswer> {
  const question = request.question.trim();
  if (!question) throw new Error('Type a question first.');
  const built = buildPagePrompt(question, request.title, request.pageText);
  if (!built.sources.length) return { status: 'insufficient-evidence', reason: 'no-match', citations: [] };
  const raw = await generateParagraph(generate, {
    prompt: built.prompt,
    maxTokens: ANSWER_MAX_TOKENS,
    onToken: request.onToken,
    signal: request.signal,
  });
  const checked = checkCitations(raw, built.sources);
  if (!checked.text) return { status: 'insufficient-evidence', reason: 'model-declined', citations: [] };
  const citedByModel = checked.cited.length > 0;
  const used = citedByModel ? checked.cited : built.sources;
  return {
    status: 'answered',
    text: checked.text,
    citedByModel,
    citations: used.map((source) => ({
      sourceId: String(source.label),
      documentId: source.documentId,
      chunkId: source.chunkId,
      title: source.title,
      pageNumber: null,
    })),
  };
}
