package expo.modules.floatingassistant

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings

/** "Display over other apps". Only the user can grant it, in system settings. */
internal object OverlayPermission {
  fun granted(context: Context): Boolean = Settings.canDrawOverlays(context)

  /** Opens the system screen for this app. Falls back to the general list where the per-app page is missing. */
  fun openSettings(context: Context) {
    val perApp = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(perApp)
    } catch (_: Exception) {
      context.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }
}
