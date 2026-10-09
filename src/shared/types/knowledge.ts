export type DocumentKind = 'article' | 'book' | 'document';

/** IDs are issued by local storage, never model output. Timestamps use ISO 8601. */
export interface KnowledgeDocument {
  id: string;
  packId: string | null;
  title: string;
  author: string | null;
  sourceUrl: string | null;
  license: string;
  mimeType: string;
  kind: DocumentKind;
  localUri: string | null;
  language: string;
  contentHash: string;
  indexedAt: string | null;
  createdAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  pageNumber: number | null;
  heading: string | null;
  offsetStart: number | null;
  offsetEnd: number | null;
}

export interface KnowledgePack {
  id: string;
  name: string;
  version: string;
  description: string;
  language: string;
  publisher: string;
  license: string;
  sourceUrls: readonly string[];
  checksum: string;
  installedAt: string;
}

export interface SourceCitation {
  sourceId: string;
  documentId: string;
  chunkId: string;
  title: string;
  pageNumber: number | null;
}
