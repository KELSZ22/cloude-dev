import { NavigationButton } from '@/shared/components/navigation-button';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';

export default function SettingsPage() {
  return (
    <Page title="Settings" description="Offline readiness, model setup, and privacy.">
      <NavigationButton href="/onboarding" label="Offline readiness checklist" />
      <NavigationButton href="/model" label="On-device model status" />
      <StatusCard title="Local by design" description="No sign-in or cloud inference. The current shell has no search or inference network calls. The app follows your system's light or dark theme." />
    </Page>
  );
}
