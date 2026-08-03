package ru.swarka.admin

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import ru.swarka.admin.notifications.LeadNotificationHelper
import ru.swarka.admin.security.PinManager

class MainActivity : AppCompatActivity() {
    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { proceedToPin() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        LeadNotificationHelper.ensureChannel(this)

        if (needsNotificationPermission() && !hasNotificationPermission()) {
            AlertDialog.Builder(this)
                .setTitle(R.string.notification_permission_title)
                .setMessage(R.string.notification_permission_message)
                .setPositiveButton(android.R.string.ok) { _, _ ->
                    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
                .setNegativeButton(android.R.string.cancel) { _, _ ->
                    proceedToPin()
                }
                .setCancelable(false)
                .show()
        } else {
            proceedToPin()
        }
    }

    private fun needsNotificationPermission(): Boolean {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
    }

    private fun hasNotificationPermission(): Boolean {
        if (!needsNotificationPermission()) return true
        return ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun proceedToPin() {
        val pinManager = PinManager(this)
        val target = if (pinManager.isPinSet) PinUnlockActivity::class.java else PinSetupActivity::class.java
        startActivity(Intent(this, target))
        finish()
    }
}
