package ru.swarka.admin.notifications

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import ru.swarka.admin.security.SessionManager

class SwarkaFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        if (data["type"] != "new_lead") return

        val leadId = data["leadId"] ?: return
        val name = data["name"] ?: "Клиент"
        val phone = data["phone"] ?: return
        val serviceType = data["serviceType"]?.ifBlank { null }

        LeadNotificationHelper.showNewLeadNotification(
            context = applicationContext,
            name = name,
            phone = phone,
            serviceType = serviceType,
            leadId = leadId
        )

        val prefs = LeadCheckPrefs(applicationContext)
        prefs.addKnownLeadIds(listOf(leadId))
    }

    override fun onNewToken(token: String) {
        val sessionManager = SessionManager(applicationContext)
        if (sessionManager.getToken().isNullOrBlank()) return
        FcmRegistrar.registerCurrentTokenAsync(applicationContext)
    }
}
