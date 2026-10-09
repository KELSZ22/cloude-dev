import { create } from "zustand";

type DownloadStore = {
  packId: string | null;
  progress: number;
  paused: boolean;
  installed: Record<string, boolean>;
  finishedId: string | null;
  start: (packId: string) => void;
  togglePause: () => void;
  cancel: () => void;
  dismissFinished: () => void;
};

let timer: ReturnType<typeof setInterval> | null = null;

function stopTimer() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  packId: null,
  progress: 0,
  paused: false,
  installed: {},
  finishedId: null,
  start: (packId) => {
    if (get().installed[packId]) return;
    if (get().packId === packId) {
      set({ paused: false, finishedId: null });
      return;
    }
    set({ packId, progress: 0.56, paused: false, finishedId: null });
    if (timer) return;
    timer = setInterval(() => {
      const { packId: active, paused, progress } = get();
      if (!active || paused) return;
      const next = Math.min(1, progress + 0.01);
      if (next >= 1) {
        set((state) => ({
          progress: 1,
          packId: null,
          paused: false,
          finishedId: active,
          installed: { ...state.installed, [active]: true },
        }));
        stopTimer();
        return;
      }
      set({ progress: next });
    }, 350);
  },
  togglePause: () => set((state) => ({ paused: !state.paused })),
  cancel: () => {
    stopTimer();
    set({ packId: null, progress: 0, paused: false });
  },
  dismissFinished: () => set({ finishedId: null }),
}));
