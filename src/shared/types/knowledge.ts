export type DocumentKind = 'article' | 'book' | 'document';

/** IDs are issued by local storage, never model output. Timestamps use ISO 8601. */
export interface KnowledgeDocument {
  id: string;
  packId: string | null;
  title: string;
  /** Display labels from the source, such as "1. Linear Equations" and "1.2". */
  chapter: string | null;
  section: string | null;
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
  /** The pack's own passage identifier; one passage may be split into several chunks. */
  passageId: string | null;
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
  author: string;
  publisher: string;
  /** Where the content came from, in words. */
  source: string;
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
