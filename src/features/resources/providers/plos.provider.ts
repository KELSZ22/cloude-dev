import type { ProviderPage, ResourceProvider, ResourceSearchOptions } from "../types/resource.types";
import { doiUrl, normalizeDoi } from "../utils/doi";
import { createHttpClient, invalidError, type ProviderDeps } from "../utils/network";
import { buildResult } from "../utils/rights";
import { asArray, asNumber, asRecord, asString, clampPageSize, cleanText, httpUrl, requireQuery } from "../utils/values";

const ENDPOINT = "https://api.plos.org/search";
const FIELDS = "id,title,author_display,abstract,publication_date,article_type,link";

export function createPlosProvider(deps: ProviderDeps = {}): ResourceProvider {
  const http = createHttpClient("plos", deps);

  async function load(params: URLSearchParams, signal?: AbortSignal) {
    params.set("wt", "json");
    params.set("fl", FIELDS);
    const payload = await http.getJson(`${ENDPOINT}?${params}`, signal);
    const response = asRecord(asRecord(payload)?.response);
    if (!response || !Array.isArray(response.docs)) throw invalidError("plos");
    return {
      found: asNumber(response.numFound) ?? 0,
      start: asNumber(response.start) ?? 0,
      results: response.docs.map(mapDoc).filter((item) => item !== null),
    };
  }

  return {
    id: "plos",
    async search(options: ResourceSearchOptions): Promise<ProviderPage> {
      const pageSize = clampPageSize(options.pageSize);
      const start = cursorStart(options.cursor);
      const params = new URLSearchParams({
        q: plosQuery(requireQuery("plos", options.query)),
        rows: String(pageSize),
        start: String(start),
      });
      const page = await load(params, options.signal);
      const nextStart = start + pageSize;
      const hasMore = nextStart < page.found;
      return { results: page.results, nextCursor: hasMore ? String(nextStart) : undefined, hasMore };
    },
    async getById(id: string, signal?: AbortSignal) {
      const doi = normalizeDoi(id.replace(/^plos:/, ""));
      if (!doi) return null;
      const params = new URLSearchParams({ q: `id:${doi}`, rows: "1", start: "0" });
      const page = await load(params, signal);
      return page.results[0] ?? null;
    },
  };
}

function plosQuery(query: string): string {
  const term = query.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
  return `title:"${term}" OR abstract:"${term}"`;
}

function cursorStart(cursor: string | undefined): number {
  const start = Number(cursor ?? "0");
  if (!Number.isInteger(start) || start < 0) return 0;
  return start;
}

function mapDoc(value: unknown) {
  const doc = asRecord(value);
  const title = cleanText(asString(doc?.title), 400);
  const doi = normalizeDoi(asString(doc?.id));
  if (!doc || !title || !doi) return null;
  const pdfUrl = pdfFromLinks(doc.link);
  return buildResult({
    id: `plos:${doi}`,
    provider: "plos",
    title,
    authors: asArray(doc.author_display).map(asString).filter((name): name is string => Boolean(name)),
    description: cleanText(asArray(doc.abstract).map(asString).filter(Boolean).join(" ")),
    kind: "research-paper",
    sourceUrl: doiUrl(doi) ?? `https://doi.org/${doi}`,
    doi,
    publishedAt: asString(doc.publication_date),
    accessStatus: "open-access",
    pdfUrl,
    provenance: "PLOS",
  });
}

function pdfFromLinks(value: unknown): string | undefined {
  const links = Array.isArray(value) ? value : value ? [value] : [];
  for (const link of links) {
    const url = httpUrl(asString(link) ?? asString(asRecord(link)?.url), true);
    if (url && /\.pdf($|\?)/i.test(url)) return url;
  }
  return undefined;
}
