package expo.modules.floatingassistant

import android.animation.ValueAnimator
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Outline
import android.graphics.PixelFormat
import android.graphics.Point
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.hardware.display.DisplayManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.text.TextUtils
import android.util.TypedValue
import android.view.ContextThemeWrapper
import android.view.Display
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.view.WindowInsets
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.util.UUID
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * The floating bubble, its long-press menu, and the chat window. All three are plain Android views
 * added to the WindowManager, so they stay on screen over other apps.
 *
 * This class only shows text and reports what the user typed or tapped. Answers come from the
 * app's JavaScript side through [AssistantBus].
 */
internal class OverlayController(
  private val service: Service,
  private val shutDown: (reason: String) -> Unit
) : AssistantBus.Ui {

  private class ChatMessage(val id: String, val role: String, var text: String, var isError: Boolean = false)

  private val main = Handler(Looper.getMainLooper())
  private val overlayType =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

  // A window context reports correct screen metrics and insets for an overlay created from a service.
  private val windowContext: Context =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val display = (service.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager).getDisplay(Display.DEFAULT_DISPLAY)
      service.createDisplayContext(display).createWindowContext(overlayType, null)
    } else service
  private val windows = windowContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private val touchSlop = ViewConfiguration.get(service).scaledTouchSlop

  private var ui: Context = themedContext()
  private var palette = Palette(isNight())
  private val strings get() = AssistantBus.strings

  private val transcript = ArrayList<ChatMessage>()
  private val messageViews = HashMap<String, TextView>()
  private var generatingId: String? = null
  private var modelStatus = AssistantBus.modelStatus
  private var screenAttached = false
  private var screenSummary: String? = null
  private var panelOpen = false
  private var hiddenForCapture = false

  private var bubble: View? = null
  private var bubbleParams: WindowManager.LayoutParams? = null
  private var snapAnimator: ValueAnimator? = null
  private var menu: View? = null

  private var panel: View? = null
  private var statusView: TextView? = null
  private var messagesColumn: LinearLayout? = null
  private var scroll: ScrollView? = null
  private var input: EditText? = null
  private var sendButton: ImageView? = null
  private var micButton: ImageView? = null
  private var contextRow: LinearLayout? = null
  private var contextLabel: TextView? = null
  private var confirmCard: View? = null

  /** Whatever was already typed when the microphone was tapped; speech is added after it. */
  private var voicePrefix = ""
  private val voice by lazy {
    VoiceInput(
      context = service,
      onPartial = ::showHeard,
      onFinal = ::showHeard,
      onListening = ::updateMicButton,
      onProblem = ::showNotice
    )
  }

  // ---------------------------------------------------------------- lifecycle

  fun show() = addBubble()

  fun destroy() {
    main.removeCallbacksAndMessages(null)
    snapAnimator?.cancel()
    voice.destroy()
    dismissMenu()
    removeWindow(panel)
    removeWindow(bubble)
    panel = null
    bubble = null
  }

  /** Rotation, dark mode, or font size changed: rebuild the views; the conversation is kept. */
  fun onConfigurationChanged() {
    val wasOpen = panelOpen
    snapAnimator?.cancel()
    voice.cancel()
    dismissMenu()
    removeWindow(panel)
    removeWindow(bubble)
    panel = null
    bubble = null
    ui = themedContext()
    palette = Palette(isNight())
    if (hiddenForCapture) return
    if (wasOpen) openPanel() else addBubble()
  }

  // ---------------------------------------------------------------- helpers

  private fun isNight() =
    (service.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

  private fun themedContext(): Context =
    ContextThemeWrapper(windowContext, if (isNight()) android.R.style.Theme_DeviceDefault else android.R.style.Theme_DeviceDefault_Light)

  private fun dp(value: Int) = (value * ui.resources.displayMetrics.density).roundToInt()

  private fun rounded(color: Int, radiusDp: Int, stroke: Int? = null) = GradientDrawable().apply {
    setColor(color)
    cornerRadius = dp(radiusDp).toFloat()
    if (stroke != null) setStroke(dp(1), stroke)
  }

  private fun label(text: String, sizeSp: Float, color: Int, bold: Boolean = false) = TextView(ui).apply {
    this.text = text
    setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
    setTextColor(color)
    if (bold) typeface = Typeface.DEFAULT_BOLD
  }

  private fun iconButton(icon: Int, description: String, tint: Int, onClick: () -> Unit) = ImageView(ui).apply {
    setImageResource(icon)
    setColorFilter(tint)
    contentDescription = description
    val pad = dp(10)
    setPadding(pad, pad, pad, pad)
    layoutParams = LinearLayout.LayoutParams(dp(44), dp(44))
    isClickable = true
    isFocusable = true
    setOnClickListener { onClick() }
  }

  private fun divider() = View(ui).apply {
    setBackgroundColor(palette.border)
    layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, max(1, dp(1)))
  }

  private class Area(val width: Int, val height: Int, val top: Int, val bottom: Int, val left: Int, val right: Int)

  /** Screen size and the parts taken by the status bar, navigation bar and display cutout. */
  private fun area(): Area {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val metrics = windows.currentWindowMetrics
      val insets = metrics.windowInsets.getInsetsIgnoringVisibility(
        WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout()
      )
      return Area(metrics.bounds.width(), metrics.bounds.height(), insets.top, insets.bottom, insets.left, insets.right)
    }
    val size = Point()
    @Suppress("DEPRECATION") windows.defaultDisplay.getRealSize(size)
    return Area(size.x, size.y, dp(24), dp(48), 0, 0)
  }

  private fun addWindow(view: View, params: WindowManager.LayoutParams): Boolean = try {
    windows.addView(view, params)
    true
  } catch (_: Exception) {
    // Most often the overlay permission was revoked while the assistant was running.
    shutDown("permission")
    false
  }

  private fun updateWindow(view: View?, params: WindowManager.LayoutParams?) {
    if (view == null || params == null || !view.isAttachedToWindow) return
    try { windows.updateViewLayout(view, params) } catch (_: Exception) {}
  }

  private fun removeWindow(view: View?) {
    if (view == null) return
    try { windows.removeViewImmediate(view) } catch (_: Exception) {}
  }

  // ---------------------------------------------------------------- bubble

  private val bubbleSize get() = dp(56)
  private val edgeMargin get() = dp(8)
  /** Room around the bubble image so its shadow is not clipped by the window. */
  private val bubblePad get() = dp(10)

  private fun bubbleX(onRight: Boolean, area: Area) =
    if (onRight) area.width - area.right - bubbleSize - edgeMargin else area.left + edgeMargin

  private fun bubbleYRange(area: Area): IntRange {
    val top = area.top + edgeMargin
    return top..max(top, area.height - area.bottom - bubbleSize - edgeMargin)
  }

  private fun addBubble() {
    if (bubble != null || hiddenForCapture) return
    val area = area()
    val saved = BubblePosition.load(service)
    val range = bubbleYRange(area)
    val image = ImageView(ui).apply {
      setImageResource(R.drawable.seekora_assistant)
      scaleType = ImageView.ScaleType.CENTER_CROP
      contentDescription = strings.bubbleLabel
      outlineProvider = object : ViewOutlineProvider() {
        override fun getOutline(view: View, outline: Outline) = outline.setOval(0, 0, view.width, view.height)
      }
      clipToOutline = true
      elevation = dp(4).toFloat()
    }
    val shadowPad = bubblePad
    val holder = FrameLayout(ui).apply {
      setPadding(shadowPad, shadowPad, shadowPad, shadowPad)
      clipToPadding = false
      addView(image, FrameLayout.LayoutParams(bubbleSize, bubbleSize))
    }
    val params = WindowManager.LayoutParams(
      bubbleSize + shadowPad * 2, bubbleSize + shadowPad * 2, overlayType,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = bubbleX(saved.onRight, area) - shadowPad
      y = (range.first + (range.last - range.first) * saved.yFraction).roundToInt().coerceIn(range) - shadowPad
    }
    holder.setOnTouchListener(BubbleTouch(params, shadowPad))
    if (addWindow(holder, params)) {
      bubble = holder
      bubbleParams = params
    }
  }

  /** Separates a tap, a long press and a drag, so dragging never opens the chat by accident. */
  private inner class BubbleTouch(private val params: WindowManager.LayoutParams, private val pad: Int) : View.OnTouchListener {
    private var downX = 0f
    private var downY = 0f
    private var startX = 0
    private var startY = 0
    private var dragging = false
    private var longPressed = false
    private val longPress = Runnable {
      longPressed = true
      showMenu()
    }

    override fun onTouch(view: View, event: MotionEvent): Boolean {
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          snapAnimator?.cancel()
          dismissMenu()
          downX = event.rawX; downY = event.rawY
          startX = params.x; startY = params.y
          dragging = false; longPressed = false
          main.postDelayed(longPress, ViewConfiguration.getLongPressTimeout().toLong())
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = event.rawX - downX
          val dy = event.rawY - downY
          if (!dragging && (abs(dx) > touchSlop || abs(dy) > touchSlop)) {
            dragging = true
            main.removeCallbacks(longPress)
          }
          if (dragging) {
            val area = area()
            val range = bubbleYRange(area)
            params.x = (startX + dx).roundToInt().coerceIn(area.left - pad, area.width - area.right - bubbleSize - pad)
            params.y = (startY + dy).roundToInt().coerceIn(range.first - pad, range.last - pad)
            updateWindow(view, params)
          }
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          main.removeCallbacks(longPress)
          if (dragging) snapToEdge(view, params, pad)
          else if (!longPressed && event.actionMasked == MotionEvent.ACTION_UP) {
            view.performClick()
            openPanel()
          }
        }
      }
      return true
    }
  }

  private fun snapToEdge(view: View, params: WindowManager.LayoutParams, pad: Int) {
    val area = area()
    val range = bubbleYRange(area)
    val onRight = params.x + pad + bubbleSize / 2 > area.width / 2
    val target = bubbleX(onRight, area) - pad
    val span = max(1, range.last - range.first)
    BubblePosition.save(service, BubblePosition.Saved(onRight, ((params.y + pad - range.first).toFloat() / span).coerceIn(0f, 1f)))
    snapAnimator = ValueAnimator.ofInt(params.x, target).apply {
      duration = 180
      addUpdateListener {
        params.x = it.animatedValue as Int
        updateWindow(view, params)
      }
      start()
    }
  }

  private fun moveBubbleTo(onRight: Boolean) {
    val view = bubble ?: return
    val params = bubbleParams ?: return
    val area = area()
    val pad = bubblePad
    val range = bubbleYRange(area)
    val span = max(1, range.last - range.first)
    BubblePosition.save(service, BubblePosition.Saved(onRight, ((params.y + pad - range.first).toFloat() / span).coerceIn(0f, 1f)))
    params.x = bubbleX(onRight, area) - pad
    updateWindow(view, params)
  }

  private fun showMenu() {
    val params = bubbleParams ?: return
    dismissMenu()
    val area = area()
    val onRight = params.x > area.width / 2
    val card = LinearLayout(ui).apply {
      orientation = LinearLayout.VERTICAL
      background = rounded(palette.surface, 14, palette.border)
      elevation = dp(8).toFloat()
      setPadding(0, dp(6), 0, dp(6))
    }
    fun row(text: String, color: Int, action: () -> Unit) = card.addView(label(text, 15f, color).apply {
      setPadding(dp(18), dp(12), dp(18), dp(12))
      isClickable = true
      setOnClickListener {
        dismissMenu()
        action()
      }
    })
    row(strings.menuOpen, palette.text) { openPanel() }
    row(if (onRight) strings.menuMoveLeft else strings.menuMoveRight, palette.text) { moveBubbleTo(!onRight) }
    row(strings.menuClose, palette.error) { shutDown("user") }

    val holder = FrameLayout(ui).apply {
      setPadding(dp(8), dp(8), dp(8), dp(8))
      clipToPadding = false
      addView(card)
      // A touch anywhere else closes the menu.
      setOnTouchListener { _, event ->
        if (event.actionMasked == MotionEvent.ACTION_OUTSIDE) dismissMenu()
        false
      }
    }
    val menuParams = WindowManager.LayoutParams(
      ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, overlayType,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or (if (onRight) Gravity.END else Gravity.START)
      x = edgeMargin + (if (onRight) area.right else area.left)
      y = min(params.y + bubbleSize + dp(12), area.height - area.bottom - dp(190))
    }
    if (addWindow(holder, menuParams)) menu = holder
  }

  private fun dismissMenu() {
    removeWindow(menu)
    menu = null
  }

  // ---------------------------------------------------------------- chat window

  private fun openPanel() {
    if (panel != null || hiddenForCapture) return
    dismissMenu()
    removeWindow(bubble)
    bubble = null
    val area = area()
    // Room around the card so its shadow is not clipped by the window.
    val pad = dp(14)
    val usableHeight = area.height - area.top - area.bottom
    val width = min(area.width - area.left - area.right - pad * 2, dp(380))
    val height = (usableHeight * 0.62f).roundToInt().coerceIn(min(dp(300), usableHeight - dp(24)), dp(540))
    val holder = object : FrameLayout(ui) {
      override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK) {
          if (event.action == KeyEvent.ACTION_UP) closePanel()
          return true
        }
        return super.dispatchKeyEvent(event)
      }
    }
    holder.setPadding(pad, pad, pad, pad)
    holder.clipToPadding = false
    holder.addView(buildCard(), FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    val params = WindowManager.LayoutParams(
      width + pad * 2, height + pad * 2, overlayType,
      // Focusable so the keyboard works, but touches outside the window still reach the app underneath.
      WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
      y = dp(6)
      softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN
      // Placed above the system bars and the keyboard, so the input row is never covered.
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        fitInsetsTypes = WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout() or WindowInsets.Type.ime()
      }
    }
    if (addWindow(holder, params)) {
      panel = holder
      panelOpen = true
      renderTranscript()
      updateStatus()
      updateContextRow()
      updateSendButton()
    }
  }

  /** Minimise: back to the bubble. The conversation is kept. */
  private fun closePanel() {
    hideKeyboard()
    voice.cancel()
    removeWindow(panel)
    panel = null
    panelOpen = false
    statusView = null; messagesColumn = null; scroll = null; input = null
    sendButton = null; micButton = null; contextRow = null; contextLabel = null; confirmCard = null
    messageViews.clear()
    addBubble()
  }

  private fun buildCard(): View {
    val column = LinearLayout(ui).apply {
      orientation = LinearLayout.VERTICAL
      background = rounded(palette.surface, 20, palette.border)
      elevation = dp(6).toFloat()
      clipToOutline = true
    }

    // Header: logo, title and status, minimise, turn off.
    val header = LinearLayout(ui).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(14), dp(6), dp(4), dp(6))
    }
    header.addView(ImageView(ui).apply {
      setImageResource(R.drawable.seekora_assistant)
      scaleType = ImageView.ScaleType.CENTER_CROP
      outlineProvider = object : ViewOutlineProvider() {
        override fun getOutline(view: View, outline: Outline) =
          outline.setRoundRect(0, 0, view.width, view.height, dp(8).toFloat())
      }
      clipToOutline = true
      layoutParams = LinearLayout.LayoutParams(dp(30), dp(30))
    })
    val titles = LinearLayout(ui).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(10), 0, dp(4), 0)
      layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
    }
    titles.addView(label(strings.title, 16f, palette.text, bold = true))
    statusView = label("", 12f, palette.textSecondary).also { titles.addView(it) }
    header.addView(titles)
    header.addView(iconButton(R.drawable.seekora_ic_minimize, strings.minimize, palette.text) { closePanel() })
    header.addView(iconButton(R.drawable.seekora_ic_close, strings.close, palette.text) { shutDown("user") })
    column.addView(header)
    column.addView(divider())

    // Conversation.
    val messages = LinearLayout(ui).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(12), dp(12), dp(12), dp(12))
    }
    messagesColumn = messages
    scroll = ScrollView(ui).apply {
      isFillViewport = true
      addView(messages, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
      layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f)
    }
    column.addView(scroll)

    // Shown while captured screen text is part of the conversation, with a way to discard it.
    val context = LinearLayout(ui).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setBackgroundColor(palette.surfaceSelected)
      setPadding(dp(14), dp(4), dp(8), dp(4))
      visibility = View.GONE
    }
    contextLabel = label("", 12f, palette.text).apply {
      // Room for the line count and a short sample of the text that was read.
      maxLines = 4
      ellipsize = TextUtils.TruncateAt.END
      layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
    }
    context.addView(contextLabel)
    context.addView(label(strings.discard, 12f, palette.tint, bold = true).apply {
      setPadding(dp(10), dp(8), dp(10), dp(8))
      isClickable = true
      setOnClickListener { AssistantBus.toJs("onClearContext", mapOf("scope" to "screen")) }
    })
    contextRow = context
    column.addView(context)
    column.addView(divider())

    // Input row: text, speak, analyse screen, send or stop.
    val row = LinearLayout(ui).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(10), dp(6), dp(4), dp(6))
    }
    val field = EditText(ui).apply {
      hint = strings.placeholder
      setHintTextColor(palette.textSecondary)
      setTextColor(palette.text)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
      background = rounded(palette.surfaceSelected, 22)
      setPadding(dp(14), dp(10), dp(14), dp(10))
      inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
      imeOptions = EditorInfo.IME_ACTION_SEND or EditorInfo.IME_FLAG_NO_EXTRACT_UI
      // Wraps onto up to three lines while keeping the keyboard's Send key.
      setHorizontallyScrolling(false)
      maxLines = 3
      layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
      setOnEditorActionListener { _, action, _ ->
        if (action == EditorInfo.IME_ACTION_SEND) {
          submitTyped()
          true
        } else false
      }
    }
    input = field
    row.addView(field)
    micButton = iconButton(R.drawable.seekora_ic_mic, strings.voiceStart, palette.tint) { toggleVoice() }
      .also { row.addView(it) }
    updateMicButton(voice.isListening)
    row.addView(iconButton(R.drawable.seekora_ic_scan, strings.actionAnalyze, palette.tint) { explainCapture("") })
    sendButton = iconButton(R.drawable.seekora_ic_send, strings.send, palette.tint) {
      if (generatingId != null) AssistantBus.toJs("onCancelRequested") else submitTyped()
    }.also { row.addView(it) }
    column.addView(row)
    return column
  }

  private fun renderTranscript() {
    val column = messagesColumn ?: return
    column.removeAllViews()
    messageViews.clear()
    confirmCard = null
    addBubbleView(ChatMessage("greeting", "assistant", strings.greeting))
    if (transcript.isEmpty()) {
      addAction(strings.actionAsk, R.drawable.seekora_ic_send) { focusInput() }
      addAction(strings.actionAnalyze, R.drawable.seekora_ic_scan) { explainCapture("") }
      addAction(strings.actionExplain, R.drawable.seekora_ic_scan) { explainCapture("explain") }
      addAction(strings.actionSummarize, R.drawable.seekora_ic_scan) { explainCapture("summarize") }
    }
    transcript.forEach { addBubbleView(it) }
    scrollToEnd()
  }

  private fun addAction(text: String, icon: Int, onClick: () -> Unit) {
    val column = messagesColumn ?: return
    val row = LinearLayout(ui).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      background = rounded(palette.surfaceSelected, 12)
      minimumHeight = dp(46)
      setPadding(dp(12), dp(6), dp(12), dp(6))
      isClickable = true
      contentDescription = text
      setOnClickListener { onClick() }
      layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
        topMargin = dp(8)
      }
    }
    row.addView(ImageView(ui).apply {
      setImageResource(icon)
      setColorFilter(palette.tint)
      layoutParams = LinearLayout.LayoutParams(dp(20), dp(20))
    })
    row.addView(label(text, 14f, palette.tint).apply { setPadding(dp(10), 0, 0, 0) })
    column.addView(row)
  }

  private fun addBubbleView(message: ChatMessage) {
    val column = messagesColumn ?: return
    val isUser = message.role == "user"
    val isNotice = message.role == "notice"
    val view = label(
      message.text, if (isNotice) 12.5f else 14.5f,
      when {
        message.isError -> palette.error
        isNotice -> palette.textSecondary
        else -> palette.text
      }
    ).apply {
      setLineSpacing(dp(2).toFloat(), 1f)
      if (!isNotice) {
        background = if (isUser) rounded(palette.surfaceSelected, 14) else rounded(palette.surface, 14, palette.border)
        setPadding(dp(12), dp(9), dp(12), dp(9))
      } else {
        gravity = Gravity.CENTER_HORIZONTAL
        setPadding(dp(8), dp(4), dp(8), dp(4))
      }
      layoutParams = LinearLayout.LayoutParams(
        if (isNotice) ViewGroup.LayoutParams.MATCH_PARENT else ViewGroup.LayoutParams.WRAP_CONTENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
      ).apply {
        topMargin = if (column.childCount == 0) 0 else dp(8)
        gravity = if (isUser) Gravity.END else Gravity.START
        if (isUser) marginStart = dp(36) else if (!isNotice) marginEnd = dp(24)
      }
    }
    messageViews[message.id] = view
    column.addView(view)
  }

  private fun addMessage(role: String, text: String, id: String = UUID.randomUUID().toString(), isError: Boolean = false): ChatMessage {
    val first = transcript.isEmpty()
    val message = ChatMessage(id, role, text, isError)
    transcript.add(message)
    // The first real message replaces the quick-action list.
    if (first) renderTranscript() else addBubbleView(message)
    scrollToEnd()
    return message
  }

  private fun scrollToEnd() {
    val view = scroll ?: return
    view.post { view.fullScroll(View.FOCUS_DOWN) }
  }

  private fun focusInput() {
    val field = input ?: return
    field.requestFocus()
    (ui.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).showSoftInput(field, InputMethodManager.SHOW_IMPLICIT)
  }

  private fun hideKeyboard() {
    val field = input ?: return
    (ui.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(field.windowToken, 0)
  }

  private fun updateStatus() {
    statusView?.text = when (modelStatus) {
      "ready" -> strings.statusReady
      "loading" -> strings.statusLoading
      "busy" -> strings.statusBusy
      "notLoaded" -> strings.statusNotLoaded
      "missing" -> strings.statusMissing
      else -> strings.statusUnavailable
    }
  }

  private fun updateSendButton() {
    val button = sendButton ?: return
    val generating = generatingId != null
    button.setImageResource(if (generating) R.drawable.seekora_ic_stop else R.drawable.seekora_ic_send)
    button.contentDescription = if (generating) strings.stop else strings.send
  }

  private fun updateMicButton(listening: Boolean) {
    micButton?.setColorFilter(if (listening) palette.error else palette.tint)
    micButton?.contentDescription = if (listening) strings.voiceStop else strings.voiceStart
    input?.hint = if (listening) strings.voiceListening else strings.placeholder
  }

  /** Speech lands in the input field, as if it had been typed; the user still decides to send. */
  private fun showHeard(text: String) {
    val field = input ?: return
    field.setText(if (voicePrefix.isEmpty()) text else "$voicePrefix $text")
    field.setSelection(field.text.length)
  }

  private fun updateContextRow() {
    contextRow?.visibility = if (screenAttached) View.VISIBLE else View.GONE
    contextLabel?.text = listOfNotNull(strings.screenAttached, screenSummary).joinToString(" · ")
  }

  // ---------------------------------------------------------------- user actions

  private fun toggleVoice() {
    if (generatingId != null) return
    if (!voice.isListening) {
      hideKeyboard()
      voicePrefix = input?.text?.toString()?.trim().orEmpty()
    }
    voice.toggle(strings.voiceLang)
  }

  private fun submitTyped() {
    val field = input ?: return
    val text = field.text.toString().trim()
    if (text.isEmpty() || generatingId != null) return
    voice.cancel()
    voicePrefix = ""
    field.setText("")
    send(text, "chat")
  }

  private fun send(text: String, mode: String) {
    val message = addMessage("user", text)
    val delivered = AssistantBus.toJs("onUserMessage", mapOf("id" to message.id, "text" to text, "mode" to mode))
    if (!delivered) showAppClosed()
  }

  /** The app's JavaScript side is gone, so nothing can answer. Offer to reopen Seekora. */
  private fun showAppClosed() {
    addMessage("notice", strings.appClosed)
    addAction(strings.openApp, R.drawable.seekora_ic_send) {
      service.packageManager.getLaunchIntentForPackage(service.packageName)?.let {
        service.startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      closePanel()
    }
    scrollToEnd()
  }

  /** Step one of a capture: say plainly what will happen, and let the user back out. */
  private fun explainCapture(action: String) {
    if (generatingId != null || confirmCard != null) return
    val column = messagesColumn ?: return
    if (AssistantBus.bridge == null) {
      showAppClosed()
      return
    }
    hideKeyboard()
    val card = LinearLayout(ui).apply {
      orientation = LinearLayout.VERTICAL
      background = rounded(palette.surfaceSelected, 14, palette.border)
      setPadding(dp(14), dp(12), dp(14), dp(10))
      layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
        topMargin = dp(10)
      }
    }
    card.addView(label(strings.captureTitle, 15f, palette.text, bold = true))
    card.addView(label(strings.captureBody, 13.5f, palette.text).apply {
      setPadding(0, dp(6), 0, dp(8))
      setLineSpacing(dp(2).toFloat(), 1f)
    })
    val buttons = LinearLayout(ui).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.END
    }
    buttons.addView(label(strings.captureCancel, 14f, palette.textSecondary, bold = true).apply {
      setPadding(dp(14), dp(10), dp(14), dp(10))
      isClickable = true
      setOnClickListener {
        column.removeView(card)
        confirmCard = null
      }
    })
    buttons.addView(label(strings.captureContinue, 14f, palette.onTint, bold = true).apply {
      background = rounded(palette.tint, 18)
      setPadding(dp(18), dp(10), dp(18), dp(10))
      isClickable = true
      setOnClickListener {
        column.removeView(card)
        confirmCard = null
        startCapture(action)
      }
    })
    card.addView(buttons)
    confirmCard = card
    column.addView(card)
    scrollToEnd()
  }

  /** Step two: get out of the way, then hand over to Android's own consent dialog. */
  private fun startCapture(action: String) {
    hiddenForCapture = true
    panelOpen = true
    hideKeyboard()
    voice.cancel()
    removeWindow(panel)
    panel = null
    statusView = null; messagesColumn = null; scroll = null; input = null
    sendButton = null; micButton = null; contextRow = null; contextLabel = null
    messageViews.clear()
    AssistantBus.pendingCaptureAction = action.ifEmpty { null }
    try {
      service.startActivity(Intent(service, ScreenCaptureActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: Exception) {
      AssistantBus.captureFinished(CaptureResult("failed", UUID.randomUUID().toString(), System.currentTimeMillis(), "", 0, 0, action.ifEmpty { null }))
    }
  }

  // ---------------------------------------------------------------- calls from JavaScript

  override fun onCaptureFinished(result: CaptureResult) {
    hiddenForCapture = false
    openPanel()
  }

  override fun beginReply(id: String) {
    generatingId = id
    addMessage("assistant", "...", id)
    updateSendButton()
  }

  override fun appendReply(id: String, chunk: String) {
    val message = transcript.lastOrNull { it.id == id } ?: return
    message.text = if (message.text == "...") chunk else message.text + chunk
    messageViews[id]?.text = message.text
    scrollToEnd()
  }

  override fun endReply(id: String, text: String, isError: Boolean) {
    val message = transcript.lastOrNull { it.id == id } ?: addMessage("assistant", text, id, isError)
    message.text = text
    message.isError = isError
    messageViews[id]?.let {
      it.text = text
      if (isError) it.setTextColor(palette.error)
    }
    if (generatingId == id) generatingId = null
    updateSendButton()
    scrollToEnd()
  }

  override fun showNotice(text: String) {
    addMessage("notice", text)
  }

  override fun submitUserMessage(text: String) {
    if (generatingId == null) send(text, "screen")
  }

  override fun setModelStatus(status: String) {
    modelStatus = status
    updateStatus()
  }

  override fun setScreenAttached(attached: Boolean, summary: String?) {
    screenAttached = attached
    screenSummary = summary
    updateContextRow()
  }

  override fun resetBubblePosition() {
    if (bubble == null) return
    removeWindow(bubble)
    bubble = null
    addBubble()
  }

  override fun applyStrings() {
    if (panel != null) {
      removeWindow(panel)
      panel = null
      openPanel()
    }
  }
}
