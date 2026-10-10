import { useRef, useState } from 'react';

import { useKnowledge } from '@/shared/providers/knowledge-provider';
import { useModel } from '@/shared/providers/model-provider';
import { classifyOutOfScope, type OutOfScope } from '@/shared/services/ai/scope';
import {
  answerFromPage, answerQuestion, answerWithoutSources, resolveCitations, retrieveEvidence,
  type GroundedAnswer, type InsufficientReason,
} from '@/shared/services/rag/answer-question';
import { buildPagePrompt, buildRagPrompt } from '@/shared/services/rag/context-builder';
import { type AskedTurn, resolveFollowUp } from '@/shared/services/rag/follow-up';
import type { SourceCitation } from '@/shared/types/knowledge';

export type PageScan = { title: string; text: string };

export type AskResult =
  | { status: 'answered'; text: string; citations: SourceCitation[]; citedByModel: boolean }
  /** No passage supports the question, so this comes from the model alone and is labelled as such. */
  | { status: 'unsourced'; text: string }
  /** The model is not loaded, so only the supporting passages are shown. */
  | { status: 'passages-only'; citations: SourceCitation[] }
  /** The app cannot serve this kind of request at all, whatever the library holds. */
  | { status: 'out-of-scope'; reason: OutOfScope }
  | { status: 'insufficient-evidence'; reason: InsufficientReason };

export type AskOutcome =
  | AskResult
  | { status: 'error'; message: string }
  | { status: 'notice'; message: string }
  | { status: 'stopped'; text: string };

export interface AskOptions {
  /** The article open behind the assistant, when there is one. */
  page?: PageScan;
  /** This conversation so far, oldest first. Gives a follow-up its subject and catches repeats. */
  history?: readonly AskedTurn[];
}

export function useGroundedAnswer() {
  const { repository } = useKnowledge();
  const model = useModel();
  const [busy, setBusy] = useState(false);
  const [streamed, setStreamed] = useState('');
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);

  const modelReady = model.state.status === 'ready' && model.operation === null;

  async function ask(question: string, options: AskOptions = {}): Promise<AskOutcome | null> {
    const { page, history = [] } = options;
    // With no page and no library the model can still answer from its own knowledge, labelled.
    if (busy || (!page && !repository && !modelReady)) return null;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true); setStreamed(''); setResult(null); setError(null);
    let written = '';
    let outcome: AskOutcome;

    // Each stage of the fallback chain streams its own attempt, so the draft starts over.
    const stream = {
      onToken: (token: string) => { written += token; setStreamed(written); },
      onRestart: () => { written = ''; setStreamed(''); },
    };
    // The library is searched with the words of the question; a bare "why?" needs the earlier one.
    const asked = resolveFollowUp(question, history);
    const earlierAnswers = history.map((turn) => turn.answer).filter(Boolean);

    try {
      const blocked = classifyOutOfScope(question);
      if (blocked) {
        outcome = { status: 'out-of-scope', reason: blocked };
      } else if (modelReady) {
        // The open article is tried first because most questions are about what is on screen, but a
        // question it cannot answer is not the reader's mistake: the library, then the model's own
        // knowledge, get their turn before anything is refused.
        let grounded: GroundedAnswer | null = null;
        if (page) {
          grounded = await answerFromPage(model.generate, {
            question: asked, title: page.title, pageText: page.text, earlierAnswers,
            signal: controller.signal, ...stream,
          });
        }
        if (grounded?.status !== 'answered' && repository) {
          stream.onRestart();
          grounded = await answerQuestion({ repository, generate: model.generate }, {
            question: asked, earlierAnswers, signal: controller.signal, ...stream,
          });
        }
        if (grounded?.status === 'answered') outcome = grounded;
        else {
          stream.onRestart();
          const unsourced = await answerWithoutSources(model.generate, {
            question: asked, earlierAnswers, signal: controller.signal, ...stream,
          });
          outcome = unsourced.status === 'unsourced'
            ? unsourced
            : { status: 'insufficient-evidence', reason: grounded?.reason ?? 'model-declined' };
        }
      } else if (page) {
        const { sources } = buildPagePrompt(asked, page.title, page.text);
        outcome = sources.length
          ? {
              status: 'passages-only',
              citations: sources.map((source) => ({
                sourceId: String(source.label),
                documentId: source.documentId,
                chunkId: source.chunkId,
                title: source.title,
                pageNumber: null,
              })),
            }
          : { status: 'insufficient-evidence', reason: 'no-match' };
      } else if (repository) {
        const evidence = await retrieveEvidence(repository, asked, controller.signal);
        if (!evidence.sufficient) outcome = { status: 'insufficient-evidence', reason: evidence.reason };
        else {
          const { sources } = buildRagPrompt(asked, evidence.hits);
          // Only the source list is used here; the prompt is not sent because no model is loaded.
          outcome = { status: 'passages-only', citations: await resolveCitations(repository, sources) };
        }
      } else {
        return null;
      }
      setResult(outcome);
    } catch (failure) {
      if (controller.signal.aborted) outcome = { status: 'stopped', text: written };
      else {
        const message = failure instanceof Error ? failure.message : 'Seekora could not answer that.';
        outcome = { status: 'error', message };
        setError(message);
      }
    } finally {
      active.current = null;
      setBusy(false); setStreamed('');
    }
    return outcome;
  }

  function stop() {
    active.current?.abort();
    void model.cancel();
  }

  return { ask, stop, busy, streamed, result, error, modelReady, libraryReady: repository !== null };
}
