import { MAX_DOCUMENT_BYTES } from "../config";
import type { DocumentLinkCheck, ResourceDownloadCandidate, ResourceResult } from "../types/resource.types";
import { createHttpClient, type ProviderDeps } from "../utils/network";

const PDF_MIME = ["application/pdf", "application/x-pdf"];

/**
 * Boundary: this returns a candidate the app's existing downloader can fetch.
 * It does not save files, build knowledge packs, or open a reader.
 */
export function toDownloadCandidate(result: ResourceResult): ResourceDownloadCandidate | null {
  if (result.canDownload !== true) return null;
  const url = result.pdfUrl ?? result.fileUrl;
  if (!url) return null;
  const authors = result.authors.filter(Boolean).join(", ");
  const license = result.license ? ` License: ${result.license}.` : "";
  return {
    resourceId: result.id,
    provider: result.provider,
    url,
    mimeType: result.pdfUrl ? "application/pdf" : "application/octet-stream",
    license: result.license,
    licenseUrl: result.licenseUrl,
    canRedistribute: result.canRedistribute ?? null,
    sourceUrl: result.sourceUrl,
    attribution: `${authors ? `${authors}. ` : ""}${result.title}. ${result.provenance ?? result.provider}.${license}`.trim(),
  };
}

export async function validateDocumentLink(
  url: string,
  deps: ProviderDeps & { signal?: AbortSignal } = {},
): Promise<DocumentLinkCheck> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { url, finalUrl: url, ok: false, bytes: null, tooLarge: false, reason: "invalid-url" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { url, finalUrl: url, ok: false, bytes: null, tooLarge: false, reason: "unsupported-url" };
  }
  const http = createHttpClient("document-link", deps);
  const head = await http.fetchResponse(url, {
    method: "HEAD",
    signal: deps.signal,
    headers: { Accept: "application/pdf, */*;q=0.1" },
  });
  if (isPdfResponse(head) && head.ok) return summarize(url, head, true);
  if (head.status === 401 || head.status === 403) return blocked(url, head);
  await head.body?.cancel().catch(() => undefined);
  const ranged = await http.fetchResponse(url, {
    method: "GET",
    signal: deps.signal,
    headers: { Accept: "application/pdf, */*;q=0.1", Range: "bytes=0-2047" },
  });
  if (ranged.status === 401 || ranged.status === 403) return blocked(url, ranged);
  return summarize(url, ranged, false);
}

async function summarize(url: string, response: Response, headOnly: boolean): Promise<DocumentLinkCheck> {
  const mime = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  const bytes = contentLength(response);
  const tooLarge = bytes !== null && bytes > MAX_DOCUMENT_BYTES;
  let sniffed = false;
  if (!headOnly) sniffed = await sniffPdf(response);
  const mimeOk = Boolean(mime && PDF_MIME.includes(mime));
  const urlLooksPdf = /\.pdf($|\?)/i.test(response.url || url);
  const ok = response.ok && (mimeOk || sniffed || (urlLooksPdf && mime === "application/octet-stream"));
  return {
    url,
    finalUrl: response.url || url,
    ok: ok && !tooLarge,
    httpStatus: response.status,
    mimeType: mime,
    bytes,
    tooLarge,
    reason: ok ? (tooLarge ? "file-too-large" : undefined) : "not-a-pdf",
  };
}

function blocked(url: string, response: Response): DocumentLinkCheck {
  return {
    url,
    finalUrl: response.url || url,
    ok: false,
    httpStatus: response.status,
    bytes: contentLength(response),
    tooLarge: false,
    reason: "forbidden",
  };
}

function isPdfResponse(response: Response): boolean {
  const mime = response.headers.get("content-type")?.toLowerCase() ?? "";
  return PDF_MIME.some((type) => mime.includes(type));
}

function contentLength(response: Response): number | null {
  const range = response.headers.get("content-range");
  const total = range?.match(/\/(\d+)\s*$/)?.[1];
  const header = total ?? response.headers.get("content-length");
  if (!header) return null;
  const bytes = Number(header);
  return Number.isFinite(bytes) ? bytes : null;
}

async function sniffPdf(response: Response): Promise<boolean> {
  const reader = response.body?.getReader();
  if (!reader) return false;
  try {
    const { value } = await reader.read();
    if (!value || value.length < 4) return false;
    return value[0] === 0x25 && value[1] === 0x50 && value[2] === 0x44 && value[3] === 0x46;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
