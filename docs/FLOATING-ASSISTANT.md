# Floating AI assistant

A bubble with the Seekora assistant that stays on screen over other apps. Tapping it opens a small chat window that answers with the same on-device model the rest of the app uses. Questions can be typed or spoken. On request, and only after Android's own capture prompt is approved, it reads the text on the current screen and answers questions about it.

It is off until the user turns it on in **Settings → Floating AI Assistant**. Android only.

## How it fits into the app

```
Settings row ──► FloatingAssistantPage (features/floating-assistant)
                        │ enable / disable
                        ▼
FloatingAssistantProvider (shared/providers) ──► ModelProvider.generate()   ← the one existing model
        │  ▲                    │
        │  │ events             └─► AssistantConversation + AssistantSession (shared/services/floating-assistant)
        ▼  │                         prompts, history, captured screen text (memory only)
SeekoraFloatingAssistant (modules/floating-assistant, Kotlin)
        ├─ FloatingAssistantService   foreground service (specialUse, microphone): draws the bubble and chat window
        ├─ OverlayController          the views: bubble, long-press menu, chat window
        ├─ VoiceInput                 on-device SpeechRecognizer behind the chat's microphone button
        ├─ ScreenCaptureActivity      invisible host for Android's capture consent dialog
        └─ ScreenCaptureService       foreground service (mediaProjection): one frame → ML Kit OCR → text
```

- **No second model.** The native side only draws views and reports what was typed or tapped. Every answer is produced by `ModelProvider`, which still owns the single `LlamaRnEngine`. Nothing in `src/infrastructure/llm` changed.
- **Additive changes to existing code** are limited to: `ensureLoaded()` and `setBackgroundHold()` on `ModelProvider`; exporting the existing `generateParagraph()` from `services/rag/answer-question.ts`; one row in `SettingsPage`; one provider and one screen in `src/app/_layout.tsx`; new keys in the two i18n files.
- **Prompts are separate.** `services/floating-assistant/prompts.ts` holds the assistant's prompts. The library prompts in `services/rag` and the engine's system prompt are unchanged, so Ask Seekora answers exactly as before.

## Model lifecycle

| Situation | What happens |
| --- | --- |
| Assistant off | Unchanged: the model unloads whenever Seekora leaves the foreground. |
| Assistant on, model not loaded | The first question loads it (`ensureLoaded`), the same verify-then-load path as the Model screen. |
| Assistant on, Seekora in the background | The model stays loaded (`setBackgroundHold`) so a question asked over another app can be answered. |
| Assistant turned off | The hold is released; the next time Seekora leaves the foreground the model unloads as before. |
| Android reports critical memory pressure | The model is unloaded if it is idle, and the chat says so. It loads again on the next question. |
| Main app is using the model | One generation at a time. The assistant reports that the model is busy instead of interrupting. |
| Seekora's process is gone | The bubble is gone too. It returns the next time Seekora is opened, because the setting is remembered. If only the JavaScript runtime is gone, the chat offers an "Open Seekora" button. |

The model runs inside Seekora's JavaScript runtime, so the assistant works **while Seekora is still running in the background**. It does not start by itself after a reboot, and a phone that kills background apps aggressively will remove the bubble until Seekora is opened again.

## Screen analysis

The model is text-only, so the screen is read with on-device text recognition (ML Kit, Latin script). Its recognition data is bundled in the APK, so nothing is downloaded at run time; the library and data add about 12.5 MB to a one-ABI build.

1. The user taps **Analyze current screen**, **Explain this page**, **Summarize content**, or the scan button.
2. The chat explains what will happen and offers **Continue** or **Cancel**.
3. Seekora's overlay windows are removed and Android shows its own capture consent prompt. Declining ends the flow with nothing read.
4. A short-lived foreground service takes **one** frame, releases the capture session immediately, and runs text recognition on the in-memory bitmap.
5. The bitmap is recycled. Only the recognised text is passed to JavaScript, where it is kept in memory for the conversation.
6. The chat shows "Screen text attached · N lines" with a short sample of what was read and a **Discard** button. Follow-up questions use that text until it is discarded, replaced by a new capture, or the assistant is turned off.

Consent is asked for on every capture; Android's token is single-use and nothing is cached.

What it cannot do: understand pictures, video, charts, handwriting or layout; read non-Latin scripts; read windows that set `FLAG_SECURE` (banking, password and DRM screens come back blank, and the chat says no readable text was found).

**A screen that is mostly a picture gives the model almost nothing.** Capturing a video of a black hole yields only the page's labels ("Subscribe", "Share", "Home"), so a question about the picture gets "the text does not contain the answer". The sample line shows the user what was read, and when the model answers that way the chat adds a note that only words are read and that **Discard** lets them ask a general question instead. Looser prompts ("explain it with what you know") were tried against the model and rejected: they made it invent content from button labels and answer simple on-screen questions less accurately.

## Voice input

The chat's microphone button fills the input field with what was said; the user still decides when to send it. Recognition uses Android's **on-device** recogniser only (`SpeechRecognizer.createOnDeviceSpeechRecognizer`, Android 12+) with `EXTRA_PREFER_OFFLINE`, so audio never leaves the phone. There is deliberately no network fallback: a device without an offline voice model is told so instead. The in-app chat uses the same rule through `requiresOnDeviceRecognition` in `useSpeechInput`.

Android only lets a foreground service reach the microphone if that service runs with the `microphone` type, and only if `RECORD_AUDIO` is already granted when it starts. So the settings screen asks for the microphone before starting the overlay, and `FloatingAssistantService` adds the microphone type only when the permission is held. Declining it leaves everything else working; the microphone button then explains that access is off and that the assistant has to be turned off and on again after granting it.

## Privacy and security

- Overlay permission is used only to draw. It is never treated as permission to read the screen.
- No `AccessibilityService`, no background capture, no screenshots written to storage, no upload, no analytics. The module contains no logging calls; `tests/floating-assistant.test.js` checks the sources and manifest for this.
- ML Kit's usage-statistics uploader components are removed from the merged manifest (`tools:node="remove"` in the module manifest).
- Captured text is untrusted input. It is placed between markers, described to the model as material to explain, and followed by the real instructions; marker text inside a capture is neutralised. A 0.8B model can still be misled by a page, so treat answers about a screen as a reading aid.
- Captured text, the conversation, and the bubble's history are cleared when the assistant is turned off. **Settings → Floating AI Assistant → Clear temporary screen context** clears the captured text at any time.
- No wakelock is held.

## Android permissions added

| Permission | Why |
| --- | --- |
| `SYSTEM_ALERT_WINDOW` | Draw the bubble and chat window over other apps. Granted by the user in system settings. |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE` | Keep the bubble alive while it is turned on. |
| `FOREGROUND_SERVICE_MEDIA_PROJECTION` | Required by Android 14+ for the moment a user-approved capture runs. |
| `POST_NOTIFICATIONS` | Show the "assistant is on" notification with its **Turn off** action (Android 13+). The bubble works without it. |
| `RECORD_AUDIO`, `FOREGROUND_SERVICE_MICROPHONE` | Voice input in the chat window, recognised on the device. Optional: declined, the chat still takes typing. |

Google Play requires a declaration for `specialUse` foreground services and for `SYSTEM_ALERT_WINDOW`; that has not been prepared.

## Files

| Path | Purpose |
| --- | --- |
| `modules/floating-assistant/` | Local Expo module (Kotlin), picked up by autolinking. No config plugin and no edits to `android/`. |
| `src/infrastructure/floating-assistant/native.ts` | Typed access to the module; `null` on web, iOS, and builds made before it existed. |
| `src/shared/services/floating-assistant/` | `prompts.ts`, `session.ts`, `conversation.ts`: no React or native imports, covered by tests. |
| `src/shared/providers/floating-assistant-provider.tsx` | Connects the overlay to `ModelProvider`. |
| `src/shared/stores/floating-assistant-store.ts` | The on/off setting (AsyncStorage). |
| `src/shared/lib/speech.ts` | The recognition language tag, shared by the in-app chat and the overlay. |
| `src/features/floating-assistant/` and `src/app/floating-assistant.tsx` | The settings screen. |

Because the module contains native code, it needs a new native build (`expo run:android` or a Gradle build). An older installed build shows "Not available here" on the settings screen and is otherwise unaffected.

## What has been verified (2026-10-10)

Automated, on the desktop: `bun test tests` (141 pass, 38 of them for this feature: prompts, screen-text handling, session, conversation flow, and checks of the module's manifest and sources), `bunx tsc --noEmit`, `bunx expo lint`.

Builds: debug and release APKs for x86_64, with the model bundled.

On an Android 17 emulator (API 37, x86_64), development build:

| Checked | Result |
| --- | --- |
| Settings row and the rest of Settings | Row shows Off/On; nothing else on the screen changed |
| Permission declined | Message shown, assistant stays off, no service started |
| Permission allowed in Android's screen | "Floating Assistant Enabled"; foreground service running as `specialUse`; notification permission requested |
| Bubble and chat window | Bubble shows the Seekora assistant; tap opens the chat with greeting, quick actions, input |
| Question answered by the existing model | Streamed into the chat: 76 prompt tokens at 26.7 tokens/s, 57 tokens at 10.4 tokens/s, 8.4 s in total |
| Send from the button and from the keyboard's Send key | Both work |
| Model status line | Not loaded → loading → thinking → ready |
| Minimise | Returns to the bubble |
| Reopening Seekora with the setting on | Service and bubble start again by themselves |
| Chat over another app, and one screen capture | Done by hand over YouTube: consent accepted, "Screen text attached · 9 lines"; afterwards the capture service was gone and `dumpsys media_projection` reported no session |
| Existing screens | Home, Settings and the Model screen (including "Verify and load model") behave as before |

**Not yet exercised:** voice input (the microphone button, a device without an offline voice model, and a run with `RECORD_AUDIO` declined), dragging and edge snapping, the remembered position, the long-press menu, stopping an answer midway, declining Android's capture prompt, a `FLAG_SECURE` screen, rotation, dark mode, layout with the on-screen keyboard (the emulator used a hardware keyboard), turning off from the notification / the ✕ / the settings screen, revoking the permission while running, memory pressure, the Filipino overlay text, TalkBack, a release build at run time, and any physical phone.

## Testing on a phone

1. Install a build made from this branch and open Seekora. Set up the model if it is not installed.
2. **Settings → Floating AI Assistant → Enable Floating Assistant.** Android opens "Display over other apps".
   - Go back without allowing: the screen says the permission was not granted and the assistant stays off.
   - Allow it for Seekora and go back: "Floating Assistant Enabled" appears with the bubble.
3. Drag the bubble; release it and it snaps to the nearest edge. Close and reopen Seekora: it returns to the same place.
4. Long-press the bubble: **Open Seekora AI**, **Move to left/right**, **Turn off**.
5. Press Home, open another app, tap the bubble, and ask a question. The first answer after a fresh start includes the model load.
   - Tap the microphone and speak: the words appear in the input field as you talk, and the icon turns red while it listens. Tap it again, or stop talking, then send.
6. Tap the stop button while an answer is being written.
7. Tap **Analyze current screen → Continue**, then decline Android's prompt: the chat says nothing was read.
8. Repeat and accept: the chat shows "Screen text attached". Ask about the page. Tap **Discard**.
9. Try it over a screen that blocks capture (a banking app's login, or an incognito browser tab): the chat reports no readable text.
10. Rotate the phone with the chat open; switch dark mode; open the keyboard and check the input row stays visible.
11. Turn it off from the notification, from the chat's ✕, and from the settings screen. Each removes the bubble and the notification.
12. In Android settings, revoke "Display over other apps" while the bubble is showing, then return to Seekora: the setting shows Off.
13. Check that Search, Library, the AI tab and the Model screen behave as before, with the assistant both on and off.
