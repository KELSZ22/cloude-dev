import { useColorScheme as useSystemColorScheme } from "react-native";

import { useThemeStore } from "@/shared/stores/theme-store";

export function useColorScheme(): "light" | "dark" {
  const systemScheme = useSystemColorScheme();
  const mode = useThemeStore((state) => state.mode);

  return mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
}
