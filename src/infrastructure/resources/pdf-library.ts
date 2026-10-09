import type { PdfLibrary } from "./pdf-record";

const unsupported = async (): Promise<never> => {
  throw new Error("PDF storage requires Android, iOS, or a browser.");
};

export const pdfLibrary: PdfLibrary = {
  listIds: unsupported,
  read: async () => null,
  save: unsupported,
};

export { isPdfBytes, pdfStorageKey } from "./pdf-record";
export type { SavedPdfRecord } from "./pdf-record";
