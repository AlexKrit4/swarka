package ru.swarka.admin

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
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
            allowFileAccess = false
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

    private fun isLoginUrl(uri: Uri): Boolean {
        val path = uri.path.orEmpty()
        return path == "/login" || path.startsWith("/login/")
    }

    private fun handleNativeLogout() {
        if (isLoggingOut) return
        isLoggingOut = true

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
