import {
  figureFileName, isFigureFileName, isFigureId, isReadingId, mimeForFigureFile, readingId, readingMinutes, ReadingError,
  type DisplayFigure, type OpenedReading, type ReadingAsset, type ReadingFigure, type ReadingImageMime,
  type ReadingSummary, type SavedReading,
} from "../../shared/types/offline-reading";

const MAX_JSON_BYTES = 2_000_000;
const MAX_PACKAGE_BYTES = 6_000_000;
const FILE_PAGE = /^https:\/\/(commons\.wikimedia\.org|en\.wikipedia\.org|tl\.wikipedia\.org)\/wiki\/File:/;

export interface ReadingStorage {
  keys(): Promise<string[]>;
  read(id: string): Promise<string | null>;
  write(id: string, content: string): Promise<void>;
  writeAssets(id: string, assets: ReadingAsset[]): Promise<void>;
  readAsset(id: string, name: string): Promise<string | null>;
  assetSize(id: string, name: string): Promise<number>;
  remove(id: string): Promise<void>;
}

function validFigure(figure: unknown): figure is ReadingFigure {
  if (!figure || typeof figure !== "object") return false;
  const item = figure as ReadingFigure;
  const mime: ReadingImageMime[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  return isFigureId(item.id) && typeof item.caption === "string" && typeof item.credit === "string" &&
    typeof item.license === "string" && item.license.trim().length > 0 &&
    typeof item.filePageUrl === "string" && FILE_PAGE.test(item.filePageUrl) &&
    mime.includes(item.mime) && positiveSize(item.width) && positiveSize(item.height);
}

function positiveSize(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function decodeReading(raw: string): SavedReading | null {
  try {
    const item = JSON.parse(raw) as SavedReading;
    const figures = Array.isArray(item.figures) ? item.figures : item.version === 1 ? [] : null;
    if (!item || (item.version !== 1 && item.version !== 2) || typeof item.id !== "string" || !isReadingId(item.id) ||
      !["en", "tl"].includes(item.language) || !Number.isSafeInteger(item.pageId) || item.pageId < 1 ||
      item.id !== readingId(item.language, item.pageId) ||
      typeof item.title !== "string" || !item.title.trim() || typeof item.summary !== "string" ||
      !Number.isSafeInteger(item.revisionId) || item.revisionId < 1 ||
      typeof item.downloadedAt !== "string" || !Number.isFinite(Date.parse(item.downloadedAt)) ||
      typeof item.revisedAt !== "string" || !Number.isFinite(Date.parse(item.revisedAt)) ||
      !Number.isFinite(item.readMinutes) || item.readMinutes < 1 ||
      item.license !== "CC BY-SA 4.0" || item.licenseUrl !== "https://creativecommons.org/licenses/by-sa/4.0/" ||
      item.sourceUrl !== `https://${item.language}.wikipedia.org/w/index.php?oldid=${item.revisionId}` ||
      item.historyUrl !== `https://${item.language}.wikipedia.org/w/index.php?curid=${item.pageId}&action=history` ||
      !Array.isArray(item.sections) || !item.sections.length ||
      !item.sections.every((section) => section && typeof section.title === "string" &&
        Number.isInteger(section.level) && section.level >= 1 && section.level <= 6 &&
        Array.isArray(section.paragraphs) && section.paragraphs.every((p) => typeof p === "string")) ||
      !item.sections.some((section) => section.paragraphs.some((p) => p.trim())) ||
      !figures || !figures.every(validFigure) ||
      new Set(figures.map((figure) => figure.id)).size !== figures.length) return null;
    return { ...item, figures };
  } catch {
    return null;
  }
}

async function packageSize(storage: ReadingStorage, item: SavedReading, raw: string) {
  let extra = 0;
  for (const figure of item.figures) extra += await storage.assetSize(item.id, figureFileName(figure));
  return { ...summarize(item, raw), sizeBytes: new TextEncoder().encode(raw).byteLength + extra };
}

function summarize(item: SavedReading, raw: string, extraBytes = 0): ReadingSummary {
  const { sections: _sections, figures: _figures, ...summary } = item;
  return {
    ...summary,
    readMinutes: readingMinutes(item.sections),
    figureCount: item.figures.length,
    sizeBytes: new TextEncoder().encode(raw).byteLength + extraBytes,
  };
}

export function createReadingRepository(storage: ReadingStorage) {
  return {
    async list(): Promise<ReadingSummary[]> {
      const summaries: ReadingSummary[] = [];
      // Keep only metadata in memory; load one article at a time on mobile.
      for (const id of await storage.keys()) {
        if (!isReadingId(id)) continue;
        const raw = await storage.read(id);
        const item = raw ? decodeReading(raw) : null;
        if (item && raw && item.id === id) summaries.push(await packageSize(storage, item, raw));
      }
      return summaries.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
    },
    async get(id: string): Promise<OpenedReading | null> {
      if (!isReadingId(id)) return null;
      const raw = await storage.read(id);
      const item = raw ? decodeReading(raw) : null;
      if (!item || item.id !== id) return null;
      const figures: DisplayFigure[] = [];
      for (const figure of item.figures) {
        const uri = await storage.readAsset(item.id, figureFileName(figure));
        if (uri) figures.push({ ...figure, uri });
      }
      return { ...item, figures, readMinutes: readingMinutes(item.sections) };
    },
    async save(item: SavedReading, assets: ReadingAsset[] = []) {
      const raw = JSON.stringify(item);
      if (!decodeReading(raw)) throw new ReadingError("unavailable");
      const names = new Set(item.figures.map(figureFileName));
      if (assets.some((asset) => !isFigureFileName(asset.name) || !mimeForFigureFile(asset.name) || !names.has(asset.name)) ||
        item.figures.some((figure) => !assets.some((asset) => asset.name === figureFileName(figure)))) {
        throw new ReadingError("unavailable");
      }
      const extraBytes = assets.reduce((total, asset) => total + asset.bytes.byteLength, 0);
      const summary = summarize(item, raw, extraBytes);
      if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BYTES || summary.sizeBytes > MAX_PACKAGE_BYTES) {
        throw new ReadingError("tooLarge");
      }
      try {
        await storage.writeAssets(item.id, assets);
        await storage.write(item.id, raw);
      } catch (error) {
        await storage.remove(item.id).catch(() => undefined);
        throw error;
      }
      return summary;
    },
    async remove(id: string) {
      if (!isReadingId(id)) throw new ReadingError("unavailable");
      await storage.remove(id);
    },
  };
}
