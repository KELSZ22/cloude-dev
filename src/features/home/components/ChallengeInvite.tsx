import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/shared/components/themed-text";
import { Colors } from "@/shared/constants/theme";
import { useTranslation } from "@/shared/i18n";
import { useKnowledge } from "@/shared/providers/knowledge-provider";
import { useChallengeDeckStore } from "@/shared/stores/challenge-deck-store";
import { useOfflineReadingStore } from "@/shared/stores/offline-reading-store";

const STARTER_QUESTIONS = 10;
const MINUTES = 3;

/** How wide the glint is, how long it takes to cross, and how long the card rests between. */
const SHINE_WIDTH = 86;
const SHINE_SWEEP = 1100;
const SHINE_REST = 2800;

/**
 * A glint that crosses the card every few seconds, marking it as the one thing on the dashboard
 * asking to be tapped. Sits above the content, so it catches the mascot and the button too.
 */
function Shine() {
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion || !width) return;
    progress.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(
          SHINE_REST,
          withTiming(1, { duration: SHINE_SWEEP, easing: Easing.inOut(Easing.quad) }),
        ),
      ),
      -1,
    );
    return () => cancelAnimation(progress);
  }, [reducedMotion, width, progress]);

  const sweep = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-SHINE_WIDTH * 2, width + SHINE_WIDTH]) },
      { rotate: "18deg" },
    ],
  }));

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.shine, sweep]}>
        <LinearGradient
          // A narrow bright core with a soft falloff reads as a glint; an even wash just looks
          // like the card briefly lost its colour.
          colors={[
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.28)",
            "rgba(255,255,255,0.9)",
            "rgba(255,255,255,0.28)",
            "rgba(255,255,255,0)",
          ]}
          locations={[0, 0.35, 0.5, 0.65, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** True once a pack is on the device or a reading has been saved. */
function useStartedLearning() {
  const hydrate = useOfflineReadingStore((state) => state.hydrate);
  const hydrated = useOfflineReadingStore((state) => state.hydrated);
  const readings = useOfflineReadingStore((state) => state.items.length);
  const knowledge = useKnowledge();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const library = knowledge.state.status === "ready" ? knowledge.state : null;
  const packs = library?.packs.length ?? 0;
  const passages = library?.passages ?? 0;
  const started = (hydrated && readings > 0) || packs > 0 || passages > 0;

  return started;
}

export function ChallengeInvite() {
  const { t } = useTranslation();
  const started = useStartedLearning();
  const questions = useChallengeDeckStore((state) => state.questions.length);
  const articles = useChallengeDeckStore((state) => state.articles);
  const status = useChallengeDeckStore((state) => state.status);
  const build = useChallengeDeckStore((state) => state.build);

  // Writing the deck ahead of time keeps Start challenge instant.
  useEffect(() => {
    void build();
  }, [build]);

  const fromLibrary = status === "ready" && questions > 0;
  const message = fromLibrary
    ? t("home.challengeFromLibrary", { count: articles })
    : t(started ? "home.challengeStarted" : "home.challengeNew");
  const count = fromLibrary ? questions : STARTER_QUESTIONS;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("home.challengeTitle")}. ${message} ${t("home.challengeStart")}`}
      onPress={() => router.navigate("/(tabs)/challenge")}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image
        source={require("@/assets/avatars/Thumbs-Up.png")}
        contentFit="contain"
        contentPosition="bottom center"
        accessible={false}
        accessibilityLabel=""
        style={styles.mascot}
      />
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <SymbolView
            name={{ ios: "star.fill", android: "star", web: "star" }}
            size={16}
            tintColor={Colors.light.accentGold}
          />
          <ThemedText type="smallBold" style={styles.title}>
            {t("home.challengeTitle")}
          </ThemedText>
        </View>
        <ThemedText type="small" style={styles.meta}>
          {t("home.challengeMeta", { count, minutes: MINUTES })}
        </ThemedText>
        <ThemedText type="small" style={styles.message}>
          {message}
        </ThemedText>
        <View style={styles.action}>
          <ThemedText type="smallBold" style={styles.actionLabel}>
            {t("home.challengeStart")}
          </ThemedText>
          <SymbolView
            name={{ ios: "arrow.right", android: "arrow_forward", web: "arrow_forward" }}
            size={16}
            tintColor={Colors.light.backgroundElement}
          />
        </View>
      </View>
      <Shine />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#E7F6EC",
    borderWidth: 1,
    borderColor: "#C5E6D4",
    borderRadius: 22,
    overflow: "hidden",
    minHeight: 156,
  },
  pressed: { opacity: 0.92 },
  // Taller than the card so the tilted band still covers it corner to corner.
  shine: { position: "absolute", top: -40, bottom: -40, width: SHINE_WIDTH },
  mascot: { width: 132, height: 148, marginLeft: 4, marginBottom: 4 },
  copy: {
    flex: 1,
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 14,
    gap: 4,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { color: Colors.light.brand, fontSize: 18, lineHeight: 22 },
  meta: { color: "#5C7268", fontSize: 12, lineHeight: 16 },
  message: { color: Colors.light.brand, fontSize: 13, lineHeight: 18 },
  action: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    backgroundColor: Colors.light.tint,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionLabel: { color: Colors.light.backgroundElement, fontSize: 13, lineHeight: 18 },
});
