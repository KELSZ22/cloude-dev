const DOI_PATTERN = /^10\.\d{4,9}\/\S+$/;

export function normalizeDoi(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let doi = value.trim();
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  doi = doi.replace(/^doi:\s*/i, "");
  try {
    doi = decodeURIComponent(doi);
  } catch {
    return undefined;
  }
  doi = doi.trim().replace(/[.\s]+$/, "").toLowerCase();
  if (!DOI_PATTERN.test(doi)) return undefined;
  return doi;
}

export function doiUrl(doi: string | undefined): string | undefined {
  const normalized = normalizeDoi(doi);
  return normalized ? `https://doi.org/${normalized}` : undefined;
}
