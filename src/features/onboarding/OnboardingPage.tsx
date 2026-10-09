import { NavigationButton } from '@/shared/components/navigation-button';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';
import { readiness } from '@/shared/constants/readiness';

export default function OnboardingPage() {
  return (
    <Page nested title="Prepare for offline use" description="You can explore the app while setup is pending.">
      <StatusCard {...readiness.search} />
      <StatusCard {...readiness.model} />
      <NavigationButton href="/(tabs)/search" label="Continue to Search" />
      <NavigationButton href="/model" label="Review model requirements" />
    </Page>
  );
}
