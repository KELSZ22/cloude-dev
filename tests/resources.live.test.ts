import { describe, expect, test } from "bun:test";

import { enrichByDoi, searchResources } from "../src/features/resources/index";

const live = process.env.LIVE_RESOURCE_APIS === "1";
const liveTest = live ? test : test.skip;

describe("live resource apis", () => {
  liveTest("combines real provider responses for photosynthesis", async () => {
    const result = await searchResources({ query: "photosynthesis", pageSize: 2 });
    const ok = result.providers.filter((status) => status.state === "ok");
    expect(result.networkUnavailable).toBe(false);
    expect(ok.length).toBeGreaterThanOrEqual(4);
    expect(result.results.length).toBeGreaterThan(0);
    for (const item of result.results) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.sourceUrl.startsWith("http")).toBe(true);
      if (item.canDownload === true) expect(item.pdfUrl ?? item.fileUrl).toBeTruthy();
      if (item.canRedistribute === true) expect(item.license).toBeTruthy();
      if (item.provider === "wikipedia") expect(item.pdfUrl).toBeUndefined();
    }
    const arxiv = result.providers.find((status) => status.provider === "arxiv");
    if (arxiv?.state === "ok") {
      const preprint = result.results.find((item) => item.provider === "arxiv" || item.alsoFoundAt?.includes("arxiv"));
      expect(preprint?.pdfUrl ?? "").toContain("arxiv.org/pdf/");
    }
  }, 90_000);

  liveTest("Crossref resolves a known DOI and Unpaywall waits for a contact email", async () => {
    const enrichment = await enrichByDoi("10.1371/journal.pone.0000001");
    expect(enrichment.crossref.ok).toBe(true);
    expect(enrichment.crossref.patch?.title?.toLowerCase()).toContain("cold-seeking");
    expect(enrichment.crossref.patch?.pdfUrl).toBeUndefined();
    expect(enrichment.unpaywall.ok).toBe(false);
    expect(enrichment.unpaywall.error?.code).toBe("config");
  }, 30_000);
});
