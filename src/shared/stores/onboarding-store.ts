import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const ONBOARDING_STEPS = [
  "splash",
  "intro1",
  "intro2",
  "preferences",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const APP_LOCALES = ["en", "fil"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

/** Native names, so the picker stays readable in either language. */
export const LOCALE_NAMES: Record<AppLocale, string> = {
  en: "English",
  fil: "Filipino",
};

export const ONBOARDING_TOPIC_IDS = [
  "general",
  "science",
  "technology",
  "history",
  "health",
  "business",
  "arts",
  "environment",
] as const;

export type OnboardingTopicId = (typeof ONBOARDING_TOPIC_IDS)[number];

/** Device language on first launch. Filipino covers both `fil` and Tagalog `tl`. */
export function deviceLocale(): AppLocale {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    if (code === "fil" || code === "tl") return "fil";
  } catch {
    // Locale lookup can fail before the native module is ready.
  }
  return "en";
}

/** Maps a persisted value, including the old display names, onto a locale. */
function savedLocale(value: unknown): AppLocale | null {
  if (value === "en" || value === "English") return "en";
  if (value === "fil" || value === "Filipino") return "fil";
  if (typeof value === "string") return "en";
  return null;
}

type OnboardingState = {
  hasHydrated: boolean;
  completed: boolean;
  step: OnboardingStep;
  language: AppLocale;
  topics: OnboardingTopicId[];
  setHasHydrated: (value: boolean) => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  complete: () => void;
  setLanguage: (language: AppLocale) => void;
  toggleTopic: (id: OnboardingTopicId) => void;
  resetTour: () => void;
};

const stepIndex = (step: OnboardingStep) => ONBOARDING_STEPS.indexOf(step);

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      completed: false,
      step: "splash",
      language: deviceLocale(),
      topics: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      next: () => {
        const index = stepIndex(get().step);
        const nextStep = ONBOARDING_STEPS[index + 1];
        if (nextStep) set({ step: nextStep });
      },
      back: () => {
        const index = stepIndex(get().step);
        const previous = ONBOARDING_STEPS[index - 1];
        if (previous) set({ step: previous });
      },
      skip: () => set({ completed: true, step: "splash" }),
      complete: () => set({ completed: true, step: "splash" }),
      setLanguage: (language) => set({ language }),
      toggleTopic: (id) => {
        const topics = get().topics;
        set({
          topics: topics.includes(id)
            ? topics.filter((topic) => topic !== id)
            : [...topics, id],
        });
      },
      resetTour: () => set({ completed: false, step: "splash" }),
    }),
    {
      name: "aralsearch-onboarding",
      storage: createJSONStorage(() => AsyncStorage),
      skipHydration: true,
      partialize: (state) => ({
        completed: state.completed,
        step: state.completed ? "splash" : state.step,
        language: state.language,
        topics: state.topics,
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const saved = persisted as Partial<OnboardingState> & {
          language?: unknown;
        };
        const { language: stored, ...rest } = saved;
        return {
          ...current,
          ...rest,
          language: savedLocale(stored) ?? current.language,
        };
      },
    },
  ),
);

export function useHydrateOnboardingStore() {
  useEffect(() => {
    const finish = () => useOnboardingStore.getState().setHasHydrated(true);
    const unsub = useOnboardingStore.persist.onFinishHydration(finish);
    if (useOnboardingStore.persist.hasHydrated()) finish();
    else void useOnboardingStore.persist.rehydrate();
    const timeout = setTimeout(finish, 1200);
    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);
}
