import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

import { useThemeStore } from "@/shared/stores/theme-store";

const emptySubscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): "light" | "dark" {
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const colorScheme = useRNColorScheme();
  const mode = useThemeStore((state) => state.mode);

  if (hasHydrated) {
    return mode === "system" ? (colorScheme === "dark" ? "dark" : "light") : mode;
  }

  return "light";
}
