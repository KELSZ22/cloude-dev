import type { AccessStatus, ResourceResult } from "../types/resource.types";

export function redistributionFromLicense(license: string | undefined): boolean | null {
  if (!license) return null;
  const value = license.trim().toLowerCase();
  if (!value || value === "unknown" || value === "unspecified" || value === "none") return null;
  if (/all rights reserved|proprietary|non-?commercial|\bnc\b|no-?deriv|\bnd\b/.test(value)) return false;
  if (
    /cc0|cc-?0|public[- ]domain|\bpd\b|cc-?by-?sa\b|cc by-sa|cc-?by\b|creative commons attribution/.test(value)
  ) {
    return true;
  }
  return null;
}

export function assessRights(input: {
  accessStatus: AccessStatus;
  pdfUrl?: string;
  fileUrl?: string;
  license?: string;
}): Pick<ResourceResult, "canDownload" | "canRedistribute"> {
  const hasFile = Boolean(input.pdfUrl || input.fileUrl);
  let canDownload: boolean | null = null;
  if (hasFile && input.accessStatus === "open-access") canDownload = true;
  if (hasFile && input.accessStatus === "restricted") canDownload = false;
  return {
    canDownload,
    canRedistribute: redistributionFromLicense(input.license),
  };
}

export function buildResult(
  input: Omit<ResourceResult, "canDownload" | "canRedistribute" | "authors"> & { authors?: string[] },
): ResourceResult {
  const result: ResourceResult = {
    ...input,
    authors: input.authors ?? [],
    canDownload: null,
    canRedistribute: null,
  };
  return { ...result, ...assessRights(result) };
}
