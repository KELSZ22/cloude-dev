import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { DatabaseUnavailableError, type KnowledgeRepository } from '@/infrastructure/database';
import { openKnowledgeDatabase } from '@/infrastructure/database/create-database';
import { assertFts5, migrate } from '@/infrastructure/database/migrations';
import { SqliteKnowledgeRepository } from '@/infrastructure/database/sqlite-knowledge-repository';
import { bundledPacks } from '@/infrastructure/knowledge/bundled-packs';
import { parsePack } from '@/infrastructure/knowledge/pack-format';
import type { KnowledgePack } from '@/shared/types/knowledge';

export type KnowledgeState =
  | { status: 'opening' }
  | { status: 'ready'; packs: readonly KnowledgePack[]; passages: number }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; message: string };

interface KnowledgeContextValue {
  state: KnowledgeState;
  /** Null until the local library has been opened, migrated, and indexed. */
  repository: KnowledgeRepository | null;
}

interface Library { repository: KnowledgeRepository; packs: readonly KnowledgePack[]; passages: number }

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null);

async function openLibrary(): Promise<Library> {
  const database = await openKnowledgeDatabase();
  await assertFts5(database);
  await migrate(database);
  const repository = new SqliteKnowledgeRepository(database);
  // Installing is a no-op when the stored checksum already matches the bundled pack.
  for (const pack of bundledPacks) await repository.installPack(parsePack(pack));
  return { repository, packs: await repository.listPacks(), passages: await repository.countChunks() };
}

export function KnowledgeProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<KnowledgeState>({ status: 'opening' });
  const [repository, setRepository] = useState<KnowledgeRepository | null>(null);
  // One connection for the life of the app, even if the effect runs twice in development.
  const opening = useRef<Promise<Library> | null>(null);

  useEffect(() => {
    let disposed = false;
    opening.current ??= openLibrary();
    opening.current.then((library) => {
      if (disposed) return;
      setRepository(library.repository);
      setState({ status: 'ready', packs: library.packs, passages: library.passages });
    }).catch((failure: unknown) => {
      if (disposed) return;
      const message = failure instanceof Error ? failure.message : 'The offline library could not be opened.';
      setState(failure instanceof DatabaseUnavailableError ? { status: 'unavailable', reason: message } : { status: 'error', message });
    });
    return () => { disposed = true; };
  }, []);

  return <KnowledgeContext.Provider value={{ state, repository }}>{children}</KnowledgeContext.Provider>;
}

export function useKnowledge() {
  const knowledge = useContext(KnowledgeContext);
  if (!knowledge) throw new Error('useKnowledge must be used within KnowledgeProvider.');
  return knowledge;
}
