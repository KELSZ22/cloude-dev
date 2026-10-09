import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

export function HintStrip({ pack }: { pack: string }) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.strip, { backgroundColor: colors.backgroundSelected }]}>
      <SymbolView
        name={{
          ios: "lightbulb.fill",
          android: "lightbulb",
          web: "lightbulb",
        }}
        size={18}
        tintColor={colors.accentGold}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        {t("challenge.fromPack", { pack })}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  text: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "500" },
});
