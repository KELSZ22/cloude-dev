import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { useModel } from "@/shared/providers/model-provider";
import { readingSentences } from "@/shared/services/challenge/collect-material";
import { writeQuestionWithModel } from "@/shared/services/challenge/model-questions";
import { useChallengeDeckStore } from "@/shared/stores/challenge-deck-store";
import { readingRepository } from "@/shared/stores/offline-reading-store";

/** Enough material for the model to write from without crowding the context. */
const PASSAGE_SENTENCES = 6;

/**
 * Rewrites the library deck with the on-device model, one question at a time, and only while
 * the model is already loaded and free. Nothing here loads or downloads a model: a question
 * the model cannot write stays exactly as the library wrote it, and the rewritten deck is kept
 * aside until the next build so no run changes underneath the person playing it.
 */
export function useModelQuestions(skip: boolean) {
  const model = useModel();
  const ready = model.state.status === "ready" && model.operation === null;
  const started = useRef("");

  useEffect(() => {
    if (skip || !ready || Platform.OS === "web") return;
    const deck = useChallengeDeckStore.getState();
    const fingerprint = deck.fingerprint;
    if (!fingerprint || deck.questions.length === 0) return;
    if (deck.pendingFingerprint === fingerprint) return;
    if (started.current === fingerprint) return;
    started.current = fingerprint;

    const controller = new AbortController();
    void rewrite(fingerprint, model.generate, controller.signal).catch(() => {
      // A busy, unloaded or cancelled model simply leaves the library deck in place.
      started.current = "";
    });
    return () => controller.abort();
  }, [skip, ready, model.generate]);
}

async function rewrite(
  fingerprint: string,
  generate: ReturnType<typeof useModel>["generate"],
  signal: AbortSignal,
) {
  const questions = useChallengeDeckStore.getState().questions;
  const passages = new Map<string, string>();

  for (const [index, question] of questions.entries()) {
    if (signal.aborted) return;
    if (useChallengeDeckStore.getState().fingerprint !== fingerprint) return;

    let passage = passages.get(question.readingId);
    if (passage === undefined) {
      const reading = await readingRepository.get(question.readingId).catch(() => null);
      passage = reading
        ? readingSentences(reading).slice(0, PASSAGE_SENTENCES).join(" ")
        : "";
      passages.set(question.readingId, passage);
    }
    if (!passage) continue;

    const written = await writeQuestionWithModel(generate, {
      base: question,
      title: question.source,
      passage,
      signal,
    });
    if (written) {
      useChallengeDeckStore.getState().setPendingQuestion(fingerprint, index, written);
    }
  }
}
