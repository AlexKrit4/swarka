package ru.swarka.admin.notifications

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import ru.swarka.admin.AdminWebActivity
import ru.swarka.admin.R

object LeadNotificationHelper {
    const val CHANNEL_ID = "swarka_leads"
    const val EXTRA_LEAD_ID = "lead_id"
    const val EXTRA_PHONE = "phone"
    const val EXTRA_NOTIFICATION_ID = "notification_id"
    const val ACTION_OPEN_LEAD = "ru.swarka.admin.action.OPEN_LEAD"
    const val ACTION_CALL = "ru.swarka.admin.action.CALL"
    const val ACTION_WHATSAPP = "ru.swarka.admin.action.WHATSAPP"

    private const val NOTIFICATION_ID_BASE = 1000

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = android.app.NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.notification_channel_leads),
            android.app.NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = context.getString(R.string.notification_channel_leads_desc)
            enableVibration(true)
        }
        val manager = context.getSystemService(android.app.NotificationManager::class.java)
        manager?.createNotificationChannel(channel)
    }

    fun showNewLeadNotification(
        context: Context,
        name: String,
        phone: String,
        serviceType: String?,
        leadId: String
    ) {
        ensureChannel(context)
        LeadBadgeManager.increment(context)

        val notificationId = NOTIFICATION_ID_BASE + (leadId.hashCode() and 0x7FFF)
        val unreadCount = LeadBadgeManager.getCount(context)

        val text = buildString {
            append(phone)
            if (!serviceType.isNullOrBlank()) {
                append(" · ")
                append(serviceType)
            }
        }

        val openIntent = AdminWebActivity.createLeadIntent(context, leadId)
        val contentPendingIntent = PendingIntent.getActivity(
            context,
            leadId.hashCode(),
            openIntent,
            pendingIntentFlags()
        )

        val callPendingIntent = actionPendingIntent(
            context = context,
            action = ACTION_CALL,
            requestCode = leadId.hashCode() + 1,
            leadId = leadId,
            phone = phone,
            notificationId = notificationId
        )

        val whatsappPendingIntent = actionPendingIntent(
            context = context,
            action = ACTION_WHATSAPP,
            requestCode = leadId.hashCode() + 2,
            leadId = leadId,
            phone = phone,
            notificationId = notificationId
        )

        val openLeadPendingIntent = actionPendingIntent(
            context = context,
            action = ACTION_OPEN_LEAD,
            requestCode = leadId.hashCode() + 3,
            leadId = leadId,
            phone = phone,
            notificationId = notificationId
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(context.getString(R.string.notification_new_lead, name))
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setContentIntent(contentPendingIntent)
            .setNumber(unreadCount)
            .addAction(R.drawable.ic_notification, context.getString(R.string.notification_action_call), callPendingIntent)
            .addAction(R.drawable.ic_notification, context.getString(R.string.notification_action_whatsapp), whatsappPendingIntent)
            .addAction(R.drawable.ic_notification, context.getString(R.string.notification_action_open), openLeadPendingIntent)
            .build()

        NotificationManagerCompat.from(context).notify(notificationId, notification)
    }

    private fun actionPendingIntent(
        context: Context,
        action: String,
        requestCode: Int,
        leadId: String,
        phone: String,
        notificationId: Int
    ): PendingIntent {
        val intent = Intent(context, LeadActionReceiver::class.java).apply {
            this.action = action
            putExtra(EXTRA_LEAD_ID, leadId)
            putExtra(EXTRA_PHONE, phone)
            putExtra(EXTRA_NOTIFICATION_ID, notificationId)
        }
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            pendingIntentFlags()
        )
    }

    private fun pendingIntentFlags(): Int {
        return PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    }
}
