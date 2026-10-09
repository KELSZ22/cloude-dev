import { providerLabel, resolveContactEmail } from "../config";
import { ResourceApiError, type AccessStatus, type DoiLookup } from "../types/resource.types";
import { normalizeDoi } from "../utils/doi";
import { configError, createHttpClient, invalidError, type ProviderDeps } from "../utils/network";
import { asBoolean, asRecord, asString, httpUrl } from "../utils/values";

const ENDPOINT = "https://api.unpaywall.org/v2";

/**
 * DOI lookup only. Unpaywall no longer offers keyword search.
 * Requires EXPO_PUBLIC_CONTACT_EMAIL (a real address, not a placeholder).
 */
export async function lookupUnpaywall(
  doi: string,
  deps: ProviderDeps & { signal?: AbortSignal } = {},
): Promise<DoiLookup<unknown>> {
  const normalized = normalizeDoi(doi);
  if (!normalized) {
    return { ok: false, provider: "unpaywall", error: invalidDoi() };
  }
  const email = resolveContactEmail(deps.contactEmail);
  if (!email) {
    return {
      ok: false,
      provider: "unpaywall",
      error: configError(
        "unpaywall",
        `${providerLabel("unpaywall")} needs a contact email before it can be used.`,
      ),
    };
  }
  const http = createHttpClient("unpaywall", deps);
  const params = new URLSearchParams({ email });
  try {
    const payload = await http.getJson(`${ENDPOINT}/${encodeURIComponent(normalized)}?${params}`, deps.signal);
    const record = asRecord(payload);
    if (!record || (asString(record.doi) === undefined && asBoolean(record.is_oa) === undefined)) {
      throw invalidError("unpaywall");
    }
    const best = asRecord(record.best_oa_location);
    const pdfUrl = httpUrl(asString(best?.url_for_pdf), true);
    const isOpen = asBoolean(record.is_oa) === true;
    const accessStatus: AccessStatus = isOpen ? "open-access" : asString(record.oa_status) === "closed" ? "restricted" : "unknown";
    return {
      ok: true,
      provider: "unpaywall",
      record,
      patch: {
        provider: "unpaywall",
        doi: normalizeDoi(asString(record.doi)) ?? normalized,
        title: asString(record.title),
        publishedAt: asString(record.published_date),
        accessStatus,
        pdfUrl,
        sourceUrl: httpUrl(asString(best?.url)) ?? undefined,
        license: asString(best?.license),
        provenance: "Unpaywall",
      },
    };
  } catch (error) {
    return {
      ok: false,
      provider: "unpaywall",
      error: error instanceof ResourceApiError ? error : invalidError("unpaywall"),
    };
  }
}

function invalidDoi(): ResourceApiError {
  return new ResourceApiError({
    provider: "unpaywall",
    code: "invalid",
    retryable: false,
    userMessage: "Enter a valid DOI.",
  });
}
