import type { ResourceResult, ResourceSearchOptions } from "../types/resource.types";
import { deduplicateResults, rankResults } from "../utils/deduplicate";
import { yearOf } from "../utils/values";

export function normalizeResourceResults(
  results: ResourceResult[],
  options: ResourceSearchOptions,
): ResourceResult[] {
  const merged = deduplicateResults(results).filter((result) => matchesFilters(result, options));
  return rankResults(merged, options.query);
}

function matchesFilters(result: ResourceResult, options: ResourceSearchOptions): boolean {
  if (options.openAccessOnly && result.accessStatus !== "open-access") return false;
  if (options.pdfOnly && !result.pdfUrl) return false;
  if (options.category && options.category !== "all") {
    const kindOk = options.category === "research-paper"
      ? result.kind === "research-paper" || result.kind === "preprint"
      : result.kind === options.category;
    if (!kindOk) return false;
  }
  const year = yearOf(result.publishedAt);
  if (options.fromYear && year && year < options.fromYear) return false;
  if (options.toYear && year && year > options.toYear) return false;
  return true;
}

const SUPPORTED: Record<string, NonNullable<ResourceSearchOptions["category"]>[]> = {
  openalex: ["all", "research-paper", "article", "book", "report", "preprint", "encyclopedia"],
  arxiv: ["all", "preprint", "research-paper"],
  europepmc: ["all", "research-paper", "article", "preprint"],
  plos: ["all", "research-paper", "article"],
  zenodo: ["all", "research-paper", "article", "book", "report", "preprint"],
  wikipedia: ["all", "encyclopedia"],
};

export function providerSupports(provider: string, options: ResourceSearchOptions): boolean {
  if (options.pdfOnly && provider === "wikipedia") return false;
  const category = options.category ?? "all";
  const supported = SUPPORTED[provider];
  if (!supported) return true;
  return supported.includes(category);
}
