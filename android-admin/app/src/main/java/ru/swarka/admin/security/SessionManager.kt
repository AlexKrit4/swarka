package ru.swarka.admin.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import ru.swarka.admin.BuildConfig
import java.net.HttpURLConnection
import java.net.URL

class SessionManager(context: Context) {
    private val prefs = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    fun clearToken() {
        prefs.edit().remove(KEY_TOKEN).apply()
    }

    suspend fun ensureLoggedIn(): Result<String> = withContext(Dispatchers.IO) {
        getToken()?.let { return@withContext Result.success(it) }
        loginWithConfiguredCredentials()
    }

    suspend fun loginWithConfiguredCredentials(): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val connection = (URL("${BuildConfig.API_URL}/api/admin/login").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 15000
                readTimeout = 15000
            }

            val body = JSONObject()
                .put("email", BuildConfig.ADMIN_LOGIN)
                .put("password", BuildConfig.ADMIN_PASSWORD)
                .toString()

            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

            val responseCode = connection.responseCode
            val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()
                ?.use { it.readText() }
                .orEmpty()

            if (responseCode !in 200..299) {
                error("Login failed: HTTP $responseCode — $responseText")
            }

            val json = JSONObject(responseText)
            val token = json.optString("token")
            if (token.isBlank()) {
                error("Login failed: token missing")
            }

            saveToken(token)
            token
        }
    }

    companion object {
        const val TOKEN_STORAGE_KEY = "swarka_admin_token"
        private const val PREFS_NAME = "swarka_session_secure"
        private const val KEY_TOKEN = "jwt_token"
    }
}
