import type { SymbolViewProps } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { LeafDecor } from "@/shared/components/leaf-decor";
import { useTheme } from "@/shared/hooks/use-theme";
import { withAlpha } from "@/shared/lib/color";

/** Stands in for pack artwork, drawn from the brand's own botanical elements. */
export function QuestionBanner({
  icon,
  label,
}: {
  icon: SymbolViewProps["name"];
  label: string;
}) {
  const colors = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.banner,
        {
          backgroundColor: colors.backgroundSelected,
          borderColor: colors.dashboardBorder,
        },
      ]}
    >
      <LeafDecor width={120} />
      <View
        style={[
          styles.disc,
          { backgroundColor: withAlpha(colors.backgroundElement, 0.75) },
        ]}
      >
        <SymbolView name={icon} size={44} tintColor={colors.tint} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    aspectRatio: 16 / 9,
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  disc: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
});
