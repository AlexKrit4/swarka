package ru.swarka.admin.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import ru.swarka.admin.AdminAccount
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

    fun getActiveUserId(): String? = prefs.getString(KEY_USER_ID, null)

    fun getActiveUserEmail(): String? = prefs.getString(KEY_USER_EMAIL, null)

    fun saveSession(userId: String, email: String, token: String) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_USER_ID, userId)
            .putString(KEY_USER_EMAIL, email)
            .apply()
    }

    fun clearSession() {
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_USER_ID)
            .remove(KEY_USER_EMAIL)
            .apply()
    }

    fun getSavedPassword(userId: String): String? = prefs.getString(credKey(userId), null)

    fun savePassword(userId: String, password: String) {
        prefs.edit().putString(credKey(userId), password).apply()
    }

    fun clearPassword(userId: String) {
        prefs.edit().remove(credKey(userId)).apply()
    }

    suspend fun fetchAccounts(): Result<List<AdminAccount>> = withContext(Dispatchers.IO) {
        runCatching {
            val connection = (URL("${BuildConfig.API_URL}/api/mobile/accounts").openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 15000
                readTimeout = 15000
            }

            val responseCode = connection.responseCode
            val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()
                ?.use { it.readText() }
                .orEmpty()

            if (responseCode !in 200..299) {
                error("Failed to load accounts: HTTP $responseCode")
            }

            val array = JSONArray(responseText)
            buildList {
                for (i in 0 until array.length()) {
                    val item = array.getJSONObject(i)
                    add(
                        AdminAccount(
                            id = item.getString("id"),
                            email = item.getString("email"),
                            name = item.optString("name").ifBlank { null }
                        )
                    )
                }
            }
        }
    }

    suspend fun login(email: String, password: String): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val connection = (URL("${BuildConfig.API_URL}/api/admin/login").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 15000
                readTimeout = 15000
            }

            val body = JSONObject()
                .put("email", email)
                .put("password", password)
                .toString()

            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

            val responseCode = connection.responseCode
            val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()
                ?.use { it.readText() }
                .orEmpty()

            if (responseCode !in 200..299) {
                error("Неверный логин или пароль")
            }

            val json = JSONObject(responseText)
            val token = json.optString("token")
            val user = json.optJSONObject("user")
            if (token.isBlank() || user == null) {
                error("Login failed")
            }

            val userId = user.getString("id")
            saveSession(userId, user.getString("email"), token)
            token
        }
    }

    private fun credKey(userId: String) = "cred_$userId"

    companion object {
        const val TOKEN_STORAGE_KEY = "swarka_admin_token"
        private const val PREFS_NAME = "swarka_session_secure"
        private const val KEY_TOKEN = "jwt_token"
        private const val KEY_USER_ID = "active_user_id"
        private const val KEY_USER_EMAIL = "active_user_email"
    }
}
