export { providerLabel, RESEARCH_PROVIDER_IDS, SEARCH_PROVIDER_IDS, resolveContactEmail } from "./config";
export { useResourceSearch } from "./hooks/use-resource-search";
export { createArxivProvider } from "./providers/arxiv.provider";
export { lookupCrossref } from "./providers/crossref.provider";
export { createEuropePmcProvider } from "./providers/europe-pmc.provider";
export { createOpenAlexProvider } from "./providers/openalex.provider";
export { createPlosProvider } from "./providers/plos.provider";
export { lookupUnpaywall } from "./providers/unpaywall.provider";
export { createWikipediaProvider } from "./providers/wikipedia.provider";
export { createZenodoProvider } from "./providers/zenodo.provider";
export { toDownloadCandidate, validateDocumentLink } from "./services/resource-download-links.service";
export { normalizeResourceResults } from "./services/resource-normalizer.service";
export { createResourceProviders, enrichByDoi, searchResources } from "./services/resource-search.service";
export { ResourceApiError } from "./types/resource.types";
export type {
  AccessStatus,
  DocumentLinkCheck,
  DoiEnrichment,
  FederatedSearchResult,
  ProviderPage,
  ProviderRunStatus,
  ResourceDownloadCandidate,
  ResourceKind,
  ResourceProvider,
  ResourceResult,
  ResourceSearchOptions,
} from "./types/resource.types";
