import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { ExternalLink } from "@/shared/components/external-link";
import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import type { DisplayFigure } from "@/shared/types/offline-reading";

export function ArticleFigure({ figure }: { figure: DisplayFigure }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const ratio = figure.width / figure.height;
  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder }]}>
      <Image
        source={{ uri: figure.uri }}
        contentFit="contain"
        accessibilityLabel={figure.caption || t("reading.figure")}
        style={[styles.image, { aspectRatio: Number.isFinite(ratio) && ratio > 0 ? ratio : 4 / 3 }]}
      />
      {figure.caption ? <ThemedText type="small">{figure.caption}</ThemedText> : null}
      <ThemedText type="small" themeColor="textSecondary">
        {figure.credit ? `${figure.credit} · ${figure.license}` : figure.license}
      </ThemedText>
      <ExternalLink href={figure.filePageUrl}>
        <ThemedText type="link" themeColor="tint">{t("reading.figureSource")}</ThemedText>
      </ExternalLink>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.two, gap: Spacing.two, marginBottom: Spacing.three },
  image: { width: "100%", maxHeight: 320, borderRadius: 12 },
});
