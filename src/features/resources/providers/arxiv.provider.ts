import { ARXIV_MIN_INTERVAL_MS } from "../config";
import type { ProviderPage, ResourceProvider, ResourceSearchOptions } from "../types/resource.types";
import { parseAtomFeed } from "../utils/atom";
import { normalizeDoi } from "../utils/doi";
import { createHttpClient, delay, invalidError, type ProviderDeps } from "../utils/network";
import { buildResult } from "../utils/rights";
import { clampPageSize, cleanText, httpUrl, requireQuery } from "../utils/values";

const ENDPOINT = "https://export.arxiv.org/api/query";
let lastRequestAt = 0;

export function createArxivProvider(deps: ProviderDeps = {}): ResourceProvider {
  const http = createHttpClient("arxiv", deps);
  const minInterval = deps.minIntervalMs ?? ARXIV_MIN_INTERVAL_MS;

  async function query(params: URLSearchParams, signal?: AbortSignal) {
    const wait = lastRequestAt + minInterval - Date.now();
    if (minInterval > 0 && wait > 0) await (deps.sleep ?? delay)(wait);
    lastRequestAt = Date.now();
    const xml = await http.getText(`${ENDPOINT}?${params}`, signal);
    try {
      return parseAtomFeed(xml);
    } catch {
      throw invalidError("arxiv");
    }
  }

  return {
    id: "arxiv",
    async search(options: ResourceSearchOptions): Promise<ProviderPage> {
      const pageSize = clampPageSize(options.pageSize);
      const start = cursorStart(options.cursor);
      const params = new URLSearchParams({
        search_query: arxivQuery(requireQuery("arxiv", options.query)),
        start: String(start),
        max_results: String(pageSize),
      });
      const feed = await query(params, options.signal);
      const results = feed.entries.map(mapEntry).filter((item) => item !== null);
      const total = feed.total;
      const hasMore = typeof total === "number" ? start + results.length < total : results.length >= pageSize;
      return { results, nextCursor: hasMore ? String(start + pageSize) : undefined, hasMore };
    },
    async getById(id: string, signal?: AbortSignal) {
      const arxivId = id.replace(/^arxiv:/, "").replace(/^https?:\/\/arxiv\.org\/(abs|pdf)\//, "");
      if (!/^\d{4}\.\d{4,5}(v\d+)?$/.test(arxivId) && !/^[a-z-]+\/\d{7}(v\d+)?$/i.test(arxivId)) return null;
      const params = new URLSearchParams({ id_list: arxivId, max_results: "1" });
      const feed = await query(params, signal);
      return feed.entries.map(mapEntry).find((item) => item !== null) ?? null;
    },
  };
}

function arxivQuery(query: string): string {
  const cleaned = query.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
  return `all:"${cleaned}"`;
}

function cursorStart(cursor: string | undefined): number {
  const start = Number(cursor ?? "0");
  if (!Number.isInteger(start) || start < 0) return 0;
  return start;
}

function mapEntry(entry: ReturnType<typeof parseAtomFeed>["entries"][number]) {
  const title = entry.title;
  if (!title || !entry.id) return null;
  const shortId = entry.id.split("/abs/").pop()?.replace(/v\d+$/, (match) => match) ?? entry.id;
  const pdf = entry.links.find((link) => link.type === "application/pdf" || link.title === "pdf");
  const alternate = entry.links.find((link) => link.rel === "alternate");
  const pdfUrl = httpUrl(pdf?.href, true);
  const sourceUrl = httpUrl(alternate?.href) ?? httpUrl(entry.id) ?? `https://arxiv.org/abs/${shortId}`;
  return buildResult({
    id: `arxiv:${shortId}`,
    provider: "arxiv",
    title,
    authors: entry.authors,
    description: cleanText(entry.summary),
    kind: "preprint",
    sourceUrl,
    doi: normalizeDoi(entry.doi),
    publishedAt: entry.published,
    accessStatus: "open-access",
    pdfUrl,
    provenance: "arXiv",
  });
}
