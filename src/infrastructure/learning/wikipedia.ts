import {
  figureFileName,
  ReadingError,
  readingId,
  type ReadingAsset,
  type ReadingDownload,
  type ReadingFigure,
  type ReadingImageMime,
  type ReadingSection,
  type WikipediaLanguage,
  type WikipediaResult,
} from "../../shared/types/offline-reading";

type JsonObject = Record<string, unknown>;

const MAX_EXTRACT = 1_000_000;
const MAX_FIGURES = 8;
const MAX_FIGURE_BYTES = 400_000;
const MIN_FIGURE_WIDTH = 240;
const DECORATIVE = /logo|icon|ambox|symbol_|speaker|wiktionary|wikibooks|commons-logo|edit-clear|question.?book|padlock|disambig|crystal|nuvola|increase|decrease|office-book|red.?pencil|featured|sound-icon|videoicon|lock-|folder_|check\.svg|x.?mark|star_of|p_?vip|wikimedia/i;

function object(value: unknown): JsonObject {
  return value && typeof value === "object" ? value as JsonObject : {};
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function metadataText(entry: unknown) {
  const value = object(entry).value;
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
}

function allowedFilePage(url: unknown): url is `https://${string}` {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const path = decodeURIComponent(parsed.pathname);
    return parsed.protocol === "https:" &&
      (host === "commons.wikimedia.org" || host === "en.wikipedia.org" || host === "tl.wikipedia.org") &&
      path.includes("/wiki/File:");
  } catch {
    return false;
  }
}

function allowedWikimediaMediaUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" &&
      (parsed.hostname === "upload.wikimedia.org" || parsed.hostname === "thumb.wikimedia.org");
  } catch {
    return false;
  }
}

function imageMime(bytes: Uint8Array): ReadingImageMime | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (bytes[0] === 0x52 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  return null;
}

async function queryWikipedia(
  language: WikipediaLanguage,
  params: Record<string, string>,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  if (language !== "en" && language !== "tl") throw new ReadingError("unavailable");
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  const timeout = setTimeout(cancel, 25_000);
  try {
    if (controller.signal.aborted) throw new ReadingError("cancelled");
    const search = new URLSearchParams({
      action: "query", format: "json", formatversion: "2", origin: "*", ...params,
    });
    const response = await fetcher(`https://${language}.wikipedia.org/w/api.php?${search}`, {
      signal: controller.signal,
      headers: { "Api-User-Agent": "AralSearch/1.0 (offline educational reader)" },
    });
    if (!response.ok) throw new ReadingError("network");
    const data = object(await response.json());
    if (data.error) throw new ReadingError("unavailable");
    // Never mark a truncated/failed extract as a complete download.
    if (object(data.warnings).extracts) throw new ReadingError("unavailable");
    return object(data.query);
  } catch (error) {
    if (signal?.aborted) throw new ReadingError("cancelled");
    if (error instanceof ReadingError) throw error;
    throw new ReadingError("network");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

async function fetchImageBytes(url: string, signal: AbortSignal | undefined, fetcher: typeof fetch) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  const timeout = setTimeout(cancel, 25_000);
  try {
    if (controller.signal.aborted) throw new ReadingError("cancelled");
    const response = await fetcher(url, {
      signal: controller.signal,
      headers: { "Api-User-Agent": "AralSearch/1.0 (offline educational reader)" },
    });
    if (!response.ok) throw new ReadingError("network");
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength < 32 || buffer.byteLength > MAX_FIGURE_BYTES) throw new ReadingError("tooLarge");
    return buffer;
  } catch (error) {
    if (signal?.aborted) throw new ReadingError("cancelled");
    if (error instanceof ReadingError) throw error;
    throw new ReadingError("network");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

export async function searchWikipedia(
  query: string,
  language: WikipediaLanguage,
  signal?: AbortSignal,
  fetcher?: typeof fetch,
): Promise<WikipediaResult[]> {
  const needle = query.trim();
  if (!needle) return [];
  const result = await queryWikipedia(language, {
    generator: "search", gsrsearch: needle.slice(0, 200), gsrnamespace: "0",
    gsrlimit: "12", gsrprop: "wordcount", prop: "pageimages", piprop: "thumbnail",
    pithumbsize: "160",
  }, signal, fetcher);
  if (!Array.isArray(result.pages)) throw new ReadingError("unavailable");
  return [...result.pages].map(object).sort((a, b) =>
    (positiveInteger(a.index) ? a.index : 999) - (positiveInteger(b.index) ? b.index : 999)
  ).flatMap((page) => {
    if (!positiveInteger(page.pageid) || typeof page.title !== "string") return [];
    const thumb = object(page.thumbnail).source;
    return [{
      id: readingId(language, page.pageid), pageId: page.pageid,
      language, title: page.title,
      wordCount: positiveInteger(page.wordcount) ? page.wordcount : 0,
      ...(allowedWikimediaMediaUrl(thumb) ? { thumbnailUrl: thumb } : {}),
    }];
  });
}

export function extractSections(text: string): ReadingSection[] {
  const sections: ReadingSection[] = [{ title: "", level: 1, paragraphs: [] }];
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const heading = /^(={2,6})\s+(.+?)\s+\1$/.exec(trimmed);
    if (heading) {
      sections.push({ title: heading[2], level: heading[1].length, paragraphs: [] });
    } else {
      sections[sections.length - 1].paragraphs.push(trimmed);
    }
  }
  return sections.filter((section) => section.title || section.paragraphs.length);
}

function candidateFromFilePage(page: JsonObject, leadName: string) {
  const title = typeof page.title === "string" ? page.title : "";
  const info = object(Array.isArray(page.imageinfo) ? page.imageinfo[0] : undefined);
  const mime = info.mime;
  const width = positiveInteger(info.thumbwidth) ? info.thumbwidth : 0;
  const height = positiveInteger(info.thumbheight) ? info.thumbheight : 0;
  const license = metadataText(object(info.extmetadata).LicenseShortName);
  const raster = mime === "image/jpeg" || mime === "image/png" || mime === "image/webp" || mime === "image/gif";
  if (!title.startsWith("File:") || DECORATIVE.test(title) ||
    (!raster && mime !== "image/svg+xml") ||
    width < MIN_FIGURE_WIDTH || !allowedWikimediaMediaUrl(info.thumburl) || !allowedFilePage(info.descriptionurl) ||
    !license) return null;
  const fileName = title.slice(5).replace(/ /g, "_");
  return {
    title, mime: mime as ReadingImageMime, width, height, license,
    thumburl: info.thumburl as string, filePageUrl: info.descriptionurl,
    caption: metadataText(object(info.extmetadata).ImageDescription),
    credit: metadataText(object(info.extmetadata).Artist) || metadataText(object(info.extmetadata).Credit),
    lead: fileName === leadName.replace(/ /g, "_"),
  };
}

async function downloadFigures(
  pageId: number,
  language: WikipediaLanguage,
  leadName: string,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch,
): Promise<{ figures: ReadingFigure[]; assets: ReadingAsset[] }> {
  const result = await queryWikipedia(language, {
    generator: "images", pageids: String(pageId), gimlimit: "40",
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "720",
  }, signal, fetcher);
  const pages = Array.isArray(result.pages) ? result.pages.map(object) : [];
  const candidates = pages.map((page) => candidateFromFilePage(page, leadName))
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => Number(b.lead) - Number(a.lead))
    .slice(0, MAX_FIGURES);
  const figures: ReadingFigure[] = [];
  const assets: ReadingAsset[] = [];
  for (const candidate of candidates) {
    try {
      const bytes = await fetchImageBytes(candidate.thumburl, signal, fetcher);
      const detected = imageMime(bytes);
      if (!detected) continue;
      const id = `fig-${figures.length + 1}`;
      const figure: ReadingFigure = {
        id, caption: candidate.caption, credit: candidate.credit, license: candidate.license,
        filePageUrl: candidate.filePageUrl, mime: detected,
        width: candidate.width, height: candidate.height,
      };
      figures.push(figure);
      assets.push({ name: figureFileName(figure), bytes });
    } catch (error) {
      if (error instanceof ReadingError && error.code === "cancelled") throw error;
    }
  }
  return { figures, assets };
}

export async function downloadWikipedia(
  pageId: number,
  language: WikipediaLanguage,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<ReadingDownload> {
  if (!positiveInteger(pageId)) throw new ReadingError("unavailable");
  const result = await queryWikipedia(language, {
    pageids: String(pageId), prop: "extracts|revisions|pageimages", rvprop: "ids|timestamp",
    piprop: "name", explaintext: "1", exsectionformat: "wiki",
    // No exintro, exchars, or exsentences: request all available article text.
  }, signal, fetcher);
  const page = object(Array.isArray(result.pages) ? result.pages[0] : undefined);
  const revision = object(Array.isArray(page.revisions) ? page.revisions[0] : undefined);
  if (page.missing || page.pageid !== pageId || typeof page.title !== "string" ||
    typeof page.extract !== "string" || !page.extract.trim() ||
    !positiveInteger(revision.revid) || typeof revision.timestamp !== "string" ||
    !Number.isFinite(Date.parse(revision.timestamp))) {
    throw new ReadingError("unavailable");
  }
  if (page.extract.length > MAX_EXTRACT) throw new ReadingError("tooLarge");
  const sections = extractSections(page.extract);
  if (!sections.some((section) => section.paragraphs.length)) throw new ReadingError("unavailable");
  let figures: ReadingFigure[] = [];
  let assets: ReadingAsset[] = [];
  try {
    const media = await downloadFigures(
      pageId, language, typeof page.pageimage === "string" ? page.pageimage : "", signal, fetcher,
    );
    figures = media.figures;
    assets = media.assets;
  } catch (error) {
    if (error instanceof ReadingError && error.code === "cancelled") throw error;
  }
  const base = `https://${language}.wikipedia.org` as const;
  return {
    article: {
      version: 2, id: readingId(language, pageId), pageId, language, title: page.title,
      summary: sections.flatMap((section) => section.paragraphs)[0].slice(0, 260),
      revisionId: revision.revid, revisedAt: revision.timestamp,
      downloadedAt: new Date().toISOString(),
      sourceUrl: `${base}/w/index.php?oldid=${revision.revid}`,
      historyUrl: `${base}/w/index.php?curid=${pageId}&action=history`,
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      readMinutes: Math.max(1, Math.ceil(page.extract.split(/\s+/).length / 220)),
      sections, figures,
    },
    assets,
  };
}
