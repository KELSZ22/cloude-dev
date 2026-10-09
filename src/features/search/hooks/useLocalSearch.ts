import { useEffect, useState } from 'react';

import type { SearchHit } from '@/infrastructure/database';
import { useKnowledge } from '@/shared/providers/knowledge-provider';

const DEBOUNCE_MS = 250;
const RESULT_LIMIT = 20;

/** Debounced full-text search over the local library. A newer query cancels the one in flight. */
export function useLocalSearch(query: string) {
  const { repository } = useKnowledge();
  const [hits, setHits] = useState<readonly SearchHit[]>([]);
  const [searched, setSearched] = useState('');
  const [error, setError] = useState<string | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (!repository) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const request = trimmed ? repository.search({ query: trimmed, limit: RESULT_LIMIT, offset: 0, signal: controller.signal }) : Promise.resolve([]);
      request.then((found) => {
        if (controller.signal.aborted) return;
        setHits(found); setSearched(trimmed); setError(null);
      }).catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Search failed.');
      });
    }, trimmed ? DEBOUNCE_MS : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [repository, trimmed]);

  return { hits, error, ready: repository !== null, pending: trimmed !== searched };
}
