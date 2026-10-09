import { create } from "zustand";

type AssistantSheetState = {
  open: boolean;
  /** Changes on every open, so a second tap on the same article asks again. */
  requestId: number;
  articleTitle: string | null;
  /** Text from the open article. Follow-up questions stay on this page. */
  pageText: string | null;
  openAssistant: (context?: { articleTitle?: string; pageText?: string }) => void;
  closeAssistant: () => void;
};

export const useAssistantSheetStore = create<AssistantSheetState>((set) => ({
  open: false,
  requestId: 0,
  articleTitle: null,
  pageText: null,
  openAssistant: (context) =>
    set((state) => ({
      open: true,
      requestId: state.requestId + 1,
      articleTitle: context?.articleTitle ?? null,
      pageText: context?.pageText ?? null,
    })),
  closeAssistant: () => set({ open: false }),
}));
