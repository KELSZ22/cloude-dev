import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { DatabaseUnavailableError, type KnowledgeRepository } from '@/infrastructure/database';
import { openKnowledgeDatabase } from '@/infrastructure/database/create-database';
import { assertFts5, migrate } from '@/infrastructure/database/migrations';
import { SqliteKnowledgeRepository } from '@/infrastructure/database/sqlite-knowledge-repository';
import { bundledPacks } from '@/infrastructure/knowledge/bundled-packs';
import { parsePack, type KnowledgePackFile } from '@/infrastructure/knowledge/pack-format';
import type { KnowledgePack } from '@/shared/types/knowledge';

export type KnowledgeState =
  | { status: 'opening' }
  | { status: 'ready'; packs: readonly KnowledgePack[]; passages: number }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; message: string };

/** What a pack shipped with the app offers, for a user deciding whether to add it. */
export interface BundledPack {
  id: string;
  title: string;
  description: string;
  language: string;
  author: string;
  license: string;
  passages: number;
}

interface KnowledgeContextValue {
  state: KnowledgeState;
  /** Null until the local library has been opened, migrated, and indexed. */
  repository: KnowledgeRepository | null;
  /** Packs this build carries, whether or not they are in the library yet. */
  bundled: readonly BundledPack[];
  installing: boolean;
  /** Adds bundled packs to the library. Installing one that is already there changes nothing. */
  installPacks(ids: readonly string[]): Promise<void>;
}

/** Holds the concrete repository so installs can reach the pack store the interface leaves out. */
interface Library { repository: SqliteKnowledgeRepository; packs: readonly KnowledgePack[]; passages: number }

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null);

/** Parsed once: the bundled files are validated the same way an imported pack would be. */
const packFiles: readonly KnowledgePackFile[] = bundledPacks.map((pack) => parsePack(pack));

const bundled: readonly BundledPack[] = packFiles.map((pack) => ({
  id: pack.id,
  title: pack.title,
  description: pack.description,
  language: pack.language,
  author: pack.author,
  license: pack.license,
  passages: pack.chapters.reduce(
    (total, chapter) => total + chapter.sections.reduce((count, section) => count + section.passages.length, 0),
    0,
  ),
}));

async function openLibrary(): Promise<Library> {
  const database = await openKnowledgeDatabase();
  await assertFts5(database);
  await migrate(database);
  const repository = new SqliteKnowledgeRepository(database);
  return { repository, packs: await repository.listPacks(), passages: await repository.countChunks() };
}

export function KnowledgeProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<KnowledgeState>({ status: 'opening' });
  const [repository, setRepository] = useState<KnowledgeRepository | null>(null);
  const [installing, setInstalling] = useState(false);
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

  async function installPacks(ids: readonly string[]) {
    const library = await (opening.current ?? Promise.reject(new Error('The offline library is not open.')));
    setInstalling(true);
    try {
      for (const pack of packFiles) {
        if (ids.includes(pack.id)) await library.repository.installPack(pack);
      }
      setState({ status: 'ready', packs: await library.repository.listPacks(), passages: await library.repository.countChunks() });
    } finally {
      setInstalling(false);
    }
  }

  return (
    <KnowledgeContext.Provider value={{ state, repository, bundled, installing, installPacks }}>
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledge() {
  const knowledge = useContext(KnowledgeContext);
  if (!knowledge) throw new Error('useKnowledge must be used within KnowledgeProvider.');
  return knowledge;
}
