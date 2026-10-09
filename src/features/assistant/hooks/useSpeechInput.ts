import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";

import type { MessageKey } from "@/shared/i18n";
import type { AppLocale } from "@/shared/stores/onboarding-store";

function recognitionLang(locale: AppLocale) {
  return locale === "fil" ? "fil-PH" : "en-US";
}

export function useSpeechInput({
  locale,
  active,
  disabled,
  getPrefix,
  onTranscript,
  onError,
}: {
  locale: AppLocale;
  /** When false, any in-flight recognition is aborted. */
  active: boolean;
  disabled?: boolean;
  getPrefix: () => string;
  onTranscript: (text: string) => void;
  onError: (messageKey: MessageKey) => void;
}) {
  const [listening, setListening] = useState(false);
  const prefixRef = useRef("");

  useSpeechRecognitionEvent("start", () => setListening(true));
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("result", (event) => {
    const piece = event.results[0]?.transcript ?? "";
    const prefix = prefixRef.current;
    const gap = prefix && piece && !/\s$/.test(prefix) ? " " : "";
    onTranscript(`${prefix}${gap}${piece}`);
  });
  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    if (event.error === "not-allowed") onError("assistant.voiceDenied");
    else if (event.error === "service-not-allowed" || event.error === "language-not-supported") {
      onError("assistant.voiceUnavailable");
    }
  });

  useEffect(() => {
    if (!active) ExpoSpeechRecognitionModule.abort();
    return () => {
      ExpoSpeechRecognitionModule.abort();
    };
  }, [active]);

  const toggle = useCallback(async () => {
    if (disabled) return;
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      onError("assistant.voiceUnavailable");
      return;
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      onError("assistant.voiceDenied");
      return;
    }
    prefixRef.current = getPrefix();
    ExpoSpeechRecognitionModule.start({
      lang: recognitionLang(locale),
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
    });
  }, [disabled, getPrefix, listening, locale, onError]);

  return { listening, toggle };
}
