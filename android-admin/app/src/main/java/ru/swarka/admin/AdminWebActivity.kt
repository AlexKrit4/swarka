package ru.swarka.admin

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
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

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val host = request.url.host.orEmpty()
                val allowed = host.endsWith("swarka-i-voditel.ru")
                return !allowed
            }

            override fun onPageFinished(view: WebView, url: String?) {
                progressBar.visibility = View.GONE
                injectTokenIfNeeded()
            }
        }

        lifecycleScope.launch {
            val result = sessionManager.ensureLoggedIn()
            result.onSuccess {
                tokenInjected = false
                webView.loadUrl(BuildConfig.ADMIN_URL)
            }.onFailure {
                progressBar.visibility = View.GONE
                errorText.visibility = View.VISIBLE
            }
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
}
