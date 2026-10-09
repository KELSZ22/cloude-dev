import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { contentSources } from "@/shared/constants/content-sources";

import {
  cancelActivePackDownload,
  discoverInstalledPackIds,
  installOpenStaxPack,
  pauseActivePackDownload,
  resumeActivePackDownload,
} from "@/infrastructure/openstax/pack-installer";

type PackDownloadStore = {
  packId: string | null;
  progress: number;
  paused: boolean;
  installed: Record<string, boolean>;
  finishedId: string | null;
  error: string | null;
  downloadedBytes: number;
  totalBytes: number;
  speedBps: number;
  start: (packId: string) => void;
  togglePause: () => void;
  cancel: () => void;
  dismissFinished: () => void;
  clearError: () => void;
  syncFromDisk: () => Promise<void>;
};

let abortController: AbortController | null = null;
let resumeWaiters: (() => void)[] = [];

function notifyResumeWaiters() {
  for (const unblock of resumeWaiters) unblock();
  resumeWaiters = [];
}

export const usePackDownloadStore = create<PackDownloadStore>()(
  persist(
    (set, get) => ({
      packId: null,
      progress: 0,
      paused: false,
      installed: {},
      finishedId: null,
      error: null,
      downloadedBytes: 0,
      totalBytes: 0,
      speedBps: 0,
      start: (packId) => {
        if (!contentSources.openStax) return;
        if (get().installed[packId]) return;
        if (get().packId === packId) {
          if (get().paused) get().togglePause();
          return;
        }
        if (get().packId) return;

        abortController?.abort();
        abortController = new AbortController();
        const signal = abortController.signal;

        set({
          packId,
          progress: 0,
          paused: false,
          finishedId: null,
          error: null,
          downloadedBytes: 0,
          totalBytes: 0,
          speedBps: 0,
        });

        void installOpenStaxPack(
          packId,
          {
            signal,
            isPaused: () => get().paused,
            waitUntilResumed: () =>
              new Promise<void>((resolve) => {
                if (!get().paused) {
                  resolve();
                  return;
                }
                resumeWaiters.push(resolve);
              }),
          },
          (update) => {
            set({
              progress: update.fraction,
              downloadedBytes: update.downloadedBytes,
              totalBytes: update.totalBytes,
              speedBps: update.speedBps,
            });
          },
        )
          .then(() => {
            if (signal.aborted) return;
            set((state) => ({
              progress: 1,
              packId: null,
              paused: false,
              finishedId: packId,
              installed: { ...state.installed, [packId]: true },
            }));
          })
          .catch((error: unknown) => {
            const message =
              error instanceof Error ? error.message : "Pack download failed.";
            if (signal.aborted || message === "Download cancelled") {
              set({ packId: null, progress: 0, paused: false });
              return;
            }
            set({
              packId: null,
              progress: 0,
              paused: false,
              error: message,
            });
          });
      },
      togglePause: () => {
        const paused = !get().paused;
        set({ paused });
        if (paused) pauseActivePackDownload();
        else {
          resumeActivePackDownload();
          notifyResumeWaiters();
        }
      },
      cancel: () => {
        abortController?.abort();
        abortController = null;
        cancelActivePackDownload();
        set({ packId: null, progress: 0, paused: false });
        notifyResumeWaiters();
      },
      dismissFinished: () => set({ finishedId: null }),
      clearError: () => set({ error: null }),
      syncFromDisk: async () => {
        const ids = await discoverInstalledPackIds();
        if (!ids.length) return;
        set((state) => {
          const installed = { ...state.installed };
          for (const id of ids) installed[id] = true;
          return { installed };
        });
      },
    }),
    {
      name: "pack-download-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ installed: state.installed }),
    },
  ),
);

/** @deprecated Import `usePackDownloadStore` from `@/shared/stores/pack-download-store`. */
export const useDownloadStore = usePackDownloadStore;
