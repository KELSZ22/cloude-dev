import { NavigationButton } from '@/shared/components/navigation-button';
import { ModelStatus } from '@/shared/components/model-status';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';

export default function AssistantPage() {
  return (
    <Page title="AI Assistant" description="Answers grounded in your offline library, with sources you can inspect.">
      <ModelStatus />
      <StatusCard variant="ai" title="Offline research setup pending" description="Local search and citation retrieval are not connected yet. Model testing is available in setup; research answers will require actual local evidence.">
        <NavigationButton href="/model" label="View model setup" />
      </StatusCard>
      <NavigationButton href="/(tabs)/search" label="Go to Search" />
    </Page>
  );
}
