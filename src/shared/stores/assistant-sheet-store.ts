import { create } from "zustand";

type AssistantSheetState = {
  open: boolean;
  /** Changes on every open, so a second tap on the same article asks again. */
  requestId: number;
  articleTitle: string | null;
  openAssistant: (context?: { articleTitle?: string }) => void;
  closeAssistant: () => void;
};

export const useAssistantSheetStore = create<AssistantSheetState>((set) => ({
  open: false,
  requestId: 0,
  articleTitle: null,
  openAssistant: (context) =>
    set((state) => ({
      open: true,
      requestId: state.requestId + 1,
      articleTitle: context?.articleTitle ?? null,
    })),
  closeAssistant: () => set({ open: false }),
}));
