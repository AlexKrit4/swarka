package ru.swarka.admin.notifications

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import ru.swarka.admin.BuildConfig
import ru.swarka.admin.security.SessionManager
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant

data class LeadSummary(
    val id: String,
    val name: String,
    val phone: String,
    val serviceType: String?,
    val createdAt: String
)

object LeadChecker {
    suspend fun checkAndNotify(context: Context): Result<Int> = withContext(Dispatchers.IO) {
        runCatching {
            val sessionManager = SessionManager(context)
            val token = sessionManager.getToken() ?: return@runCatching 0

            val prefs = LeadCheckPrefs(context)
            val since = prefs.getLastCheckedAt()
            if (since == null) {
                prefs.setLastCheckedAt(Instant.now().toString())
                return@runCatching 0
            }

            val url = buildString {
                append("${BuildConfig.API_URL}/api/mobile/leads/check")
                if (!since.isNullOrBlank()) {
                    append("?since=")
                    append(java.net.URLEncoder.encode(since, Charsets.UTF_8.name()))
                }
            }

            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("Authorization", "Bearer $token")
                connectTimeout = 15000
                readTimeout = 15000
            }

            val responseCode = connection.responseCode
            val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()
                ?.use { it.readText() }
                .orEmpty()

            if (responseCode !in 200..299) {
                error("HTTP $responseCode")
            }

            val json = JSONObject(responseText)
            val leadsArray = json.optJSONArray("leads") ?: JSONArray()
            val knownIds = prefs.getKnownLeadIds()
            val newLeads = mutableListOf<LeadSummary>()

            for (i in 0 until leadsArray.length()) {
                val item = leadsArray.getJSONObject(i)
                val id = item.getString("id")
                if (id in knownIds) continue
                newLeads.add(
                    LeadSummary(
                        id = id,
                        name = item.getString("name"),
                        phone = item.getString("phone"),
                        serviceType = item.optString("serviceType").ifBlank { null },
                        createdAt = item.getString("createdAt")
                    )
                )
            }

            if (newLeads.isNotEmpty()) {
                newLeads.forEach { lead ->
                    LeadNotificationHelper.showNewLeadNotification(
                        context = context,
                        name = lead.name,
                        phone = lead.phone,
                        serviceType = lead.serviceType,
                        leadId = lead.id
                    )
                }
                prefs.addKnownLeadIds(newLeads.map { it.id })
            }

            prefs.setLastCheckedAt(Instant.now().toString())
            newLeads.size
        }
    }
}
