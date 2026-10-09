import type { DocumentChunk, DocumentKind, KnowledgeDocument, KnowledgePack } from '@/shared/types/knowledge';

export interface SearchRequest {
  query: string;
  kind?: DocumentKind;
  limit: number;
  offset: number;
  signal?: AbortSignal;
}

export interface SearchHit {
  document: KnowledgeDocument;
  chunkId: string;
  excerpt: string;
  packName: string | null;
  /** SQLite bm25: lower values rank first. */
  rank: number;
}

/** Local-only port. Implementations own SQL, parameterization, and cancellation. */
export interface KnowledgeRepository {
  search(request: SearchRequest): Promise<readonly SearchHit[]>;
  getDocument(id: string): Promise<KnowledgeDocument | null>;
  getChunk(id: string): Promise<DocumentChunk | null>;
  getDocumentChunks(documentId: string, limit: number, offset: number): Promise<readonly DocumentChunk[]>;
  listPacks(): Promise<readonly KnowledgePack[]>;
}

export interface SavedItem {
  id: string;
  documentId: string;
  chunkId: string | null;
  note: string | null;
  createdAt: string;
}

export interface SavedItemsRepository {
  list(limit: number, offset: number): Promise<readonly SavedItem[]>;
  save(documentId: string, chunkId?: string): Promise<SavedItem>;
  remove(id: string): Promise<void>;
}
