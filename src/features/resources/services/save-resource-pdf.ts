import { MAX_DOCUMENT_BYTES } from "@/features/resources/config";
import { isPdfBytes, pdfLibrary, pdfStorageKey, type SavedPdfRecord } from "@/infrastructure/resources/pdf-library";

export type PdfSaveFailure = "network" | "not-pdf" | "too-large" | "storage";

export class PdfSaveError extends Error {
  constructor(readonly code: PdfSaveFailure) {
    super(code);
    this.name = "PdfSaveError";
  }
}

export async function saveResourcePdf(input: {
  resourceId: string;
  title: string;
  url: string;
  signal?: AbortSignal;
}): Promise<SavedPdfRecord> {
  const id = pdfStorageKey(input.resourceId);
  let response: Response;
  try {
    response = await fetch(input.url, { signal: input.signal });
  } catch {
    throw new PdfSaveError("network");
  }
  if (!response.ok) throw new PdfSaveError("network");
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_DOCUMENT_BYTES) throw new PdfSaveError("too-large");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) throw new PdfSaveError("too-large");
  if (!isPdfBytes(bytes)) throw new PdfSaveError("not-pdf");
  const record: SavedPdfRecord = {
    id,
    resourceId: input.resourceId,
    title: input.title,
    sourceUrl: input.url,
    bytes,
    savedAt: new Date().toISOString(),
  };
  try {
    await pdfLibrary.save(record);
  } catch {
    throw new PdfSaveError("storage");
  }
  return record;
}

export async function savedPdfIds(): Promise<string[]> {
  try {
    return await pdfLibrary.listIds();
  } catch {
    return [];
  }
}

export async function openSavedPdf(id: string): Promise<SavedPdfRecord | null> {
  try {
    return await pdfLibrary.read(pdfStorageKey(id));
  } catch {
    return null;
  }
}
