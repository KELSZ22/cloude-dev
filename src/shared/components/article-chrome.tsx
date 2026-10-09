import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

export const ARTICLE_HERO_HEIGHT = 248;

export function ArticleHero({
  image,
  fit = "cover",
}: {
  image: ImageSource | null;
  fit?: "cover" | "contain";
}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.hero,
        fit === "contain" && { backgroundColor: colors.backgroundElement },
        !image && { height: insets.top + 56 },
      ]}
    >
      {image ? (
        <Image
          source={image}
          contentFit={fit}
          contentPosition="center"
          accessible={false}
          accessibilityLabel=""
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}

export function ArticleTopBar({
  onBack,
  onBookmark,
  bookmarked,
  onAsk,
  onPhoto,
}: {
  onBack: () => void;
  onBookmark?: () => void;
  bookmarked?: boolean;
  onAsk: () => void;
  onPhoto: boolean;
}) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const icon = onPhoto ? "#FFFFFF" : undefined;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.bar, { paddingTop: insets.top + Spacing.two, paddingBottom: onPhoto ? 0 : Spacing.four }]}
    >
      {onPhoto ? null : (
        <LinearGradient
          pointerEvents="none"
          colors={[colors.backgroundWarm, colors.backgroundWarm, "transparent"]}
          locations={[0, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <ChromeButton
        label={t("common.goBack")}
        name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
        onPress={onBack}
        onPhoto={onPhoto}
        tint={icon}
      />
      <View style={styles.barActions}>
        {onBookmark ? (
          <ChromeButton
            label={bookmarked ? t("article.removeBookmark") : t("article.bookmark")}
            name={{
              ios: bookmarked ? "bookmark.fill" : "bookmark",
              android: bookmarked ? "bookmark" : "bookmark_border",
              web: bookmarked ? "bookmark" : "bookmark_border",
            }}
            onPress={onBookmark}
            onPhoto={onPhoto}
            tint={icon}
          />
        ) : null}
        <ChromeButton
          label={t("article.askAi")}
          name={{ ios: "bubble.left", android: "chat_bubble_outline", web: "chat_bubble_outline" }}
          onPress={onAsk}
          onPhoto={onPhoto}
          tint={icon}
        />
      </View>
    </View>
  );
}

function ChromeButton({
  label,
  name,
  onPress,
  onPhoto,
  tint,
}: {
  label: string;
  name: SymbolViewProps["name"];
  onPress: () => void;
  onPhoto: boolean;
  tint?: string;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chrome,
        {
          backgroundColor: onPhoto ? "rgba(13,27,42,0.45)" : colors.backgroundElement,
          borderWidth: onPhoto ? 0 : StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView name={name} size={20} tintColor={tint ?? colors.brand} />
    </Pressable>
  );
}

export function ArticleIntro({
  title,
  source,
  minutes,
}: {
  title: string;
  source: string;
  minutes: number;
}) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View style={styles.intro}>
      <ThemedText type="title" accessibilityRole="header" style={[styles.title, { color: colors.brand }]}>
        {title}
      </ThemedText>
      <ThemedText type="smallBold" style={[styles.source, { color: colors.tint }]}>
        {t("search.fromPack", { pack: source })}
      </ThemedText>
      <View style={styles.meta}>
        <ThemedText type="small" themeColor="textSecondary">{t("search.article")}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">·</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("reading.minutes", { count: minutes })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">·</ThemedText>
        <SymbolView
          name={{ ios: "leaf.fill", android: "eco", web: "eco" }}
          size={14}
          tintColor={colors.tint}
        />
        <ThemedText type="small" themeColor="textSecondary">{t("article.availableOffline")}</ThemedText>
      </View>
    </View>
  );
}

export function ArticleCallout({ text }: { text: string }) {
  const colors = useTheme();
  if (!text.trim()) return null;
  return (
    <View style={[styles.callout, { backgroundColor: colors.backgroundSelected }]}>
      <SymbolView
        name={{ ios: "leaf.fill", android: "eco", web: "eco" }}
        size={18}
        tintColor={colors.tint}
      />
      <ThemedText style={styles.calloutText}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: ARTICLE_HERO_HEIGHT, justifyContent: "flex-start" },
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  barActions: { flexDirection: "row", gap: Spacing.two },
  chrome: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.75 },
  intro: { gap: 6, marginBottom: Spacing.three },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: 0 },
  source: { fontSize: 15, lineHeight: 20 },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 2 },
  callout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 16,
    padding: 14,
    marginBottom: Spacing.four,
  },
  calloutText: { flex: 1, fontSize: 15, lineHeight: 22 },
});
