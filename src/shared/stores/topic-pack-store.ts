import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { searchWikipedia } from "@/infrastructure/learning/wikipedia";
import { topicQuery } from "@/shared/constants/topic-queries";
import {
  ONBOARDING_TOPIC_IDS,
  type OnboardingTopicId,
} from "@/shared/stores/onboarding-store";
import { useOfflineReadingStore } from "@/shared/stores/offline-reading-store";
import {
  isReadingId,
  type ReadingErrorCode,
} from "@/shared/types/offline-reading";

export const ARTICLES_PER_TOPIC = 10;

type TopicPackState = {
  hydrated: boolean;
  articleIds: Partial<Record<OnboardingTopicId, string[]>>;
  preparing: boolean;
  activeTopic: OnboardingTopicId | null;
  savedInTopic: number;
  error: ReadingErrorCode | null;
  setHydrated: (value: boolean) => void;
  ensure: (topics: readonly OnboardingTopicId[]) => Promise<void>;
};

function savedArticleIds(value: unknown): Partial<Record<OnboardingTopicId, string[]>> {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const articleIds: Partial<Record<OnboardingTopicId, string[]>> = {};
  for (const id of ONBOARDING_TOPIC_IDS) {
    const list = source[id];
    if (!Array.isArray(list)) continue;
    const ids = list.filter((item): item is string => typeof item === "string" && isReadingId(item));
    if (ids.length) articleIds[id] = ids.slice(0, ARTICLES_PER_TOPIC);
  }
  return articleIds;
}

let flight: Promise<void> | null = null;

export const useTopicPackStore = create<TopicPackState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      articleIds: {},
      preparing: false,
      activeTopic: null,
      savedInTopic: 0,
      error: null,
      setHydrated: (value) => set({ hydrated: value }),
      ensure: (topics) => {
        if (flight) return flight;
        flight = prepare(topics, set, get).finally(() => {
          flight = null;
        });
        return flight;
      },
    }),
    {
      name: "aralsearch-topic-packs",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ articleIds: state.articleIds }),
      merge: (persisted, current) => {
        const saved = persisted && typeof persisted === "object"
          ? (persisted as { articleIds?: unknown }).articleIds
          : undefined;
        return { ...current, articleIds: savedArticleIds(saved) };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

async function prepare(
  topics: readonly OnboardingTopicId[],
  set: (partial: Partial<TopicPackState>) => void,
  get: () => TopicPackState,
) {
  if (!useTopicPackStore.persist.hasHydrated()) {
    await useTopicPackStore.persist.rehydrate();
  }
  const reading = useOfflineReadingStore.getState();
  await reading.hydrate();
  if (!useOfflineReadingStore.getState().hydrated) {
    set({ error: "storage", preparing: false });
    return;
  }
  set({ preparing: true, error: null });
  try {
    for (const topic of topics) {
      const saved = await fillTopic(topic, set, get);
      if (saved === "stopped") return;
    }
  } finally {
    set({ preparing: false, activeTopic: null });
  }
}

async function fillTopic(
  topic: OnboardingTopicId,
  set: (partial: Partial<TopicPackState>) => void,
  get: () => TopicPackState,
): Promise<"done" | "stopped"> {
  const installed = new Set(useOfflineReadingStore.getState().items.map((item) => item.id));
  const ids = (get().articleIds[topic] ?? []).filter((id) => installed.has(id));
  set({
    activeTopic: topic,
    savedInTopic: ids.length,
    articleIds: { ...get().articleIds, [topic]: ids },
  });
  if (ids.length >= ARTICLES_PER_TOPIC) return "done";

  let results;
  try {
    results = await searchWikipedia(topicQuery[topic], "en", undefined, undefined, 20);
  } catch {
    set({ error: "network" });
    return "stopped";
  }

  for (const result of results) {
    if (ids.length >= ARTICLES_PER_TOPIC) break;
    if (ids.includes(result.id)) continue;
    if (useOfflineReadingStore.getState().busyId) return "stopped";
    set({ savedInTopic: ids.length });
    await useOfflineReadingStore.getState().download(result);
    const after = useOfflineReadingStore.getState();
    if (after.items.some((item) => item.id === result.id)) {
      ids.push(result.id);
      set({
        savedInTopic: ids.length,
        articleIds: { ...get().articleIds, [topic]: [...ids] },
      });
      continue;
    }
    const error = after.error;
    after.clearError();
    if (error === "network" || error === "cancelled" || error === "storage") {
      set({ error: error ?? "network" });
      return "stopped";
    }
  }
  return "done";
}
