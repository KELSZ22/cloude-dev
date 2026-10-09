package expo.modules.floatingassistant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ComponentCallbacks2
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.content.res.Configuration
import android.graphics.drawable.Icon
import android.os.Build
import android.os.IBinder

/**
 * Keeps the floating bubble on screen while the user has the assistant turned on.
 * It draws the overlay and nothing else: it never captures the screen and never runs the model.
 */
class FloatingAssistantService : Service() {
  companion object {
    const val ACTION_STOP = "expo.modules.floatingassistant.STOP"
    private const val CHANNEL = "seekora_floating_assistant"
    private const val NOTIFICATION_ID = 4711

    @Volatile
    var running = false
      private set
  }

  private var controller: OverlayController? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    running = true
    showForegroundNotification()
    // The permission can be revoked at any time; without it there is nothing this service may draw.
    if (!OverlayPermission.granted(this)) {
      shutDown("permission")
      return
    }
    try {
      val created = OverlayController(this) { reason -> shutDown(reason) }
      created.show()
      controller = created
      AssistantBus.ui = created
      AssistantBus.toJs("onOverlayState", mapOf("running" to true, "reason" to "started"))
    } catch (_: Exception) {
      shutDown("overlay-failed")
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) shutDown("user")
    // Not restarted automatically if Android stops it; the app starts it again when next opened.
    return START_NOT_STICKY
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    controller?.onConfigurationChanged()
  }

  override fun onLowMemory() {
    super.onLowMemory()
    AssistantBus.toJs("onMemoryPressure")
  }

  override fun onTrimMemory(level: Int) {
    super.onTrimMemory(level)
    if (level == ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL || level >= ComponentCallbacks2.TRIM_MEMORY_COMPLETE) {
      AssistantBus.toJs("onMemoryPressure")
    }
  }

  override fun onDestroy() {
    running = false
    val current = controller
    controller = null
    current?.destroy()
    if (AssistantBus.ui === current) AssistantBus.ui = null
    AssistantBus.toJs("onOverlayState", mapOf("running" to false, "reason" to stopReason))
    super.onDestroy()
  }

  private var stopReason = "system"

  private fun shutDown(reason: String) {
    stopReason = reason
    stopSelf()
  }

  private fun showForegroundNotification() {
    val strings = AssistantBus.strings
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL, strings.notificationChannel, NotificationManager.IMPORTANCE_LOW).apply { setShowBadge(false) }
      )
    }
    val immutable = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    val stop = PendingIntent.getService(this, 0, Intent(this, FloatingAssistantService::class.java).setAction(ACTION_STOP), immutable)
    val open = packageManager.getLaunchIntentForPackage(packageName)?.let { PendingIntent.getActivity(this, 1, it, immutable) }

    @Suppress("DEPRECATION")
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL) else Notification.Builder(this)
    val notification = builder
      .setSmallIcon(R.drawable.seekora_ic_assistant)
      .setContentTitle(strings.notificationTitle)
      .setContentText(strings.notificationText)
      .setStyle(Notification.BigTextStyle().bigText(strings.notificationText))
      .setOngoing(true)
      .setContentIntent(open)
      .addAction(Notification.Action.Builder(null as Icon?, strings.notificationStop, stop).build())
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }
}
