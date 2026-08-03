package ru.swarka.admin.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationManagerCompat
import ru.swarka.admin.AdminWebActivity

class LeadActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val leadId = intent.getStringExtra(LeadNotificationHelper.EXTRA_LEAD_ID).orEmpty()
        val phone = intent.getStringExtra(LeadNotificationHelper.EXTRA_PHONE).orEmpty()
        val notificationId = intent.getIntExtra(LeadNotificationHelper.EXTRA_NOTIFICATION_ID, -1)

        when (intent.action) {
            LeadNotificationHelper.ACTION_CALL -> {
                if (phone.isNotBlank()) {
                    val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(dialIntent)
                }
            }
            LeadNotificationHelper.ACTION_WHATSAPP -> {
                if (phone.isNotBlank()) {
                    val digits = phone.filter { it.isDigit() }
                    val whatsappIntent = Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://wa.me/$digits")
                    ).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(whatsappIntent)
                }
            }
            LeadNotificationHelper.ACTION_OPEN_LEAD -> {
                val openIntent = AdminWebActivity.createLeadIntent(context, leadId)
                context.startActivity(openIntent)
            }
        }

        if (notificationId >= 0) {
            NotificationManagerCompat.from(context).cancel(notificationId)
        }
    }
}
