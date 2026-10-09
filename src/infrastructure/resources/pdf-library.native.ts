import { Directory, File, Paths } from "expo-file-system";

import {
  isPdfBytes,
  pdfStorageKey,
  type PdfLibrary,
  type SavedPdfRecord,
  type SavedPdfSummary,
} from "./pdf-record";

function root() {
  return new Directory(Paths.document, "resource-pdfs");
}

function pdfFile(id: string) {
  return new File(root(), `${pdfStorageKey(id)}.pdf`);
}

function metaFile(id: string) {
  return new File(root(), `${pdfStorageKey(id)}.json`);
}

export const pdfLibrary: PdfLibrary = {
  async listIds() {
    const directory = root();
    if (!directory.exists) return [];
    return directory
      .list()
      .filter((entry) => entry instanceof File && entry.name.endsWith(".pdf"))
      .map((entry) => entry.name.slice(0, -4));
  },
  async listSummaries() {
    const directory = root();
    if (!directory.exists) return [];
    const summaries: SavedPdfSummary[] = [];
    for (const entry of directory.list()) {
      if (!(entry instanceof File) || !entry.name.endsWith(".json")) continue;
      try {
        const parsed = JSON.parse(await entry.text()) as Partial<SavedPdfSummary>;
        if (!parsed.id || !parsed.title) continue;
        summaries.push({
          id: parsed.id,
          title: parsed.title,
          savedAt: parsed.savedAt ?? "",
        });
      } catch {
        continue;
      }
    }
    return summaries.sort((left, right) => right.savedAt.localeCompare(left.savedAt));
  },
  async read(id) {
    const file = pdfFile(id);
    const meta = metaFile(id);
    if (!file.exists || !meta.exists) return null;
    const parsed = JSON.parse(await meta.text()) as Omit<
      SavedPdfRecord,
      "bytes" | "localUri"
    >;
    return { ...parsed, bytes: await file.bytes(), localUri: file.uri };
  },
  async save(record) {
    root().create({ intermediates: true, idempotent: true });
    const file = pdfFile(record.id);
    const meta = metaFile(record.id);
    file.write(record.bytes);
    meta.write(
      JSON.stringify({
        id: pdfStorageKey(record.id),
        resourceId: record.resourceId,
        title: record.title,
        sourceUrl: record.sourceUrl,
        savedAt: record.savedAt,
      }),
    );
  },
};

export { isPdfBytes, pdfStorageKey };
