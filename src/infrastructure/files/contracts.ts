export type ImportFormat = 'text/plain' | 'text/markdown';

export interface ImportProgress {
  stage: 'copying' | 'extracting' | 'indexing' | 'complete';
  processedChunks: number;
}

export type ImportResult =
  | { status: 'imported'; documentId: string }
  | { status: 'duplicate'; documentId: string };

/** Copy into owned storage; never delete the user's original picked file. */
export interface DocumentImporter {
  import(request: {
    sourceUri: string;
    filename: string;
    mimeType: ImportFormat;
    onProgress?: (progress: ImportProgress) => void;
    signal?: AbortSignal;
  }): Promise<ImportResult>;
}
