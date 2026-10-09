import type { AccessStatus, ProviderPage, ResourceProvider, ResourceSearchOptions } from "../types/resource.types";
import { doiUrl, normalizeDoi } from "../utils/doi";
import { createHttpClient, invalidError, type ProviderDeps } from "../utils/network";
import { buildResult } from "../utils/rights";
import { asArray, asRecord, asString, clampPageSize, cleanText, httpUrl, requireQuery } from "../utils/values";

const ENDPOINT = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

export function createEuropePmcProvider(deps: ProviderDeps = {}): ResourceProvider {
  const http = createHttpClient("europepmc", deps);

  async function load(params: URLSearchParams, signal?: AbortSignal) {
    params.set("format", "json");
    params.set("resultType", "core");
    const payload = await http.getJson(`${ENDPOINT}?${params}`, signal);
    const record = asRecord(payload);
    const list = asRecord(record?.resultList);
    if (!record || !list) throw invalidError("europepmc");
    const raw = list.result;
    const entries = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
    const results = entries.map(mapRecord).filter((item) => item !== null);
    return { record, results };
  }

  return {
    id: "europepmc",
    async search(options: ResourceSearchOptions): Promise<ProviderPage> {
      const pageSize = clampPageSize(options.pageSize);
      const params = new URLSearchParams({
        query: europeQuery(requireQuery("europepmc", options.query), options),
        pageSize: String(pageSize),
        cursorMark: options.cursor || "*",
      });
      const { record, results } = await load(params, options.signal);
      const next = asString(record.nextCursorMark);
      const hasMore = Boolean(next) && next !== (options.cursor || "*") && results.length >= pageSize;
      return { results, nextCursor: hasMore ? next : undefined, hasMore };
    },
    async getById(id: string, signal?: AbortSignal) {
      const match = id.match(/^europepmc:([^:]+):(.+)$/);
      if (!match) return null;
      const params = new URLSearchParams({
        query: `SRC:${match[1]} AND EXT_ID:${match[2]}`,
        pageSize: "1",
        cursorMark: "*",
      });
      const { results } = await load(params, signal);
      return results[0] ?? null;
    },
  };
}

function europeQuery(query: string, options: ResourceSearchOptions): string {
  const parts = [query];
  if (options.openAccessOnly) parts.push("OPEN_ACCESS:y");
  if (options.pdfOnly) parts.push("HAS_PDF:y");
  if (options.fromYear) parts.push(`PUB_YEAR:[${options.fromYear} TO ${options.toYear ?? 3000}]`);
  else if (options.toYear) parts.push(`PUB_YEAR:[1000 TO ${options.toYear}]`);
  return parts.join(" AND ");
}

function mapRecord(value: unknown) {
  const record = asRecord(value);
  const title = cleanText(asString(record?.title), 400);
  const source = asString(record?.source);
  const extId = asString(record?.id);
  if (!record || !title || !source || !extId) return null;
  const doi = normalizeDoi(asString(record.doi));
  const links = fullTextLinks(record.fullTextUrlList);
  const pdf = links.find((link) => link.style === "pdf" && link.open);
  const landing = links.find((link) => link.open) ?? links[0];
  const accessStatus: AccessStatus = record.isOpenAccess === "Y" || pdf ? "open-access"
    : links.some((link) => link.code === "S") ? "restricted"
    : "unknown";
  return buildResult({
    id: `europepmc:${source}:${extId}`,
    provider: "europepmc",
    title,
    authors: authorNames(record),
    description: cleanText(asString(record.abstractText)),
    kind: source === "PPR" ? "preprint" : "research-paper",
    sourceUrl: landing?.url ?? doiUrl(doi) ?? `https://europepmc.org/article/${source}/${extId}`,
    doi,
    publishedAt: asString(record.pubYear),
    language: asString(record.language),
    accessStatus,
    pdfUrl: pdf?.url,
    license: asString(record.license),
    provenance: "Europe PMC",
  });
}

function authorNames(record: Record<string, unknown>): string[] {
  const listed = asArray(asRecord(record.authorList)?.author)
    .map((author) => asString(asRecord(author)?.fullName))
    .filter((name): name is string => Boolean(name));
  if (listed.length) return listed;
  return (asString(record.authorString) ?? "").split(/,\s*/).map((name) => name.trim()).filter(Boolean);
}

function fullTextLinks(value: unknown): { url: string; style?: string; open: boolean; code?: string }[] {
  const raw = asRecord(value)?.fullTextUrl;
  const entries = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  return entries.flatMap((entry) => {
    const record = asRecord(entry);
    const url = httpUrl(asString(record?.url), true);
    if (!record || !url) return [];
    return [{
      url,
      style: asString(record.documentStyle)?.toLowerCase(),
      code: asString(record.availabilityCode)?.toUpperCase(),
      open: asString(record.availabilityCode)?.toUpperCase() === "OA",
    }];
  });
}
