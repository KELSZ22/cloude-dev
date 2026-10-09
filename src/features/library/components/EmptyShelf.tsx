import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";

export function EmptyShelf({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View style={styles.wrapper}>
      <Image
        source={require("@/assets/results/noresult.png")}
        accessible={false}
        accessibilityLabel=""
        contentFit="contain"
        style={styles.art}
      />
      <ThemedText type="smallBold" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
        {body}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  art: { width: "72%", maxWidth: 240, aspectRatio: 1448 / 1086 },
  title: { fontSize: 16, lineHeight: 22, textAlign: "center" },
  body: { fontSize: 13, lineHeight: 19, textAlign: "center" },
});
