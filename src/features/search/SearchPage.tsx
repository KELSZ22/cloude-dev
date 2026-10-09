import { useState } from 'react';

import { KnowledgeStatus } from '@/shared/components/knowledge-status';
import { NavigationButton } from '@/shared/components/navigation-button';
import { Page } from '@/shared/components/page';
import { PassageLink } from '@/shared/components/passage-link';
import { StatusCard } from '@/shared/components/status-card';
import { TextField } from '@/shared/components/text-field';
import { ThemedText } from '@/shared/components/themed-text';
import { useLocalSearch } from './hooks/useLocalSearch';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const { hits, error, ready, pending } = useLocalSearch(query);
  const asked = query.trim() !== '';
  return (
    <Page title="Search" description="Find passages in your installed and imported resources.">
      <TextField label="Search your offline library" placeholder="Search for a topic, such as slope or exponents"
        value={query} onChangeText={setQuery} editable={ready} returnKeyType="search" autoCapitalize="none" maxLength={200} />
      {error && <ThemedText themeColor="error" accessibilityRole="alert">{error}</ThemedText>}
      {asked && !pending && !error && (
        <ThemedText themeColor="textSecondary" accessibilityLiveRegion="polite">
          {hits.length === 0 ? 'No passages match. Search covers only your offline library.'
            : `${hits.length} matching ${hits.length === 1 ? 'passage' : 'passages'}, best match first`}
        </ThemedText>
      )}
      {asked && hits.map((hit) => (
        <PassageLink key={hit.chunkId} chunkId={hit.chunkId} title={hit.document.title} excerpt={hit.excerpt}
          detail={[hit.document.chapter, hit.packName].filter(Boolean).join(' · ')} />
      ))}
      {!asked && (
        <>
          <KnowledgeStatus>
            <NavigationButton href="/packs" label="View Knowledge Packs" />
          </KnowledgeStatus>
          <StatusCard title="Want an explanation?" description="Ask Seekora writes an answer from the passages it finds and links each source.">
            <NavigationButton href="/(tabs)/assistant" label="Ask Seekora" />
          </StatusCard>
        </>
      )}
    </Page>
  );
}
