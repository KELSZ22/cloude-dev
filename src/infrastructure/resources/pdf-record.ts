export interface SavedPdfRecord {
  id: string;
  resourceId: string;
  title: string;
  sourceUrl: string;
  bytes: Uint8Array;
  savedAt: string;
  /** Native file URI. The browser reader builds a preview URL from `bytes`. */
  localUri?: string;
}

export interface SavedPdfSummary {
  id: string;
  title: string;
  savedAt: string;
}

export interface PdfLibrary {
  listIds(): Promise<string[]>;
  listSummaries(): Promise<SavedPdfSummary[]>;
  read(id: string): Promise<SavedPdfRecord | null>;
  save(record: SavedPdfRecord): Promise<void>;
}

export function pdfStorageKey(resourceId: string): string {
  const key = resourceId.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return (key || "pdf").slice(0, 120);
}

export function isPdfBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}
