import Constants from "expo-constants";
import { useState } from "react";
import { Linking, StyleSheet } from "react-native";

import { ActionRow } from "@/shared/components/action-row";
import { Collapsible } from "@/shared/components/collapsible";
import { InfoRow } from "@/shared/components/info-row";
import { RowGroup } from "@/shared/components/row-group";
import { StackPage } from "@/shared/components/stack-page";
import { ThemedText } from "@/shared/components/themed-text";
import { contentSources } from "@/shared/constants/content-sources";
import { localModel } from "@/shared/constants/local-model";
import { Spacing } from "@/shared/constants/theme";
import { useTranslation } from "@/shared/i18n";

const SUPPORT_EMAIL = "tyrsurtida@gmail.com";

const QUESTIONS = [
  { question: "help.q1", answer: "help.a1" },
  { question: "help.q2", answer: "help.a2" },
  { question: "help.q3", answer: "help.a3" },
  { question: "help.q4", answer: "help.a4" },
  { question: "help.q5", answer: "help.a5" },
  { question: "help.q6", answer: "help.a6" },
] as const;

export default function HelpPage() {
  const { t } = useTranslation();
  const [mailError, setMailError] = useState("");
  const version = Constants.expoConfig?.version ?? "1.0.0";

  function openSupportMail() {
    setMailError("");
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Seekora`).catch(() =>
      setMailError(t("help.contactFailed", { email: SUPPORT_EMAIL })),
    );
  }

  return (
    <StackPage title={t("settings.help")}>
      <ThemedText type="small" themeColor="textSecondary">
        {t("help.intro")}
      </ThemedText>

      <ThemedText type="subtitle" accessibilityRole="header">
        {t("help.questionsTitle")}
      </ThemedText>
      <RowGroup>
        {QUESTIONS.map((item, index) => (
          <Collapsible
            key={item.question}
            title={t(item.question)}
            last={index === QUESTIONS.length - 1}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {t(item.answer)}
            </ThemedText>
          </Collapsible>
        ))}
      </RowGroup>

      <ThemedText type="subtitle" accessibilityRole="header">
        {t("help.contactTitle")}
      </ThemedText>
      <RowGroup>
        <ActionRow
          first
          icon={{ ios: "envelope", android: "mail", web: "mail" }}
          label={t("help.contactLabel")}
          onPress={openSupportMail}
        />
      </RowGroup>
      {mailError ? (
        <ThemedText type="small" themeColor="error" accessibilityRole="alert">
          {mailError}
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {t("help.contactNote", { email: SUPPORT_EMAIL })}
        </ThemedText>
      )}

      <ThemedText type="subtitle" accessibilityRole="header">
        {t("help.aboutTitle")}
      </ThemedText>
      <RowGroup>
        <InfoRow
          first
          icon={{ ios: "info.circle", android: "info", web: "info" }}
          label={t("help.rowVersion")}
          value={version}
        />
      </RowGroup>

      <ThemedText type="subtitle" accessibilityRole="header">
        {t("help.creditsTitle")}
      </ThemedText>
      <RowGroup>
        <ActionRow
          first
          icon={{ ios: "doc.text", android: "description", web: "description" }}
          label={t("help.rowWikipedia")}
          value="CC BY-SA 4.0"
          onPress={() => {
            void Linking.openURL("https://creativecommons.org/licenses/by-sa/4.0/");
          }}
        />
        <ActionRow
          icon={{ ios: "cpu", android: "memory", web: "memory" }}
          label={t("help.rowAi")}
          value={localModel.license}
          onPress={() => {
            void Linking.openURL("https://www.apache.org/licenses/LICENSE-2.0");
          }}
        />
        <ActionRow
          icon={{ ios: "textformat", android: "text_fields", web: "text_fields" }}
          label={t("help.rowFonts")}
          value="OFL 1.1"
          onPress={() => {
            void Linking.openURL("https://openfontlicense.org");
          }}
        />
        {contentSources.openStax ? (
          <ActionRow
            icon={{ ios: "books.vertical", android: "library_books", web: "library_books" }}
            label={t("help.rowOpenStax")}
            value="CC BY 4.0"
            onPress={() => {
              void Linking.openURL("https://openstax.org");
            }}
          />
        ) : null}
      </RowGroup>

      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        {t("help.privacyNote")}
      </ThemedText>
    </StackPage>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 12, lineHeight: 17, paddingHorizontal: Spacing.one },
});
