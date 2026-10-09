import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { openSavedPdf } from "@/features/resources/services/save-resource-pdf";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

import { PdfFrame } from "./components/PdfFrame";

export default function PdfReaderPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { t } = useTranslation();
  const colors = useTheme();
  const [title, setTitle] = useState("");
  const [uri, setUri] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    void openSavedPdf(id)
      .then((saved) => {
        if (!active) return;
        if (!saved) {
          setMissing(true);
          return;
        }
        setTitle(saved.title);
        if (saved.localUri) {
          setUri(saved.localUri);
          return;
        }
        const copy = saved.bytes.buffer.slice(
          saved.bytes.byteOffset,
          saved.bytes.byteOffset + saved.bytes.byteLength,
        ) as ArrayBuffer;
        objectUrl = URL.createObjectURL(
          new Blob([copy], { type: "application/pdf" }),
        );
        setUri(objectUrl);
      })
      .catch(() => {
        if (active) setMissing(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  return (
    <ThemedView style={styles.screen}>
      <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
        {title || t("search.pdfReader")}
      </ThemedText>
      {missing ? (
        <ThemedText style={styles.missing}>{t("search.pdfMissing")}</ThemedText>
      ) : null}
      {!missing && !uri ? (
        <ActivityIndicator
          color={colors.tint}
          accessibilityLabel={t("search.resourcesDownloadingPdf")}
        />
      ) : null}
      {uri ? (
        <View style={styles.viewer}>
          <PdfFrame uri={uri} />
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  missing: { paddingHorizontal: Spacing.three },
  viewer: { flex: 1 },
});
