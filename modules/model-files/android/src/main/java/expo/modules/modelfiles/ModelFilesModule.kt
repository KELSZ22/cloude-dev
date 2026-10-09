package expo.modules.modelfiles

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import java.io.BufferedInputStream
import java.io.DataInputStream
import java.io.File
import java.io.FileInputStream
import java.net.URI
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicBoolean

/** Verifies app-owned model files without passing their bytes through JavaScript. */
class ModelFilesModule : Module() {
  private companion object {
    const val BUFFER_SIZE = 256 * 1024
    // A cancellation can reach the synchronous function before the async function starts.
    const val MAX_PENDING_CANCELLATIONS = 64
  }

  private val lock = Any()
  private val active = HashMap<String, AtomicBoolean>()
  private val pendingCancellations = LinkedHashSet<String>()
  @Volatile private var destroyed = false

  override fun definition() = ModuleDefinition {
    Name("SeekoraModelFiles")
    Events("onVerificationProgress")

    AsyncFunction("verifyModel") Coroutine { requestId: String, uri: String, expectedSize: Double, expectedSha256: String ->
      require(requestId.isNotBlank() && requestId.length <= 128) { "Invalid verification request." }
      val cancelled = synchronized(lock) {
        check(!destroyed) { "Model verification is unavailable." }
        check(!active.containsKey(requestId)) { "This verification request is already running." }
        AtomicBoolean(pendingCancellations.remove(requestId)).also { active[requestId] = it }
      }
      try {
        withContext(Dispatchers.IO) {
          verifyFile(requestId, uri, expectedSize, expectedSha256, cancelled)
        }
      } finally {
        synchronized(lock) { active.remove(requestId) }
      }
    }

    Function("cancelVerification") { requestId: String ->
      synchronized(lock) {
        if (!destroyed && requestId.isNotBlank() && requestId.length <= 128) {
          val current = active[requestId]
          if (current != null) current.set(true)
          else {
            pendingCancellations.add(requestId)
            while (pendingCancellations.size > MAX_PENDING_CANCELLATIONS) {
              pendingCancellations.remove(pendingCancellations.first())
            }
          }
        }
      }
    }

    OnDestroy {
      synchronized(lock) {
        destroyed = true
        active.values.forEach { it.set(true) }
        active.clear()
        pendingCancellations.clear()
      }
    }
  }

  private suspend fun checkCancelled(cancelled: AtomicBoolean) {
    currentCoroutineContext().ensureActive()
    check(!cancelled.get() && !destroyed) { "Model verification cancelled." }
  }

  private suspend fun verifyFile(
    requestId: String,
    uri: String,
    expectedSize: Double,
    expectedSha256: String,
    cancelled: AtomicBoolean
  ): Boolean {
    checkCancelled(cancelled)
    require(expectedSize.isFinite() && expectedSize >= 8 && expectedSize <= 9007199254740991.0 && expectedSize % 1.0 == 0.0) {
      "Invalid expected model size."
    }
    require(expectedSha256.matches(Regex("[0-9a-fA-F]{64}"))) { "Invalid expected SHA-256." }
    val parsed = URI(uri)
    require(parsed.scheme == "file" && parsed.authority.isNullOrEmpty() && parsed.query == null && parsed.fragment == null) {
      "Model verification requires an app-owned local file."
    }
    val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    val root = context.filesDir.canonicalFile
    val file = File(parsed).canonicalFile
    require(file.path.startsWith(root.path + File.separator) && file.isFile) {
      "Model verification requires a file inside app storage."
    }
    val size = expectedSize.toLong()
    require(file.length() == size) { "The model file size does not match." }
    val digest = MessageDigest.getInstance("SHA-256")
    var total = 0L
    var reportedPercent = -1
    fun reportProgress() {
      val percent = (total * 100.0 / size).toInt()
      // Reserve 100% for a successful checksum, rather than merely finishing the read.
      if (percent != reportedPercent && percent < 100 && !cancelled.get() && !destroyed) {
        reportedPercent = percent
        sendEvent("onVerificationProgress", mapOf("requestId" to requestId, "fraction" to total.toDouble() / size))
      }
    }
    reportProgress()
    DataInputStream(BufferedInputStream(FileInputStream(file), BUFFER_SIZE)).use { input ->
      val header = ByteArray(8)
      input.readFully(header)
      require(header[0] == 71.toByte() && header[1] == 71.toByte() && header[2] == 85.toByte() && header[3] == 70.toByte()) {
        "This is not a GGUF model file."
      }
      require(header[4] == 3.toByte() && header[5] == 0.toByte() && header[6] == 0.toByte() && header[7] == 0.toByte()) {
        "Expected a GGUF version 3 file."
      }
      digest.update(header)
      total = header.size.toLong()
      val buffer = ByteArray(BUFFER_SIZE)
      while (total < size) {
        checkCancelled(cancelled)
        val count = input.read(buffer, 0, minOf(buffer.size.toLong(), size - total).toInt())
        check(count > 0) { "The model file is truncated." }
        digest.update(buffer, 0, count)
        total += count
        reportProgress()
      }
      checkCancelled(cancelled)
      require(input.read() == -1 && file.length() == size) { "The model file size does not match." }
    }
    val actual = digest.digest().joinToString("") { "%02x".format(it.toInt() and 0xff) }
    require(actual.equals(expectedSha256, ignoreCase = true)) {
      "SHA-256 mismatch. Select the exact pinned Qwen3.5 file; it may be damaged or a different model."
    }
    checkCancelled(cancelled)
    sendEvent("onVerificationProgress", mapOf("requestId" to requestId, "fraction" to 1.0))
    return true
  }
}
