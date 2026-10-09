import algebraStarter from "@/assets/knowledge-packs/algebra-starter-sample.json";
import type { ImageSource } from "expo-image";
import { parsePack } from "@/infrastructure/knowledge/pack-format";

import {
  openStaxBooks,
  openStaxPackById,
  openStaxPacks,
} from "@/shared/content/openstax/initial-resources";
import {
  bookArtwork,
  packArtwork,
} from "@/shared/content/openstax/pack-presentation";
import { topicLabelKey } from "@/shared/constants/topics";
import type { OnboardingTopicId } from "@/shared/stores/onboarding-store";

export type SearchKind = "article" | "document" | "pack";

export { topicLabelKey };

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

export type CatalogSection = {
  title: string;
  level: number;
  paragraphs: string[];
};

const algebraStudy = parsePack(algebraStarter);

export function catalogSections(article: CatalogArticle): CatalogSection[] {
  const overview = article.overview.trim();
  const sections: CatalogSection[] = [{
    title: "",
    level: 1,
    paragraphs: overview ? [overview] : [],
  }];
  if (article.id !== "openstax:algebra-1") return sections.filter(hasSectionText);
  for (const chapter of algebraStudy.chapters) {
    for (const section of chapter.sections) {
      sections.push({
        title: `${chapter.title} · ${section.number} ${section.title}`,
        level: 2,
        paragraphs: section.passages.map((passage) => passage.text),
      });
    }
  }
  return sections.filter(hasSectionText);
}

function hasSectionText(section: CatalogSection) {
  return Boolean(section.title || section.paragraphs.length);
}

export function articlesForPack(packId: string) {
  const pack = openStaxPackById(packId);
  if (!pack) return [];
  return articles.filter(
    (article) => article.kind === "article" && article.pack === pack.title,
  );
}
