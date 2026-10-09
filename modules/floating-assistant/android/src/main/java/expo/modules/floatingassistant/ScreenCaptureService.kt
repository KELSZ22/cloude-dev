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
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.util.UUID

/**
 * Takes exactly one picture of the screen after the user approved it, reads the text in it on the
 * device, and stops. The picture stays in memory, is never written to storage or logged, and is
 * released as soon as the text has been read.
 */
class ScreenCaptureService : Service() {
  companion object {
    const val EXTRA_RESULT_CODE = "resultCode"
    const val EXTRA_RESULT_DATA = "resultData"
    private const val CHANNEL = "seekora_screen_capture"
    private const val NOTIFICATION_ID = 4712
    /** Lets Android's consent dialog and this app's own windows leave the screen first. */
    private const val SETTLE_MS = 500L
    private const val RETRY_MS = 150L
    private const val TIMEOUT_MS = 6000L
  }

  private val main = Handler(Looper.getMainLooper())
  private var projection: MediaProjection? = null
  private var display: VirtualDisplay? = null
  private var reader: ImageReader? = null
  private var finished = false
  private val captureId = UUID.randomUUID().toString()

  private val projectionCallback = object : MediaProjection.Callback() {
    override fun onStop() {
      // The user or the system ended the session before a picture was taken.
      finish("failed", "", 0, 0)
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
    if (resultCode != Activity.RESULT_OK || data == null) {
      finish("denied", "", 0, 0)
      return START_NOT_STICKY
    }
    main.postDelayed({ beginCapture(resultCode, data) }, SETTLE_MS)
    main.postDelayed({ finish("failed", "", 0, 0) }, TIMEOUT_MS)
    return START_NOT_STICKY
  }

  private fun beginCapture(resultCode: Int, data: Intent) {
    if (finished) return
    try {
      val manager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
      val session = manager.getMediaProjection(resultCode, data)
      if (session == null) {
        finish("failed", "", 0, 0)
        return
      }
      projection = session
      session.registerCallback(projectionCallback, main)

      val size = Point()
      val windows = getSystemService(Context.WINDOW_SERVICE) as WindowManager
      @Suppress("DEPRECATION") windows.defaultDisplay.getRealSize(size)
      val imageReader = ImageReader.newInstance(size.x, size.y, PixelFormat.RGBA_8888, 2)
      reader = imageReader
      display = session.createVirtualDisplay(
        "seekora-screen-analysis", size.x, size.y, resources.displayMetrics.densityDpi,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, imageReader.surface, null, main
      )
      main.postDelayed({ grabFrame(imageReader) }, SETTLE_MS)
    } catch (_: Exception) {
      finish("failed", "", 0, 0)
    }
  }

  /** The first frame can arrive a moment after the display is created, so poll briefly. */
  private fun grabFrame(imageReader: ImageReader) {
    if (finished) return
    val image = try { imageReader.acquireLatestImage() } catch (_: Exception) { null }
    if (image == null) {
      main.postDelayed({ grabFrame(imageReader) }, RETRY_MS)
      return
    }
    val bitmap = try { toBitmap(image) } catch (_: Exception) { null } finally { image.close() }
    // The capture is done: release the screen immediately, before the slower text recognition.
    releaseProjection()
    if (bitmap == null) finish("failed", "", 0, 0) else readText(bitmap)
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
    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    recognizer.process(InputImage.fromBitmap(bitmap, 0))
      .addOnSuccessListener { result ->
        // Reading order: top to bottom, then left to right.
        val blocks = result.textBlocks.sortedWith(compareBy({ it.boundingBox?.top ?: 0 }, { it.boundingBox?.left ?: 0 }))
        val text = blocks.joinToString("\n\n") { block -> block.lines.joinToString("\n") { it.text } }.trim()
        val lines = blocks.sumOf { it.lines.size }
        finish(if (text.isEmpty()) "empty" else "ok", text, blocks.size, lines)
      }
      .addOnFailureListener { finish("failed", "", 0, 0) }
      .addOnCompleteListener {
        bitmap.recycle()
        recognizer.close()
      }
  }

  private fun releaseProjection() {
    try { display?.release() } catch (_: Exception) {}
    display = null
    try { reader?.close() } catch (_: Exception) {}
    reader = null
    projection?.let {
      try { it.unregisterCallback(projectionCallback) } catch (_: Exception) {}
      try { it.stop() } catch (_: Exception) {}
    }
    projection = null
  }

  private fun finish(status: String, text: String, blocks: Int, lines: Int) {
    if (finished) return
    finished = true
    main.removeCallbacksAndMessages(null)
    releaseProjection()
    AssistantBus.captureFinished(
      CaptureResult(status, captureId, System.currentTimeMillis(), text, blocks, lines, AssistantBus.pendingCaptureAction)
    )
    stopSelf()
  }

  override fun onDestroy() {
    main.removeCallbacksAndMessages(null)
    releaseProjection()
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
      .setOngoing(true)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }
}
