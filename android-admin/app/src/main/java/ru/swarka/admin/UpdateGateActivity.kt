package ru.swarka.admin

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch
import ru.swarka.admin.update.ApkDownloader
import ru.swarka.admin.update.ApkInstaller
import ru.swarka.admin.update.AppVersionInfo
import ru.swarka.admin.update.UpdateChecker

class UpdateGateActivity : AppCompatActivity() {
    private lateinit var checkProgressBar: ProgressBar
    private lateinit var titleText: TextView
    private lateinit var subtitleText: TextView
    private lateinit var downloadProgressBar: ProgressBar
    private lateinit var progressText: TextView
    private lateinit var errorText: TextView
    private lateinit var updateButton: MaterialButton
    private lateinit var laterButton: MaterialButton

    private var latestVersion: AppVersionInfo? = null
    private var isDownloading = false

    private val installPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        if (ApkInstaller.canInstallPackages(this)) {
            startDownload()
        } else {
            showError(getString(R.string.update_install_permission_denied))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_update_gate)

        checkProgressBar = findViewById(R.id.checkProgressBar)
        titleText = findViewById(R.id.titleText)
        subtitleText = findViewById(R.id.subtitleText)
        downloadProgressBar = findViewById(R.id.progressBar)
        progressText = findViewById(R.id.progressText)
        errorText = findViewById(R.id.errorText)
        updateButton = findViewById(R.id.updateButton)
        laterButton = findViewById(R.id.laterButton)

        updateButton.setOnClickListener { onUpdateClicked() }
        laterButton.setOnClickListener { continueToApp() }

        hideUpdateUi()
        checkForUpdates()
    }

    private fun checkForUpdates() {
        lifecycleScope.launch {
            val result = UpdateChecker.fetchLatestVersion()
            checkProgressBar.visibility = View.GONE

            result.onSuccess { latest ->
                if (UpdateChecker.isUpdateAvailable(latest)) {
                    latestVersion = latest
                    showUpdateUi(latest)
                } else {
                    continueToApp()
                }
            }.onFailure {
                continueToApp()
            }
        }
    }

    private fun hideUpdateUi() {
        titleText.visibility = View.GONE
        subtitleText.visibility = View.GONE
        downloadProgressBar.visibility = View.GONE
        progressText.visibility = View.GONE
        errorText.visibility = View.GONE
        updateButton.visibility = View.GONE
        laterButton.visibility = View.GONE
    }

    private fun showUpdateUi(latest: AppVersionInfo) {
        titleText.visibility = View.VISIBLE
        subtitleText.visibility = View.VISIBLE
        updateButton.visibility = View.VISIBLE
        laterButton.visibility = View.VISIBLE
        subtitleText.text = getString(R.string.update_available_subtitle, latest.versionName)
    }

    private fun onUpdateClicked() {
        if (isDownloading) return

        if (!ApkInstaller.canInstallPackages(this)) {
            installPermissionLauncher.launch(ApkInstaller.createInstallPermissionIntent(this))
            return
        }

        startDownload()
    }

    private fun startDownload() {
        val version = latestVersion ?: return
        isDownloading = true
        errorText.visibility = View.GONE
        updateButton.isEnabled = false
        laterButton.isEnabled = false
        downloadProgressBar.visibility = View.VISIBLE
        progressText.visibility = View.VISIBLE
        downloadProgressBar.progress = 0
        progressText.text = getString(R.string.update_downloading, 0)

        lifecycleScope.launch {
            val result = ApkDownloader.download(this@UpdateGateActivity, version.downloadUrl) { progress ->
                runOnUiThread {
                    downloadProgressBar.progress = progress
                    progressText.text = getString(R.string.update_downloading, progress)
                }
            }

            isDownloading = false
            updateButton.isEnabled = true
            laterButton.isEnabled = true

            result.onSuccess { file ->
                ApkInstaller.install(this@UpdateGateActivity, file)
            }.onFailure {
                showError(getString(R.string.update_download_failed))
            }
        }
    }

    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
    }

    private fun continueToApp() {
        startActivity(Intent(this, AccountPickerActivity::class.java))
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (latestVersion != null && !isDownloading) {
            continueToApp()
        } else {
            moveTaskToBack(true)
        }
    }
}
