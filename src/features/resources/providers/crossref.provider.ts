import { resolveContactEmail } from "../config";
import { ResourceApiError, type DoiLookup, type ResourceKind } from "../types/resource.types";
import { doiUrl, normalizeDoi } from "../utils/doi";
import { createHttpClient, invalidError, type ProviderDeps } from "../utils/network";
import { asArray, asRecord, asString, cleanText, httpUrl } from "../utils/values";

const ENDPOINT = "https://api.crossref.org/works";

export async function lookupCrossref(doi: string, deps: ProviderDeps & { signal?: AbortSignal } = {}): Promise<DoiLookup<unknown>> {
  const normalized = normalizeDoi(doi);
  if (!normalized) return failed("Enter a valid DOI.");
  const http = createHttpClient("crossref", { ...deps, contactEmail: resolveContactEmail(deps.contactEmail) });
  try {
    const payload = await http.getJsonOrNull(`${ENDPOINT}/${encodeURIComponent(normalized)}`, deps.signal);
    if (!payload) return failed("Crossref has no record for this DOI.");
    const message = asRecord(asRecord(payload)?.message);
    if (!message) throw invalidError("crossref");
    const title = cleanText(asString(asArray(message.title)[0]), 400);
    const license = firstLicense(message.license);
    return {
      ok: true,
      provider: "crossref",
      record: message,
      patch: {
        provider: "crossref",
        title,
        authors: crossrefAuthors(message.author),
        description: cleanText(asString(message.abstract)),
        kind: crossrefKind(asString(message.type)),
        sourceUrl: httpUrl(asString(message.URL)) ?? doiUrl(normalized),
        doi: normalized,
        publishedAt: dateParts(message.published) ?? dateParts(message.issued),
        license: license?.name,
        licenseUrl: license?.url,
        provenance: asString(message.publisher) ? `Crossref; ${asString(message.publisher)}` : "Crossref",
      },
    };
  } catch (error) {
    return { ok: false, provider: "crossref", error: error instanceof ResourceApiError ? error : invalidError("crossref") };
  }
}

function firstLicense(value: unknown): { name?: string; url?: string } | undefined {
  const entry = asRecord(asArray(value)[0]);
  if (!entry) return undefined;
  const url = httpUrl(asString(entry.URL));
  return { url, name: url ? licenseName(url) : undefined };
}

function licenseName(url: string): string {
  const match = url.match(/creativecommons\.org\/licenses\/([a-z-]+)\/(\d+\.\d+)/i);
  if (!match) return url;
  return `cc-${match[1]}-${match[2]}`;
}

function crossrefAuthors(value: unknown): string[] {
  return asArray(value).flatMap((entry) => {
    const author = asRecord(entry);
    if (!author) return [];
    const name = asString(author.name) ?? [asString(author.given), asString(author.family)].filter(Boolean).join(" ");
    return name ? [name] : [];
  });
}

function dateParts(value: unknown): string | undefined {
  const parts = asArray(asRecord(value)?.["date-parts"])[0];
  if (!Array.isArray(parts) || typeof parts[0] !== "number") return undefined;
  const [year, month = 1, day = 1] = parts;
  if (typeof year !== "number") return undefined;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function crossrefKind(type: string | undefined): ResourceKind {
  if (type === "posted-content") return "preprint";
  if (type === "book" || type === "monograph" || type === "book-chapter") return "book";
  if (type === "report") return "report";
  if (type === "reference-entry") return "encyclopedia";
  if (type === "journal-article" || type === "proceedings-article") return "research-paper";
  return "article";
}

function failed(userMessage: string): DoiLookup<unknown> {
  return {
    ok: false,
    provider: "crossref",
    error: new ResourceApiError({
      provider: "crossref",
      code: "invalid",
      retryable: false,
      userMessage,
    }),
  };
}
