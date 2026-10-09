import AsyncStorage from "@react-native-async-storage/async-storage";
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

export const ONBOARDING_LANGUAGES = [
  "English",
  "Filipino",
  "Spanish",
  "French",
  "Arabic",
] as const;
export type OnboardingLanguage = (typeof ONBOARDING_LANGUAGES)[number];

export const ONBOARDING_TOPICS = [
  { id: "general", label: "General Knowledge" },
  { id: "science", label: "Science" },
  { id: "technology", label: "Technology" },
  { id: "history", label: "History" },
  { id: "health", label: "Health" },
  { id: "business", label: "Business" },
  { id: "arts", label: "Arts & Culture" },
  { id: "environment", label: "Environment" },
] as const;

export type OnboardingTopicId = (typeof ONBOARDING_TOPICS)[number]["id"];

type OnboardingState = {
  hasHydrated: boolean;
  completed: boolean;
  step: OnboardingStep;
  language: OnboardingLanguage;
  topics: OnboardingTopicId[];
  setHasHydrated: (value: boolean) => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  complete: () => void;
  setLanguage: (language: OnboardingLanguage) => void;
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
      language: "English",
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
