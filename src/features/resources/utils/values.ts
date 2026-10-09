import { ResourceApiError } from "../types/resource.types";

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function clampPageSize(value: number | undefined, max = 25): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    return Math.min(10, max);
  return Math.min(max, Math.max(1, Math.floor(value)));
}

export function cleanText(
  value: string | undefined,
  max = 600,
): string | undefined {
  if (!value) return undefined;
  const decoded = value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
  const text = decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return undefined;
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

export function yearOf(value: string | undefined): number | undefined {
  const match = value?.match(/\d{4}/);
  if (!match) return undefined;
  const year = Number(match[0]);
  if (year < 1000 || year > 3000) return undefined;
  return year;
}

export function httpUrl(
  value: string | undefined,
  httpsOnly = false,
): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && (httpsOnly || url.protocol !== "http:"))
      return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function canonicalUrl(value: string | undefined): string | undefined {
  const absolute = httpUrl(value);
  if (!absolute) return undefined;
  const url = new URL(absolute);
  url.protocol = "https:";
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ]) {
    url.searchParams.delete(key);
  }
  url.searchParams.sort();
  const path = url.pathname.replace(/\/$/, "") || "/";
  const query = url.searchParams.toString();
  return `https://${url.hostname}${path}${query ? `?${query}` : ""}`;
}

export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, digits: string) =>
      String.fromCodePoint(Number(digits)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function invertedIndexToText(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const positions: { index: number; word: string }[] = [];
  for (const [word, indexes] of Object.entries(record)) {
    if (!Array.isArray(indexes)) continue;
    for (const index of indexes) {
      if (typeof index === "number" && index >= 0 && index < 80)
        positions.push({ index, word });
    }
  }
  if (!positions.length) return undefined;
  positions.sort((left, right) => left.index - right.index);
  return cleanText(positions.map((item) => item.word).join(" "));
}

export function requireQuery(provider: string, query: string): string {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new ResourceApiError({
      provider,
      code: "invalid",
      retryable: false,
      userMessage: "Enter a search term.",
    });
  }
  return trimmed;
}
