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
    idleLabel?: string;
    savedLabel?: string;
    busyLabel?: string;
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
        accessibilityLabel={[result.title, source, meta].filter(Boolean).join(". ")}
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
          <ThemedText type="smallBold" style={styles.title}>
            {result.title}
          </ThemedText>
          {source ? (
            <ThemedText type="small" style={[styles.pack, { color: colors.tint }]} numberOfLines={1}>
              {source}
            </ThemedText>
          ) : null}
          {result.summary ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
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
      </View>
      {result.download ? (
        <View style={[styles.downloadWrap, { borderTopColor: colors.dashboardBorder }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${downloadActionLabel(result, t)}: ${result.title}`}
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
              {downloadActionLabel(result, t)}
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

function downloadActionLabel(
  result: SearchResult,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
) {
  const action = result.download;
  if (!action) return "";
  if (action.busy) return action.busyLabel ?? t("search.resourcesDownloadingPdf");
  if (action.saved) return action.savedLabel ?? t("search.resourcesReadPdf");
  return action.idleLabel ?? t("search.resourcesDownloadPdf");
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.three,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  top: { flexDirection: "row", alignItems: "stretch" },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    padding: 12,
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
  // The thumbnail follows the copy column instead of setting the row height, so a card
  // with a one-line title stays short and a long title is never clipped.
  thumb: { width: 92, minHeight: 72, alignSelf: "stretch", borderRadius: 16 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 2, paddingTop: 1 },
  title: { fontSize: 16, lineHeight: 21 },
  pack: { fontSize: 13, lineHeight: 18 },
  summary: { fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  meta: { fontSize: 12, lineHeight: 16 },
});
