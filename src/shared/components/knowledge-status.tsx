import type { PropsWithChildren } from 'react';

import { useKnowledge } from '@/shared/providers/knowledge-provider';
import { StatusCard } from './status-card';

export function KnowledgeStatus({ children }: PropsWithChildren) {
  const { state } = useKnowledge();
  const title = state.status === 'ready' ? 'Offline library ready'
    : state.status === 'opening' ? 'Opening offline library'
    : state.status === 'unavailable' ? 'Library unavailable on web' : 'Library could not be opened';
  const description = state.status === 'ready'
    ? `${state.passages} passages from ${state.packs.length} knowledge ${state.packs.length === 1 ? 'pack' : 'packs'} are indexed on this device. Search covers only this content, not the live web.`
    : state.status === 'opening' ? 'Preparing the local search index…'
    : state.status === 'unavailable' ? state.reason : state.message;
  return <StatusCard title={title} description={description}>{children}</StatusCard>;
}
