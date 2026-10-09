import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ActionButton } from "@/shared/components/action-button";
import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useOfflineReadingStore } from "@/shared/stores/offline-reading-store";

export function ReadingShelf({ query = "", compact = false }: { query?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { items, hydrated, busyId, error, hydrate, remove, clearError } = useOfflineReadingStore();
  const [removingId, setRemovingId] = useState<string | null>(null);
  useEffect(() => { void hydrate(); }, [hydrate]);
  const needle = query.trim().toLowerCase();
  const matches = items.filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(needle));

  return (
    <View style={styles.shelf}>
      <ThemedText type="smallBold" accessibilityRole="header">{t("reading.savedTitle")}</ThemedText>
      {!compact ? (
        <ActionButton label={t("reading.browse")} onPress={() => router.navigate("/(tabs)/search")} />
      ) : null}
      {!hydrated && !error ? <ActivityIndicator color={colors.tint} accessibilityLabel={t("reading.loading")} /> : null}
      {error ? (
        <View style={styles.shelf}>
          <ThemedText type="small" accessibilityRole="alert" style={{ color: colors.error }}>
            {t(`reading.errors.${error}`)}
          </ThemedText>
          <ActionButton label={t("reading.retry")} onPress={() => { clearError(); void hydrate(); }} />
        </View>
      ) : null}
      {hydrated && !matches.length ? (
        <ThemedText type="small" themeColor="textSecondary">
          {needle ? t("reading.noSavedMatches") : t("reading.empty")}
        </ThemedText>
      ) : null}
      {matches.map((item) => (
        <View key={item.id} style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("reading.readTitle", { title: item.title })}
            onPress={() => router.push({ pathname: "/read/[id]", params: { id: item.id } })}
            style={styles.open}
          >
            <ThemedText type="subtitle">{item.title}</ThemedText>
            <ThemedText type="small" themeColor="tint">
              {item.figureCount ? t("reading.availableIllustrated") : t("reading.available")} · {item.language === "en" ? "English" : "Tagalog"}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{item.summary}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Wikipedia · {t("reading.minutes", { count: item.readMinutes })}
              {item.figureCount ? ` · ${t("reading.figures", { count: item.figureCount })}` : ""} · {Math.max(1, Math.ceil(item.sizeBytes / 1024))} KB
            </ThemedText>
          </Pressable>
          {!compact ? (
            <View style={styles.manage}>
              {removingId === item.id ? (
                <>
                  <ThemedText type="small">{t("reading.removePrompt")}</ThemedText>
                  <ActionButton label={t("reading.remove")} destructive disabled={!!busyId} onPress={() => {
                    void remove(item.id).then(() => setRemovingId(null));
                  }} />
                  <ActionButton label={t("common.cancel")} disabled={!!busyId} onPress={() => setRemovingId(null)} />
                </>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel={t("reading.removeTitle", { title: item.title })}
                  disabled={!!busyId} onPress={() => setRemovingId(item.id)} style={styles.remove}>
                  <ThemedText type="small" themeColor="textSecondary">{t("reading.remove")}</ThemedText>
                </Pressable>
              )}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: Spacing.three },
  card: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  open: { padding: Spacing.three, gap: Spacing.two, minHeight: 100 },
  manage: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.two },
  remove: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
});
