import { SEARCH_PROVIDER_IDS } from "../config";
import {
  createArxivProvider,
} from "../providers/arxiv.provider";
import { lookupCrossref } from "../providers/crossref.provider";
import { createEuropePmcProvider } from "../providers/europe-pmc.provider";
import { createOpenAlexProvider } from "../providers/openalex.provider";
import { createPlosProvider } from "../providers/plos.provider";
import { lookupUnpaywall } from "../providers/unpaywall.provider";
import { createWikipediaProvider } from "../providers/wikipedia.provider";
import { createZenodoProvider } from "../providers/zenodo.provider";
import {
  ResourceApiError,
  type DoiEnrichment,
  type FederatedSearchResult,
  type ProviderRunStatus,
  type ResourceProvider,
  type ResourceResult,
  type ResourceSearchOptions,
} from "../types/resource.types";
import { normalizeDoi } from "../utils/doi";
import type { ProviderDeps } from "../utils/network";
import { buildResult } from "../utils/rights";
import { normalizeResourceResults, providerSupports } from "./resource-normalizer.service";

export function createResourceProviders(deps: ProviderDeps = {}): ResourceProvider[] {
  return [
    createOpenAlexProvider(deps),
    createArxivProvider(deps),
    createEuropePmcProvider(deps),
    createPlosProvider(deps),
    createZenodoProvider(deps),
    createWikipediaProvider(deps),
  ];
}

export async function searchResources(
  options: ResourceSearchOptions,
  enabledProviders: readonly string[] = SEARCH_PROVIDER_IDS,
  registry: ResourceProvider[] = createResourceProviders(),
): Promise<FederatedSearchResult> {
  const query = options.query?.trim() ?? "";
  if (!query) {
    throw new ResourceApiError({
      provider: "resources",
      code: "invalid",
      retryable: false,
      userMessage: "Enter a search term.",
    });
  }
  const enabled = new Set(enabledProviders);
  const cursors = readCursors(options.cursor);
  const selected = registry.filter((provider) => enabled.has(provider.id));
  const settled = await Promise.allSettled(selected.map(async (provider) => {
    if (!providerSupports(provider.id, options)) {
      const skipped: ProviderRunStatus = {
        provider: provider.id,
        state: "skipped",
        resultCount: 0,
        hasMore: false,
        message: "This source does not match the selected filters.",
      };
      return { status: skipped, results: [] as ResourceResult[] };
    }
    const page = await provider.search({
      ...options,
      query,
      cursor: cursors[provider.id],
    });
    const status: ProviderRunStatus = {
      provider: provider.id,
      state: "ok",
      resultCount: page.results.length,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    };
    return { status, results: page.results };
  }));

  const providers: ProviderRunStatus[] = [];
  const collected: ResourceResult[] = [];
  settled.forEach((outcome, index) => {
    const provider = selected[index];
    if (outcome.status === "fulfilled") {
      providers.push(outcome.value.status);
      collected.push(...outcome.value.results);
      return;
    }
    const error = outcome.reason;
    const wrapped = error instanceof ResourceApiError ? error : new ResourceApiError({
      provider: provider.id,
      code: "invalid",
      retryable: false,
      userMessage: "This source could not complete the request.",
    });
    if (wrapped.code !== "cancelled") {
      console.warn(`[resources] ${wrapped.provider} failed`, { code: wrapped.code, status: wrapped.status });
    }
    providers.push({
      provider: provider.id,
      state: "error",
      httpStatus: wrapped.status,
      retryable: wrapped.retryable,
      code: wrapped.code,
      message: wrapped.userMessage,
      resultCount: 0,
      hasMore: false,
    });
  });

  const attempted = providers.filter((status) => status.state !== "skipped");
  const networkUnavailable = attempted.length > 0 && attempted.every((status) =>
    status.state === "error" && (status.code === "network" || status.code === "timeout"));
  const next = Object.fromEntries(providers.flatMap((status) =>
    status.nextCursor ? [[status.provider, status.nextCursor]] : []));
  return {
    results: normalizeResourceResults(collected, { ...options, query }),
    providers,
    nextCursor: Object.keys(next).length ? JSON.stringify(next) : undefined,
    networkUnavailable,
  };
}

export async function enrichByDoi(
  doi: string,
  deps: ProviderDeps & { signal?: AbortSignal } = {},
): Promise<DoiEnrichment> {
  const normalized = normalizeDoi(doi);
  if (!normalized) {
    throw new ResourceApiError({
      provider: "resources",
      code: "invalid",
      retryable: false,
      userMessage: "Enter a valid DOI.",
    });
  }
  const [crossref, unpaywall] = await Promise.all([
    lookupCrossref(normalized, deps),
    lookupUnpaywall(normalized, deps),
  ]);
  const title = crossref.patch?.title ?? unpaywall.patch?.title ?? normalized;
  const base = buildResult({
    id: `doi:${normalized}`,
    provider: crossref.ok ? "crossref" : unpaywall.ok ? "unpaywall" : "crossref",
    title,
    authors: crossref.patch?.authors ?? [],
    description: crossref.patch?.description,
    kind: crossref.patch?.kind ?? "research-paper",
    sourceUrl: crossref.patch?.sourceUrl ?? unpaywall.patch?.sourceUrl ?? `https://doi.org/${normalized}`,
    doi: normalized,
    publishedAt: crossref.patch?.publishedAt ?? unpaywall.patch?.publishedAt,
    accessStatus: unpaywall.patch?.accessStatus ?? "unknown",
    pdfUrl: unpaywall.patch?.pdfUrl,
    license: unpaywall.patch?.license ?? crossref.patch?.license,
    licenseUrl: crossref.patch?.licenseUrl,
    provenance: [crossref.patch?.provenance, unpaywall.patch?.provenance].filter(Boolean).join("; ") || undefined,
  });
  const alsoFoundAt = [
    crossref.ok ? "crossref" : undefined,
    unpaywall.ok ? "unpaywall" : undefined,
  ].filter((provider): provider is string => Boolean(provider) && provider !== base.provider);
  const result = crossref.ok || unpaywall.ok ? { ...base, alsoFoundAt: alsoFoundAt.length ? alsoFoundAt : undefined } : null;
  return { doi: normalized, crossref, unpaywall, result };
}

function readCursors(cursor: string | undefined): Record<string, string> {
  if (!cursor) return {};
  try {
    const parsed = JSON.parse(cursor) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}
