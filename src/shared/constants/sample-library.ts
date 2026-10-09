import type { SymbolViewProps } from "expo-symbols";

import {
  openStaxBooks,
  openStaxPacks,
} from "@/shared/content/openstax/initial-resources";
import {
  packAccent,
  packIcon,
} from "@/shared/content/openstax/pack-presentation";
import type { ThemeColor } from "@/shared/constants/theme";

/**
 * Library shell data backed by the bundled OpenStax initial-resources index.
 * User imports and on-device install state will replace or extend this later.
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

export const samplePacks: readonly LibraryPack[] = openStaxPacks.map((pack) => ({
  id: pack.id,
  name: pack.title,
  articles: pack.resourceCount,
  sizeMb: pack.sizeMb,
  updatedAt: pack.updatedAt,
  accent: packAccent(pack.category),
  icon: packIcon(pack.category),
}));

const featuredBooks = openStaxBooks
  .filter((book) => book.locale === "en")
  .slice(0, 2);

export const sampleDocuments: readonly LibraryDocument[] = featuredBooks.map(
  (book) => ({
    id: book.id,
    name: `${book.title} (OpenStax)`,
    sizeMb: Math.max(1, Math.round(book.sizeBytes / (1024 * 1024))),
    addedAt: book.updatedAt,
    kind: "pdf",
  }),
);

export const sampleBookmarks: readonly LibraryBookmark[] = openStaxBooks
  .filter((book) => book.locale === "en")
  .slice(2, 4)
  .map((book) => ({
    id: book.id,
    title: book.title,
    source: book.packTitle,
    savedAt: book.updatedAt,
  }));

export const sampleHistory: readonly LibraryHistoryEntry[] = openStaxBooks
  .filter((book) => book.locale === "en")
  .slice(4, 7)
  .map((book) => ({
    id: book.id,
    query: book.title.split(":")[0]?.trim() ?? book.title,
    source: book.packTitle,
    viewedAt: book.updatedAt,
  }));

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
export function libraryPacksForInstalled(installed: Record<string, boolean>) {
  return samplePacks.filter((pack) => installed[pack.id]);
}

export function installedSizeMb(installed: Record<string, boolean> = {}) {
  const onDevice = libraryPacksForInstalled(installed);
  if (onDevice.length) {
    return onDevice.reduce((total, pack) => total + pack.sizeMb, 0);
  }
  return 0;
}
