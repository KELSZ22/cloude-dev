import type { OnboardingTopicId } from "@/shared/stores/onboarding-store";

/** Subject articles, so a topic matches what the page is about rather than its title. */
export const topicQuery: Record<OnboardingTopicId, string> = {
  general: "morelike:Knowledge|Education|Culture|Society",
  science: "morelike:Physics|Chemistry|Biology|Astronomy|Geology",
  technology: "morelike:Engineering|Computer_science|Internet|Electronics",
  history: "morelike:Civilization|Archaeology|Ancient_Rome|Middle_Ages",
  health: "morelike:Medicine|Disease|Anatomy|Public_health",
  business: "morelike:Economics|Finance|Marketing|Accounting",
  arts: "morelike:Visual_arts|Literature|Music|Theatre",
  environment: "morelike:Ecology|Climate_change|Biodiversity|Conservation_biology",
};
