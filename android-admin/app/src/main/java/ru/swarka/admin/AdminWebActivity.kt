package ru.swarka.admin

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.ToneGenerator
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.HapticFeedbackConstants
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import ru.swarka.admin.notifications.FcmRegistrar
import ru.swarka.admin.notifications.LeadBadgeManager
import ru.swarka.admin.notifications.LeadChecker
import ru.swarka.admin.notifications.LeadNotificationScheduler
import ru.swarka.admin.security.SessionManager
import java.io.File

class AdminWebActivity : AppCompatActivity() {
    private lateinit var sessionManager: SessionManager
    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var offlinePanel: LinearLayout
    private lateinit var retryButton: MaterialButton
    private lateinit var loadingOverlay: LinearLayout
    private var tokenInjected = false
    private var isLoggingOut = false
    private var pendingDeepLinkPath: String? = null
    private var isOnline = true
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingFileChooserIntent: Intent? = null
    private var pendingAcceptsImagesOnly = false
    private var cameraPhotoUri: Uri? = null
    private var connectivityManager: ConnectivityManager? = null
    private var pageScrollY = 0

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            runOnUiThread { updateOnlineState(true) }
        }

        override fun onLost(network: Network) {
            runOnUiThread { updateOnlineState(hasNetworkConnection()) }
        }
    }

    private val filePermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            showFileSourceDialog()
        } else {
            Toast.makeText(this, R.string.file_permission_denied, Toast.LENGTH_SHORT).show()
            cancelFileChooser()
        }
    }

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            launchCameraCapture()
        } else {
            Toast.makeText(this, R.string.camera_permission_denied, Toast.LENGTH_SHORT).show()
            cancelFileChooser()
        }
    }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = filePathCallback
        filePathCallback = null

        if (callback == null) return@registerForActivityResult

        if (result.resultCode != Activity.RESULT_OK) {
            callback.onReceiveValue(null)
            return@registerForActivityResult
        }

        val data = result.data
        val uris = when {
            data?.clipData != null -> {
                val clip = data.clipData!!
                Array(clip.itemCount) { index -> clip.getItemAt(index).uri }
            }
            data?.data != null -> arrayOf(data.data!!)
            else -> null
        }
        callback.onReceiveValue(uris)
    }

    private val takePictureLauncher = registerForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        val callback = filePathCallback
        filePathCallback = null

        if (callback == null) return@registerForActivityResult

        if (success && cameraPhotoUri != null) {
            callback.onReceiveValue(arrayOf(cameraPhotoUri!!))
        } else {
            callback.onReceiveValue(null)
        }
        cameraPhotoUri = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_admin_web)

        sessionManager = SessionManager(this)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        errorText = findViewById(R.id.errorText)
        offlinePanel = findViewById(R.id.offlinePanel)
        retryButton = findViewById(R.id.retryButton)
        loadingOverlay = findViewById(R.id.loadingOverlay)

        applyWebViewDarkTheme()
        setupWebView()
        setupSwipeRefresh()
        setupNetworkMonitor()
        setupRetryButton()
        handleLaunchIntent(intent)
        scheduleLeadChecks()
        FcmRegistrar.registerCurrentTokenAsync(this)
        loadAdminIfReady()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleLaunchIntent(intent)
        pendingDeepLinkPath?.let {
            if (tokenInjected) {
                navigateToPath(it)
                pendingDeepLinkPath = null
            }
        }
    }

    private fun handleLaunchIntent(intent: Intent?) {
        val leadId = intent?.getStringExtra(EXTRA_LEAD_ID)
        if (!leadId.isNullOrBlank()) {
            pendingDeepLinkPath = "/leads?lead=$leadId"
        }
    }

    private fun applyWebViewDarkTheme() {
        val nightMode = resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK
        val isDark = nightMode == android.content.res.Configuration.UI_MODE_NIGHT_YES

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            webView.settings.isAlgorithmicDarkeningAllowed = isDark
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            @Suppress("DEPRECATION")
            webView.settings.forceDark = if (isDark) {
                WebSettings.FORCE_DARK_ON
            } else {
                WebSettings.FORCE_DARK_OFF
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }
        webView.isNestedScrollingEnabled = true

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.addJavascriptInterface(AndroidBridge(), JS_BRIDGE_NAME)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (isLoginUrl(request.url)) {
                    handleNativeLogout()
                    return true
                }
                val host = request.url.host.orEmpty()
                if (host.endsWith("swarka-i-voditel.ru")) {
                    return false
                }
                return openExternalUrl(request.url)
            }

            override fun onPageFinished(view: WebView, url: String?) {
                swipeRefresh.isRefreshing = false
                progressBar.visibility = View.GONE
                pageScrollY = 0
                installScrollTracking()
                if (url != null && isLoginUrl(Uri.parse(url))) {
                    handleNativeLogout()
                    return
                }
                injectTokenIfNeeded()
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: android.webkit.WebResourceError
            ) {
                if (request.isForMainFrame) {
                    swipeRefresh.isRefreshing = false
                    progressBar.visibility = View.GONE
                    if (!hasNetworkConnection()) {
                        updateOnlineState(false)
                    }
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                cancelFileChooser()
                this@AdminWebActivity.filePathCallback = filePathCallback

                val acceptTypes = fileChooserParams?.acceptTypes
                    ?.filter { it.isNotBlank() }
                    ?.takeIf { it.isNotEmpty() }
                pendingAcceptsImagesOnly = acceptTypes?.all { it.startsWith("image/") || it == "image/*" } == true

                pendingFileChooserIntent = when {
                    fileChooserParams != null -> fileChooserParams.createIntent()
                    pendingAcceptsImagesOnly -> Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "image/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                    }
                    else -> Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "*/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                        putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "application/pdf", "video/*"))
                    }
                }

                if (hasMediaPermission()) {
                    showFileSourceDialog()
                } else {
                    filePermissionLauncher.launch(requiredMediaPermission())
                }
                return true
            }
        }
    }

    private fun setupSwipeRefresh() {
        swipeRefresh.setColorSchemeResources(R.color.accent_yellow)
        swipeRefresh.setOnChildScrollUpCallback { _, _ ->
            pageScrollY > 0
        }
        swipeRefresh.setOnRefreshListener {
            if (pageScrollY > 0) {
                swipeRefresh.isRefreshing = false
                return@setOnRefreshListener
            }
            if (!hasNetworkConnection()) {
                swipeRefresh.isRefreshing = false
                updateOnlineState(false)
                return@setOnRefreshListener
            }
            webView.reload()
        }
    }

    private fun installScrollTracking() {
        webView.evaluateJavascript(
            """
            (function() {
              function getScrollY() {
                var y = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
                var mains = document.querySelectorAll('main');
                for (var i = 0; i < mains.length; i++) {
                  y = Math.max(y, mains[i].scrollTop || 0);
                }
                return Math.round(y);
              }
              function report() {
                if (window.SwarkaAdmin && window.SwarkaAdmin.onPageScroll) {
                  window.SwarkaAdmin.onPageScroll(getScrollY());
                }
              }
              if (window.__swarkaScrollHook) {
                report();
                return;
              }
              window.__swarkaScrollHook = true;
              window.addEventListener('scroll', report, { passive: true });
              document.addEventListener('scroll', report, { passive: true, capture: true });
              report();
            })();
            """.trimIndent(),
            null
        )
    }

    private fun setupNetworkMonitor() {
        connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        updateOnlineState(hasNetworkConnection())

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        connectivityManager?.registerNetworkCallback(request, networkCallback)
    }

    private fun setupRetryButton() {
        retryButton.setOnClickListener {
            if (hasNetworkConnection()) {
                updateOnlineState(true)
                loadAdminIfReady(forceReload = true)
            } else {
                Toast.makeText(this, R.string.offline_title, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun scheduleLeadChecks() {
        LeadNotificationScheduler.schedule(this)
        lifecycleScope.launch {
            while (isActive) {
                LeadChecker.checkAndNotify(this@AdminWebActivity)
                delay(60_000)
            }
        }
    }

    private fun loadAdminIfReady(forceReload: Boolean = false) {
        lifecycleScope.launch {
            val token = sessionManager.getToken()
            if (token.isNullOrBlank()) {
                progressBar.visibility = View.GONE
                errorText.visibility = View.VISIBLE
                errorText.text = getString(R.string.login_failed)
                return@launch
            }

            if (!hasNetworkConnection()) {
                progressBar.visibility = View.GONE
                updateOnlineState(false)
                return@launch
            }

            errorText.visibility = View.GONE
            offlinePanel.visibility = View.GONE
            webView.visibility = View.VISIBLE

            if (forceReload || webView.url.isNullOrBlank()) {
                tokenInjected = false
                progressBar.visibility = View.VISIBLE
                webView.loadUrl(BuildConfig.ADMIN_URL)
            }
        }
    }

    private fun updateOnlineState(online: Boolean) {
        isOnline = online
        if (online) {
            offlinePanel.visibility = View.GONE
            webView.visibility = View.VISIBLE
        } else {
            swipeRefresh.isRefreshing = false
            progressBar.visibility = View.GONE
            offlinePanel.visibility = View.VISIBLE
            webView.visibility = View.GONE
        }
    }

    private fun hasNetworkConnection(): Boolean {
        val manager = connectivityManager ?: return true
        val network = manager.activeNetwork ?: return false
        val capabilities = manager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun requiredMediaPermission(): String {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            android.Manifest.permission.READ_MEDIA_IMAGES
        } else {
            android.Manifest.permission.READ_EXTERNAL_STORAGE
        }
    }

    private fun hasMediaPermission(): Boolean {
        return ContextCompat.checkSelfPermission(this, requiredMediaPermission()) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    private fun showFileSourceDialog() {
        if (pendingAcceptsImagesOnly) {
            AlertDialog.Builder(this)
                .setTitle(R.string.file_chooser_title)
                .setItems(arrayOf(getString(R.string.file_chooser_gallery), getString(R.string.file_chooser_camera))) { _, which ->
                    when (which) {
                        0 -> openGalleryChooser()
                        1 -> requestCameraCapture()
                    }
                }
                .setOnCancelListener { cancelFileChooser() }
                .show()
        } else {
            openGalleryChooser()
        }
    }

    private fun openGalleryChooser() {
        val intent = pendingFileChooserIntent ?: Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "image/*"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        pendingFileChooserIntent = null

        try {
            fileChooserLauncher.launch(
                Intent.createChooser(intent, getString(R.string.file_chooser_title))
            )
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, R.string.file_chooser_unavailable, Toast.LENGTH_SHORT).show()
            cancelFileChooser()
        }
    }

    private fun requestCameraCapture() {
        if (hasCameraPermission()) {
            launchCameraCapture()
        } else {
            cameraPermissionLauncher.launch(android.Manifest.permission.CAMERA)
        }
    }

    private fun launchCameraCapture() {
        val photosDir = File(cacheDir, "photos").apply { mkdirs() }
        val photoFile = File(photosDir, "capture_${System.currentTimeMillis()}.jpg")
        val uri = FileProvider.getUriForFile(
            this,
            "${BuildConfig.APPLICATION_ID}.fileprovider",
            photoFile
        )
        cameraPhotoUri = uri
        takePictureLauncher.launch(uri)
    }

    private fun cancelFileChooser() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        pendingFileChooserIntent = null
        cameraPhotoUri = null
    }

    private fun isLoginUrl(uri: Uri): Boolean {
        val path = uri.path.orEmpty()
        return path == "/login" || path.startsWith("/login/")
    }

    private fun handleNativeLogout() {
        if (isLoggingOut) return
        isLoggingOut = true

        cancelFileChooser()
        sessionManager.clearSession()
        CookieManager.getInstance().removeAllCookies(null)
        CookieManager.getInstance().flush()
        webView.stopLoading()
        webView.clearHistory()
        webView.clearCache(true)

        val intent = Intent(this, PinUnlockActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        startActivity(intent)
        finish()
    }

    private fun handleSwitchAccount() {
        cancelFileChooser()
        sessionManager.clearSession()
        sessionManager.clearRememberedAccount()
        CookieManager.getInstance().removeAllCookies(null)
        CookieManager.getInstance().flush()
        webView.stopLoading()

        startActivity(Intent(this, AccountPickerActivity::class.java))
        finish()
    }

    private fun showSavedFeedback() {
        webView.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
        vibrateSuccess()
        playSuccessTone()
        Toast.makeText(this, R.string.saved_toast, Toast.LENGTH_SHORT).show()
    }

    private fun vibrateSuccess() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibrator = (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
            vibrator.vibrate(VibrationEffect.createOneShot(40, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(40, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(40)
            }
        }
    }

    private fun playSuccessTone() {
        try {
            val tone = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80)
            tone.startTone(ToneGenerator.TONE_PROP_ACK, 120)
            tone.release()
        } catch (_: Exception) {
        }
    }

    private fun injectTokenIfNeeded() {
        if (tokenInjected) return
        val token = sessionManager.getToken() ?: return
        val escaped = token.replace("\\", "\\\\").replace("'", "\\'")
        val script = """
            (function() {
              try {
                localStorage.setItem('${SessionManager.TOKEN_STORAGE_KEY}', '$escaped');
                if (window.location.pathname.indexOf('/login') !== -1) {
                  window.location.replace('/');
                }
              } catch (e) {}
            })();
        """.trimIndent()
        webView.evaluateJavascript(script) {
            tokenInjected = true
            pendingDeepLinkPath?.let { path ->
                pendingDeepLinkPath = null
                navigateToPath(path)
            }
        }
    }

    private fun navigateToPath(path: String) {
        val url = BuildConfig.ADMIN_URL.trimEnd('/') + path
        webView.loadUrl(url)
    }

    private fun dialPhone(phone: String) {
        val normalized = phone.trim()
        if (normalized.isBlank()) return
        startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$normalized")))
    }

    private fun launchWhatsApp(phone: String, text: String?) {
        val digits = phone.filter { it.isDigit() }
        if (digits.isBlank()) return
        val builder = StringBuilder("https://wa.me/$digits")
        if (!text.isNullOrBlank()) {
            builder.append("?text=")
            builder.append(Uri.encode(text))
        }
        openExternalUrl(Uri.parse(builder.toString()))
    }

    private fun openExternalUrl(uri: Uri): Boolean {
        return try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
            true
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, R.string.browser_unavailable, Toast.LENGTH_SHORT).show()
            false
        }
    }

    private fun showErrorFeedback(message: String) {
        Toast.makeText(this, getString(R.string.error_toast_prefix, message), Toast.LENGTH_LONG).show()
    }

    private fun setLoadingOverlay(visible: Boolean) {
        loadingOverlay.visibility = if (visible) View.VISIBLE else View.GONE
    }

    override fun onDestroy() {
        connectivityManager?.unregisterNetworkCallback(networkCallback)
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (filePathCallback != null) {
            cancelFileChooser()
            return
        }
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            moveTaskToBack(true)
        }
    }

    private inner class AndroidBridge {
        @JavascriptInterface
        fun onLogout() {
            runOnUiThread { handleNativeLogout() }
        }

        @JavascriptInterface
        fun onSwitchAccount() {
            runOnUiThread { handleSwitchAccount() }
        }

        @JavascriptInterface
        fun onSaved() {
            runOnUiThread { showSavedFeedback() }
        }

        @JavascriptInterface
        fun onError(message: String?) {
            runOnUiThread {
                showErrorFeedback(message?.ifBlank { getString(R.string.login_failed) } ?: getString(R.string.login_failed))
            }
        }

        @JavascriptInterface
        fun onLoading(loading: Boolean) {
            runOnUiThread { setLoadingOverlay(loading) }
        }

        @JavascriptInterface
        fun openDialer(phone: String?) {
            runOnUiThread {
                if (phone != null) dialPhone(phone)
            }
        }

        @JavascriptInterface
        fun openWhatsApp(phone: String?, text: String?) {
            runOnUiThread {
                if (phone != null) launchWhatsApp(phone, text)
            }
        }

        @JavascriptInterface
        fun openExternalUrl(url: String?) {
            runOnUiThread {
                val value = url?.trim().orEmpty()
                if (value.isBlank()) return@runOnUiThread
                openExternalUrl(Uri.parse(value))
            }
        }

        @JavascriptInterface
        fun clearLeadBadge() {
            runOnUiThread { LeadBadgeManager.clear(this@AdminWebActivity) }
        }

        @JavascriptInterface
        fun onPageScroll(scrollY: Int) {
            runOnUiThread { pageScrollY = scrollY.coerceAtLeast(0) }
        }
    }

    companion object {
        const val JS_BRIDGE_NAME = "SwarkaAdmin"
        const val EXTRA_LEAD_ID = "lead_id"

        fun createLeadIntent(context: Context, leadId: String): Intent {
            return Intent(context, AdminWebActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra(EXTRA_LEAD_ID, leadId)
            }
        }
    }
}
