export type ResourceKind =
  | "research-paper"
  | "article"
  | "book"
  | "report"
  | "preprint"
  | "encyclopedia";

export type AccessStatus = "open-access" | "restricted" | "unknown";

export type ResourceErrorCode =
  | "timeout"
  | "network"
  | "cancelled"
  | "http"
  | "invalid"
  | "config";

export interface ResourceResult {
  id: string;
  provider: string;
  alsoFoundAt?: string[];
  title: string;
  authors: string[];
  description?: string;
  kind: ResourceKind;
  sourceUrl: string;
  doi?: string;
  publishedAt?: string;
  language?: string;
  accessStatus: AccessStatus;
  pdfUrl?: string;
  fileUrl?: string;
  license?: string;
  licenseUrl?: string;
  /** True only with evidence the user may download. Null means unverified. */
  canDownload?: boolean | null;
  /** True only when the license allows repackaging. Null means unverified. */
  canRedistribute?: boolean | null;
  provenance?: string;
}

export interface ResourceSearchOptions {
  query: string;
  pageSize?: number;
  /** Provider-native cursor. Federated search uses a JSON map of cursors. */
  cursor?: string;
  category?: ResourceKind | "all";
  openAccessOnly?: boolean;
  pdfOnly?: boolean;
  fromYear?: number;
  toYear?: number;
  signal?: AbortSignal;
}

export interface ProviderPage {
  results: ResourceResult[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface ResourceProvider {
  id: string;
  search(options: ResourceSearchOptions): Promise<ProviderPage>;
  getById?(id: string, signal?: AbortSignal): Promise<ResourceResult | null>;
}

export interface ProviderRunStatus {
  provider: string;
  state: "ok" | "error" | "skipped";
  httpStatus?: number;
  retryable?: boolean;
  code?: ResourceErrorCode;
  message?: string;
  resultCount: number;
  nextCursor?: string;
  hasMore: boolean;
}

export interface FederatedSearchResult {
  results: ResourceResult[];
  providers: ProviderRunStatus[];
  /** JSON map of per-provider cursors for the next page. */
  nextCursor?: string;
  networkUnavailable: boolean;
}

export interface ResourceDownloadCandidate {
  resourceId: string;
  provider: string;
  url: string;
  filenameHint?: string;
  mimeType: "application/pdf" | "application/octet-stream";
  license?: string;
  licenseUrl?: string;
  canRedistribute: boolean | null;
  sourceUrl: string;
  attribution: string;
}

export interface DocumentLinkCheck {
  url: string;
  finalUrl: string;
  ok: boolean;
  httpStatus?: number;
  mimeType?: string;
  bytes: number | null;
  tooLarge: boolean;
  reason?: string;
}

export interface DoiLookup<T> {
  ok: boolean;
  provider: "crossref" | "unpaywall";
  patch?: Partial<ResourceResult>;
  record?: T;
  error?: ResourceApiError;
}

export interface DoiEnrichment {
  doi: string;
  crossref: DoiLookup<unknown>;
  unpaywall: DoiLookup<unknown>;
  result: ResourceResult | null;
}

export class ResourceApiError extends Error {
  readonly provider: string;
  readonly status?: number;
  readonly retryable: boolean;
  readonly userMessage: string;
  readonly code: ResourceErrorCode;

  constructor(input: {
    provider: string;
    userMessage: string;
    code: ResourceErrorCode;
    retryable: boolean;
    status?: number;
  }) {
    super(input.userMessage);
    this.name = "ResourceApiError";
    this.provider = input.provider;
    this.userMessage = input.userMessage;
    this.code = input.code;
    this.retryable = input.retryable;
    this.status = input.status;
  }
}
