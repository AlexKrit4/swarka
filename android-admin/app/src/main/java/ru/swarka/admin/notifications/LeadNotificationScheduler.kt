package ru.swarka.admin.notifications

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object LeadNotificationScheduler {
    private const val WORK_NAME = "swarka_lead_check"

    fun schedule(context: Context) {
        val request = PeriodicWorkRequestBuilder<LeadCheckWorker>(15, TimeUnit.MINUTES)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
    }
}
