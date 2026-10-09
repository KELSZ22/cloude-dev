import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FloatingAssistantState = {
  hasHydrated: boolean;
  /** Off until the user turns the floating assistant on. */
  enabled: boolean;
  setHasHydrated: (value: boolean) => void;
  setEnabled: (enabled: boolean) => void;
};

export const useFloatingAssistantStore = create<FloatingAssistantState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      enabled: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: "seekora-floating-assistant",
      storage: createJSONStorage(() => AsyncStorage),
      skipHydration: true,
      partialize: (state) => ({ enabled: state.enabled }),
    },
  ),
);
