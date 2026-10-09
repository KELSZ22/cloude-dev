import { KnowledgeStatus } from '@/shared/components/knowledge-status';
import { NavigationButton } from '@/shared/components/navigation-button';
import { Page } from '@/shared/components/page';
import { StatusCard } from '@/shared/components/status-card';

export default function HomePage() {
  return (
    <Page title="Explore more. Understand better." description="Anywhere, offline. Your own collection of knowledge, in your pocket.">
      <NavigationButton href="/(tabs)/search" label="Explore local search" />
      <NavigationButton href="/(tabs)/assistant" label="Ask Seekora a question" />
      <KnowledgeStatus>
        <NavigationButton href="/packs" label="View Knowledge Packs" />
      </KnowledgeStatus>
      <StatusCard title="Your offline library" description="Search will cover only resources you install or import. It does not include the live web.">
        <NavigationButton href="/(tabs)/library" label="Open Library" />
      </StatusCard>
      <NavigationButton href="/onboarding" label="View offline setup checklist" />
    </Page>
  );
}
