import { resolveContactEmail } from "../config";
import type { AccessStatus, ProviderPage, ResourceKind, ResourceProvider, ResourceSearchOptions } from "../types/resource.types";
import { doiUrl, normalizeDoi } from "../utils/doi";
import { createHttpClient, invalidError, type ProviderDeps } from "../utils/network";
import { buildResult } from "../utils/rights";
import {
  asArray,
  asBoolean,
  asRecord,
  asString,
  clampPageSize,
  httpUrl,
  invertedIndexToText,
  requireQuery,
} from "../utils/values";

const ENDPOINT = "https://api.openalex.org/works";
const SELECT = [
  "id",
  "doi",
  "display_name",
  "authorships",
  "publication_date",
  "type",
  "language",
  "open_access",
  "primary_location",
  "best_oa_location",
  "abstract_inverted_index",
].join(",");

export function createOpenAlexProvider(deps: ProviderDeps = {}): ResourceProvider {
  const http = createHttpClient("openalex", deps);
  const email = resolveContactEmail(deps.contactEmail);

  async function load(params: URLSearchParams, signal?: AbortSignal) {
    params.set("select", SELECT);
    if (email) params.set("mailto", email);
    const payload = await http.getJson(`${ENDPOINT}?${params}`, signal);
    const record = asRecord(payload);
    const results = asArray(record?.results).map(mapWork).filter((item) => item !== null);
    if (!record || !Array.isArray(record.results)) throw invalidError("openalex");
    return { record, results };
  }

  return {
    id: "openalex",
    async search(options: ResourceSearchOptions): Promise<ProviderPage> {
      const query = requireQuery("openalex", options.query);
      const pageSize = clampPageSize(options.pageSize);
      const params = new URLSearchParams({ search: query, "per-page": String(pageSize) });
      params.set("cursor", options.cursor || "*");
      const filter = openAlexFilter(options);
      if (filter) params.set("filter", filter);
      const { record, results } = await load(params, options.signal);
      const next = asString(asRecord(record.meta)?.next_cursor);
      const hasMore = Boolean(next) && results.length >= pageSize;
      return { results, nextCursor: hasMore ? next : undefined, hasMore };
    },
    async getById(id: string, signal?: AbortSignal) {
      const workId = id.replace(/^openalex:/, "");
      if (!/^W\d+$/i.test(workId)) return null;
      const params = new URLSearchParams();
      const payload = await http.getJsonOrNull(`${ENDPOINT}/${encodeURIComponent(workId)}?${withSelect(params, email)}`, signal);
      if (!payload) return null;
      return mapWork(payload);
    },
  };
}

function withSelect(params: URLSearchParams, email?: string): URLSearchParams {
  params.set("select", SELECT);
  if (email) params.set("mailto", email);
  return params;
}

function openAlexFilter(options: ResourceSearchOptions): string | undefined {
  const filters: string[] = [];
  if (options.openAccessOnly) filters.push("open_access.is_oa:true");
  if (options.pdfOnly) filters.push("has_pdf_url:true");
  if (options.fromYear) filters.push(`from_publication_date:${options.fromYear}-01-01`);
  if (options.toYear) filters.push(`to_publication_date:${options.toYear}-12-31`);
  const type = openAlexType(options.category);
  if (type) filters.push(`type:${type}`);
  return filters.length ? filters.join(",") : undefined;
}

function openAlexType(category: ResourceSearchOptions["category"]): string | undefined {
  if (category === "book") return "book|book-chapter";
  if (category === "preprint") return "preprint";
  if (category === "report") return "report|dissertation";
  if (category === "encyclopedia") return "reference-entry";
  return undefined;
}

function mapWork(value: unknown) {
  const work = asRecord(value);
  const title = asString(work?.display_name);
  const openAlexUrl = asString(work?.id);
  if (!work || !title || !openAlexUrl) return null;
  const shortId = openAlexUrl.split("/").pop() ?? openAlexUrl;
  const primary = asRecord(work.primary_location);
  const best = asRecord(work.best_oa_location) ?? primary;
  const openAccess = asRecord(work.open_access);
  const doi = normalizeDoi(asString(work.doi));
  const pdfUrl = httpUrl(asString(best?.pdf_url), true);
  const sourceUrl = httpUrl(asString(primary?.landing_page_url)) ?? doiUrl(doi) ?? openAlexUrl;
  const isOpen = asBoolean(openAccess?.is_oa) === true || asBoolean(best?.is_oa) === true;
  const closed = asString(openAccess?.oa_status) === "closed";
  const accessStatus: AccessStatus = isOpen ? "open-access" : closed ? "restricted" : "unknown";
  const license = asString(best?.license) ?? asString(primary?.license);
  return buildResult({
    id: `openalex:${shortId}`,
    provider: "openalex",
    title,
    authors: authorsFrom(work.authorships),
    description: invertedIndexToText(work.abstract_inverted_index),
    kind: mapKind(asString(work.type)),
    sourceUrl,
    doi,
    publishedAt: asString(work.publication_date),
    language: asString(work.language),
    accessStatus,
    pdfUrl,
    license,
    provenance: "OpenAlex",
  });
}

function authorsFrom(value: unknown): string[] {
  return asArray(value)
    .map((entry) => asString(asRecord(asRecord(entry)?.author)?.display_name))
    .filter((name): name is string => Boolean(name));
}

function mapKind(type: string | undefined): ResourceKind {
  if (type === "preprint") return "preprint";
  if (type === "book" || type === "book-chapter") return "book";
  if (type === "report" || type === "dissertation") return "report";
  if (type === "reference-entry") return "encyclopedia";
  if (type === "article" || type === "review" || type === "letter" || type === "editorial") return "research-paper";
  return "article";
}
