import { create } from "zustand";

import { createReadingRepository } from "@/infrastructure/learning/reading-repository";
import { readingStorage } from "@/infrastructure/learning/reading-storage";
import { downloadWikipedia } from "@/infrastructure/learning/wikipedia";
import {
  ReadingError, type ReadingErrorCode, type ReadingSummary, type WikipediaResult,
} from "@/shared/types/offline-reading";

export const readingRepository = createReadingRepository(readingStorage);
let hydration: Promise<void> | null = null;
let downloadController: AbortController | null = null;

type ReadingState = {
  items: ReadingSummary[];
  hydrated: boolean;
  busyId: string | null;
  downloading: boolean;
  error: ReadingErrorCode | null;
  hydrate: () => Promise<void>;
  download: (result: WikipediaResult) => Promise<void>;
  remove: (id: string) => Promise<void>;
  cancel: () => void;
  clearError: () => void;
};

export const useOfflineReadingStore = create<ReadingState>((set, get) => ({
  items: [], hydrated: false, busyId: null, downloading: false, error: null,
  hydrate: async () => {
    if (get().hydrated) return;
    if (hydration) return hydration;
    hydration = (async () => {
      try {
        const items = await readingRepository.list();
        set({ items, hydrated: true, error: null });
      } catch {
        set({ error: "storage" });
      }
    })();
    await hydration;
    hydration = null;
  },
  download: async (result) => {
    if (get().busyId) return;
    set({ busyId: result.id, downloading: true, error: null });
    const controller = new AbortController();
    downloadController = controller;
    try {
      await get().hydrate();
      if (!get().hydrated) throw new ReadingError("storage");
      if (get().items.some((item) => item.id === result.id)) return;
      const download = await downloadWikipedia(result.pageId, result.language, controller.signal);
      if (controller.signal.aborted) return;
      // The short disk commit is not cancellable, so its result stays unambiguous.
      downloadController = null;
      set({ downloading: false });
      const summary = await readingRepository.save(download.article, download.assets);
      set((state) => ({ items: [summary, ...state.items.filter((item) => item.id !== summary.id)] }));
    } catch (error) {
      if (!controller.signal.aborted) {
        set({ error: error instanceof ReadingError ? error.code : "storage" });
      }
    } finally {
      downloadController = null;
      set({ busyId: null, downloading: false });
    }
  },
  remove: async (id) => {
    if (get().busyId) return;
    set({ busyId: id, error: null });
    try {
      await readingRepository.remove(id);
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    } catch {
      set({ error: "storage" });
    } finally {
      set({ busyId: null });
    }
  },
  cancel: () => downloadController?.abort(),
  clearError: () => set({ error: null }),
}));
