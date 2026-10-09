import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

/**
 * Seekora has no sign-in, so this states what the profile actually is rather
 * than implying an account exists.
 */
export function ProfileCard({ name, detail }: { name: string; detail: string }) {
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
      <Image
        source={require("@/assets/logo/logo-greenbg.png")}
        accessible={false}
        accessibilityLabel=""
        contentFit="cover"
        style={styles.avatar}
      />
      <View style={styles.body}>
        <ThemedText type="subtitle" style={styles.name}>
          {name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.detail}>
          {detail}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderWidth: 1,
    borderRadius: 18,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  body: { flex: 1, gap: Spacing.half },
  name: { fontSize: 18, lineHeight: 24 },
  detail: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
});
