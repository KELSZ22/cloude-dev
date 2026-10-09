import { StyleSheet } from "react-native";

import { AnimatedIcon } from "@/shared/components/animated-icon";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

type HomeHeroProps = {
  title: string;
};

export function HomeHero({ title }: HomeHeroProps) {
  const theme = useTheme();
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.border }]}
    >
      <AnimatedIcon />
      <ThemedView type="backgroundElement" style={styles.copy}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Built with React Native. Preview in the browser, then run on a device.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.four,
    alignItems: "center",
    gap: Spacing.three,
  },
  copy: {
    alignItems: "center",
    gap: Spacing.one,
  },
});
