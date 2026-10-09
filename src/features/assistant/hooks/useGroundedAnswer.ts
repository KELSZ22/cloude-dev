import { useRef, useState } from 'react';

import { useKnowledge } from '@/shared/providers/knowledge-provider';
import { useModel } from '@/shared/providers/model-provider';
import {
  answerQuestion, resolveCitations, retrieveEvidence, type InsufficientReason,
} from '@/shared/services/rag/answer-question';
import { buildRagPrompt } from '@/shared/services/rag/context-builder';
import type { SourceCitation } from '@/shared/types/knowledge';

export type AskResult =
  | { status: 'answered'; text: string; citations: SourceCitation[]; citedByModel: boolean }
  /** The model is not loaded, so only the supporting passages are shown. */
  | { status: 'passages-only'; citations: SourceCitation[] }
  | { status: 'insufficient-evidence'; reason: InsufficientReason };

export type AskOutcome =
  | AskResult
  | { status: 'error'; message: string }
  | { status: 'notice'; message: string }
  | { status: 'stopped'; text: string };

export function useGroundedAnswer() {
  const { repository } = useKnowledge();
  const model = useModel();
  const [busy, setBusy] = useState(false);
  const [streamed, setStreamed] = useState('');
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);

  const modelReady = model.state.status === 'ready' && model.operation === null;

  async function ask(question: string): Promise<AskOutcome | null> {
    if (!repository || busy) return null;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true); setStreamed(''); setResult(null); setError(null);
    let written = '';
    let outcome: AskOutcome;
    try {
      if (modelReady) {
        const answer = await answerQuestion({ repository, generate: model.generate }, {
          question, signal: controller.signal, onToken: (token) => {
            written += token;
            setStreamed(written);
          },
        });
        outcome = answer.status === 'answered' ? answer : { status: 'insufficient-evidence', reason: answer.reason };
        setResult(outcome);
      } else {
        const evidence = await retrieveEvidence(repository, question, controller.signal);
        if (!evidence.sufficient) outcome = { status: 'insufficient-evidence', reason: evidence.reason };
        else {
          const { sources } = buildRagPrompt(question, evidence.hits);
          // Only the source list is used here; the prompt is not sent because no model is loaded.
          outcome = { status: 'passages-only', citations: await resolveCitations(repository, sources) };
        }
        setResult(outcome);
      }
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
