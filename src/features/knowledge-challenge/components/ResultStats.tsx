import type { SymbolViewProps } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/shared/components/themed-text";
import { useTheme } from "@/shared/hooks/use-theme";

export interface ResultStat {
  id: string;
  icon: SymbolViewProps["name"];
  accent: string;
  label: string;
  value: string;
}

export function ResultStats({
  stats,
  animate,
}: {
  stats: readonly ResultStat[];
  animate: boolean;
}) {
  const colors = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.border,
        },
      ]}
    >
      {stats.map((stat, index) => (
        <Animated.View
          key={stat.id}
          entering={
            animate ? FadeInDown.delay(320 + index * 80).duration(320) : undefined
          }
          style={[
            styles.row,
            index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
          ]}
        >
          <SymbolView name={stat.icon} size={20} tintColor={stat.accent} />
          <ThemedText type="small" style={styles.label}>
            {stat.label}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.value}>
            {stat.value}
          </ThemedText>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
  },
  label: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  value: { fontSize: 14, lineHeight: 20 },
});
