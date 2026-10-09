import { useEventListener } from "expo";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, Keyframe, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LanguageMenu } from "@/shared/components/language-menu";
import { ThemedText } from "@/shared/components/themed-text";
import { Colors, Spacing } from "@/shared/constants/theme";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

const mascotWave = require("@/assets/dashboard/dashboard.mp4");

/** The greeting pops out of the mascot's side, overshoots, then settles in two shrinking bounces. */
const bubblePop = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ scale: 0.3 }, { translateY: 14 }],
  },
  40: {
    opacity: 1,
    transform: [{ scale: 1.16 }, { translateY: -8 }],
    easing: Easing.out(Easing.back(2.2)),
  },
  60: {
    opacity: 1,
    transform: [{ scale: 0.92 }, { translateY: 4 }],
    easing: Easing.inOut(Easing.quad),
  },
  78: {
    opacity: 1,
    transform: [{ scale: 1.06 }, { translateY: -3 }],
    easing: Easing.inOut(Easing.quad),
  },
  92: {
    opacity: 1,
    transform: [{ scale: 0.98 }, { translateY: 1 }],
    easing: Easing.inOut(Easing.quad),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }, { translateY: 0 }],
    easing: Easing.out(Easing.quad),
  },
});

export function DashboardHero() {
  const colors = useTheme();
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const height = Math.max(220, Math.min(width * 0.7, 300)) + insets.top;
  const headerColor = isDark ? Colors.dark.text : Colors.light.brand;
  const [waving, setWaving] = useState(false);
  const [bubbleKey, setBubbleKey] = useState(0);
  const player = useVideoPlayer(mascotWave, (player) => {
    player.loop = false;
    player.muted = true;
  });

  useEventListener(player, "playToEnd", () => {
    setWaving(false);
  });
  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "error") setWaving(false);
  });

  // The view has to be mounted before play(), so the picture stays underneath and the wave
  // is only revealed once this visit's playback actually starts.
  useFocusEffect(
    useCallback(() => {
      setBubbleKey((key) => key + 1);
      if (reducedMotion) return;
      player.replay();
      player.play();
      setWaving(true);
      return () => {
        player.pause();
      };
    }, [player, reducedMotion]),
  );

  const bubbleEntering = reducedMotion ? undefined : bubblePop.delay(200).duration(560);

  return (
    <View style={[styles.hero, { height }]}>
      <Image
        source={require("@/assets/dashboard/dashboard.jpg")}
        contentFit="cover"
        contentPosition="center"
        accessible={false}
        accessibilityLabel=""
        style={StyleSheet.absoluteFill}
      />
      {reducedMotion ? null : (
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="cover"
          surfaceType="textureView"
          pointerEvents="none"
          accessible={false}
          style={[
            StyleSheet.absoluteFill,
            styles.wave,
            { opacity: waving ? 1 : 0 },
          ]}
        />
      )}
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["rgba(13,27,42,0.88)", "rgba(13,27,42,0.42)", "rgba(13,27,42,0)"]
            : ["rgba(13,27,42,0.62)", "rgba(13,27,42,0.26)", "rgba(13,27,42,0)"]
        }
        locations={[0, 0.12, 0.25]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.shade}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <View accessible accessibilityLabel="Seekora" style={styles.brand}>
          <Image
            source={
              isDark
                ? require("@/assets/logo/Seekora-textlogo-dark.png")
                : require("@/assets/logo/Seekora-textlogo-light.png")
            }
            contentFit="contain"
            accessible={false}
            accessibilityLabel=""
            style={styles.wordmark}
          />
        </View>
        <View style={styles.headerActions}>
          <LanguageMenu tintColor={headerColor} />
        </View>
      </View>
      <Animated.View
        key={`hero-bubble-${bubbleKey}`}
        entering={bubbleEntering}
        style={[styles.greeting, { backgroundColor: colors.backgroundElement }]}
      >
        <View style={[styles.bubbleTail, { backgroundColor: colors.backgroundElement }]} />
        <ThemedText type="subtitle" style={styles.hello}>{t("home.hello")}</ThemedText>
        <ThemedText type="smallBold" style={styles.greetingText}>
          {t("home.greeting")}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: "hidden" },
  // A video is a replaced element, so pinning its edges does not shrink it. Without an
  // explicit size it stays at its own pixel size and the hero clips the middle out.
  wave: { width: "100%", height: "100%" },
  shade: { ...StyleSheet.absoluteFill },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
  },
  brand: { flexDirection: "row", alignItems: "center" },
  wordmark: { width: 120, height: 40 },
  headerActions: { flexDirection: "row" },
  greeting: {
    position: "absolute",
    left: Spacing.three,
    bottom: 72,
    width: "36%",
    maxWidth: 160,
    borderRadius: 18,
    padding: 12,
    gap: Spacing.one,
    // The tail sits bottom-right, so the pop reads as coming out of the mascot.
    transformOrigin: "100% 85%",
  },
  bubbleTail: {
    position: "absolute",
    right: -5,
    bottom: 18,
    width: 14,
    height: 14,
    transform: [{ rotate: "45deg" }],
  },
  hello: { fontSize: 20, lineHeight: 24 },
  greetingText: { fontSize: 12, lineHeight: 16 },
});
