package ru.swarka.admin.notifications

import android.app.PendingIntent
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import ru.swarka.admin.AdminWebActivity
import ru.swarka.admin.R

object SupportNotificationHelper {
    const val CHANNEL_ID = "swarka_support"
    private const val NOTIFICATION_ID_BASE = 3000

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = android.app.NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.notification_channel_support),
            android.app.NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = context.getString(R.string.notification_channel_support_desc)
            enableVibration(true)
        }
        context.getSystemService(android.app.NotificationManager::class.java)
            ?.createNotificationChannel(channel)
    }

    fun showSupportMessageNotification(
        context: Context,
        title: String,
        preview: String,
        threadId: String
    ) {
        ensureChannel(context)

        val openIntent = AdminWebActivity.createSupportIntent(context)
        val contentPendingIntent = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID_BASE + (threadId.hashCode() and 0xffff),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val body = preview.ifBlank {
            context.getString(R.string.notification_support_default_body)
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setContentIntent(contentPendingIntent)
            .build()

        NotificationManagerCompat.from(context).notify(
            NOTIFICATION_ID_BASE + (threadId.hashCode() and 0xffff),
            notification
        )
    }
}
