import { describe, expect, test } from "bun:test";

import { createArxivProvider } from "../src/features/resources/providers/arxiv.provider";
import { lookupCrossref } from "../src/features/resources/providers/crossref.provider";
import { createEuropePmcProvider } from "../src/features/resources/providers/europe-pmc.provider";
import { createOpenAlexProvider } from "../src/features/resources/providers/openalex.provider";
import { createPlosProvider } from "../src/features/resources/providers/plos.provider";
import { lookupUnpaywall } from "../src/features/resources/providers/unpaywall.provider";
import { createWikipediaProvider } from "../src/features/resources/providers/wikipedia.provider";
import { createZenodoProvider } from "../src/features/resources/providers/zenodo.provider";
import { toDownloadCandidate, validateDocumentLink } from "../src/features/resources/services/resource-download-links.service";
import { searchResources } from "../src/features/resources/services/resource-search.service";
import { ResourceApiError, type ResourceProvider, type ResourceResult } from "../src/features/resources/types/resource.types";
import { parseAtomFeed } from "../src/features/resources/utils/atom";
import { deduplicateResults } from "../src/features/resources/utils/deduplicate";
import { normalizeDoi } from "../src/features/resources/utils/doi";
import { buildResult } from "../src/features/resources/utils/rights";

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });

function paper(overrides: Partial<ResourceResult> = {}): ResourceResult {
  return {
    id: "openalex:W1",
    provider: "openalex",
    title: "Photosynthesis",
    authors: ["Ada Lovelace"],
    kind: "research-paper",
    sourceUrl: "https://example.org/paper",
    accessStatus: "open-access",
    canDownload: null,
    canRedistribute: null,
    ...overrides,
  };
}

describe("rights and identifiers", () => {
  test("normalizes DOIs and does not treat a DOI page as a PDF", () => {
    expect(normalizeDoi("https://doi.org/10.1371/journal.PONE.0000001")).toBe("10.1371/journal.pone.0000001");
    const result = buildResult({
      id: "plos:10.1371/journal.pone.0000001",
      provider: "plos",
      title: "A paper",
      kind: "research-paper",
      sourceUrl: "https://doi.org/10.1371/journal.pone.0000001",
      doi: "10.1371/journal.pone.0000001",
      accessStatus: "open-access",
    });
    expect(result.pdfUrl).toBeUndefined();
    expect(result.canDownload).toBeNull();
    expect(result.canRedistribute).toBeNull();
  });

  test("download permission follows the file and the license separately", () => {
    const openPdf = buildResult({
      id: "zenodo:1",
      provider: "zenodo",
      title: "Notes",
      kind: "article",
      sourceUrl: "https://zenodo.org/records/1",
      accessStatus: "open-access",
      pdfUrl: "https://zenodo.org/records/1/files/notes.pdf",
      license: "cc-by-nc-4.0",
    });
    expect(openPdf.canDownload).toBe(true);
    expect(openPdf.canRedistribute).toBe(false);
    expect(toDownloadCandidate(openPdf)?.canRedistribute).toBe(false);

    const unknownFile = buildResult({
      ...openPdf,
      accessStatus: "unknown",
      license: undefined,
    });
    expect(unknownFile.canDownload).toBeNull();
    expect(toDownloadCandidate(unknownFile)).toBeNull();
  });
});

describe("deduplication", () => {
  test("merges the same DOI and keeps the real PDF", () => {
    const merged = deduplicateResults([
      paper({ doi: "https://doi.org/10.1000/XYZ", pdfUrl: undefined, license: "cc-by-nc" }),
      paper({
        id: "plos:10.1000/xyz",
        provider: "plos",
        doi: "10.1000/xyz",
        pdfUrl: "https://journals.example/file.pdf",
        license: "cc-by",
        provenance: "PLOS",
      }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].doi).toBe("10.1000/xyz");
    expect(merged[0].pdfUrl).toBe("https://journals.example/file.pdf");
    expect(merged[0].alsoFoundAt).toEqual(["plos"]);
    expect(merged[0].canRedistribute).toBe(false);
    expect(merged[0].canDownload).toBe(true);
  });

  test("does not merge different papers that share only a title", () => {
    const merged = deduplicateResults([
      paper({ id: "a", sourceUrl: "https://a.example/1", publishedAt: "2020" }),
      paper({ id: "b", provider: "arxiv", sourceUrl: "https://b.example/2", publishedAt: "2020", authors: ["Grace Hopper"] }),
    ]);
    expect(merged).toHaveLength(2);
  });
});

describe("providers", () => {
  test("parses an arXiv Atom entry into an open PDF without a redistribution license", async () => {
    const xml = `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
        <opensearch:totalResults>2</opensearch:totalResults>
        <opensearch:startIndex>0</opensearch:startIndex>
        <entry>
          <id>http://arxiv.org/abs/1107.0191v1</id>
          <title>Energy conversion</title>
          <published>2011-07-01T10:54:23Z</published>
          <summary>Light harvesting in bacteria.</summary>
          <link href="https://arxiv.org/abs/1107.0191v1" rel="alternate" type="text/html"/>
          <link href="https://arxiv.org/pdf/1107.0191v1" rel="related" type="application/pdf" title="pdf"/>
          <author><name>Felipe Caycedo-Soler</name></author>
        </entry>
      </feed>`;
    expect(parseAtomFeed(xml).entries[0].authors).toEqual(["Felipe Caycedo-Soler"]);
    const provider = createArxivProvider({
      minIntervalMs: 0,
      fetch: (async () => new Response(xml, { headers: { "content-type": "application/atom+xml" } })) as typeof fetch,
    });
    const page = await provider.search({ query: "photosynthesis", pageSize: 1 });
    expect(page.results[0].pdfUrl).toBe("https://arxiv.org/pdf/1107.0191v1");
    expect(page.results[0].canDownload).toBe(true);
    expect(page.results[0].canRedistribute).toBeNull();
    expect(page.results[0].kind).toBe("preprint");
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("1");
  });

  test("OpenAlex uses pdf_url only and retries a short Retry-After", async () => {
    const calls: string[] = [];
    const work = {
      id: "https://openalex.org/W4250109367",
      doi: "https://doi.org/10.1042/ebc20160016",
      display_name: "Photosynthesis",
      publication_date: "2016-10-26",
      type: "article",
      language: "en",
      authorships: [{ author: { display_name: "Matthew P. Johnson" } }],
      open_access: { is_oa: true, oa_status: "hybrid", oa_url: "https://publisher.example/html" },
      primary_location: { landing_page_url: "https://doi.org/10.1042/ebc20160016", pdf_url: null, license: null },
      best_oa_location: {
        is_oa: true,
        landing_page_url: "https://doi.org/10.1042/ebc20160016",
        pdf_url: "https://publisher.example/paper.pdf",
        license: "cc-by",
      },
    };
    const fetchMock = (async (url: string) => {
      calls.push(String(url));
      if (calls.length === 1) return json({ message: "slow" }, 429, { "retry-after": "0" });
      return json({ meta: { next_cursor: "next" }, results: [work] });
    }) as typeof fetch;
    const page = await createOpenAlexProvider({ fetch: fetchMock, sleep: async () => undefined }).search({
      query: "photosynthesis",
      pageSize: 1,
    });
    expect(calls).toHaveLength(2);
    expect(page.results[0].pdfUrl).toBe("https://publisher.example/paper.pdf");
    expect(page.results[0].pdfUrl).not.toContain("/html");
    expect(page.results[0].canDownload).toBe(true);
    expect(page.results[0].canRedistribute).toBe(true);
    expect(page.results[0].license).toBe("cc-by");
  });

  test("Europe PMC keeps an OA PDF and a non-commercial license", async () => {
    const payload = {
      resultList: {
        result: [{
          id: "42175593",
          source: "MED",
          doi: "10.1093/jxb/erag250",
          title: "Photosynthesis parameters",
          authorString: "Gao Y, Wu PY",
          isOpenAccess: "Y",
          pubYear: "2026",
          license: "cc by-nc",
          fullTextUrlList: {
            fullTextUrl: [
              { availabilityCode: "S", documentStyle: "doi", url: "https://doi.org/10.1093/jxb/erag250" },
              { availabilityCode: "OA", documentStyle: "pdf", url: "https://europepmc.org/articles/PMC1?pdf=render" },
            ],
          },
        }],
      },
      nextCursorMark: "cursor-2",
    };
    const page = await createEuropePmcProvider({
      fetch: (async () => json(payload)) as typeof fetch,
    }).search({ query: "photosynthesis", pageSize: 1 });
    expect(page.results[0].pdfUrl).toContain("pdf=render");
    expect(page.results[0].canDownload).toBe(true);
    expect(page.results[0].canRedistribute).toBe(false);
    expect(page.results[0].license).toBe("cc by-nc");
    expect(page.nextCursor).toBe("cursor-2");
  });

  test("PLOS stays open access without inventing a PDF", async () => {
    const payload = {
      response: {
        numFound: 1,
        start: 0,
        docs: [{
          id: "10.1371/journal.pone.0000001",
          title: "Neural Substrate of Cold-Seeking Behavior",
          author_display: ["Maria C Almeida"],
          publication_date: "2006-12-20T00:00:00Z",
        }],
      },
    };
    const page = await createPlosProvider({ fetch: (async () => json(payload)) as typeof fetch })
      .search({ query: "cold", pageSize: 5 });
    expect(page.results[0].accessStatus).toBe("open-access");
    expect(page.results[0].doi).toBe("10.1371/journal.pone.0000001");
    expect(page.results[0].pdfUrl).toBeUndefined();
    expect(page.results[0].canDownload).toBeNull();
    expect(page.hasMore).toBe(false);
  });

  test("Zenodo exposes an open PDF and hides restricted files", async () => {
    const openRecord = {
      id: 17064603,
      doi: "10.5281/zenodo.17064603",
      metadata: {
        title: "Open notes",
        access_right: "open",
        publication_date: "2025-05-14",
        license: { id: "cc-by-4.0" },
        creators: [{ name: "Ada Lovelace" }],
      },
      links: { self_html: "https://zenodo.org/records/17064603" },
      files: [{ key: "notes.pdf", links: { self: "https://zenodo.org/api/records/17064603/files/notes.pdf/content" } }],
    };
    const restricted = {
      ...openRecord,
      id: 2,
      metadata: { ...openRecord.metadata, access_right: "restricted", license: null },
    };
    const page = await createZenodoProvider({
      fetch: (async () => json({ hits: { hits: [openRecord, restricted] }, links: { next: "https://zenodo.org/api/records?page=2" } })) as typeof fetch,
    }).search({ query: "notes", pageSize: 2 });
    expect(page.results[0].pdfUrl).toContain("notes.pdf");
    expect(page.results[0].canDownload).toBe(true);
    expect(page.results[0].canRedistribute).toBe(true);
    expect(page.results[1].pdfUrl).toBeUndefined();
    expect(page.results[1].canDownload).toBeNull();
    expect(page.nextCursor).toBe("2");
  });

  test("Wikipedia search is not a PDF download", async () => {
    const page = await createWikipediaProvider({
      fetch: (async () => json({ pages: [{ id: 24544, key: "Photosynthesis", title: "Photosynthesis", description: "Biological process" }] })) as typeof fetch,
    }).search({ query: "photosynthesis" });
    expect(page.results[0].kind).toBe("encyclopedia");
    expect(page.results[0].pdfUrl).toBeUndefined();
    expect(page.results[0].canDownload).toBeNull();
    expect(page.results[0].canRedistribute).toBeNull();
    expect(page.hasMore).toBe(false);
  });

  test("Crossref enriches metadata and ignores similarity-checking links", async () => {
    const urls: string[] = [];
    const lookup = await lookupCrossref("10.1371/journal.pone.0000001", {
      fetch: (async (url: string) => {
        urls.push(String(url));
        return json({
          message: {
            DOI: "10.1371/journal.pone.0000001",
            title: ["Neural Substrate of Cold-Seeking Behavior"],
            type: "journal-article",
            publisher: "Public Library of Science (PLoS)",
            URL: "https://doi.org/10.1371/journal.pone.0000001",
            author: [{ given: "Maria", family: "Almeida" }],
            license: [{ URL: "http://creativecommons.org/licenses/by/4.0/" }],
            link: [{ URL: "http://dx.plos.org/10.1371/journal.pone.0000001", "intended-application": "similarity-checking" }],
            published: { "date-parts": [[2006, 12, 20]] },
          },
        });
      }) as typeof fetch,
    });
    expect(urls[0]).toContain("/works/10.1371%2Fjournal.pone.0000001");
    expect(lookup.ok).toBe(true);
    expect(lookup.patch?.pdfUrl).toBeUndefined();
    expect(lookup.patch?.licenseUrl).toBe("http://creativecommons.org/licenses/by/4.0/");
    expect(lookup.patch?.authors).toEqual(["Maria Almeida"]);
    expect(lookup.patch?.publishedAt).toBe("2006-12-20");
  });

  test("Unpaywall is DOI-only and refuses a placeholder email", async () => {
    let called = false;
    const missing = await lookupUnpaywall("10.1371/journal.pone.0000001", {
      fetch: (async () => {
        called = true;
        return json({});
      }) as typeof fetch,
    });
    expect(called).toBe(false);
    expect(missing.ok).toBe(false);
    expect(missing.error?.code).toBe("config");

    const urls: string[] = [];
    const found = await lookupUnpaywall("https://doi.org/10.1371/journal.pone.0000001", {
      contactEmail: "reader@school.edu",
      fetch: (async (url: string) => {
        urls.push(String(url));
        return json({
          doi: "10.1371/journal.pone.0000001",
          is_oa: true,
          title: "Neural Substrate",
          best_oa_location: {
            url_for_pdf: "https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0000001&type=printable",
            license: "cc-by",
          },
        });
      }) as typeof fetch,
    });
    expect(urls[0]).toMatch(/^https:\/\/api\.unpaywall\.org\/v2\/10\.1371%2Fjournal\.pone\.0000001\?email=/);
    expect(urls[0]).not.toContain("query=");
    expect(found.patch?.pdfUrl).toContain("type=printable");
    expect(found.patch?.accessStatus).toBe("open-access");
    await expect(lookupUnpaywall("not-a-doi", { contactEmail: "reader@school.edu" })).resolves.toMatchObject({ ok: false });
  });
});

describe("federated search", () => {
  test("keeps results when one provider fails and pages each source separately", async () => {
    const cursors: Record<string, string | undefined> = {};
    const providers: ResourceProvider[] = [
      {
        id: "openalex",
        async search(options) {
          cursors.openalex = options.cursor;
          return {
            results: [paper({ doi: "10.1000/same", title: "Shared photosynthesis paper" })],
            nextCursor: "oa-2",
            hasMore: true,
          };
        },
      },
      {
        id: "plos",
        async search() {
          throw new ResourceApiError({
            provider: "plos",
            code: "http",
            status: 503,
            retryable: true,
            userMessage: "PLOS could not complete the request.",
          });
        },
      },
      {
        id: "arxiv",
        async search(options) {
          cursors.arxiv = options.cursor;
          return {
            results: [paper({
              id: "arxiv:1",
              provider: "arxiv",
              kind: "preprint",
              doi: "10.1000/SAME",
              pdfUrl: "https://arxiv.org/pdf/1",
              provenance: "arXiv",
            })],
            nextCursor: "10",
            hasMore: true,
          };
        },
      },
      {
        id: "wikipedia",
        async search() {
          throw new Error("should not be called for pdf-only");
        },
      },
    ];
    const result = await searchResources(
      { query: "photosynthesis", pdfOnly: true, cursor: JSON.stringify({ openalex: "oa-1", arxiv: "0" }) },
      ["openalex", "plos", "arxiv", "wikipedia"],
      providers,
    );
    expect(result.networkUnavailable).toBe(false);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].pdfUrl).toBe("https://arxiv.org/pdf/1");
    expect(result.results[0].alsoFoundAt).toContain("arxiv");
    expect(result.providers.find((status) => status.provider === "plos")?.state).toBe("error");
    expect(result.providers.find((status) => status.provider === "wikipedia")?.state).toBe("skipped");
    expect(cursors).toEqual({ openalex: "oa-1", arxiv: "0" });
    expect(JSON.parse(result.nextCursor ?? "{}")).toEqual({ openalex: "oa-2", arxiv: "10" });
  });

  test("reports an offline search without inventing results", async () => {
    const provider: ResourceProvider = {
      id: "zenodo",
      async search() {
        throw new ResourceApiError({
          provider: "zenodo",
          code: "network",
          retryable: true,
          userMessage: "Could not reach Zenodo. Check your connection.",
        });
      },
    };
    const result = await searchResources({ query: "soil" }, ["zenodo"], [provider]);
    expect(result.results).toEqual([]);
    expect(result.networkUnavailable).toBe(true);
  });

  test("rejects an empty query", async () => {
    await expect(searchResources({ query: "  " }, [], [])).rejects.toBeInstanceOf(ResourceApiError);
  });
});

describe("document link checks", () => {
  test("accepts a PDF response and rejects an HTML landing page", async () => {
    const pdf = await validateDocumentLink("https://files.example/paper.pdf", {
      fetch: (async (_url: string, init?: RequestInit) => {
        if (init?.method === "HEAD") {
          return new Response(null, { status: 200, headers: { "content-type": "application/pdf", "content-length": "1200" } });
        }
        return new Response("nope", { status: 500 });
      }) as typeof fetch,
    });
    expect(pdf.ok).toBe(true);
    expect(pdf.bytes).toBe(1200);

    const html = await validateDocumentLink("https://publisher.example/article", {
      fetch: (async (_url: string, init?: RequestInit) => {
        if (init?.method === "HEAD") return new Response(null, { status: 405 });
        const bytes = new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c]);
        return new Response(bytes, { status: 200, headers: { "content-type": "text/html" } });
      }) as typeof fetch,
    });
    expect(html.ok).toBe(false);
    expect(html.reason).toBe("not-a-pdf");
  });
});
