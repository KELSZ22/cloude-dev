package expo.modules.floatingassistant

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer

/**
 * Turns speech into text for the chat window's input field.
 *
 * Only Android's on-device recogniser is used, so the audio is never sent anywhere. A phone
 * without an offline voice model gets a plain explanation instead of a network fallback.
 *
 * Every method must be called on the main thread, which is where the overlay runs.
 */
internal class VoiceInput(
  private val context: Context,
  private val onPartial: (String) -> Unit,
  private val onFinal: (String) -> Unit,
  private val onListening: (Boolean) -> Unit,
  private val onProblem: (String) -> Unit
) {
  companion object {
    fun micGranted(context: Context) =
      context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

    /** On-device recognition arrived in Android 12. Below that, voice input stays off. */
    fun available(context: Context) =
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
  }

  private val strings get() = AssistantBus.strings
  private var recognizer: SpeechRecognizer? = null
  private var listening = false

  val isListening get() = listening

  fun toggle(lang: String) = if (listening) stop() else start(lang)

  private fun start(lang: String) {
    if (!micGranted(context)) return onProblem(strings.voiceDenied)
    if (!available(context)) return onProblem(strings.voiceUnavailable)
    val engine = recognizer ?: create() ?: return onProblem(strings.voiceUnavailable)
    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
      putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
      putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
      putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
      putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
      putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
    }
    listening = true
    onListening(true)
    try {
      engine.startListening(intent)
    } catch (_: Exception) {
      setIdle()
      onProblem(strings.voiceFailed)
    }
  }

  fun stop() {
    if (!listening) return
    try {
      recognizer?.stopListening()
    } catch (_: Exception) {
      setIdle()
    }
  }

  /** Drops anything in flight without reporting it, for when the window closes. */
  fun cancel() {
    if (listening) runCatching { recognizer?.cancel() }
    setIdle()
  }

  fun destroy() {
    runCatching { recognizer?.destroy() }
    recognizer = null
    setIdle()
  }

  private fun create(): SpeechRecognizer? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return null
    return try {
      SpeechRecognizer.createOnDeviceSpeechRecognizer(context).also {
        it.setRecognitionListener(listener)
        recognizer = it
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun setIdle() {
    if (!listening) return
    listening = false
    onListening(false)
  }

  private fun best(bundle: Bundle?) = bundle
    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
    ?.firstOrNull()
    ?.takeIf { it.isNotBlank() }

  private val listener = object : RecognitionListener {
    override fun onReadyForSpeech(params: Bundle?) = Unit
    override fun onBeginningOfSpeech() = Unit
    override fun onRmsChanged(rmsdB: Float) = Unit
    override fun onBufferReceived(buffer: ByteArray?) = Unit
    override fun onEndOfSpeech() = Unit
    override fun onEvent(eventType: Int, params: Bundle?) = Unit

    override fun onPartialResults(partialResults: Bundle?) {
      best(partialResults)?.let(onPartial)
    }

    override fun onResults(results: Bundle?) {
      best(results)?.let(onFinal)
      setIdle()
    }

    override fun onError(error: Int) {
      val message = when (error) {
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> strings.voiceDenied
        SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> strings.voiceNoMatch
        SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE, SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED -> strings.voiceOffline
        // Reported when a cancel or a second tap races the recogniser. The mic turning off says enough.
        SpeechRecognizer.ERROR_CLIENT, SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> null
        else -> strings.voiceFailed
      }
      setIdle()
      message?.let(onProblem)
    }
  }
}
