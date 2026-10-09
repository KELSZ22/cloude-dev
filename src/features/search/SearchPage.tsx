import { NavigationButton } from '@/shared/components/navigation-button';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { readiness } from '@/shared/constants/readiness';

export default function SearchPage() {
  return (
    <Page title="Search" description="Find passages in your installed and imported resources.">
      <StatusCard {...readiness.search}>
        <NavigationButton href="/packs" label="View Knowledge Packs" />
        <NavigationButton href="/import" label="View document import status" />
      </StatusCard>
    </Page>
  );
}
