// eslint-disable-next-line import/no-unresolved
import { describe, expect, test } from "bun:test";

import { createReadingRepository, decodeReading } from "../src/infrastructure/learning/reading-repository";
import { downloadWikipedia, extractSections, searchWikipedia } from "../src/infrastructure/learning/wikipedia";

const extract = "Plants turn light into chemical energy.\nA second introductory paragraph.\n\n== Light reactions ==\nThis is the full section, beyond the introduction.\n\n=== Chlorophyll ===\nPigments absorb light.\n\n== References ==\nFurther reading.";
const page = {
  pageid: 24544, title: "Photosynthesis", extract, pageimage: "Leaf.png",
  revisions: [{ revid: 123456, timestamp: "2026-10-08T12:00:00Z" }],
};
const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0x2e, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
const leafInfo = {
  title: "File:Leaf.png",
  imageinfo: [{
    mime: "image/png", thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Leaf.png/720px-Leaf.png",
    thumbwidth: 720, thumbheight: 400,
    descriptionurl: "https://commons.wikimedia.org/wiki/File:Leaf.png",
    extmetadata: {
      ImageDescription: { value: "A leaf converting light." },
      Artist: { value: "Jane Botanist" },
      LicenseShortName: { value: "CC BY-SA 4.0" },
    },
  }],
};
const reply = (data, status = 200) => async () => new Response(JSON.stringify(data), { status });
const article = async () => (await downloadWikipedia(24544, "en", undefined, reply({ query: { pages: [page] } }))).article;

function wikipediaFetcher(extraPages = []) {
  return async (url) => {
    const parsed = new URL(url);
    if (parsed.hostname === "upload.wikimedia.org" || parsed.hostname === "thumb.wikimedia.org") {
      return new Response(png, { headers: { "Content-Type": "image/png" } });
    }
    if (parsed.searchParams.get("generator") === "images") {
      return new Response(JSON.stringify({ query: { pages: extraPages } }));
    }
    return new Response(JSON.stringify({ query: { pages: [page] } }));
  };
}

function memoryStorage() {
  const records = new Map();
  const assets = new Map();
  return {
    records, assets,
    keys: async () => [...records.keys()],
    read: async (id) => records.get(id) ?? null,
    write: async (id, raw) => { records.set(id, raw); },
    writeAssets: async (id, files) => {
      for (const key of [...assets.keys()]) if (key.startsWith(`${id}/`)) assets.delete(key);
      for (const file of files) assets.set(`${id}/${file.name}`, file.bytes);
    },
    readAsset: async (id, name) => assets.has(`${id}/${name}`) ? `data:image/png;base64,${Buffer.from(assets.get(`${id}/${name}`)).toString("base64")}` : null,
    assetSize: async (id, name) => assets.get(`${id}/${name}`)?.byteLength ?? 0,
    remove: async (id) => {
      records.delete(id);
      for (const key of [...assets.keys()]) if (key.startsWith(`${id}/`)) assets.delete(key);
    },
  };
}

describe("Wikipedia downloads", () => {
  test("search uses the selected language, namespace, CORS and bounded results", async () => {
    let called = false;
    const results = await searchWikipedia(" halaman ", "tl", undefined, async (url, options) => {
      called = true;
      const parsed = new URL(url);
      expect(parsed.hostname).toBe("tl.wikipedia.org");
      expect(parsed.searchParams.get("gsrsearch")).toBe("halaman");
      expect(parsed.searchParams.get("origin")).toBe("*");
      expect(parsed.searchParams.get("gsrnamespace")).toBe("0");
      expect(parsed.searchParams.get("gsrlimit")).toBe("12");
      expect(parsed.searchParams.get("prop")).toBe("pageimages");
      expect(options.headers["Api-User-Agent"]).toContain("AralSearch");
      return new Response(JSON.stringify({ query: { pages: [
        { pageid: 7, title: "Halaman", wordcount: 1100, index: 1, thumbnail: { source: "https://thumb.wikimedia.org/wikipedia/commons/a.jpg" } },
        { pageid: -1, title: "Invalid", index: 2 },
      ] } }));
    });
    expect(called).toBe(true);
    expect(results).toEqual([{
      id: "wikipedia-tl-7", pageId: 7, language: "tl", title: "Halaman", wordCount: 1100,
      thumbnailUrl: "https://thumb.wikimedia.org/wikipedia/commons/a.jpg",
    }]);
  });

  test("empty searches make no request", async () => {
    expect(await searchWikipedia("  ", "en", undefined, () => { throw new Error("network used"); })).toEqual([]);
  });

  test("downloads article text beyond the introduction and keeps source attribution", async () => {
    const saved = await downloadWikipedia(24544, "en", undefined, async (url) => {
      const params = new URL(url).searchParams;
      if (params.get("explaintext") === "1") {
        expect(params.get("prop")).toContain("extracts");
        for (const limited of ["exintro", "exchars", "exsentences"]) expect(params.has(limited)).toBe(false);
      }
      return new Response(JSON.stringify({ query: { pages: params.get("generator") === "images" ? [] : [page] } }));
    });
    expect(saved.article.sections[1].paragraphs).toContain("This is the full section, beyond the introduction.");
    expect(saved.article.sections[2].level).toBe(3);
    expect(saved.article.sourceUrl).toBe("https://en.wikipedia.org/w/index.php?oldid=123456");
    expect(saved.article.historyUrl).toContain("curid=24544&action=history");
    expect(saved.article.license).toBe("CC BY-SA 4.0");
    expect(saved.article.figures).toEqual([]);
    expect(decodeReading(JSON.stringify(saved.article))).toEqual(saved.article);
  });

  test("saves Wikipedia figures locally and skips decorative files", async () => {
    const saved = await downloadWikipedia(24544, "en", undefined, wikipediaFetcher([
      leafInfo,
      {
        title: "File:Calvin Cycle.svg",
        imageinfo: [{
          mime: "image/svg+xml",
          thumburl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Calvin_Cycle.svg/720px-Calvin_Cycle.svg.png",
          thumbwidth: 720, thumbheight: 400,
          descriptionurl: "https://commons.wikimedia.org/wiki/File:Calvin_Cycle.svg",
          extmetadata: {
            ImageDescription: { value: "The Calvin cycle." },
            Artist: { value: "A. Diagram" },
            LicenseShortName: { value: "CC BY-SA 4.0" },
          },
        }],
      },
      {
        title: "File:Commons-logo.svg",
        imageinfo: [{ mime: "image/svg+xml", thumburl: "https://upload.wikimedia.org/wikipedia/commons/logo.svg",
          thumbwidth: 400, thumbheight: 400, descriptionurl: "https://commons.wikimedia.org/wiki/File:Commons-logo.svg",
          extmetadata: { LicenseShortName: { value: "CC0" } } }],
      },
      {
        title: "File:Evil.png",
        imageinfo: [{ mime: "image/png", thumburl: "https://evil.example/x.png", thumbwidth: 720, thumbheight: 400,
          descriptionurl: "javascript:alert(1)", extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" } } }],
      },
    ]));
    expect(saved.article.figures).toEqual([
      {
        id: "fig-1", caption: "A leaf converting light.", credit: "Jane Botanist", license: "CC BY-SA 4.0",
        filePageUrl: "https://commons.wikimedia.org/wiki/File:Leaf.png", mime: "image/png", width: 720, height: 400,
      },
      {
        id: "fig-2", caption: "The Calvin cycle.", credit: "A. Diagram", license: "CC BY-SA 4.0",
        filePageUrl: "https://commons.wikimedia.org/wiki/File:Calvin_Cycle.svg", mime: "image/png", width: 720, height: 400,
      },
    ]);
    expect(saved.assets).toEqual([
      { name: "fig-1.png", bytes: png },
      { name: "fig-2.png", bytes: png },
    ]);
  });

  test("asks the media host for pictures without a header that would preflight the request", async () => {
    const mediaRequests = [];
    await downloadWikipedia(24544, "en", undefined, async (url, options) => {
      if (!url.includes("/w/api.php")) mediaRequests.push(options ?? {});
      return wikipediaFetcher([leafInfo])(url, options);
    });
    expect(mediaRequests.length).toBe(1);
    // thumb.wikimedia.org refuses the preflight any custom header forces, so none may be sent.
    expect(mediaRequests[0].headers).toBeUndefined();
  });

  test("keeps the article if figure downloads fail", async () => {
    const saved = await downloadWikipedia(24544, "en", undefined, async (url) => {
      const parsed = new URL(url);
      if (parsed.hostname === "upload.wikimedia.org" || parsed.hostname === "thumb.wikimedia.org") {
      return new Response("missing", { status: 404 });
    }
      if (parsed.searchParams.get("generator") === "images") {
        return new Response(JSON.stringify({ query: { pages: [leafInfo] } }));
      }
      return new Response(JSON.stringify({ query: { pages: [page] } }));
    });
    expect(saved.article.title).toBe("Photosynthesis");
    expect(saved.article.figures).toEqual([]);
    expect(saved.assets).toEqual([]);
  });

  test("section parsing preserves unicode, hierarchy and paragraphs", () => {
    const sections = extractSections("Panimula 🌱\r\n\r\n== Mga halaman ==\r\nTumutubo ang mga halaman.\r\n=== Araw ===\r\nLiwanag.");
    expect(sections).toEqual([
      { title: "", level: 1, paragraphs: ["Panimula 🌱"] },
      { title: "Mga halaman", level: 2, paragraphs: ["Tumutubo ang mga halaman."] },
      { title: "Araw", level: 3, paragraphs: ["Liwanag."] },
    ]);
  });

  test("rejects missing, empty, mismatched, oversized and warned extracts", async () => {
    for (const invalid of [
      { ...page, missing: true }, { ...page, extract: "" }, { ...page, pageid: 10 },
      { ...page, revisions: [] }, { ...page, extract: "a".repeat(1_000_001) },
    ]) {
      await expect(downloadWikipedia(24544, "en", undefined, reply({ query: { pages: [invalid] } }))).rejects.toThrow();
    }
    await expect(downloadWikipedia(24544, "en", undefined, reply({
      warnings: { extracts: { "*": "Extract unavailable" } }, query: { pages: [page] },
    }))).rejects.toThrow("unavailable");
  });

  test("handles rate limits, API errors and cancellation without returning content", async () => {
    await expect(downloadWikipedia(24544, "en", undefined, reply({}, 429))).rejects.toThrow("network");
    await expect(searchWikipedia("plants", "en", undefined, reply({ error: { code: "maxlag" } }))).rejects.toThrow("unavailable");
    const controller = new AbortController();
    controller.abort();
    await expect(downloadWikipedia(24544, "en", controller.signal, () => {
      throw new Error("Should not make a request");
    })).rejects.toThrow("cancelled");
  });
});

describe("durable offline reading", () => {
  test("a fresh repository opens saved text without a network dependency, and removes it", async () => {
    const storage = memoryStorage();
    const saved = await article();
    const summary = await createReadingRepository(storage).save(saved);
    expect(summary.sections).toBeUndefined();
    expect(summary.figures).toBeUndefined();
    expect(summary.figureCount).toBe(0);
    expect(summary.sizeBytes).toBeGreaterThan(extract.length);
    const restarted = createReadingRepository(storage);
    expect(await restarted.list()).toEqual([summary]);
    expect(await restarted.get(saved.id)).toEqual(saved);
    await restarted.remove(saved.id);
    expect(await restarted.list()).toEqual([]);
    expect(await restarted.get(saved.id)).toBeNull();
  });

  test("reopens saved figures from local storage", async () => {
    const storage = memoryStorage();
    const saved = await downloadWikipedia(24544, "en", undefined, wikipediaFetcher([leafInfo]));
    const summary = await createReadingRepository(storage).save(saved.article, saved.assets);
    expect(summary.figureCount).toBe(1);
    expect(summary.sizeBytes).toBeGreaterThan(png.byteLength);
    const opened = await createReadingRepository(storage).get(saved.article.id);
    expect(opened.figures[0].caption).toBe("A leaf converting light.");
    expect(opened.figures[0].uri).toContain("data:image/png;base64,");
    await createReadingRepository(storage).remove(saved.article.id);
    expect(storage.assets.size).toBe(0);
  });

  test("a failed commit never reports a downloaded article", async () => {
    const storage = memoryStorage();
    storage.write = async () => { throw new Error("Storage quota exceeded"); };
    const repository = createReadingRepository(storage);
    await expect(repository.save(await article())).rejects.toThrow("quota");
    expect(await repository.list()).toEqual([]);
  });

  test("waits for persistence to commit before resolving save", async () => {
    const storage = memoryStorage();
    let commit;
    const gate = new Promise((resolve) => { commit = resolve; });
    storage.write = async (id, raw) => { await gate; storage.records.set(id, raw); };
    const saved = await article();
    const repository = createReadingRepository(storage);
    let complete = false;
    const saving = repository.save(saved).then(() => { complete = true; });
    await Promise.resolve();
    expect(complete).toBe(false);
    expect(await repository.list()).toEqual([]);
    commit();
    await saving;
    expect(complete).toBe(true);
    expect(await repository.get(saved.id)).toEqual(saved);
  });

  test("ignores corrupt or foreign records without claiming they are installed", async () => {
    const storage = memoryStorage();
    const saved = await article();
    storage.records.set("wikipedia-en-1", "{broken JSON");
    storage.records.set("wikipedia-en-2", JSON.stringify(saved));
    storage.records.set(saved.id, JSON.stringify({ ...saved, sections: [] }));
    storage.records.set("unrelated", "private unrelated value");
    const repository = createReadingRepository(storage);
    expect(await repository.list()).toEqual([]);
    expect(await repository.get("wikipedia-en-2")).toBeNull();
    expect(await repository.get("../../private")).toBeNull();
    await expect(repository.remove("../../private")).rejects.toThrow();
    expect(storage.records.get("unrelated")).toBe("private unrelated value");
  });

  test("stored links must match the source and license, never arbitrary remote URLs", async () => {
    const saved = await article();
    expect(decodeReading(JSON.stringify({ ...saved, sourceUrl: "javascript:alert(1)" }))).toBeNull();
    expect(decodeReading(JSON.stringify({ ...saved, licenseUrl: "https://unrelated.example" }))).toBeNull();
    expect(decodeReading(JSON.stringify({
      ...saved, version: 2, figures: [{
        id: "fig-1", caption: "x", credit: "y", license: "CC BY-SA 4.0",
        filePageUrl: "https://evil.example/File:Leaf.png", mime: "image/png", width: 720, height: 400,
      }],
    }))).toBeNull();
  });

  test("opens previously saved text-only records", async () => {
    const storage = memoryStorage();
    const saved = await article();
    const { figures: _figures, ...legacy } = saved;
    storage.records.set(saved.id, JSON.stringify({ ...legacy, version: 1 }));
    const opened = await createReadingRepository(storage).get(saved.id);
    expect(opened.figures).toEqual([]);
    expect(opened.title).toBe("Photosynthesis");
  });
});
