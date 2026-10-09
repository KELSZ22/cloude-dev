import type { ImageSource } from "expo-image";

import {
  openStaxBooks,
  openStaxPackById,
  openStaxPacks,
} from "@/shared/content/openstax/initial-resources";
import {
  bookArtwork,
  packArtwork,
} from "@/shared/content/openstax/pack-presentation";

export type SearchKind = "article" | "document" | "pack";

export type CatalogArticle = {
  id: string;
  title: string;
  pack: string;
  kind: SearchKind;
  readMinutes: number;
  summary: string;
  overview: string;
  highlight: string;
  sectionTitle: string;
  subsectionTitle?: string;
  sectionBody: string;
  tags: string;
  image: ImageSource;
  sourcePage?: string | null;
  licenseName?: string;
};

export const articles: readonly CatalogArticle[] = [
  ...openStaxBooks.map((book, index) => ({
    id: book.id,
    title: book.title,
    pack: book.packTitle,
    kind: "article" as const,
    readMinutes: book.readMinutes,
    summary: book.summary,
    overview: book.overview,
    highlight: book.highlight,
    sectionTitle: "About this textbook",
    sectionBody: book.overview,
    tags: book.tags,
    image: book.coverUrl
      ? { uri: book.coverUrl }
      : bookArtwork(book.category, index),
    sourcePage: book.sourcePage,
    licenseName: book.licenseName,
  })),
  ...openStaxPacks.map((pack) => ({
    id: `pack:${pack.id}`,
    title: pack.title,
    pack: "OpenStax",
    kind: "pack" as const,
    readMinutes: 0,
    summary: pack.description,
    overview: `${pack.bookCount} textbooks and ${pack.resourceCount} downloadable resources in this subject pack.`,
    highlight: pack.highlights.join(" · "),
    sectionTitle: "Included subjects",
    sectionBody: pack.highlights.join("\n"),
    tags: `${pack.title} openstax pack ${pack.id}`,
    image: packArtwork(pack.id, pack.category),
  })),
];

export function articleById(id: string) {
  return articles.find((article) => article.id === id);
}

export function articlesForPack(packId: string) {
  const pack = openStaxPackById(packId);
  if (!pack) return [];
  return articles.filter(
    (article) => article.kind === "article" && article.pack === pack.title,
  );
}
