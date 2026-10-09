# AralSearch — Resource APIs Integration Only

> **Copy this entire file into your coding agent.** This prompt is narrowly scoped to external content discovery APIs and the links/metadata needed to download legitimately accessible PDFs. It is **not** a prompt to rebuild AralSearch.

## Role

Act as a **Senior React Native Engineer and API Integration Architect** working inside an existing **React Native + Expo + TypeScript + Bun** application named **AralSearch** (or its current renamed identity).

**Implement real, working integrations for external open-access knowledge and research resource APIs.** Inspect the existing repository first and conform to its architecture, naming conventions, navigation, and state-management choices. Preserve all currently working features.

## Strict scope

**Build only the resource API layer** needed for online discovery:

1. Provider-specific search connectors.
2. Shared typed data models and provider adapters.
3. A federated search aggregator that queries enabled providers in parallel.
4. Normalization, cross-source deduplication, filtering, basic ranking, and pagination.
5. Provider result attribution, DOI resolution, open-access indicators, PDF/document URL detection, and rights metadata.
6. Download-eligibility decisions based on explicit rights evidence; expose eligible document URLs to the app's existing download workflow.
7. Resilient networking, configuration, verification, and tests.

**Do not** redesign the app, generate new mockup screens, rebuild navigation, add accounts/payments, implement a PDF reader, add SQLite indexing, create knowledge packs, write a RAG pipeline, or integrate an LLM. Integrate with existing UI/services only where necessary to expose the new search data. If a required downstream feature does not yet exist, provide a typed interface and document the boundary instead of building it.

## Providers and integration priorities

Implement actual provider adapters, confirming their current documentation, authentication, terms, and response schemas before coding. Use the **provider's official API**, not HTML scraping.

### Phase A — Core search connectors

| Provider | Usage | Official documentation / entry point |
|---|---|---|
| **OpenAlex** | Multidisciplinary articles, metadata, open-access locations, available PDFs | https://help.openalex.org/api/searching/ ; https://api.openalex.org/works?search=machine%20learning |
| **arXiv** | Preprints in AI, computing, physics, and mathematics; PDF links | https://info.arxiv.org/help/api/ ; https://export.arxiv.org/api/query?search_query=all:machine_learning&start=0&max_results=10 |
| **Europe PMC** | Biomedical and life-science papers, full-text and OA links | https://europepmc.org/RestfulWebService ; https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=OPEN_ACCESS:y&format=json |
| **PLOS** | Open-access science articles and DOIs | https://api.plos.org/ ; https://api.plos.org/search?q=title:climate&fl=id,title&wt=json |
| **Zenodo** | Published research records and attached document files | https://developers.zenodo.org/ ; https://zenodo.org/api/records?q=artificial%20intelligence |
| **Wikimedia / Wikipedia** | General-knowledge articles and summaries (typically web/article content, **not PDFs**) | https://www.mediawiki.org/wiki/API:REST_API ; https://en.wikipedia.org/w/rest.php/v1/search/page?q=earthquake&limit=10 |

### Phase B — Enrichment connectors, not duplicate search engines

| Provider | Usage | Documentation |
|---|---|---|
| **Crossref** | DOI metadata lookup, enrichment, publisher, bibliographic fields | https://www.crossref.org/documentation/retrieve-metadata/rest-api/ |
| **Unpaywall** | Find legal open-access copies by DOI only | https://unpaywall.org/api |

**Important:** Unpaywall's general keyword-search endpoint was retired in September 2026. Do not implement it as a keyword search provider. Use OpenAlex for scholarly search; call Unpaywall only when resolving an individual DOI (with the required contact email). Crossref is metadata-first; do not pretend its entries contain downloadable PDFs merely because a DOI or full-text metadata link exists.

Optional future connectors (do not prioritize): Google Books for eligible *book discovery* and Wikipedia's sister projects. Book previews, purchased content, and metadata access do not imply downloadable full text or redistribution rights.

## Provider adapter contract

Design strongly typed interfaces; refine names to match the project:

```ts
export type ResourceKind =
  | 'research-paper'
  | 'article'
  | 'book'
  | 'report'
  | 'preprint'
  | 'encyclopedia';

export type AccessStatus =
  | 'open-access'
  | 'restricted'
  | 'unknown';

export interface ResourceResult {
  id: string;                     // stable, namespaced identifier
  provider: string;               // primary provider
  alsoFoundAt?: string[];         // merged duplicates
  title: string;
  authors: string[];
  description?: string;
  kind: ResourceKind;
  sourceUrl: string;
  doi?: string;
  publishedAt?: string;
  language?: string;
  accessStatus: AccessStatus;
  pdfUrl?: string;                // only if a real candidate PDF URL exists
  fileUrl?: string;               // other explicit attached files
  license?: string;               // preserve exact upstream license when possible
  licenseUrl?: string;
  canDownload?: boolean | null;   // null: unverified, NOT assumed true
  canRedistribute?: boolean | null;
  provenance?: string;
}

export interface ResourceSearchOptions {
  query: string;
  pageSize?: number;
  cursor?: string;
  category?: ResourceKind | 'all';
  openAccessOnly?: boolean;
  pdfOnly?: boolean;
}

export interface ProviderPage {
  results: ResourceResult[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface ResourceProvider {
  id: string;
  search(options: ResourceSearchOptions): Promise<ProviderPage>;
  getById?(id: string): Promise<ResourceResult | null>;
}
```

Add a consistent API error type, including provider, HTTP status, retryability, and safe user-facing message. Treat missing optional fields as normal; validate upstream responses at runtime (e.g., Zod or existing validation library).

## Federated resource search behavior

- Implement `searchResources(options, enabledProviders)` that executes requests concurrently using `Promise.allSettled` (or a concurrency-limited equivalent).
- A timeout or failure from one provider **must not** discard other providers' results.
- Return both merged results **and per-provider status/error information**.
- Normalize authors, titles, dates, DOI identifiers, URLs, resource type, access status, and rights metadata.
- Deduplicate DOI-bearing entries by normalized DOI; for DOI-less entries use a conservative combination of canonical URL and title/author/year. Preserve original provider attributions and merge high-quality PDF links without inventing URLs.
- Support provider-native pagination with separate per-provider cursors. Do not pretend all providers support identical page numbers.
- Apply deterministic relevance ranking, making search-result relevance and source transparency more important than opaque popularity scores.
- Implement `openAccessOnly`, `pdfOnly`, source filtering, type filtering, and optional date filters when supported; fall back to safe client-side filtering when necessary.
- Keep Wikimedia general-knowledge results in the same list, but do not label them as PDF-downloadable unless there is an actual permitted PDF resource.
- Avoid duplicates across OpenAlex, PLOS, arXiv, and Europe PMC when they refer to the same paper.

## PDF link discovery and permissions

- Extract direct PDF URLs only from **documented provider fields, official file attachments, or verified OA locations**.
- A source URL, DOI, preview page, or metadata full-text link **is not automatically a PDF**.
- Keep these separate: `pdfUrl`, `accessStatus`, `license`, `canDownload`, `canRedistribute`. An open-access label **does not** establish redistribution permission.
- Make `canDownload` true only when there is adequate evidence that the user can lawfully download the resource; otherwise use `null` or false and expose the source page instead.
- `canRedistribute` must only be true after verifying permission to repackage the work in app-distributed knowledge packs.
- Never bypass paywalls, DRM, CAPTCHA, login checks, robots restrictions, or publisher protections.
- If handing a URL to an existing downloader, provide an optional `validateDocumentLink()` helper that carefully checks final response status, redirects, MIME type (`application/pdf` or allowed equivalent), and file size when feasible. Use a GET fallback if HEAD is unsupported. Avoid downloading a whole file for validation.
- Expose structured `ResourceDownloadCandidate` data to the existing app. **Do not build a complete download manager unless one already exists and only needs the adapter.**

## Networking and security

- Work within Expo / React Native: don't use Node-only modules in runtime code.
- Keep requests encoded with URLSearchParams or equivalent, including Solr and arXiv query syntax.
- Parse arXiv Atom XML with a React Native-compatible XML parser and typed validation.
- Respect provider-specific rate limits, `Retry-After`, backoff, maximum page sizes, and usage policies.
- Add request cancellation, bounded concurrency, and small request timeouts.
- Store public config and feature toggles in appropriate environment configuration. **Never embed private API secrets in a shipped mobile application.** If a provider requires a secret, use an existing secure proxy; do not introduce a backend without approval.
- Handle offline mode with a clear `NetworkUnavailable` result; do not fake successful API responses.
- Log provider failures safely, excluding sensitive URLs, tokens, and user text when inappropriate.

## Suggested feature-first folder structure

Adapt this to the actual repository; do not force a rewrite:

```text
src/features/resources/
├── types/
│   └── resource.types.ts
├── providers/
│   ├── openalex.provider.ts
│   ├── arxiv.provider.ts
│   ├── europe-pmc.provider.ts
│   ├── plos.provider.ts
│   ├── zenodo.provider.ts
│   ├── wikipedia.provider.ts
│   ├── crossref.provider.ts      # DOI enrichment only
│   └── unpaywall.provider.ts     # DOI lookup only
├── services/
│   ├── resource-search.service.ts
│   ├── resource-normalizer.service.ts
│   └── resource-download-links.service.ts
├── utils/
│   ├── doi.ts
│   ├── deduplicate.ts
│   └── network.ts
├── hooks/                       # only if existing app uses React hooks
│   └── use-resource-search.ts
└── index.ts
```

## Execution plan

1. **Inspect** existing code and identify integration points, existing API clients, tests, configuration, and any search-result types.
2. **Implement and test Phase A connectors**, starting with **OpenAlex + arXiv + Wikimedia**, then Europe PMC, PLOS, and Zenodo.
3. **Implement federated search** with result normalization, deduplication, partial failures, pagination, and source filters.
4. **Implement DOI enrichment** with Crossref and Unpaywall; ensure Unpaywall is DOI-only.
5. **Expose eligible PDF/file links and permission metadata** to existing download services without changing the rest of the app.
6. **Validate** using live, documented provider responses when network access is available, and use captured/mocked provider fixtures in unit tests to make tests deterministic.
7. **Run** Bun/TypeScript checks, lint, and existing tests. Fix issues rather than suppressing them.

## Acceptance criteria

- [ ] At least OpenAlex, arXiv, Europe PMC, PLOS, Zenodo, and Wikimedia are integrated or any unavailable provider is explicitly documented with its concrete limitation.
- [ ] A single query can combine results from multiple enabled providers.
- [ ] Partial failure never breaks the complete search response.
- [ ] DOIs are normalized and duplicates are consolidated.
- [ ] Pagination works independently for each provider.
- [ ] Each result includes honest source attribution and accurate PDF availability.
- [ ] Unknown licensing never silently becomes permission to download or redistribute.
- [ ] Crossref and Unpaywall enrich DOI records; Unpaywall is not used for keyword search.
- [ ] Existing UI, navigation, offline local search, and AI functionality remain unchanged.
- [ ] Type checks and automated tests pass, with real API validation results summarized.

## Required handoff

After implementing, provide:

1. A brief inventory of modified/created files.
2. Provider status table: live, needs credentials, rate-limited, or blocked.
3. Sample query and anonymized normalized search response.
4. Any API keys/configurations users need to supply.
5. Test results and any incomplete integrations.

**Start inspecting the repository now, then implement the first working real API provider connector. Do not stop after writing an architecture proposal.**
