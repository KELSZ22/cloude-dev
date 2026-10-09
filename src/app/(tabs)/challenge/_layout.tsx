import { Stack } from "expo-router";

import { useTheme } from "@/shared/hooks/use-theme";

export default function ChallengeLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: colors.backgroundElement },
      }}
    />
  );
}
