import { Image } from "expo-image";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Colors } from "@/shared/constants/theme";
import { useTranslation } from "@/shared/i18n";
import { useKnowledge } from "@/shared/providers/knowledge-provider";
import { useOfflineReadingStore } from "@/shared/stores/offline-reading-store";

const QUESTIONS = 10;
const MINUTES = 3;

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
  const message = t(started ? "home.challengeStarted" : "home.challengeNew");

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
          {t("home.challengeMeta", { count: QUESTIONS, minutes: MINUTES })}
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
