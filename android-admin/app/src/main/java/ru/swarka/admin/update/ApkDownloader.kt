package ru.swarka.admin.update

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

object ApkDownloader {
    suspend fun download(
        context: Context,
        url: String,
        onProgress: (Int) -> Unit
    ): Result<File> = withContext(Dispatchers.IO) {
        runCatching {
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 30000
                readTimeout = 120000
            }

            val responseCode = connection.responseCode
            if (responseCode !in 200..299) {
                error("Download failed: HTTP $responseCode")
            }

            val totalBytes = connection.contentLengthLong.coerceAtLeast(0L)
            val outputFile = File(context.cacheDir, "swarka-admin-update.apk")
            if (outputFile.exists()) {
                outputFile.delete()
            }

            connection.inputStream.use { input ->
                outputFile.outputStream().use { output ->
                    val buffer = ByteArray(8192)
                    var downloaded = 0L
                    while (true) {
                        val read = input.read(buffer)
                        if (read == -1) break
                        output.write(buffer, 0, read)
                        downloaded += read
                        if (totalBytes > 0) {
                            val progress = ((downloaded * 100) / totalBytes).toInt().coerceIn(0, 100)
                            onProgress(progress)
                        }
                    }
                }
            }

            if (totalBytes <= 0) {
                onProgress(100)
            }

            outputFile
        }
    }
}
