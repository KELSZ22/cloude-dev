import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SavedCatalogArticle = {
  id: string;
  title: string;
  pack: string;
  summary: string;
  readMinutes: number;
};

type SavedCatalogState = {
  items: SavedCatalogArticle[];
  save: (article: SavedCatalogArticle) => void;
  remove: (id: string) => void;
};

export const useSavedCatalogStore = create<SavedCatalogState>()(
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
      name: "saved-catalog-articles",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
