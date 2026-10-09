import type { SymbolViewProps } from "expo-symbols";

import type { MessageKey } from "@/shared/i18n";
import type { OnboardingTopicId } from "@/shared/stores/onboarding-store";

export const topicLabelKey = {
  general: "topics.general",
  science: "topics.science",
  technology: "topics.technology",
  history: "topics.history",
  health: "topics.health",
  business: "topics.business",
  arts: "topics.arts",
  environment: "topics.environment",
} as const satisfies Record<OnboardingTopicId, MessageKey>;

export const topicIcon = {
  general: { ios: "book", android: "menu_book", web: "menu_book" },
  science: { ios: "atom", android: "science", web: "science" },
  technology: { ios: "desktopcomputer", android: "computer", web: "computer" },
  history: { ios: "building.columns", android: "account_balance", web: "account_balance" },
  health: { ios: "heart.fill", android: "favorite", web: "favorite" },
  business: { ios: "briefcase.fill", android: "work", web: "work" },
  arts: { ios: "paintpalette.fill", android: "palette", web: "palette" },
  environment: { ios: "leaf.fill", android: "eco", web: "eco" },
} as const satisfies Record<OnboardingTopicId, SymbolViewProps["name"]>;
