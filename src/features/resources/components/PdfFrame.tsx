import { Linking, StyleSheet, View } from "react-native";

import { ActionButton } from "@/shared/components/action-button";
import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTranslation } from "@/shared/i18n";

/** Native builds keep the file in app storage and open that saved copy. */
export function PdfFrame({ uri }: { uri: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.fallback}>
      <ThemedText>{t("search.pdfSavedNative")}</ThemedText>
      <ActionButton label={t("search.pdfOpenSaved")} onPress={() => void Linking.openURL(uri)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, justifyContent: "center", gap: Spacing.three, padding: Spacing.three },
});
