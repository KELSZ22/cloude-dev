import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import type { SourceCitation } from "@/shared/types/knowledge";

import type { AskOutcome } from "../hooks/useGroundedAnswer";

const reasonKey: Record<string, MessageKey> = {
  "no-match": "assistant.noMatch",
  "weak-match": "assistant.weakMatch",
  "model-declined": "assistant.modelDeclined",
};

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; pending: boolean; outcome: AskOutcome | null };

type Page =
  | { kind: "prose"; body: string }
  | { kind: "list"; items: { title: string; body: string }[] };

function present(text: string): Page[] {
  const clean = text.replace(/\s*\[\d+\]/g, "").trim();
  const chunks = clean.split(/\n(?=\d+\.\s)/).filter((part) => /^\d+\.\s/.test(part));
  if (chunks.length >= 2) {
    const items = chunks.map((part) => {
      const match = part.match(/^(\d+)\.\s+([\s\S]+)$/);
      const body = (match?.[2] ?? part).trim();
      const [first, ...rest] = body.split("\n");
      const broken = first.split(/\s+[—–-]\s+/);
      return {
        title: `${match?.[1] ?? ""}. ${broken[0].trim()}`.replace(/^\.\s*/, ""),
        body: [broken.slice(1).join(" — "), ...rest].filter(Boolean).join(" ").trim(),
      };
    });
    if (items.length <= 3) return [{ kind: "list", items }];
    const pages: Page[] = [];
    for (let index = 0; index < items.length; index += 3) {
      pages.push({ kind: "list", items: items.slice(index, index + 3) });
    }
    return pages;
  }

  if (clean.length <= 420) return [{ kind: "prose", body: clean }];
  const sentences = (clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [clean])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  const pages: Page[] = [];
  let current = "";
  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (current && next.length > 320) {
      pages.push({ kind: "prose", body: current });
      current = sentence;
    } else {
      current = next;
    }
  }
  if (current) pages.push({ kind: "prose", body: current });
  return pages.length > 0 ? pages : [{ kind: "prose", body: clean }];
}

function AnswerBody({ page }: { page: Page }) {
  if (page.kind === "prose") {
    return <ThemedText style={styles.answer}>{page.body}</ThemedText>;
  }
  return (
    <View style={styles.list}>
      {page.items.map((item) => (
        <View key={`${item.title}-${item.body}`} style={styles.item}>
          <ThemedText type="smallBold" style={styles.itemTitle}>
            {item.title}
          </ThemedText>
          {item.body ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.itemBody}>
              {item.body}
            </ThemedText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function ChatThread({
  messages,
  streamed,
  pageById,
  onPage,
  onOpenSource,
  onLoadModel,
  onSetupModel,
  modelInstalled,
  modelBusy,
}: {
  messages: readonly ChatMessage[];
  streamed: string;
  pageById: Readonly<Record<string, number>>;
  onPage: (id: string, page: number) => void;
  onOpenSource: (citation: SourceCitation) => void;
  onLoadModel: () => void;
  onSetupModel: () => void;
  modelInstalled: boolean;
  modelBusy: boolean;
}) {
  const colors = useTheme();
  const { t } = useTranslation();
  const bubble = {
    backgroundColor: colors.backgroundElement,
    borderColor: colors.dashboardBorder,
  };

  return (
    <View style={styles.thread}>
      <View style={styles.assistantRow}>
        <Image
          source={require("@/assets/seekora-assistant.webp")}
          accessibilityLabel={t("assistant.avatar")}
          contentFit="cover"
          style={[styles.assistantAvatar, { borderColor: colors.dashboardBorder }]}
        />
        <View style={styles.assistantBody}>
          <View style={[styles.assistantBubble, bubble]}>
            <ThemedText style={styles.answer}>{t("assistant.greeting")}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.itemBody}>
              {t("assistant.description")}
            </ThemedText>
          </View>
        </View>
      </View>
      {messages.map((message) => {
        if (message.role === "user") {
          return (
            <View key={message.id} style={styles.userRow}>
              <View
                style={[styles.userBubble, { backgroundColor: colors.backgroundSelected }]}
              >
                <ThemedText style={styles.userText}>{message.text}</ThemedText>
              </View>
              <View
                accessibilityLabel={t("assistant.you")}
                style={[
                  styles.avatar,
                  { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder },
                ]}
              >
                <SymbolView
                  name={{ ios: "person.fill", android: "person", web: "person" }}
                  size={16}
                  tintColor={colors.tint}
                />
              </View>
            </View>
          );
        }

        const outcome = message.outcome;
        const live = message.pending ? streamed : "";
        const answerText =
          outcome?.status === "answered"
            ? outcome.text
            : outcome?.status === "stopped"
              ? outcome.text
              : live;
        const pages = answerText.trim() ? present(answerText) : [];
        const pageIndex = Math.min(pageById[message.id] ?? 0, Math.max(pages.length - 1, 0));
        const page = pages[pageIndex];
        const note =
          outcome?.status === "insufficient-evidence"
            ? t(reasonKey[outcome.reason] ?? "assistant.noMatch")
            : outcome?.status === "passages-only"
              ? t(
                  outcome.citations.some((citation) => citation.chunkId.startsWith("page:"))
                    ? "assistant.scannedPage"
                    : "assistant.passagesBody",
                )
              : outcome?.status === "error" || outcome?.status === "notice"
                ? outcome.message
                : outcome?.status === "stopped" && !outcome.text
                  ? t("assistant.stopped")
                  : message.pending && !live
                    ? t("assistant.writing")
                    : null;
        const citations =
          outcome?.status === "answered" || outcome?.status === "passages-only"
            ? outcome.citations
            : [];

        return (
          <View key={message.id} style={styles.assistantRow}>
            <Image
              source={require("@/assets/seekora-assistant.webp")}
              accessibilityLabel={t("assistant.avatar")}
              contentFit="cover"
              style={[styles.assistantAvatar, { borderColor: colors.dashboardBorder }]}
            />
            <View style={styles.assistantBody}>
              {page || note ? (
                <View style={[styles.assistantBubble, bubble]}>
                  {page ? <AnswerBody page={page} /> : null}
                  {note ? (
                    <ThemedText
                      themeColor={outcome?.status === "error" ? "error" : "textSecondary"}
                      style={styles.note}
                    >
                      {note}
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}
              {pages.length > 1 ? (
                <View style={styles.pager}>
                  {pages.map((_, index) => {
                    const selected = index === pageIndex;
                    return (
                      <Pressable
                        key={index}
                        accessibilityRole="button"
                        accessibilityLabel={t("assistant.pageLabel", {
                          page: index + 1,
                          total: pages.length,
                        })}
                        accessibilityState={{ selected }}
                        onPress={() => onPage(message.id, index)}
                        style={[
                          styles.page,
                          selected && { backgroundColor: colors.tint },
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{ color: selected ? colors.backgroundElement : colors.textSecondary }}
                        >
                          {index + 1}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {outcome?.status === "passages-only" ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={modelBusy}
                  onPress={modelInstalled ? onLoadModel : onSetupModel}
                  style={styles.modelAction}
                >
                  <ThemedText type="smallBold" style={{ color: colors.tint }}>
                    {modelInstalled ? t("assistant.loadModel") : t("assistant.setupModel")}
                  </ThemedText>
                </Pressable>
              ) : null}
              {citations.length > 0 ? (
                <View style={styles.sources}>
                  <ThemedText type="smallBold">
                    {t("assistant.sources", { count: citations.length })}
                  </ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.sourceRow}
                  >
                    {citations.map((citation) => (
                      <Pressable
                        key={citation.chunkId}
                        accessibilityRole="button"
                        accessibilityLabel={t("assistant.openSource", { title: citation.title })}
                        onPress={() => onOpenSource(citation)}
                        style={({ pressed }) => [
                          styles.sourceCard,
                          {
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.dashboardBorder,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.thumb, { backgroundColor: colors.backgroundSelected }]}>
                          <SymbolView
                            name={{ ios: "leaf.fill", android: "eco", web: "eco" }}
                            size={22}
                            tintColor={colors.tint}
                          />
                        </View>
                        <ThemedText type="smallBold" numberOfLines={2} style={styles.sourceTitle}>
                          {citation.title}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {t("search.article")}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: { gap: Spacing.four, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  userRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "flex-end", gap: 8 },
  userBubble: { maxWidth: "78%", borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 12 },
  userText: { fontSize: 15, lineHeight: 22 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  assistantRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  assistantAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1 },
  assistantBody: { flex: 1, gap: 10, minWidth: 0 },
  assistantBubble: {
    alignSelf: "flex-start",
    gap: 8,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  answer: { fontSize: 15, lineHeight: 22 },
  list: { gap: 12, alignSelf: "stretch" },
  item: { gap: 2 },
  itemTitle: { fontSize: 15, lineHeight: 22 },
  itemBody: { fontSize: 14, lineHeight: 20 },
  note: { fontSize: 15, lineHeight: 22 },
  pager: { flexDirection: "row", alignSelf: "flex-end", gap: 4 },
  page: { minWidth: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  modelAction: { minHeight: 44, justifyContent: "center" },
  sources: { alignSelf: "stretch", gap: 10, marginTop: Spacing.two },
  sourceRow: { gap: 10, paddingRight: Spacing.three },
  sourceCard: { width: 148, borderRadius: 16, borderWidth: 1, padding: 8, gap: 6 },
  thumb: { height: 72, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sourceTitle: { fontSize: 13, lineHeight: 18, minHeight: 36 },
});
