import { KnowledgeStatus } from '@/shared/components/knowledge-status';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { ThemedText } from '@/shared/components/themed-text';
import { useKnowledge } from '@/shared/providers/knowledge-provider';

export default function PacksPage() {
  const { state } = useKnowledge();
  const packs = state.status === 'ready' ? state.packs : [];
  return (
    <Page nested title="Knowledge Packs" description="Expandable collections for your offline library.">
      <KnowledgeStatus />
      {packs.map((pack) => (
        <StatusCard key={pack.id} title={pack.name} description={pack.description}>
          <ThemedText type="small">Version {pack.version} · {pack.language}</ThemedText>
          <ThemedText type="small">Author: {pack.author}</ThemedText>
          <ThemedText type="small">Origin: {pack.source}</ThemedText>
          <ThemedText type="small">License: {pack.license}</ThemedText>
        </StatusCard>
      ))}
      <StatusCard title="Adding more packs" description="Only the bundled sample pack is available in this build. Packs must have attribution, a redistribution license, and verified content checksums before installation." />
    </Page>
  );
}
