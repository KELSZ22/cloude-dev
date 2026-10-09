import { ActionButton } from "@/shared/components/action-button";
import { NavigationButton } from "@/shared/components/navigation-button";
import { Page } from "@/shared/components/page";
import { StatusCard } from "@/shared/components/status-card";
import { ThemedText } from "@/shared/components/themed-text";
import {
  ONBOARDING_TOPICS,
  useOnboardingStore,
} from "@/shared/stores/onboarding-store";

export default function SettingsPage() {
  const language = useOnboardingStore((state) => state.language);
  const topics = useOnboardingStore((state) => state.topics);
  const resetTour = useOnboardingStore((state) => state.resetTour);

  return (
    <Page
      title="Settings"
      description="Offline readiness, model setup, and privacy."
    >
      <StatusCard
        title="Your preferences"
        description={`Language: ${language}. Topics: ${
          topics.length
            ? topics
                .map(
                  (id) =>
                    ONBOARDING_TOPICS.find((topic) => topic.id === id)?.label ??
                    id,
                )
                .join(", ")
            : "none selected yet"
        }.`}
      >
        <ActionButton label="Replay welcome tour" onPress={resetTour} />
      </StatusCard>
      <NavigationButton href="/setup" label="Offline readiness checklist" />
      <NavigationButton href="/model" label="On-device model status" />
      <StatusCard
        title="Local by design"
        description="No sign-in or cloud inference. The current shell has no search or inference network calls. The app follows your system's light or dark theme."
      />
      <ThemedText type="small" themeColor="textSecondary">
        Replay the tour to change language and topics from the first-run flow.
      </ThemedText>
    </Page>
  );
}
