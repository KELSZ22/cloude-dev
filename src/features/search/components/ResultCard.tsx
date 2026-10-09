import { Image, type ImageSource } from "expo-image";
import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";

import type { SearchKind } from "../catalog";

const kindKey: Record<SearchKind, MessageKey> = {
  article: "search.article",
  document: "search.document",
  pack: "search.pack",
};

export type SearchResult = {
  id: string;
  title: string;
  pack: string;
  kind: SearchKind;
  readMinutes: number;
  summary: string;
  image?: ImageSource | null;
  sourceLabel?: string;
  metaLabel?: string;
  onPress: () => void;
  download?: {
    saved: boolean;
    busy: boolean;
    error?: string | null;
    onPress: () => void;
  };
};

export function ResultCard({ result }: { result: SearchResult }) {
  const colors = useTheme();
  const { t } = useTranslation();
  const meta =
    result.metaLabel ??
    (result.kind === "pack"
      ? t("search.packReady")
      : t("search.readMeta", {
          kind: t(kindKey[result.kind]),
          minutes: result.readMinutes,
        }));
  const source =
    result.sourceLabel ??
    (result.kind === "document"
      ? result.pack
      : t("search.fromPack", { pack: result.pack }));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.dashboardBorder,
        },
      ]}
    >
      <View style={styles.top}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${result.title}. ${source}. ${meta}`}
        onPress={result.onPress}
        style={({ pressed }) => [
          styles.main,
          pressed && { backgroundColor: colors.backgroundSelected },
        ]}
      >
        {result.image ? (
          <Image
            source={result.image}
            contentFit="cover"
            style={styles.thumb}
            accessibilityLabel=""
          />
        ) : (
          <View style={[styles.thumb, styles.placeholder, { backgroundColor: colors.backgroundSelected }]}>
            <SymbolView
              name={{ ios: "photo", android: "image", web: "image" }}
              size={22}
              tintColor={colors.tint}
            />
          </View>
        )}
        <View style={styles.copy}>
          <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
            {result.title}
          </ThemedText>
          <ThemedText type="small" style={[styles.pack, { color: colors.tint }]} numberOfLines={1}>
            {source}
          </ThemedText>
          {result.summary ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={2}
              style={styles.summary}
            >
              {result.summary}
            </ThemedText>
          ) : null}
          <View style={styles.metaRow}>
            <SymbolView
              name={{ ios: "doc.text", android: "description", web: "description" }}
              size={13}
              tintColor={colors.textSecondary}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
              {meta}
            </ThemedText>
          </View>
        </View>
      </Pressable>
      {result.download ? null : (
        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityLabel={t("library.moreOptions", { name: result.title })}
          accessibilityState={{ disabled: true }}
          style={styles.more}
        >
          <SymbolView
            name={{ ios: "ellipsis", android: "more_vert", web: "more_vert" }}
            size={18}
            tintColor={colors.textSecondary}
          />
        </Pressable>
      )}
      </View>
      {result.download ? (
        <View style={[styles.downloadWrap, { borderTopColor: colors.dashboardBorder }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${result.download.saved ? t("search.resourcesReadPdf") : t("search.resourcesDownloadPdf")}: ${result.title}`}
            disabled={result.download.busy}
            onPress={result.download.onPress}
            style={({ pressed }) => [styles.download, pressed && styles.downloadPressed]}
          >
            {result.download.busy ? (
              <ActivityIndicator color={colors.tint} size="small" />
            ) : (
              <SymbolView
                name={{
                  ios: result.download.saved ? "book.fill" : "arrow.down.circle.fill",
                  android: result.download.saved ? "menu_book" : "download",
                  web: result.download.saved ? "menu_book" : "download",
                }}
                size={18}
                tintColor={colors.tint}
              />
            )}
            <ThemedText type="smallBold" style={{ color: colors.tint }}>
              {result.download.busy
                ? t("search.resourcesDownloadingPdf")
                : result.download.saved
                  ? t("search.resourcesReadPdf")
                  : t("search.resourcesDownloadPdf")}
            </ThemedText>
          </Pressable>
          {result.download.error ? (
            <ThemedText accessibilityRole="alert" style={[styles.downloadError, { color: colors.error }]}>
              {result.download.error}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.three,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  top: { flexDirection: "row", alignItems: "flex-start" },
  main: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
    paddingRight: 4,
  },
  downloadWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 4,
  },
  download: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    minHeight: 36,
  },
  downloadPressed: { opacity: 0.6 },
  downloadError: { fontSize: 13, lineHeight: 18 },
  thumb: { width: 92, height: 92, borderRadius: 16 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 2, paddingTop: 1 },
  title: { fontSize: 16, lineHeight: 21 },
  pack: { fontSize: 13, lineHeight: 18 },
  summary: { fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  meta: { fontSize: 12, lineHeight: 16 },
  more: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginRight: 4,
  },
});
