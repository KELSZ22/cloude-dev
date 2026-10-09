import { KnowledgeStatus } from '@/shared/components/knowledge-status';
import { NavigationButton } from '@/shared/components/navigation-button';
import { ModelStatus } from '@/shared/components/model-status';
import { Page } from '@/shared/components/page';

export default function OnboardingPage() {
  return (
    <Page nested title="Prepare for offline use" description="You can explore the app while setup is pending.">
      <KnowledgeStatus />
      <ModelStatus />
      <NavigationButton href="/(tabs)/search" label="Continue to Search" />
      <NavigationButton href="/model" label="Review model requirements" />
    </Page>
  );
}
