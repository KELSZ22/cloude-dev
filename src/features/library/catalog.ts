import { openStaxPacks } from "@/shared/content/openstax/initial-resources";
import { packArtwork } from "@/shared/content/openstax/pack-presentation";
import {
  formatPackCount,
  type KnowledgePackCard,
  type PackCategory,
} from "@/shared/content/knowledge-pack";

export type { KnowledgePackCard, PackCategory };

export const knowledgePacks: readonly KnowledgePackCard[] = openStaxPacks.map(
  (pack) => ({
    id: pack.id,
    title: pack.title,
    category: pack.category,
    articles: pack.resourceCount,
    sizeMb: pack.sizeMb,
    description: pack.description,
    highlights: pack.highlights,
    image: packArtwork(pack.id, pack.category),
  }),
);

export const formatCount = formatPackCount;

export function knowledgePackById(id: string) {
  return knowledgePacks.find((pack) => pack.id === id);
}
