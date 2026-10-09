import type { SymbolViewProps } from "expo-symbols";

import type { ThemeColor } from "@/shared/constants/theme";

/**
 * Placeholder library content for the shell. Local storage replaces this once
 * pack installation and document import are wired up.
 */

export interface LibraryPack {
  id: string;
  name: string;
  articles: number;
  sizeMb: number;
  /** ISO date of the last pack refresh. */
  updatedAt: string;
  accent: ThemeColor;
  icon: SymbolViewProps["name"];
}

export interface LibraryDocument {
  id: string;
  name: string;
  sizeMb: number;
  addedAt: string;
  kind: "pdf" | "text";
}

export interface LibraryBookmark {
  id: string;
  title: string;
  source: string;
  savedAt: string;
}

export interface LibraryHistoryEntry {
  id: string;
  query: string;
  source: string;
  viewedAt: string;
}

export const samplePacks: readonly LibraryPack[] = [
  {
    id: "general-knowledge",
    name: "General Knowledge",
    articles: 1850,
    sizeMb: 450,
    updatedAt: "2026-10-02",
    accent: "tint",
    icon: { ios: "graduationcap.fill", android: "school", web: "school" },
  },
  {
    id: "science-nature",
    name: "Science & Nature",
    articles: 2430,
    sizeMb: 620,
    updatedAt: "2026-09-28",
    accent: "accentBlue",
    icon: { ios: "globe.americas.fill", android: "public", web: "public" },
  },
  {
    id: "world-history",
    name: "World History",
    articles: 1240,
    sizeMb: 320,
    updatedAt: "2026-09-21",
    accent: "accentGold",
    icon: {
      ios: "building.columns.fill",
      android: "account_balance",
      web: "account_balance",
    },
  },
  {
    id: "technology",
    name: "Technology",
    articles: 960,
    sizeMb: 280,
    updatedAt: "2026-09-14",
    accent: "tint",
    icon: { ios: "laptopcomputer", android: "computer", web: "computer" },
  },
];

export const sampleDocuments: readonly LibraryDocument[] = [
  {
    id: "climate-notes",
    name: "Climate Change Notes.pdf",
    sizeMb: 15,
    addedAt: "2026-10-04",
    kind: "pdf",
  },
  {
    id: "research-ideas",
    name: "Research Ideas.txt",
    sizeMb: 2,
    addedAt: "2026-10-01",
    kind: "text",
  },
];

export const sampleBookmarks: readonly LibraryBookmark[] = [
  {
    id: "photosynthesis",
    title: "How photosynthesis stores solar energy",
    source: "Science & Nature",
    savedAt: "2026-10-05",
  },
  {
    id: "monsoon",
    title: "Why the monsoon arrives in June",
    source: "General Knowledge",
    savedAt: "2026-09-30",
  },
];

export const sampleHistory: readonly LibraryHistoryEntry[] = [
  {
    id: "geothermal",
    query: "geothermal energy",
    source: "Science & Nature",
    viewedAt: "2026-10-08",
  },
  {
    id: "trade-routes",
    query: "spice trade routes",
    source: "World History",
    viewedAt: "2026-10-06",
  },
  {
    id: "transistor",
    query: "how a transistor switches",
    source: "Technology",
    viewedAt: "2026-10-03",
  },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Formats an ISO date without relying on Intl being present on every runtime. */
export function formatLibraryDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function formatMegabytes(sizeMb: number) {
  if (sizeMb < 1024) return `${sizeMb} MB`;
  return `${(sizeMb / 1024).toFixed(1)} GB`;
}

/** Total on-device footprint shown in Settings under Manage Storage. */
export function installedSizeMb() {
  const packs = samplePacks.reduce((total, pack) => total + pack.sizeMb, 0);
  const documents = sampleDocuments.reduce(
    (total, document) => total + document.sizeMb,
    0,
  );
  return packs + documents;
}
