import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** The article record returned by a research provider, kept on this device. */
export type SavedResourceArticle = {
  id: string;
  title: string;
  authors: string[];
  description: string;
  source: string;
  sourceUrl: string;
  doi?: string;
  publishedAt?: string;
  license?: string;
  savedAt: string;
};

type SavedResourceState = {
  items: SavedResourceArticle[];
  save: (article: SavedResourceArticle) => void;
  remove: (id: string) => void;
};

export const useSavedResourceStore = create<SavedResourceState>()(
  persist(
    (set) => ({
      items: [],
      save: (article) =>
        set((state) => ({
          items: [article, ...state.items.filter((item) => item.id !== article.id)],
        })),
      remove: (id) =>
        set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
    }),
    {
      name: "saved-resource-articles",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
