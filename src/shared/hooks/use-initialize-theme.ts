import { useEffect } from "react";
import { Appearance, Platform } from "react-native";

import { useThemeStore } from "@/shared/stores/theme-store";

export function useInitializeTheme() {
  const mode = useThemeStore((state) => state.mode);

  useEffect(() => {
    void useThemeStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      // RN 0.86 uses "unspecified" to restore the device's appearance.
      Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
    }
  }, [mode]);
}
