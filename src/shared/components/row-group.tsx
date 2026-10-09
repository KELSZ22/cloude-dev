import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/shared/hooks/use-theme";

/** Holds rows as one block, so a hairline is enough to separate them. */
export function RowGroup({ children }: PropsWithChildren) {
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
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
});
