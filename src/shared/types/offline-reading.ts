export type WikipediaLanguage = "en" | "tl";

export type ReadingSection = {
  title: string;
  level: number;
  paragraphs: string[];
};

export type ReadingImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export type ReadingFigure = {
  id: string;
  caption: string;
  credit: string;
  license: string;
  filePageUrl: `https://${string}`;
  mime: ReadingImageMime;
  width: number;
  height: number;
};

export type DisplayFigure = ReadingFigure & { uri: string };

export type SavedReading = {
  version: 1 | 2;
  id: string;
  pageId: number;
  language: WikipediaLanguage;
  title: string;
  summary: string;
  revisionId: number;
  revisedAt: string;
  downloadedAt: string;
  sourceUrl: `https://${string}`;
  historyUrl: `https://${string}`;
  license: "CC BY-SA 4.0";
  licenseUrl: `https://${string}`;
  readMinutes: number;
  sections: ReadingSection[];
  figures: ReadingFigure[];
};

export type OpenedReading = Omit<SavedReading, "figures"> & { figures: DisplayFigure[] };

export type ReadingAsset = { name: string; bytes: Uint8Array };

export type ReadingDownload = { article: SavedReading; assets: ReadingAsset[] };

export type ReadingSummary = Omit<SavedReading, "sections" | "figures"> & {
  sizeBytes: number;
  figureCount: number;
};

export type WikipediaResult = {
  id: string;
  pageId: number;
  language: WikipediaLanguage;
  title: string;
  wordCount: number;
  thumbnailUrl?: string;
};

export type ReadingErrorCode = "network" | "unavailable" | "tooLarge" | "storage" | "cancelled";

export class ReadingError extends Error {
  constructor(public readonly code: ReadingErrorCode) {
    super(code);
    this.name = "ReadingError";
  }
}

const IMAGE_EXTENSION: Record<ReadingImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function readingId(language: WikipediaLanguage, pageId: number) {
  return `wikipedia-${language}-${pageId}`;
}

export function isReadingId(id: string) {
  return /^wikipedia-(en|tl)-[1-9]\d*$/.test(id);
}

export function isFigureId(id: string) {
  return /^fig-[1-8]$/.test(id);
}

export function figureFileName(figure: Pick<ReadingFigure, "id" | "mime">) {
  return `${figure.id}.${IMAGE_EXTENSION[figure.mime]}`;
}

export function isFigureFileName(name: string) {
  return /^fig-[1-8]\.(jpg|png|webp|gif)$/.test(name);
}

export function mimeForFigureFile(name: string): ReadingImageMime | null {
  if (name.endsWith(".jpg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return null;
}
