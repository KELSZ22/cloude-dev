package expo.modules.floatingassistant

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JavaScript entry point for the floating assistant. It starts and stops the overlay service and
 * relays chat text both ways. The model itself stays in the app's existing JavaScript engine.
 */
class FloatingAssistantModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val bridge = object : AssistantBus.Bridge {
    override fun emit(event: String, payload: Map<String, Any?>) {
      sendEvent(event, payload)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("SeekoraFloatingAssistant")

    Events("onUserMessage", "onScreenCaptured", "onCancelRequested", "onClearContext", "onOverlayState", "onMemoryPressure")

    OnCreate {
      AssistantBus.bridge = bridge
    }

    OnDestroy {
      if (AssistantBus.bridge === bridge) AssistantBus.bridge = null
      AssistantBus.modelStatus = "unavailable"
      AssistantBus.onUi { it.setModelStatus("unavailable") }
    }

    Function("canDrawOverlays") {
      OverlayPermission.granted(context)
    }

    Function("openOverlaySettings") {
      OverlayPermission.openSettings(context)
    }

    Function("notificationsEnabled") {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.areNotificationsEnabled()
    }

    Function("isRunning") {
      FloatingAssistantService.running
    }

    /** Returns false, without starting anything, when the overlay permission is missing. */
    Function("start") { strings: Map<String, String> ->
      AssistantBus.strings = AssistantStrings(strings)
      if (!OverlayPermission.granted(context)) return@Function false
      if (FloatingAssistantService.running) {
        AssistantBus.onUi { it.applyStrings() }
        return@Function true
      }
      val intent = Intent(context, FloatingAssistantService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
      true
    }

    Function("stop") {
      context.stopService(Intent(context, FloatingAssistantService::class.java))
    }

    Function("resetBubblePosition") {
      BubblePosition.clear(context)
      AssistantBus.onUi { it.resetBubblePosition() }
    }

    Function("setModelStatus") { status: String ->
      AssistantBus.modelStatus = status
      AssistantBus.onUi { it.setModelStatus(status) }
    }

    Function("beginReply") { id: String ->
      AssistantBus.onUi { it.beginReply(id) }
    }

    Function("appendReply") { id: String, chunk: String ->
      AssistantBus.onUi { it.appendReply(id, chunk) }
    }

    Function("endReply") { id: String, text: String, isError: Boolean ->
      AssistantBus.onUi { it.endReply(id, text, isError) }
    }

    Function("showNotice") { text: String ->
      AssistantBus.onUi { it.showNotice(text) }
    }

    Function("submitUserMessage") { text: String ->
      AssistantBus.onUi { it.submitUserMessage(text) }
    }

    Function("setScreenAttached") { attached: Boolean, summary: String? ->
      AssistantBus.onUi { it.setScreenAttached(attached, summary) }
    }
  }
}
