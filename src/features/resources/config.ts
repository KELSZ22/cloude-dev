const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_EMAIL = /@(example\.(com|org|net)|localhost)$/i;

export const RESOURCE_PAGE_SIZE = 10;
export const RESOURCE_MAX_PAGE_SIZE = 25;
export const REQUEST_TIMEOUT_MS = 12_000;
export const ARXIV_MIN_INTERVAL_MS = 3_000;
export const MAX_DOCUMENT_BYTES = 80 * 1024 * 1024;

export const SEARCH_PROVIDER_IDS = [
  "openalex",
  "arxiv",
  "europepmc",
  "plos",
  "zenodo",
  "wikipedia",
] as const;

export type SearchProviderId = (typeof SEARCH_PROVIDER_IDS)[number];

/** Scholarly sources shown in Open resources. Wikipedia stays in its own search section. */
export const RESEARCH_PROVIDER_IDS = SEARCH_PROVIDER_IDS.filter(
  (id) => id !== "wikipedia",
);

const PROVIDER_LABELS: Record<string, string> = {
  openalex: "OpenAlex",
  arxiv: "arXiv",
  europepmc: "Europe PMC",
  plos: "PLOS",
  zenodo: "Zenodo",
  wikipedia: "Wikipedia",
  crossref: "Crossref",
  unpaywall: "Unpaywall",
};

export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

/** Public contact address for polite-pool and Unpaywall calls. Never a secret. */
export function resolveContactEmail(override?: string): string | undefined {
  const value = (override ?? process.env.EXPO_PUBLIC_CONTACT_EMAIL)?.trim();
  if (!value || !EMAIL_PATTERN.test(value) || PLACEHOLDER_EMAIL.test(value))
    return undefined;
  return value;
}

export function resourceUserAgent(email = resolveContactEmail()): string {
  return email
    ? `AralSearch/1.0 (mailto:${email})`
    : "AralSearch/1.0 (educational app; contact email not configured)";
}
