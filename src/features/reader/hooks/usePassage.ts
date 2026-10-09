import { useEffect, useState } from 'react';

import { useKnowledge } from '@/shared/providers/knowledge-provider';
import type { DocumentChunk, KnowledgeDocument, KnowledgePack } from '@/shared/types/knowledge';

const SECTION_CHUNK_LIMIT = 200;

export type PassageView =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'found'; chunk: DocumentChunk; document: KnowledgeDocument; pack: KnowledgePack | null; section: readonly DocumentChunk[] };

/** Loads a stored passage together with the rest of its section and its pack's attribution. */
export function usePassage(chunkId: string | undefined): PassageView {
  const { state, repository } = useKnowledge();
  const [view, setView] = useState<PassageView>({ status: 'loading' });

  useEffect(() => {
    if (!repository || !chunkId) return;
    let disposed = false;
    void (async () => {
      const chunk = await repository.getChunk(chunkId);
      const document = chunk && await repository.getDocument(chunk.documentId);
      if (!chunk || !document) return { status: 'missing' } as const;
      const section = await repository.getDocumentChunks(document.id, SECTION_CHUNK_LIMIT, 0);
      const pack = (await repository.listPacks()).find((candidate) => candidate.id === document.packId) ?? null;
      return { status: 'found', chunk, document, pack, section } as const;
    })().then((next) => { if (!disposed) setView(next); }).catch((failure: unknown) => {
      if (!disposed) setView({ status: 'error', message: failure instanceof Error ? failure.message : 'The passage could not be read.' });
    });
    return () => { disposed = true; };
  }, [repository, chunkId]);

  if (!chunkId) return { status: 'missing' };
  if (state.status === 'unavailable') return { status: 'error', message: state.reason };
  if (state.status === 'error') return { status: 'error', message: state.message };
  return view;
}
