import type { ImageSource } from "expo-image";

import type { OpenStaxPackCategory } from "@/shared/content/openstax/types";

export type PackCategory = OpenStaxPackCategory;

export type KnowledgePackCard = {
  id: string;
  title: string;
  category: PackCategory;
  articles: number;
  sizeMb: number;
  description: string;
  highlights: readonly string[];
  image: ImageSource;
};

export function formatPackCount(value: number) {
  return value.toLocaleString("en-US");
}
