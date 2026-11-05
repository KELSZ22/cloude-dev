package expo.modules.floatingassistant

/**
 * Text shown by the overlay. The app passes its translated strings when it starts the assistant;
 * these English defaults apply only if a key is missing.
 */
internal class AssistantStrings(private val values: Map<String, String> = emptyMap()) {
  private fun text(key: String, fallback: String) = values[key]?.takeIf { it.isNotBlank() } ?: fallback

  val title get() = text("title", "Seekora AI")
  val bubbleLabel get() = text("bubbleLabel", "Open Seekora assistant")
  val greeting get() = text("greeting", "Hi! I'm Seekora.\nWhat can I help you understand?")
  val placeholder get() = text("placeholder", "Ask anything...")
  val send get() = text("send", "Send")
  val stop get() = text("stop", "Stop")
  val minimize get() = text("minimize", "Minimize")
  val close get() = text("close", "Turn off floating assistant")
  val actionAsk get() = text("actionAsk", "Ask a question")
  val actionAnalyze get() = text("actionAnalyze", "Let Seekora read my screen")
  val actionExplain get() = text("actionExplain", "Explain this page")
  val actionSummarize get() = text("actionSummarize", "Summarize content")
  val statusReady get() = text("statusReady", "Offline model ready")
  val statusLoading get() = text("statusLoading", "Loading model...")
  val statusBusy get() = text("statusBusy", "Thinking...")
  val statusNotLoaded get() = text("statusNotLoaded", "Model loads on your first question")
  val statusMissing get() = text("statusMissing", "Model not set up")
  val statusUnavailable get() = text("statusUnavailable", "Seekora is closed")
  val appClosed get() = text("appClosed", "Seekora is not running, so the assistant cannot answer. Open Seekora, then come back.")
  val openApp get() = text("openApp", "Open Seekora")
  val captureTitle get() = text("captureTitle", "Let Seekora read your screen?")
  val captureBody get() = text(
    "captureBody",
    "While the bubble is on, Seekora reads the words on your screen each time you open it, so you can ask about any app. " +
      "Text is read on this device, pictures are discarded, and nothing is uploaded. Android will ask you to confirm once. " +
      "Stop anytime from the bubble's menu."
  )
  val voiceStart get() = text("voiceStart", "Ask by voice")
  val voiceStop get() = text("voiceStop", "Stop listening")
  val voiceListening get() = text("voiceListening", "Listening...")
  val voiceDenied get() = text("voiceDenied", "Microphone access is off. Turn it on for Seekora, then turn the assistant off and on again.")
  val voiceUnavailable get() = text("voiceUnavailable", "This device has no on-device speech recognition, so voice input is unavailable.")
  val voiceOffline get() = text("voiceOffline", "Voice input needs the offline language pack. Install it from Seekora, then try again.")
  val voiceNoMatch get() = text("voiceNoMatch", "Nothing was heard. Tap the microphone and try again.")
  val voiceFailed get() = text("voiceFailed", "Voice input stopped unexpectedly. Tap the microphone to try again.")
  /** BCP-47 tag for recognition, such as "en-US". Set from the app's language, not translated. */
  val voiceLang get() = text("voiceLang", "en-US")
  val captureContinue get() = text("captureContinue", "Continue")
  val captureCancel get() = text("captureCancel", "Cancel")
  val capturing get() = text("capturing", "Reading the screen...")
  val screenAttached get() = text("screenAttached", "Screen text attached")
  val discard get() = text("discard", "Discard")
  val menuOpen get() = text("menuOpen", "Open Seekora AI")
  val menuReadScreen get() = text("menuReadScreen", "Read my screen")
  val menuStopReading get() = text("menuStopReading", "Stop reading screen")
  val menuClose get() = text("menuClose", "Turn off")
  val notificationChannel get() = text("notificationChannel", "Floating assistant")
  val notificationTitle get() = text("notificationTitle", "Seekora floating assistant is on")
  val notificationText get() = text("notificationText", "Tap the bubble to ask a question. It reads your screen only after you allow it.")
  val notificationStop get() = text("notificationStop", "Turn off")
  val captureNotificationTitle get() = text("captureNotificationTitle", "Seekora can read your screen")
  val captureNotificationText get() = text(
    "captureNotificationText",
    "Words on screen are read on this device when you open the bubble. Stop it from the bubble's menu."
  )
}
