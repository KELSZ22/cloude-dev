import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { collectMaterial } from "@/shared/services/challenge/collect-material";
import { isWrittenQuestion, type QuestionAuthor, type WrittenQuestion } from "@/shared/services/challenge/question";
import { MIN_ARTICLES, MIN_DECK, writeQuestions } from "@/shared/services/challenge/write-questions";
import { readingRepository, useOfflineReadingStore } from "@/shared/stores/offline-reading-store";
import { ONBOARDING_TOPIC_IDS, type OnboardingTopicId } from "@/shared/stores/onboarding-store";
import { useTopicPackStore } from "@/shared/stores/topic-pack-store";
import type { ReadingSummary } from "@/shared/types/offline-reading";

export type DeckStatus = "idle" | "building" | "ready" | "starter";

type DeckState = {
  fingerprint: string;
  questions: WrittenQuestion[];
  writtenBy: QuestionAuthor;
  status: DeckStatus;
  /** How many saved articles the current deck was written from. */
  articles: number;
  /**
   * The model-written deck in progress. Kept apart from `questions` so a background rewrite
   * never changes a question someone is already looking at; `build` promotes it once complete.
   */
  pending: WrittenQuestion[];
  pendingFingerprint: string;
  build: () => Promise<void>;
  /** Records one model-written question against the library deck it replaces. */
  setPendingQuestion: (fingerprint: string, index: number, question: WrittenQuestion) => void;
};

/**
 * Bumped whenever the writer changes what a question holds, so a deck saved by an older build
 * is written again instead of being shown with pieces it never had.
 */
const DECK_FORMAT = "2";

/** Identifies the library by what is saved and which revision of it. */
export function libraryFingerprint(items: readonly ReadingSummary[]): string {
  const saved = items.map((item) => `${item.id}@${item.revisionId}`).sort();
  return [DECK_FORMAT, ...saved].join("|");
}

function topicLookup(articleIds: Partial<Record<OnboardingTopicId, string[]>>) {
  const byReading = new Map<string, OnboardingTopicId>();
  for (const topic of ONBOARDING_TOPIC_IDS) {
    for (const id of articleIds[topic] ?? []) {
      if (!byReading.has(id)) byReading.set(id, topic);
    }
  }
  return (readingId: string) => byReading.get(readingId) ?? null;
}

let flight: Promise<void> | null = null;

export const useChallengeDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      fingerprint: "",
      questions: [],
      writtenBy: "library",
      status: "idle",
      articles: 0,
      pending: [],
      pendingFingerprint: "",
      build: () => {
        if (flight) return flight;
        flight = buildDeck(set, get).finally(() => {
          flight = null;
        });
        return flight;
      },
      setPendingQuestion: (fingerprint, index, question) =>
        set((state) => {
          if (state.fingerprint !== fingerprint) return state;
          const base = state.pendingFingerprint === fingerprint && state.pending.length
            ? state.pending
            : state.questions;
          if (!base[index]) return state;
          const pending = [...base];
          pending[index] = question;
          return { pending, pendingFingerprint: fingerprint };
        }),
    }),
    {
      name: "seekora-challenge-deck",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        fingerprint: state.fingerprint,
        questions: state.questions,
        writtenBy: state.writtenBy,
        articles: state.articles,
        pending: state.pending,
        pendingFingerprint: state.pendingFingerprint,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<DeckState>;
        const questions = Array.isArray(saved.questions)
          ? saved.questions.filter(isWrittenQuestion)
          : [];
        const pending = Array.isArray(saved.pending)
          ? saved.pending.filter(isWrittenQuestion)
          : [];
        // A deck that lost questions in storage is rebuilt rather than played short.
        const intact = questions.length >= MIN_DECK;
        const rewritten = intact && pending.length === questions.length;
        return {
          ...current,
          fingerprint: intact && typeof saved.fingerprint === "string" ? saved.fingerprint : "",
          questions: intact ? questions : [],
          writtenBy: saved.writtenBy === "model" ? "model" : "library",
          articles: typeof saved.articles === "number" ? saved.articles : 0,
          pending: rewritten ? pending : [],
          pendingFingerprint:
            rewritten && typeof saved.pendingFingerprint === "string"
              ? saved.pendingFingerprint
              : "",
          status: intact ? "ready" : "idle",
        };
      },
    },
  ),
);

function authorOf(questions: readonly WrittenQuestion[]): QuestionAuthor {
  return questions.some((question) => question.writtenBy === "model") ? "model" : "library";
}

async function buildDeck(
  set: (partial: Partial<DeckState>) => void,
  get: () => DeckState,
) {
  if (!useChallengeDeckStore.persist.hasHydrated()) {
    await useChallengeDeckStore.persist.rehydrate();
  }
  await useOfflineReadingStore.getState().hydrate();
  const reading = useOfflineReadingStore.getState();
  if (!reading.hydrated) return;

  const fingerprint = libraryFingerprint(reading.items);
  const current = get();

  if (fingerprint === current.fingerprint && current.questions.length >= MIN_DECK) {
    // A finished rewrite from an earlier session takes over now, between runs.
    if (
      current.pendingFingerprint === fingerprint &&
      current.pending.length === current.questions.length
    ) {
      set({
        questions: current.pending,
        writtenBy: authorOf(current.pending),
        pending: [],
        pendingFingerprint: "",
        status: "ready",
      });
      return;
    }
    set({ status: "ready" });
    return;
  }

  if (reading.items.length < MIN_ARTICLES) {
    set({
      fingerprint,
      questions: [],
      pending: [],
      pendingFingerprint: "",
      articles: reading.items.length,
      status: "starter",
    });
    return;
  }

  set({ status: "building" });
  const topicOf = topicLookup(useTopicPackStore.getState().articleIds);
  const material = await collectMaterial(
    readingRepository,
    reading.items.map((item) => item.id),
    topicOf,
  );
  const questions = writeQuestions(material, fingerprint);
  if (questions.length < MIN_DECK) {
    set({
      fingerprint,
      questions: [],
      pending: [],
      pendingFingerprint: "",
      articles: material.length,
      status: "starter",
    });
    return;
  }
  set({
    fingerprint,
    questions,
    writtenBy: "library",
    articles: material.length,
    pending: [],
    pendingFingerprint: "",
    status: "ready",
  });
}
