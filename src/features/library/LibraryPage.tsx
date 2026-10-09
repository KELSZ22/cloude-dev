import { KnowledgeStatus } from '@/shared/components/knowledge-status';
import { NavigationButton } from '@/shared/components/navigation-button';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';

export default function LibraryPage() {
  return (
    <Page title="Your library" description="Knowledge Packs, personal documents, and saved sources.">
      <KnowledgeStatus>
        <NavigationButton href="/packs" label="View Knowledge Packs" />
        <NavigationButton href="/(tabs)/search" label="Search your library" />
      </KnowledgeStatus>
      <StatusCard title="Your own documents" description="Importing documents and saving bookmarks are not available in this build yet. Both will use local storage only.">
        <NavigationButton href="/import" label="View document import status" />
      </StatusCard>
    </Page>
  );
}
