import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ActionButton } from "@/shared/components/action-button";
import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useOfflineReadingStore } from "@/shared/stores/offline-reading-store";
import { useSavedCatalogStore } from "@/shared/stores/saved-catalog-store";

export function ReadingShelf({ query = "", compact = false }: { query?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { items, hydrated, busyId, error, hydrate, remove, clearError } = useOfflineReadingStore();
  const savedCatalog = useSavedCatalogStore((state) => state.items);
  const removeCatalog = useSavedCatalogStore((state) => state.remove);
  const [removingId, setRemovingId] = useState<string | null>(null);
  useEffect(() => { void hydrate(); }, [hydrate]);
  const needle = query.trim().toLowerCase();
  const matches = items.filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(needle));
  const catalogMatches = savedCatalog.filter((item) =>
    `${item.title} ${item.summary} ${item.pack}`.toLowerCase().includes(needle),
  );

  return (
    <View style={styles.shelf}>
      <ThemedText type="smallBold" accessibilityRole="header">{t("reading.savedTitle")}</ThemedText>
      {!hydrated && !error ? <ActivityIndicator color={colors.tint} accessibilityLabel={t("reading.loading")} /> : null}
      {error ? (
        <View style={styles.shelf}>
          <ThemedText type="small" accessibilityRole="alert" style={{ color: colors.error }}>
            {t(`reading.errors.${error}`)}
          </ThemedText>
          <ActionButton label={t("reading.retry")} onPress={() => { clearError(); void hydrate(); }} />
        </View>
      ) : null}
      {hydrated && !matches.length && !catalogMatches.length ? (
        <ThemedText type="small" themeColor="textSecondary">
          {needle ? t("reading.noSavedMatches") : t("reading.empty")}
        </ThemedText>
      ) : null}
      {catalogMatches.map((item) => (
        <View key={item.id} style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("reading.readTitle", { title: item.title })}
            onPress={() => router.push(`/article/${item.id}`)}
            style={styles.open}
          >
            <ThemedText type="subtitle">{item.title}</ThemedText>
            <ThemedText type="small" themeColor="tint">{t("reading.available")}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{item.summary}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.pack} · {t("reading.minutes", { count: item.readMinutes })}
            </ThemedText>
          </Pressable>
          {!compact ? (
            <RemoveDownload
              title={item.title}
              confirming={removingId === item.id}
              onAsk={() => setRemovingId(item.id)}
              onConfirm={() => {
                removeCatalog(item.id);
                setRemovingId(null);
              }}
              onCancel={() => setRemovingId(null)}
            />
          ) : null}
        </View>
      ))}
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
            <RemoveDownload
              title={item.title}
              confirming={removingId === item.id}
              busy={!!busyId}
              onAsk={() => setRemovingId(item.id)}
              onConfirm={() => {
                void remove(item.id).then(() => setRemovingId(null));
              }}
              onCancel={() => setRemovingId(null)}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function RemoveDownload({
  title,
  confirming,
  busy = false,
  onAsk,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirming: boolean;
  busy?: boolean;
  onAsk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("reading.removeTitle", { title })}
        disabled={busy}
        onPress={onAsk}
        style={styles.trash}
      >
        <SymbolView
          name={{ ios: "trash", android: "delete", web: "delete" }}
          size={18}
          tintColor={busy ? colors.disabled : colors.error}
        />
      </Pressable>
      {confirming ? (
        <View style={styles.manage}>
          <ThemedText type="small">{t("reading.removePrompt")}</ThemedText>
          <ActionButton label={t("reading.remove")} destructive disabled={busy} onPress={onConfirm} />
          <ActionButton label={t("common.cancel")} disabled={busy} onPress={onCancel} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: Spacing.three },
  card: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  open: { padding: Spacing.three, paddingRight: 52, gap: Spacing.two, minHeight: 100 },
  trash: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  manage: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.two },
});
