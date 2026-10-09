import { NavigationButton } from "@/shared/components/navigation-button";
import { Page } from "@/shared/components/page";
import { StatusCard } from "@/shared/components/status-card";
import { readiness } from "@/shared/constants/readiness";

export default function HomePage() {
  return (
    <Page
      title="Knowledge for everyone."
      description="Anytime. Offline. Your own collection of knowledge, in your pocket."
    >
      <NavigationButton href="/(tabs)/search" label="Explore local search" />
      <StatusCard {...readiness.search}>
        <NavigationButton href="/packs" label="View Knowledge Packs" />
      </StatusCard>
      <StatusCard
        title="Your offline library"
        description="Search will cover only resources you install or import. It does not include the live web."
      >
        <NavigationButton href="/(tabs)/library" label="Open Library" />
      </StatusCard>
      <NavigationButton href="/setup" label="View offline setup checklist" />
    </Page>
  );
}
