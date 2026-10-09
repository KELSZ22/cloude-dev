import { NavigationButton } from '@/shared/components/navigation-button';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { readiness } from '@/shared/constants/readiness';

export default function AssistantPage() {
  return (
    <Page title="AI Assistant" description="Answers grounded in your offline library, with sources you can inspect.">
      <StatusCard {...readiness.model}>
        <NavigationButton href="/model" label="View model setup" />
      </StatusCard>
      <NavigationButton href="/(tabs)/search" label="Go to Search" />
    </Page>
  );
}
