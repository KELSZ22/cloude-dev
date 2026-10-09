import { NavigationButton } from '@/shared/components/navigation-button';
import { ModelStatus } from '@/shared/components/model-status';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { readiness } from '@/shared/constants/readiness';

export default function OnboardingPage() {
  return (
    <Page nested title="Prepare for offline use" description="You can explore the app while setup is pending.">
      <StatusCard {...readiness.search} />
      <ModelStatus />
      <NavigationButton href="/(tabs)/search" label="Continue to Search" />
      <NavigationButton href="/model" label="Review model requirements" />
    </Page>
  );
}
