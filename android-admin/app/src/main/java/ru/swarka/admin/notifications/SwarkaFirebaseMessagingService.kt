package ru.swarka.admin.notifications

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import ru.swarka.admin.security.SessionManager

class SwarkaFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        when (message.data["type"]) {
            "new_lead" -> handleNewLead(message.data)
            "billing_topup" -> handleBillingTopUp(message.data)
        }
    }

    private fun handleNewLead(data: Map<String, String>) {
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

        LeadCheckPrefs(applicationContext).addKnownLeadIds(listOf(leadId))
    }

    private fun handleBillingTopUp(data: Map<String, String>) {
        val amountRub = data["amountRub"]?.toIntOrNull() ?: return
        val daysRemaining = data["daysRemaining"]?.toIntOrNull() ?: return
        val paidUntil = data["paidUntil"]?.ifBlank { null }
        val isSiteEnabled = data["isSiteEnabled"] == "1"

        BillingNotificationHelper.showTopUpNotification(
            context = applicationContext,
            amountRub = amountRub,
            daysRemaining = daysRemaining,
            paidUntil = paidUntil,
            isSiteEnabled = isSiteEnabled
        )

        BillingTopUpUiNotifier.deliver(
            context = applicationContext,
            amountRub = amountRub,
            daysRemaining = daysRemaining,
            paidUntil = paidUntil,
            isSiteEnabled = isSiteEnabled
        )
    }

    override fun onNewToken(token: String) {
        val sessionManager = SessionManager(applicationContext)
        if (sessionManager.getToken().isNullOrBlank()) return
        FcmRegistrar.registerCurrentTokenAsync(applicationContext)
    }
}
