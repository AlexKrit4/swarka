package ru.swarka.admin.update

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import ru.swarka.admin.BuildConfig
import java.net.HttpURLConnection
import java.net.URL

object UpdateChecker {
    suspend fun fetchLatestVersion(): Result<AppVersionInfo> = withContext(Dispatchers.IO) {
        runCatching {
            val connection = (URL("${BuildConfig.API_URL}/api/mobile/app-version").openConnection() as HttpURLConnection).apply {
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
                error("Version check failed: HTTP $responseCode")
            }

            val json = JSONObject(responseText)
            AppVersionInfo(
                versionCode = json.getInt("versionCode"),
                versionName = json.getString("versionName"),
                downloadUrl = json.getString("downloadUrl")
            )
        }
    }

    fun isUpdateAvailable(latest: AppVersionInfo): Boolean {
        return latest.versionCode > BuildConfig.VERSION_CODE
    }
}
