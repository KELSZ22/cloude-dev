import type { AccessStatus, ProviderPage, ResourceProvider, ResourceSearchOptions } from "../types/resource.types";
import { doiUrl, normalizeDoi } from "../utils/doi";
import { createHttpClient, invalidError, type ProviderDeps } from "../utils/network";
import { buildResult } from "../utils/rights";
import { asArray, asRecord, asString, clampPageSize, cleanText, httpUrl, requireQuery } from "../utils/values";

const ENDPOINT = "https://zenodo.org/api/records";

export function createZenodoProvider(deps: ProviderDeps = {}): ResourceProvider {
  const http = createHttpClient("zenodo", deps);

  async function load(params: URLSearchParams, signal?: AbortSignal) {
    const payload = await http.getJson(`${ENDPOINT}?${params}`, signal);
    const hits = asRecord(asRecord(payload)?.hits);
    if (!hits || !Array.isArray(hits.hits)) throw invalidError("zenodo");
    return {
      results: hits.hits.map(mapRecord).filter((item) => item !== null),
      next: httpUrl(asString(asRecord(asRecord(payload)?.links)?.next)),
    };
  }

  return {
    id: "zenodo",
    async search(options: ResourceSearchOptions): Promise<ProviderPage> {
      const pageSize = clampPageSize(options.pageSize);
      const page = cursorPage(options.cursor);
      const params = new URLSearchParams({
        q: zenodoQuery(requireQuery("zenodo", options.query), options.openAccessOnly),
        size: String(pageSize),
        page: String(page),
        sort: "bestmatch",
      });
      const loaded = await load(params, options.signal);
      const hasMore = Boolean(loaded.next) && loaded.results.length > 0;
      return { results: loaded.results, nextCursor: hasMore ? String(page + 1) : undefined, hasMore };
    },
    async getById(id: string, signal?: AbortSignal) {
      const recordId = id.replace(/^zenodo:/, "");
      if (!/^\d+$/.test(recordId)) return null;
      const payload = await http.getJsonOrNull(`${ENDPOINT}/${recordId}`, signal);
      return payload ? mapRecord(payload) : null;
    },
  };
}

function zenodoQuery(query: string, openAccessOnly?: boolean): string {
  const cleaned = query.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
  return openAccessOnly ? `${cleaned} AND access_right:open` : cleaned;
}

function cursorPage(cursor: string | undefined): number {
  const page = Number(cursor ?? "1");
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

function mapRecord(value: unknown) {
  const record = asRecord(value);
  const metadata = asRecord(record?.metadata);
  const title = cleanText(asString(metadata?.title), 400);
  const recordId = record?.id;
  if (!record || !metadata || !title || (typeof recordId !== "number" && typeof recordId !== "string")) return null;
  const access = asString(metadata.access_right);
  const accessStatus: AccessStatus = access === "open" ? "open-access"
    : access === "restricted" || access === "closed" || access === "embargoed" ? "restricted"
    : "unknown";
  const files = asArray(record.files).map(fileLink).filter((file) => file !== null);
  const pdf = accessStatus === "open-access" ? files.find((file) => file.pdf) : undefined;
  const other = accessStatus === "open-access" ? files.find((file) => !file.pdf) : undefined;
  const doi = normalizeDoi(asString(metadata.doi) ?? asString(record.doi));
  const links = asRecord(record.links);
  const license = licenseId(metadata.license);
  return buildResult({
    id: `zenodo:${recordId}`,
    provider: "zenodo",
    title,
    authors: asArray(metadata.creators)
      .map((creator) => asString(asRecord(creator)?.name))
      .filter((name): name is string => Boolean(name)),
    description: cleanText(asString(metadata.description)),
    kind: zenodoKind(asString(metadata.resource_type) ?? asString(asRecord(metadata.resource_type)?.type)),
    sourceUrl: httpUrl(asString(links?.self_html)) ?? doiUrl(doi) ?? `https://zenodo.org/records/${recordId}`,
    doi,
    publishedAt: asString(metadata.publication_date),
    language: asString(metadata.language),
    accessStatus,
    pdfUrl: pdf?.url,
    fileUrl: pdf ? undefined : other?.url,
    license,
    provenance: "Zenodo",
  });
}

function fileLink(value: unknown): { url: string; pdf: boolean } | null {
  const file = asRecord(value);
  const key = asString(file?.key) ?? "";
  const url = httpUrl(asString(asRecord(file?.links)?.self), true);
  if (!url) return null;
  return { url, pdf: /\.pdf$/i.test(key) || /\.pdf(\/|$|\?)/i.test(url) };
}

function licenseId(value: unknown): string | undefined {
  return asString(value) ?? asString(asRecord(value)?.id);
}

function zenodoKind(value: string | undefined): ResourceResultKind {
  if (value === "publication" || value === "article" || value === "presentation") return "article";
  if (value === "book") return "book";
  if (value === "report") return "report";
  if (value === "preprint") return "preprint";
  return "article";
}

type ResourceResultKind = "research-paper" | "article" | "book" | "report" | "preprint" | "encyclopedia";
