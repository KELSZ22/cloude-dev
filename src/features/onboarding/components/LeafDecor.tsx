import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

export function LeafDecor({ showRight = true }: { showRight?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={require("@/assets/elements/left-leaves.png")}
        accessible={false}
        accessibilityLabel=""
        contentFit="contain"
        style={styles.bottomLeft}
      />
      {showRight ? (
        <Image
          source={require("@/assets/elements/right-leaves.png")}
          accessible={false}
          accessibilityLabel=""
          contentFit="contain"
          style={styles.bottomRight}
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
    width: 120,
    aspectRatio: 704 / 434,
  },
  bottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 120,
    aspectRatio: 638 / 422,
  },
});
