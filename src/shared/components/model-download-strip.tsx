import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useModel } from "@/shared/providers/model-provider";

/**
 * A slim progress line for the AI model while it downloads or is checked, so setup can carry on.
 * Renders nothing when no download is running.
 */
export function ModelDownloadStrip() {
  const colors = useTheme();
  const { t } = useTranslation();
  const model = useModel();

  const downloading = model.operation === "downloading";
  const checking = model.operation === "importing" || model.operation === "verifying";
  if (!downloading && !checking) return null;

  const percent = Math.round(Math.min(1, Math.max(0, model.progress)) * 100);
  const caption = downloading
    ? t("model.downloading", { percent })
    : t("model.checking", { percent });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={caption}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[
        styles.strip,
        { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder },
      ]}
    >
      <ThemedText type="small">{caption}</ThemedText>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { backgroundColor: colors.tint, width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
});
