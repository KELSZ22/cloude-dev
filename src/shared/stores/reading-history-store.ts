import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const READING_HISTORY_LIMIT = 6;

export type ReadingHistoryEntry = {
  id: string;
  title: string;
  source: string;
  viewedAt: string;
};

type ReadingHistoryState = {
  items: ReadingHistoryEntry[];
  record: (entry: { id: string; title: string; source: string }) => void;
};

/** Newest first. A repeat view moves to the front. The seventh view drops the oldest. */
export function recentViews(
  items: readonly ReadingHistoryEntry[],
  entry: { id: string; title: string; source: string },
  viewedAt: string,
): ReadingHistoryEntry[] {
  if (!entry.id || !entry.title) return items.slice(0, READING_HISTORY_LIMIT);
  return [
    { id: entry.id, title: entry.title, source: entry.source || "Wikipedia", viewedAt },
    ...items.filter((item) => item.id !== entry.id),
  ].slice(0, READING_HISTORY_LIMIT);
}

function savedEntries(value: unknown): ReadingHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: ReadingHistoryEntry[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Partial<ReadingHistoryEntry>;
    if (typeof entry.id !== "string" || !entry.id) continue;
    if (typeof entry.title !== "string" || !entry.title) continue;
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    entries.push({
      id: entry.id,
      title: entry.title,
      source: typeof entry.source === "string" && entry.source ? entry.source : "Wikipedia",
      viewedAt: typeof entry.viewedAt === "string" ? entry.viewedAt : "",
    });
    if (entries.length >= READING_HISTORY_LIMIT) break;
  }
  return entries;
}

export const useReadingHistoryStore = create<ReadingHistoryState>()(
  persist(
    (set) => ({
      items: [],
      record: (entry) =>
        set((state) => ({
          items: recentViews(state.items, entry, new Date().toISOString()),
        })),
    }),
    {
      name: "aralsearch-reading-history",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
      merge: (persisted, current) => {
        const saved = persisted && typeof persisted === "object"
          ? (persisted as { items?: unknown }).items
          : undefined;
        return { ...current, items: savedEntries(saved) };
      },
    },
  ),
);
