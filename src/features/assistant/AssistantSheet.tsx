import { Image } from "expo-image";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Fonts, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import { assistantModelStatus, type AssistantModelStatus } from "@/shared/lib/assistant-status";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { useKnowledge } from "@/shared/providers/knowledge-provider";
import { useModel } from "@/shared/providers/model-provider";
import { useAssistantSheetStore } from "@/shared/stores/assistant-sheet-store";
import type { SourceCitation } from "@/shared/types/knowledge";

import { ChatThread, type ChatMessage } from "./components/ChatThread";
import { useGroundedAnswer, type AskOutcome } from "./hooks/useGroundedAnswer";
import { useSpeechInput } from "./hooks/useSpeechInput";

const statusKey: Record<AssistantModelStatus, MessageKey> = {
  ready: "assistant.statusReady",
  loading: "assistant.statusLoading",
  busy: "assistant.statusBusy",
  notLoaded: "assistant.statusNotLoaded",
  missing: "assistant.statusMissing",
};

export function AssistantSheet() {
  const open = useAssistantSheetStore((state) => state.open);
  const requestId = useAssistantSheetStore((state) => state.requestId);
  const articleTitle = useAssistantSheetStore((state) => state.articleTitle);
  const pageText = useAssistantSheetStore((state) => state.pageText);
  const closeAssistant = useAssistantSheetStore((state) => state.closeAssistant);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const { t } = useTranslation();
  const appLocale = useOnboardingStore((state) => state.language);
  const model = useModel();
  const knowledge = useKnowledge();
  const { ask, stop, busy, streamed, libraryReady } = useGroundedAnswer();

  const [presented, setPresented] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pageById, setPageById] = useState<Record<string, number>>({});
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const draftRef = useRef("");
  const progress = useSharedValue(0);
  const travel = useSharedValue(width);
  const scrollRef = useRef<ScrollView>(null);
  const nextId = useRef(0);
  const sending = useRef(false);
  const handledRequest = useRef(0);
  const submitRef = useRef<(text: string) => Promise<void>>(async () => {});
  const tRef = useRef(t);
  const openRef = useRef(open);
  const pageRef = useRef<{ title: string; text: string } | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const { listening, toggle: toggleVoice } = useSpeechInput({
    locale: appLocale,
    active: open && presented,
    disabled: busy,
    getPrefix: () => draftRef.current,
    onTranscript: (text) => {
      setVoiceNotice(null);
      setDraft(text.slice(0, 400));
    },
    onError: (key: MessageKey) => setVoiceNotice(t(key)),
  });

  if (open && !presented) setPresented(true);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    pageRef.current = articleTitle && pageText ? { title: articleTitle, text: pageText } : null;
  }, [articleTitle, pageText]);

  useEffect(() => {
    travel.value = width;
  }, [travel, width]);

  useEffect(() => {
    openRef.current = open;
    if (!presented) return;
    const duration = reducedMotion ? 0 : open ? 320 : 240;
    progress.value = withTiming(
      open ? 1 : 0,
      { duration, easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic) },
      (finished) => {
        if (finished && !openRef.current) runOnJS(setPresented)(false);
      },
    );
  }, [open, presented, progress, reducedMotion]);

  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * travel.value }],
  }));

  async function submit(text: string) {
    const question = text.trim();
    if (!question || sending.current) return;
    sending.current = true;
    const answerId = `a-${++nextId.current}`;
    setDraft((current) => (current.trim() === question ? "" : current));
    setMessages((current) => [
      ...current,
      { id: `q-${nextId.current}`, role: "user", text: question },
      { id: answerId, role: "assistant", pending: true, outcome: null },
    ]);
    let outcome: AskOutcome | null = null;
    try {
      const library = knowledge.state;
      const page = pageRef.current;
      outcome = page
        ? await ask(question, page)
        : libraryReady
          ? await ask(question)
          : {
              status: "notice",
              message:
                library.status === "unavailable"
                  ? library.reason
                  : library.status === "error"
                    ? library.message
                    : tRef.current("assistant.libraryPending"),
            };
    } finally {
      sending.current = false;
      setMessages((current) =>
        current.map((message) =>
          message.id === answerId && message.role === "assistant"
            ? { ...message, pending: false, outcome }
            : message,
        ),
      );
    }
  }

  useEffect(() => {
    submitRef.current = submit;
  });

  useEffect(() => {
    if (!open || !articleTitle || requestId === 0) return;
    if (handledRequest.current === requestId) return;
    handledRequest.current = requestId;
    void submitRef.current(tRef.current("assistant.aboutArticle", { title: articleTitle }));
  }, [open, articleTitle, requestId]);

  useEffect(() => {
    if (!presented) return;
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, streamed, presented]);

  function openSource(citation: SourceCitation) {
    if (citation.chunkId.startsWith("page:")) return;
    closeAssistant();
    router.push({ pathname: "/passage/[chunkId]", params: { chunkId: citation.chunkId } });
  }

  const canSend = draft.trim().length > 0 && !busy;

  return (
    <Modal
      visible={presented}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeAssistant}
    >
      <Animated.View style={[StyleSheet.absoluteFill, slide]}>
        <ThemedView type="backgroundWarm" style={styles.fill}>
          <KeyboardAvoidingView
            style={styles.fill}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View
              style={[
                styles.header,
                {
                  paddingTop: insets.top + Spacing.one,
                  borderBottomColor: colors.dashboardBorder,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.goBack")}
                onPress={closeAssistant}
                style={styles.back}
              >
                <SymbolView
                  name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
                  size={22}
                  tintColor={colors.text}
                />
              </Pressable>
              <Image
                source={require("@/assets/seekora-assistant.png")}
                accessibilityLabel={t("assistant.avatar")}
                contentFit="cover"
                style={[styles.headerAvatar, { borderColor: colors.dashboardBorder }]}
              />
              <View style={styles.headerText}>
                <ThemedText type="smallBold" accessibilityRole="header" style={styles.title}>
                  {t("assistant.chatTitle")}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.status}>
                  {t(statusKey[assistantModelStatus(model)])}
                </ThemedText>
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              <ChatThread
                messages={messages}
                streamed={streamed}
                pageById={pageById}
                onPage={(id, page) => setPageById((current) => ({ ...current, [id]: page }))}
                onOpenSource={openSource}
                onLoadModel={() => {
                  void model.loadModel();
                }}
                onSetupModel={() => {
                  closeAssistant();
                  router.push("/model");
                }}
                modelInstalled={model.installed !== null}
                modelBusy={model.operation !== null}
              />
            </ScrollView>

            {voiceNotice ? (
              <ThemedText
                themeColor="textSecondary"
                accessibilityRole="alert"
                style={styles.voiceNotice}
              >
                {voiceNotice}
              </ThemedText>
            ) : null}

            <View
              style={[
                styles.composer,
                {
                  paddingBottom: insets.bottom + Spacing.two,
                  borderTopColor: colors.dashboardBorder,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  listening ? t("assistant.stopVoice") : t("assistant.startVoice")
                }
                accessibilityState={{ disabled: busy, selected: listening }}
                disabled={busy}
                onPress={() => {
                  void toggleVoice();
                }}
                style={[
                  styles.mic,
                  {
                    borderColor: listening ? colors.tint : colors.dashboardBorder,
                    backgroundColor: listening
                      ? colors.backgroundSelected
                      : colors.backgroundElement,
                  },
                ]}
              >
                <SymbolView
                  name={
                    listening
                      ? { ios: "mic.fill", android: "mic", web: "mic" }
                      : { ios: "mic", android: "mic", web: "mic" }
                  }
                  size={20}
                  tintColor={listening ? colors.tint : colors.text}
                />
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={messages.length > 0 ? t("assistant.followUp") : t("assistant.askFirst")}
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel={t("assistant.questionLabel")}
                editable={!busy}
                maxLength={400}
                onSubmitEditing={() => {
                  void submit(draft);
                }}
                returnKeyType="send"
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.dashboardBorder,
                    fontFamily: Fonts.sans,
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={busy ? t("assistant.stop") : t("assistant.send")}
                disabled={!busy && !canSend}
                onPress={() => {
                  if (busy) stop();
                  else void submit(draft);
                }}
                style={[
                  styles.send,
                  { backgroundColor: busy || canSend ? colors.tint : colors.disabled },
                ]}
              >
                <SymbolView
                  name={
                    busy
                      ? { ios: "stop.fill", android: "stop", web: "stop" }
                      : { ios: "arrow.up", android: "arrow_upward", web: "arrow_upward" }
                  }
                  size={18}
                  tintColor={colors.backgroundElement}
                />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </ThemedView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: Spacing.three,
    paddingBottom: Spacing.two,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerAvatar: { width: 32, height: 32, borderRadius: 10, borderWidth: 1 },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, lineHeight: 22 },
  status: { fontSize: 12, lineHeight: 16 },
  scroll: { flexGrow: 1, paddingBottom: Spacing.four },
  voiceNotice: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
