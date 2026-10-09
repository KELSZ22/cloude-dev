import type { ProviderPage, ResourceProvider, ResourceSearchOptions } from "../types/resource.types";
import { createHttpClient, invalidError, type ProviderDeps } from "../utils/network";
import { buildResult } from "../utils/rights";
import { asRecord, asString, clampPageSize, cleanText, httpUrl, requireQuery } from "../utils/values";

const REST = "https://en.wikipedia.org/w/rest.php/v1";

export function createWikipediaProvider(deps: ProviderDeps = {}): ResourceProvider {
  const http = createHttpClient("wikipedia", deps);

  return {
    id: "wikipedia",
    async search(options: ResourceSearchOptions): Promise<ProviderPage> {
      const pageSize = clampPageSize(options.pageSize, 20);
      const params = new URLSearchParams({
        q: requireQuery("wikipedia", options.query),
        limit: String(pageSize),
      });
      const payload = await http.getJson(`${REST}/search/page?${params}`, options.signal);
      const pages = asRecord(payload)?.pages;
      if (!Array.isArray(pages)) throw invalidError("wikipedia");
      return {
        results: pages.map(mapSearchHit).filter((item) => item !== null),
        hasMore: false,
      };
    },
    async getById(id: string, signal?: AbortSignal) {
      const key = id.replace(/^wikipedia:en:/, "");
      if (!key || key === id) return null;
      const payload = await http.getJsonOrNull(`${REST}/page/${encodeURIComponent(key)}/bare`, signal);
      return payload ? mapBarePage(payload) : null;
    },
  };
}

function mapSearchHit(value: unknown) {
  const page = asRecord(value);
  const key = asString(page?.key);
  const title = asString(page?.title);
  if (!page || !key || !title) return null;
  return buildResult({
    id: `wikipedia:en:${key}`,
    provider: "wikipedia",
    title,
    authors: [],
    description: cleanText(asString(page.description) ?? strip(asString(page.excerpt))),
    kind: "encyclopedia",
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(key)}`,
    language: "en",
    accessStatus: "open-access",
    provenance: "Wikipedia",
  });
}

function mapBarePage(value: unknown) {
  const page = asRecord(value);
  const key = asString(page?.key);
  const title = asString(page?.title);
  if (!page || !key || !title) return null;
  const license = asRecord(page.license);
  return buildResult({
    id: `wikipedia:en:${key}`,
    provider: "wikipedia",
    title,
    kind: "encyclopedia",
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(key)}`,
    language: "en",
    accessStatus: "open-access",
    license: asString(license?.title),
    licenseUrl: httpUrl(asString(license?.url), true),
    provenance: "Wikipedia",
  });
}

function strip(value: string | undefined): string | undefined {
  return cleanText(value);
}
