package expo.modules.floatingassistant

import android.content.Context
import android.graphics.Color

/** Colours taken from the app's theme tokens (src/shared/constants/theme.ts), for light and dark mode. */
internal class Palette(night: Boolean) {
  val text: Int = Color.parseColor(if (night) "#FFFFFF" else "#111827")
  val textSecondary: Int = Color.parseColor(if (night) "#A7B5C6" else "#64748B")
  val surface: Int = Color.parseColor(if (night) "#162638" else "#FFFFFF")
  val surfaceSelected: Int = Color.parseColor(if (night) "#193C35" else "#E4F5EE")
  val tint: Int = Color.parseColor(if (night) "#34D399" else "#047857")
  val onTint: Int = Color.parseColor(if (night) "#0D1B2A" else "#FFFFFF")
  val border: Int = Color.parseColor(if (night) "#304257" else "#E2E8F0")
  val error: Int = Color.parseColor(if (night) "#F87171" else "#DC2626")
}

/** Where the user left the bubble: which edge, and how far down as a fraction, so it survives rotation. */
internal object BubblePosition {
  private const val PREFS = "seekora_floating_assistant"

  data class Saved(val onRight: Boolean, val yFraction: Float)

  fun load(context: Context): Saved {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return Saved(prefs.getBoolean("onRight", true), prefs.getFloat("yFraction", 0.35f))
  }

  fun save(context: Context, value: Saved) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putBoolean("onRight", value.onRight).putFloat("yFraction", value.yFraction).apply()
  }

  fun clear(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
  }
}
