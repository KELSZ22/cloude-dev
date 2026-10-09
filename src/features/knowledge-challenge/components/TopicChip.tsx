import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { useTheme } from "@/shared/hooks/use-theme";

export function TopicChip({ label }: { label: string }) {
  const colors = useTheme();

  return (
    <View
      style={[styles.chip, { backgroundColor: colors.backgroundSelected }]}
    >
      <View style={[styles.badge, { backgroundColor: colors.tint }]}>
        <SymbolView
          name={{
            ios: "globe.americas.fill",
            android: "public",
            web: "public",
          }}
          size={14}
          tintColor={colors.backgroundElement}
        />
      </View>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 34,
    borderRadius: 999,
    paddingLeft: 6,
    paddingRight: 14,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 13, lineHeight: 18 },
});
