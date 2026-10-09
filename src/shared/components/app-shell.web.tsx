import type { PropsWithChildren } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

const DEVICE_WIDTH = 390;
const DEVICE_HEIGHT = 844;

export function AppShell({ children }: PropsWithChildren) {
  const { width, height } = useWindowDimensions();
  const showFrame = width >= DEVICE_WIDTH + 64 && height >= 720;

  if (!showFrame) {
    return <View style={styles.fill}>{children}</View>;
  }

  return (
    <View style={[styles.stage, { height }]}>
      <View style={styles.device}>
        <View pointerEvents="none" style={styles.islandWrap}>
          <View style={styles.island} />
        </View>
        <View style={styles.screen}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  stage: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111113",
  },
  device: {
    width: DEVICE_WIDTH,
    height: DEVICE_HEIGHT,
    borderRadius: 44,
    overflow: "hidden",
    borderWidth: 10,
    borderColor: "#1c1c1e",
    backgroundColor: "#000",
  },
  islandWrap: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: "center",
  },
  island: {
    width: 118,
    height: 34,
    borderRadius: 20,
    backgroundColor: "#000",
  },
  screen: {
    flex: 1,
    paddingTop: 44,
  },
});
