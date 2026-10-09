import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import type { MessageKey } from "@/shared/i18n";
import { recognitionLang } from "@/shared/lib/speech";
import type { AppLocale } from "@/shared/stores/onboarding-store";

/**
 * Android can fetch the offline voice model on demand, through its own dialog. Recognition stays
 * on this device, so without that model there is no answer we are willing to get another way.
 */
async function offerOfflineModel(locale: AppLocale) {
  if (Platform.OS !== "android") return;
  try {
    await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
      locale: recognitionLang(locale),
    });
  } catch {
    // Nothing more to offer; the notice has already told the user voice is unavailable.
  }
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
    else if (event.error === "language-not-supported") {
      onError("assistant.voiceOffline");
      void offerOfflineModel(locale);
    } else if (event.error === "service-not-allowed") onError("assistant.voiceUnavailable");
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
    if (
      !ExpoSpeechRecognitionModule.isRecognitionAvailable() ||
      !ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()
    ) {
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
      // Speech is turned into text here, like everything else the assistant does.
      requiresOnDeviceRecognition: true,
      androidIntentOptions: { EXTRA_PREFER_OFFLINE: true },
    });
  }, [disabled, getPrefix, listening, locale, onError]);

  return { listening, toggle };
}
