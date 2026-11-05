package expo.modules.floatingassistant

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionConfig
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import java.util.UUID

/**
 * Invisible activity whose only job is to show Android's own "start recording or casting?" dialog.
 * A service cannot receive that dialog's answer. One answer starts a session that lasts while the
 * bubble is on.
 */
class ScreenCaptureActivity : Activity() {
  private companion object {
    const val REQUEST_CAPTURE = 9041
    const val STATE_ASKED = "asked"
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    AssistantBus.consentShown = true
    if (savedInstanceState?.getBoolean(STATE_ASKED) == true) return
    val manager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    try {
      // The whole screen, not one app: the user asks about whatever app is under the bubble.
      val consent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        manager.createScreenCaptureIntent(MediaProjectionConfig.createConfigForDefaultDisplay())
      } else manager.createScreenCaptureIntent()
      @Suppress("DEPRECATION")
      startActivityForResult(consent, REQUEST_CAPTURE)
    } catch (_: Exception) {
      finishWith("failed")
    }
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    outState.putBoolean(STATE_ASKED, true)
  }

  @Deprecated("The activity-result API needs androidx; this activity deliberately has no dependencies.")
  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    if (requestCode != REQUEST_CAPTURE) return
    if (resultCode != RESULT_OK || data == null) {
      finishWith("denied")
      return
    }
    // Android 14 and later require a media-projection foreground service to be running before the
    // approval can be used, so the session lives in that service.
    val intent = Intent(this, ScreenCaptureService::class.java)
      .putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, resultCode)
      .putExtra(ScreenCaptureService.EXTRA_RESULT_DATA, data)
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(intent) else startService(intent)
      close()
    } catch (_: Exception) {
      finishWith("failed")
    }
  }

  private fun finishWith(status: String) {
    AssistantBus.captureFinished(
      CaptureResult(status, UUID.randomUUID().toString(), System.currentTimeMillis(), "", 0, 0, AssistantBus.pendingCaptureAction)
    )
    close()
  }

  private fun close() {
    finish()
    @Suppress("DEPRECATION")
    overridePendingTransition(0, 0)
  }
}
