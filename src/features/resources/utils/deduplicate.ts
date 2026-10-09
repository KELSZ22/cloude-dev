import type { AccessStatus, ResourceResult } from "../types/resource.types";
import { normalizeDoi } from "./doi";
import { assessRights, redistributionFromLicense } from "./rights";
import { canonicalUrl, normalizeTitle, yearOf } from "./values";

export function deduplicateResults(results: ResourceResult[]): ResourceResult[] {
  const byDoi = new Map<string, ResourceResult>();
  const loose: ResourceResult[] = [];
  for (const result of results) {
    const doi = normalizeDoi(result.doi);
    if (doi) {
      const stamped = { ...result, doi };
      const existing = byDoi.get(doi);
      byDoi.set(doi, existing ? mergeResults(existing, stamped) : stamped);
    } else {
      loose.push(result);
    }
  }
  const mergedLoose: ResourceResult[] = [];
  for (const result of loose) {
    const index = mergedLoose.findIndex((item) => sameLooseWork(item, result));
    if (index === -1) mergedLoose.push(result);
    else mergedLoose[index] = mergeResults(mergedLoose[index], result);
  }
  return [...byDoi.values(), ...mergedLoose];
}

function sameLooseWork(left: ResourceResult, right: ResourceResult): boolean {
  const leftUrl = canonicalUrl(left.sourceUrl);
  const rightUrl = canonicalUrl(right.sourceUrl);
  if (leftUrl && leftUrl === rightUrl) return true;
  const leftTitle = normalizeTitle(left.title);
  const rightTitle = normalizeTitle(right.title);
  if (!leftTitle || leftTitle !== rightTitle) return false;
  const leftYear = yearOf(left.publishedAt);
  const rightYear = yearOf(right.publishedAt);
  if (!leftYear || leftYear !== rightYear) return false;
  return authorsOverlap(left.authors, right.authors);
}

function authorsOverlap(left: string[], right: string[]): boolean {
  const keys = new Set(left.map(authorKey).filter(Boolean));
  if (!keys.size) return false;
  return right.some((author) => keys.has(authorKey(author)));
}

function authorKey(author: string): string {
  const parts = author.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function mergeResults(primary: ResourceResult, incoming: ResourceResult): ResourceResult {
  const providers = new Set([
    ...(primary.alsoFoundAt ?? []),
    incoming.provider,
    ...(incoming.alsoFoundAt ?? []),
  ]);
  providers.delete(primary.provider);
  const licenseChoice = preferLicense(primary.license, incoming.license);
  const accessStatus = preferAccess(primary.accessStatus, incoming.accessStatus);
  const pdfUrl = primary.pdfUrl ?? incoming.pdfUrl;
  const fileUrl = primary.fileUrl ?? incoming.fileUrl;
  const license = licenseChoice.license;
  const rights = assessRights({ accessStatus, pdfUrl, fileUrl, license });
  return {
    ...primary,
    description: longerText(primary.description, incoming.description),
    authors: primary.authors.length >= incoming.authors.length ? primary.authors : incoming.authors,
    doi: normalizeDoi(primary.doi) ?? normalizeDoi(incoming.doi),
    publishedAt: primary.publishedAt ?? incoming.publishedAt,
    language: primary.language ?? incoming.language,
    kind: primary.kind,
    sourceUrl: primary.sourceUrl || incoming.sourceUrl,
    pdfUrl,
    fileUrl,
    license,
    licenseUrl: primary.licenseUrl ?? incoming.licenseUrl,
    accessStatus,
    alsoFoundAt: [...providers].sort(),
    provenance: [primary.provenance, incoming.provenance].filter(Boolean).join("; ") || primary.provenance,
    canDownload: rights.canDownload,
    canRedistribute: licenseChoice.canRedistribute,
  };
}

function longerText(left?: string, right?: string): string | undefined {
  if (!left) return right;
  if (!right) return left;
  return right.length > left.length ? right : left;
}

function preferAccess(left: AccessStatus, right: AccessStatus): AccessStatus {
  if (left === "open-access" || right === "open-access") return "open-access";
  if (left === "restricted" || right === "restricted") return "restricted";
  return "unknown";
}

function preferLicense(left?: string, right?: string): { license?: string; canRedistribute: boolean | null } {
  const leftRights = redistributionFromLicense(left);
  const rightRights = redistributionFromLicense(right);
  if (leftRights === false) return { license: left, canRedistribute: false };
  if (rightRights === false) return { license: right, canRedistribute: false };
  if (leftRights === true) return { license: left, canRedistribute: true };
  if (rightRights === true) return { license: right, canRedistribute: true };
  return { license: left ?? right, canRedistribute: null };
}

export function rankResults(results: ResourceResult[], query: string): ResourceResult[] {
  const tokens = query.toLowerCase().split(/\s+/).filter((token) => token.length > 1);
  const phrase = query.trim().toLowerCase();
  return [...results].sort((left, right) => {
    const delta = score(right, tokens, phrase) - score(left, tokens, phrase);
    if (delta !== 0) return delta;
    const title = left.title.localeCompare(right.title);
    if (title !== 0) return title;
    return left.id.localeCompare(right.id);
  });
}

function score(result: ResourceResult, tokens: string[], phrase: string): number {
  const title = result.title.toLowerCase();
  const description = (result.description ?? "").toLowerCase();
  let value = title === phrase ? 100 : 0;
  for (const token of tokens) {
    if (title.includes(token)) value += 10;
    if (description.includes(token)) value += 2;
  }
  return value;
}
