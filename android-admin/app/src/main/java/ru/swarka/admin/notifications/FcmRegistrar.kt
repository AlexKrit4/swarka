package ru.swarka.admin.notifications

import android.content.Context
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONObject
import ru.swarka.admin.BuildConfig
import ru.swarka.admin.security.SessionManager
import java.net.HttpURLConnection
import java.net.URL

object FcmRegistrar {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun registerCurrentTokenAsync(context: Context) {
        scope.launch {
            registerCurrentToken(context)
        }
    }

    suspend fun registerCurrentToken(context: Context) = withContext(Dispatchers.IO) {
        runCatching {
            val sessionManager = SessionManager(context)
            val authToken = sessionManager.getToken() ?: return@runCatching

            val fcmToken = FirebaseMessaging.getInstance().token.await()
            val connection = (URL("${BuildConfig.API_URL}/api/mobile/push/register").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $authToken")
                doOutput = true
                connectTimeout = 15000
                readTimeout = 15000
            }

            val body = JSONObject().put("token", fcmToken).toString()
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

            val responseCode = connection.responseCode
            if (responseCode !in 200..299) {
                error("Push register failed: HTTP $responseCode")
            }
        }
    }
}
