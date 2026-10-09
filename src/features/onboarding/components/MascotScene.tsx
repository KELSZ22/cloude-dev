import { Image } from "expo-image";
import { StyleSheet } from "react-native";

const scenes = {
  companion: {
    source: require("@/assets/onboarding/onboarding1.png"),
    label: "An explorer learning on a tablet beside a colorful parrot",
  },
  explore: {
    source: require("@/assets/onboarding/onboarding2.png"),
    label: "An explorer discovering science, history, technology, and health",
  },
} as const;

export function MascotScene({ scene }: { scene: keyof typeof scenes }) {
  const { source, label } = scenes[scene];

  return (
    <Image
      source={source}
      accessibilityLabel={label}
      contentFit="cover"
      contentPosition="bottom"
      style={styles.image}
    />
  );
}

const styles = StyleSheet.create({
  image: { width: "100%", height: "100%" },
});
