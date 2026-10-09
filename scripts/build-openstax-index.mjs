/**
 * Builds a slim app index from content/openstax metadata (catalog + manifest).
 * Run after refreshing OpenStax downloads: `bun run content:openstax`
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const METADATA = resolve(ROOT, "content/openstax");
const OUT_DIR = resolve(ROOT, "src/shared/content/openstax");
const OUT_FILE = resolve(OUT_DIR, "initial-resources.json");
const OUT_ASSETS = resolve(OUT_DIR, "pack-assets.json");

const CATEGORY_BY_SUBJECT = {
  Science: "science",
  Ciencia: "science",
  Nursing: "science",
  Math: "culture",
  "Matemáticas": "culture",
  "Social Sciences": "history",
  Humanities: "history",
  Business: "technology",
  "Computer Science": "technology",
  "College Success": "culture",
  Other: "culture",
};

function stripHtml(value) {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugSubject(name) {
  const value = name ? String(name) : "Other";
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "other";
}

function estimateReadMinutes(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.min(45, Math.round(words / 180)));
}

function readJson(name) {
  return JSON.parse(readFileSync(resolve(METADATA, name), "utf8"));
}

const catalog = readJson("catalog.json");
const manifest = readJson("manifest.json");
const verification = readJson("verification.json");

const catalogById = new Map(catalog.map((book) => [book.id, book]));
const assetByPath = new Map(manifest.assets.map((asset) => [asset.path, asset]));

const books = [];
const packStats = new Map();

for (const book of catalog) {
  if (book.book_state !== "live") continue;

  const slug = book.meta?.slug;
  if (!slug) continue;

  const subject =
    book.book_subjects?.[0]?.subject_name ??
    book.book_categories?.[0]?.subject_name ??
    "Other";
  const packId = slugSubject(subject);
  const packTitle = subject;
  const category = CATEGORY_BY_SUBJECT[subject] ?? "culture";

  const refs = manifest.references.filter(
    (ref) => ref.book_slug === slug && ref.status === "downloaded" && ref.path,
  );
  if (!refs.length) continue;

  let sizeBytes = 0;
  const paths = new Set();
  for (const ref of refs) {
    paths.add(ref.path);
    const asset = assetByPath.get(ref.path);
    if (asset?.bytes) sizeBytes += asset.bytes;
  }

  const plainDescription = stripHtml(book.description);
  const summary =
    stripHtml(book.meta?.search_description) ||
    plainDescription.slice(0, 280) ||
    book.title;

  const tags = [
    subject,
    ...(book.book_categories?.map((c) => c.subject_category) ?? []),
    book.title,
  ]
    .join(" ")
    .toLowerCase();

  const id = `openstax:${slug}`;
  books.push({
    id,
    slug,
    bookId: book.id,
    title: book.title,
    packId,
    packTitle,
    category,
    locale: book.meta?.locale ?? "en",
    summary,
    overview: plainDescription.slice(0, 1200) || summary,
    highlight: summary.slice(0, 160),
    resourceCount: refs.length,
    sizeBytes,
    coverUrl: book.cover_url ?? book.title_image_url ?? null,
    sourcePage: book.meta?.html_url ?? null,
    licenseName: book.license_name ?? "Creative Commons",
    licenseUrl: book.license_url ?? null,
    updatedAt: (book.updated ?? book.created ?? manifest.retrieved_at).slice(0, 10),
    tags,
    readMinutes: estimateReadMinutes(plainDescription || summary),
  });

  const pack = packStats.get(packId) ?? {
    id: packId,
    title: packTitle,
    category,
    resourceCount: 0,
    bookCount: 0,
    sizeBytes: 0,
    highlights: [],
    updatedAt: manifest.retrieved_at.slice(0, 10),
  };
  pack.resourceCount += refs.length;
  pack.bookCount += 1;
  pack.sizeBytes += sizeBytes;
  if (pack.highlights.length < 4) pack.highlights.push(book.title);
  packStats.set(packId, pack);
}

books.sort((a, b) => a.title.localeCompare(b.title));

const packs = [...packStats.values()]
  .map((pack) => ({
    ...pack,
    sizeMb: Math.max(1, Math.round(pack.sizeBytes / (1024 * 1024))),
    description: `OpenStax textbooks and student resources for ${pack.title.toLowerCase()}.`,
    publisher: "OpenStax",
  }))
  .sort((a, b) => b.sizeBytes - a.sizeBytes);

const packAssetMap = {};

for (const asset of manifest.assets) {
  if (!asset.url) continue;
  if (asset.status !== "downloaded" && asset.status !== "pending" && asset.status !== "failed") {
    continue;
  }
  const refs = asset.references
    .map((index) => manifest.references[index])
    .filter(Boolean);
  const ref = refs.find((entry) => entry.status === "downloaded" || entry.status === "pending");
  if (!ref) continue;

  const packId = slugSubject((ref.subjects || ["Other"])[0]);
  const entry = packAssetMap[packId] ?? { totalBytes: 0, assets: new Map() };
  if (!entry.assets.has(asset.path)) {
    entry.assets.set(asset.path, {
      path: asset.path,
      url: asset.url,
      bytes: asset.bytes ?? asset.expected_bytes ?? 0,
      sha256: asset.sha256 ?? null,
    });
    entry.totalBytes += asset.bytes ?? asset.expected_bytes ?? 0;
  }
  packAssetMap[packId] = entry;
}

const packDownloads = Object.fromEntries(
  Object.entries(packAssetMap)
    .map(([packId, entry]) => [
      packId,
      {
        totalBytes: entry.totalBytes,
        assets: [...entry.assets.values()].sort((a, b) => a.path.localeCompare(b.path)),
      },
    ])
    .sort(([a], [b]) => a.localeCompare(b)),
);

const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    name: "OpenStax",
    catalogRetrievedAt: manifest.retrieved_at,
    verification: {
      verifiedAt: verification.verified_at,
      books: verification.books,
      downloadedAssets: verification.asset_statuses?.downloaded ?? 0,
      downloadedBytes: verification.downloaded_bytes,
    },
  },
  packs,
  books,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");
writeFileSync(
  OUT_ASSETS,
  JSON.stringify({ schemaVersion: 1, generatedAt: payload.generatedAt, packs: packDownloads }, null, 2) +
    "\n",
  "utf8",
);

const kb = Math.round(readFileSync(OUT_FILE, "utf8").length / 1024);
const assetsKb = Math.round(readFileSync(OUT_ASSETS, "utf8").length / 1024);
console.log(
  `Wrote ${OUT_FILE} (${kb} KB, ${packs.length} packs, ${books.length} books)`,
);
console.log(`Wrote ${OUT_ASSETS} (${assetsKb} KB, ${Object.keys(packDownloads).length} pack manifests)`);
