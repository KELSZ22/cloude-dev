import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

export function LeafDecor({
  showRight = true,
  width = 120,
}: {
  showRight?: boolean;
  width?: number;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={require("@/assets/elements/left-leaves.webp")}
        accessible={false}
        accessibilityLabel=""
        contentFit="contain"
        style={[styles.bottomLeft, { width }]}
      />
      {showRight ? (
        <Image
          source={require("@/assets/elements/right-leaves.webp")}
          accessible={false}
          accessibilityLabel=""
          contentFit="contain"
          style={[styles.bottomRight, { width }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    aspectRatio: 704 / 434,
  },
  bottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    aspectRatio: 638 / 422,
  },
});
