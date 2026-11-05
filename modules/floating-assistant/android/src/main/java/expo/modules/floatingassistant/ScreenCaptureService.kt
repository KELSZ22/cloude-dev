package expo.modules.floatingassistant

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.graphics.Point
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.WindowManager
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.util.UUID

/**
 * A screen-reading session the user approved once. While the bubble is on, each capture takes one
 * picture of the screen, reads its text on the device and drops the picture. Pictures are never
 * written to storage or logged. Between captures the virtual display has no surface, so nothing is
 * rendered. The session ends when the bubble is turned off, the user stops it, or Android ends it
 * (for example when the screen locks).
 */
class ScreenCaptureService : Service() {
  companion object {
    const val EXTRA_RESULT_CODE = "resultCode"
    const val EXTRA_RESULT_DATA = "resultData"
    private const val CHANNEL = "seekora_screen_capture"
    private const val NOTIFICATION_ID = 4712
    /** Lets Android's consent dialog leave the screen before the first capture. */
    private const val CONSENT_SETTLE_MS = 500L
    /** Lets this app's own windows leave the screen before a picture is taken. */
    private const val SETTLE_MS = 250L
    private const val RETRY_MS = 100L
    private const val TIMEOUT_MS = 6000L

    @Volatile private var active: ScreenCaptureService? = null

    /** True while the user's approval is still valid, so a capture needs no new consent. */
    val sessionActive: Boolean get() = active != null

    /** Starts a capture in the running session. Returns false when there is no session. */
    fun capture(action: String?): Boolean = active?.startCapture(action) ?: false

    fun stop(context: Context) {
      context.stopService(Intent(context, ScreenCaptureService::class.java))
    }
  }

  private val main = Handler(Looper.getMainLooper())
  private var projection: MediaProjection? = null
  private var display: VirtualDisplay? = null
  private var reader: ImageReader? = null
  private var recognizer: TextRecognizer? = null
  private var width = 0
  private var height = 0
  /** The newest frame since the surface was attached. Only one is held, and only during a capture. */
  private var latest: Image? = null

  private var capturing = false
  private var captureId = ""
  private var captureAction: String? = null
  private var deadline = 0L

  private val projectionCallback = object : MediaProjection.Callback() {
    override fun onStop() {
      // The user stopped sharing, or Android ended the session.
      endSession()
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    showForegroundNotification()
    val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED) ?: Activity.RESULT_CANCELED
    val data: Intent? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent?.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
    } else {
      @Suppress("DEPRECATION") intent?.getParcelableExtra(EXTRA_RESULT_DATA)
    }
    val action = AssistantBus.pendingCaptureAction
    if (projection != null) {
      // Already running: an approval cannot be reused, so take the picture with the session we have.
      startCapture(action)
      return START_NOT_STICKY
    }
    if (resultCode != Activity.RESULT_OK || data == null) {
      report("denied", "", 0, 0, UUID.randomUUID().toString(), action)
      stopSelf()
      return START_NOT_STICKY
    }
    main.postDelayed({
      if (beginSession(resultCode, data)) startCapture(action)
      else {
        report("failed", "", 0, 0, UUID.randomUUID().toString(), action)
        stopSelf()
      }
    }, CONSENT_SETTLE_MS)
    return START_NOT_STICKY
  }

  private fun beginSession(resultCode: Int, data: Intent): Boolean {
    return try {
      val manager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
      val session = manager.getMediaProjection(resultCode, data) ?: return false
      projection = session
      session.registerCallback(projectionCallback, main)
      val (w, h) = screenSize()
      width = w; height = h
      val imageReader = newReader(w, h)
      reader = imageReader
      // Created once: Android 14 and later allow a single virtual display per approval. It starts
      // with the reader attached, because a new display is always drawn once, so the first capture
      // gets a frame even when nothing on the screen moves.
      display = session.createVirtualDisplay(
        "seekora-screen-analysis", w, h, resources.displayMetrics.densityDpi,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, imageReader.surface, null, main
      )
      recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      active = this
      true
    } catch (_: Exception) {
      releaseSession()
      false
    }
  }

  private fun screenSize(): Pair<Int, Int> {
    val size = Point()
    val windows = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    @Suppress("DEPRECATION") windows.defaultDisplay.getRealSize(size)
    return size.x to size.y
  }

  private fun newReader(w: Int, h: Int): ImageReader =
    ImageReader.newInstance(w, h, PixelFormat.RGBA_8888, 3).apply {
      setOnImageAvailableListener({ source ->
        val image = try { source.acquireLatestImage() } catch (_: Exception) { null }
        if (image == null) return@setOnImageAvailableListener
        latest?.close()
        latest = image
      }, main)
    }

  private fun startCapture(action: String?): Boolean {
    val virtual = display ?: return false
    if (capturing) return true
    capturing = true
    captureId = UUID.randomUUID().toString()
    captureAction = action
    deadline = System.currentTimeMillis() + TIMEOUT_MS
    try {
      // The screen may have rotated since the last capture.
      val (w, h) = screenSize()
      if (w != width || h != height) {
        width = w; height = h
        virtual.surface = null
        reader?.close()
        reader = newReader(w, h)
        virtual.resize(w, h, resources.displayMetrics.densityDpi)
      }
      // Attaching the surface makes Android draw the screen into it; the overlay leaving the
      // screen at the same moment guarantees a fresh frame even when nothing else moves.
      virtual.surface = reader?.surface
    } catch (_: Exception) {
      finishCapture("failed", "", 0, 0)
      return true
    }
    main.postDelayed(::grabFrame, SETTLE_MS)
    return true
  }

  private fun grabFrame() {
    if (!capturing) return
    val image = latest
    if (image == null) {
      if (System.currentTimeMillis() > deadline) finishCapture("failed", "", 0, 0)
      else main.postDelayed(::grabFrame, RETRY_MS)
      return
    }
    latest = null
    val bitmap = try { toBitmap(image) } catch (_: Exception) { null } finally { image.close() }
    // Stop drawing into the reader straight away, before the slower text recognition.
    detachSurface()
    AssistantBus.captureTaken()
    if (bitmap == null) finishCapture("failed", "", 0, 0) else readText(bitmap)
  }

  private fun detachSurface() {
    try { display?.surface = null } catch (_: Exception) {}
    latest?.close()
    latest = null
  }

  private fun toBitmap(image: Image): Bitmap {
    val plane = image.planes[0]
    val rowPadding = plane.rowStride - plane.pixelStride * image.width
    val padded = Bitmap.createBitmap(image.width + rowPadding / plane.pixelStride, image.height, Bitmap.Config.ARGB_8888)
    padded.copyPixelsFromBuffer(plane.buffer)
    if (rowPadding == 0) return padded
    val exact = Bitmap.createBitmap(padded, 0, 0, image.width, image.height)
    padded.recycle()
    return exact
  }

  private fun readText(bitmap: Bitmap) {
    val client = recognizer
    if (client == null) {
      bitmap.recycle()
      finishCapture("failed", "", 0, 0)
      return
    }
    client.process(InputImage.fromBitmap(bitmap, 0))
      .addOnSuccessListener { result ->
        // Reading order: top to bottom, then left to right.
        val blocks = result.textBlocks.sortedWith(compareBy({ it.boundingBox?.top ?: 0 }, { it.boundingBox?.left ?: 0 }))
        val text = blocks.joinToString("\n\n") { block -> block.lines.joinToString("\n") { it.text } }.trim()
        val lines = blocks.sumOf { it.lines.size }
        finishCapture(if (text.isEmpty()) "empty" else "ok", text, blocks.size, lines)
      }
      .addOnFailureListener { finishCapture("failed", "", 0, 0) }
      .addOnCompleteListener { bitmap.recycle() }
  }

  private fun finishCapture(status: String, text: String, blocks: Int, lines: Int) {
    if (!capturing) return
    capturing = false
    main.removeCallbacksAndMessages(null)
    detachSurface()
    report(status, text, blocks, lines, captureId, captureAction)
  }

  private fun report(status: String, text: String, blocks: Int, lines: Int, id: String, action: String?) {
    AssistantBus.captureFinished(CaptureResult(status, id, System.currentTimeMillis(), text, blocks, lines, action))
  }

  private fun endSession() {
    finishCapture("failed", "", 0, 0)
    releaseSession()
    stopSelf()
  }

  private fun releaseSession() {
    if (active === this) active = null
    main.removeCallbacksAndMessages(null)
    latest?.close()
    latest = null
    try { display?.release() } catch (_: Exception) {}
    display = null
    try { reader?.close() } catch (_: Exception) {}
    reader = null
    try { recognizer?.close() } catch (_: Exception) {}
    recognizer = null
    projection?.let {
      try { it.unregisterCallback(projectionCallback) } catch (_: Exception) {}
      try { it.stop() } catch (_: Exception) {}
    }
    projection = null
    AssistantBus.screenSessionChanged()
  }

  override fun onDestroy() {
    finishCapture("failed", "", 0, 0)
    releaseSession()
    super.onDestroy()
  }

  private fun showForegroundNotification() {
    val strings = AssistantBus.strings
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(NotificationChannel(CHANNEL, strings.captureNotificationTitle, NotificationManager.IMPORTANCE_LOW))
    }
    @Suppress("DEPRECATION")
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL) else Notification.Builder(this)
    val notification = builder
      .setSmallIcon(R.drawable.seekora_ic_scan)
      .setContentTitle(strings.captureNotificationTitle)
      .setContentText(strings.captureNotificationText)
      .setStyle(Notification.BigTextStyle().bigText(strings.captureNotificationText))
      .setOngoing(true)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }
}
