package ru.swarka.admin.notifications

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.webkit.WebView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import ru.swarka.admin.AdminWebActivity
import ru.swarka.admin.R
import java.lang.ref.WeakReference
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private fun formatPaidUntil(paidUntil: String?): String? {
    if (paidUntil.isNullOrBlank()) return null
    return try {
        val date = LocalDate.parse(paidUntil.substring(0, 10))
        date.format(DateTimeFormatter.ofPattern("d MMMM yyyy", Locale("ru")))
    } catch (_: Exception) {
        null
    }
}

private fun buildBillingMessage(
    context: Context,
    amountRub: Int,
    daysRemaining: Int,
    paidUntil: String?,
    isSiteEnabled: Boolean,
    fullFormat: Boolean
): String {
    val daysPart = context.getString(R.string.notification_billing_topup_days, daysRemaining)
    val paidUntilFormatted = formatPaidUntil(paidUntil)
    return when {
        fullFormat && isSiteEnabled && paidUntilFormatted != null -> context.getString(
            R.string.notification_billing_topup_body_full,
            amountRub,
            daysPart,
            paidUntilFormatted
        )
        else -> context.getString(
            R.string.notification_billing_topup_body_amount_days,
            amountRub,
            daysPart
        )
    }
}

object BillingNotificationHelper {
    const val CHANNEL_ID = "swarka_billing"
    private const val NOTIFICATION_ID = 2001

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = android.app.NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.notification_channel_billing),
            android.app.NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = context.getString(R.string.notification_channel_billing_desc)
            enableVibration(true)
        }
        context.getSystemService(android.app.NotificationManager::class.java)?.createNotificationChannel(channel)
    }

    fun showTopUpNotification(
        context: Context,
        amountRub: Int,
        daysRemaining: Int,
        paidUntil: String?,
        isSiteEnabled: Boolean
    ) {
        ensureChannel(context)

        val body = buildBillingMessage(context, amountRub, daysRemaining, paidUntil, isSiteEnabled, fullFormat = true)
        val openIntent = AdminWebActivity.createBillingIntent(context)
        val contentPendingIntent = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(context.getString(R.string.notification_billing_topup_title))
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setAutoCancel(true)
            .setContentIntent(contentPendingIntent)
            .build()

        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    }
}

object BillingTopUpUiNotifier {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var webViewRef: WeakReference<WebView>? = null

    fun attachWebView(webView: WebView) {
        webViewRef = WeakReference(webView)
    }

    fun detachWebView(webView: WebView) {
        if (webViewRef?.get() === webView) {
            webViewRef = null
        }
    }

    fun deliver(
        context: Context,
        amountRub: Int,
        daysRemaining: Int,
        paidUntil: String?,
        isSiteEnabled: Boolean
    ) {
        mainHandler.post {
            val daysPart = context.getString(R.string.notification_billing_topup_days, daysRemaining)
            val paidUntilFormatted = formatPaidUntil(paidUntil)
            val toastText = if (isSiteEnabled && paidUntilFormatted != null) {
                context.getString(R.string.billing_topup_toast_full, amountRub, daysPart, paidUntilFormatted)
            } else {
                context.getString(R.string.billing_topup_toast_short, amountRub, daysPart)
            }
            Toast.makeText(context, toastText, Toast.LENGTH_LONG).show()

            val webView = webViewRef?.get() ?: return@post
            val paidUntilJson = paidUntil?.let { "\"${it.replace("\"", "\\\"")}\"" } ?: "null"
            val script = """
                (function() {
                  var detail = {
                    amountRub: $amountRub,
                    daysRemaining: $daysRemaining,
                    paidUntil: $paidUntilJson,
                    isSiteEnabled: ${if (isSiteEnabled) "true" else "false"}
                  };
                  window.dispatchEvent(new CustomEvent('swarka:billing-topup', { detail: detail }));
                })();
            """.trimIndent()
            webView.evaluateJavascript(script, null)
        }
    }
}
