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
import type { MessageKey } from "@/shared/i18n";
import type { OnboardingTopicId } from "@/shared/stores/onboarding-store";

export type SearchKind = "article" | "document" | "pack";

export const topicLabelKey = {
  general: "topics.general",
  science: "topics.science",
  technology: "topics.technology",
  history: "topics.history",
  health: "topics.health",
  business: "topics.business",
  arts: "topics.arts",
  environment: "topics.environment",
} as const satisfies Record<OnboardingTopicId, MessageKey>;

const topicPacks: Record<OnboardingTopicId, readonly string[]> = {
  general: ["college-success", "math", "matematicas"],
  science: ["science", "ciencia"],
  technology: ["computer-science"],
  history: ["humanities", "social-sciences"],
  health: ["nursing"],
  business: ["business"],
  arts: ["humanities"],
  environment: [],
};

export type CatalogArticle = {
  id: string;
  title: string;
  pack: string;
  packId: string;
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
  pdfUrl?: string | null;
};

export const articles: readonly CatalogArticle[] = [
  ...openStaxBooks.map((book, index) => ({
    id: book.id,
    title: book.title,
    pack: book.packTitle,
    packId: book.packId,
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
    pdfUrl: book.pdfUrl,
  })),
  ...openStaxPacks.map((pack) => ({
    id: `pack:${pack.id}`,
    title: pack.title,
    pack: "OpenStax",
    packId: pack.id,
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

export function articleMatchesTopic(
  article: CatalogArticle,
  topic: OnboardingTopicId,
) {
  const text = `${article.title} ${article.tags}`.toLowerCase();
  if (topic === "environment") {
    return /biology|microbiology|astronomy|nutrition|environment|ecology|climate/.test(
      text,
    );
  }
  if (topic === "arts") {
    return /philosoph|writing|literature|music|culture/.test(text);
  }
  if (topic === "history") {
    return /history|government|political|sociolog|anthropolog|psycholog|econom/.test(
      text,
    );
  }
  if (topic === "technology") {
    return (
      article.packId === "computer-science" ||
      /computer|python|software|data science|information systems|manufacturing/.test(
        text,
      )
    );
  }
  return topicPacks[topic].includes(article.packId);
}

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
