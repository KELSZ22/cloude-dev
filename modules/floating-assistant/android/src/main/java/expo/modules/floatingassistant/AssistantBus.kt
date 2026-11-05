package expo.modules.floatingassistant

import android.os.Handler
import android.os.Looper

/** What one user-approved screen capture produced. The image itself is never kept. */
data class CaptureResult(
  /** "ok", "empty" (nothing readable), "denied" (user cancelled) or "failed". */
  val status: String,
  val captureId: String,
  val capturedAt: Long,
  val text: String,
  val blocks: Int,
  val lines: Int,
  /** What the user asked for when starting the capture, such as "explain". */
  val action: String?
) {
  fun toPayload(): Map<String, Any?> = mapOf(
    "status" to status, "captureId" to captureId, "capturedAt" to capturedAt.toDouble(),
    "text" to text, "blocks" to blocks, "lines" to lines, "action" to action
  )
}

/**
 * Connects the overlay (a Service on the main thread) with the JavaScript side (the Expo module).
 * Both live in the app's process, so this is a plain in-memory hand-off.
 */
internal object AssistantBus {
  interface Bridge {
    fun emit(event: String, payload: Map<String, Any?>)
  }

  interface Ui {
    fun beginReply(id: String)
    fun appendReply(id: String, chunk: String)
    fun endReply(id: String, text: String, isError: Boolean)
    fun showNotice(text: String)
    fun submitUserMessage(text: String)
    fun setModelStatus(status: String)
    fun setScreenAttached(attached: Boolean, summary: String?)
    fun resetBubblePosition()
    fun applyStrings()
    /** The picture is taken; the overlay may come back while the text is still being read. */
    fun onCaptureTaken()
    fun onCaptureFinished(result: CaptureResult)
    /** Screen reading was turned on or off. */
    fun onScreenSessionChanged()
  }

  private val main = Handler(Looper.getMainLooper())

  /** Null when the app's JavaScript runtime is not running. */
  @Volatile var bridge: Bridge? = null
  @Volatile var ui: Ui? = null
  @Volatile var strings: AssistantStrings = AssistantStrings()
  @Volatile var modelStatus: String = "unavailable"
  /** Set while a capture is in flight, so its result can say what the user wanted done with it. */
  @Volatile var pendingCaptureAction: String? = null
  /** Set once Android's consent dialog is up, so the overlay knows the launch was not refused. */
  @Volatile var consentShown: Boolean = false

  /** Returns false when nothing is listening, so the overlay can tell the user to reopen Seekora. */
  fun toJs(event: String, payload: Map<String, Any?> = emptyMap()): Boolean {
    val target = bridge ?: return false
    return try {
      target.emit(event, payload)
      true
    } catch (_: Throwable) {
      false
    }
  }

  fun onUi(action: (Ui) -> Unit) {
    main.post { ui?.let(action) }
  }

  fun captureTaken() {
    main.post { ui?.onCaptureTaken() }
  }

  fun screenSessionChanged() {
    main.post { ui?.onScreenSessionChanged() }
  }

  fun captureFinished(result: CaptureResult) {
    pendingCaptureAction = null
    main.post { ui?.onCaptureFinished(result) }
    toJs("onScreenCaptured", result.toPayload())
  }
}
