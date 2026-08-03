package ru.swarka.admin

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import ru.swarka.admin.security.SessionManager

class AdminWebActivity : AppCompatActivity() {
    private lateinit var sessionManager: SessionManager
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var errorText: TextView
    private var tokenInjected = false
    private var isLoggingOut = false
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingFileChooserIntent: Intent? = null

    private val filePermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            openPendingFileChooser()
        } else {
            Toast.makeText(this, R.string.file_permission_denied, Toast.LENGTH_SHORT).show()
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

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_admin_web)

        sessionManager = SessionManager(this)
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        errorText = findViewById(R.id.errorText)

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
                return !host.endsWith("swarka-i-voditel.ru")
            }

            override fun onPageFinished(view: WebView, url: String?) {
                progressBar.visibility = View.GONE
                if (url != null && isLoginUrl(Uri.parse(url))) {
                    handleNativeLogout()
                    return
                }
                injectTokenIfNeeded()
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
                val acceptsImagesOnly = acceptTypes?.all { it.startsWith("image/") || it == "image/*" } == true

                pendingFileChooserIntent = when {
                    fileChooserParams != null -> fileChooserParams.createIntent()
                    acceptsImagesOnly -> Intent(Intent.ACTION_GET_CONTENT).apply {
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
                    openPendingFileChooser()
                } else {
                    filePermissionLauncher.launch(requiredMediaPermission())
                }
                return true
            }
        }

        lifecycleScope.launch {
            val token = sessionManager.getToken()
            if (token.isNullOrBlank()) {
                progressBar.visibility = View.GONE
                errorText.visibility = View.VISIBLE
                errorText.text = getString(R.string.login_failed)
                return@launch
            }
            tokenInjected = false
            webView.loadUrl(BuildConfig.ADMIN_URL)
        }
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

    private fun openPendingFileChooser() {
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

    private fun cancelFileChooser() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        pendingFileChooserIntent = null
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
        }
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
    }

    companion object {
        const val JS_BRIDGE_NAME = "SwarkaAdmin"
    }
}
