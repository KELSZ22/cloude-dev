import { NavigationButton } from '@/shared/components/navigation-button';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';

export default function LibraryPage() {
  return (
    <Page title="Your library" description="Knowledge Packs, personal documents, and saved sources.">
      <StatusCard title="Your library starts here" description="No content is installed in this foundation build. Pack installation, imports, and bookmarks will use local storage.">
        <NavigationButton href="/packs" label="View Knowledge Packs" />
        <NavigationButton href="/import" label="View document import status" />
      </StatusCard>
    </Page>
  );
}
