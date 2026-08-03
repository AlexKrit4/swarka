package ru.swarka.admin

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import ru.swarka.admin.security.BiometricHelper
import ru.swarka.admin.security.PinManager

class PinSetupActivity : AppCompatActivity() {
    private lateinit var pinManager: PinManager
    private lateinit var biometricHelper: BiometricHelper
    private lateinit var dotsHelper: PinDotsHelper
    private lateinit var errorText: TextView
    private lateinit var titleText: TextView
    private lateinit var subtitleText: TextView

    private var firstPin: String? = null
    private var currentPin = StringBuilder()
    private var confirming = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pin)

        pinManager = PinManager(this)
        biometricHelper = BiometricHelper(this)

        titleText = findViewById(R.id.titleText)
        subtitleText = findViewById(R.id.subtitleText)
        errorText = findViewById(R.id.errorText)
        dotsHelper = PinDotsHelper(
            listOf(
                findViewById(R.id.dot1),
                findViewById(R.id.dot2),
                findViewById(R.id.dot3),
                findViewById(R.id.dot4)
            )
        )

        findViewById<MaterialButton>(R.id.biometricButton).visibility = View.GONE

        PinKeypadHelper(
            activity = this,
            onDigit = { addDigit(it) },
            onDelete = { deleteDigit() }
        )

        updateUi()
    }

    private fun addDigit(digit: String) {
        if (currentPin.length >= 4) return
        errorText.visibility = View.GONE
        currentPin.append(digit)
        dotsHelper.update(currentPin.length)
        if (currentPin.length == 4) {
            window.decorView.postDelayed({ handleCompletePin() }, 120)
        }
    }

    private fun deleteDigit() {
        if (currentPin.isNotEmpty()) {
            currentPin.deleteCharAt(currentPin.length - 1)
            dotsHelper.update(currentPin.length)
        }
        errorText.visibility = View.GONE
    }

    private fun handleCompletePin() {
        val pin = currentPin.toString()
        currentPin = StringBuilder()
        dotsHelper.clear()

        if (!confirming) {
            firstPin = pin
            confirming = true
            updateUi()
            return
        }

        if (pin != firstPin) {
            firstPin = null
            confirming = false
            showError(getString(R.string.pin_mismatch))
            updateUi()
            return
        }

        pinManager.savePin(pin)
        offerBiometric()
    }

    private fun offerBiometric() {
        if (!biometricHelper.isAvailable()) {
            openAdmin()
            return
        }

        AlertDialog.Builder(this)
            .setTitle(R.string.enable_biometric)
            .setMessage("Использовать отпечаток пальца для быстрого входа?")
            .setPositiveButton(R.string.enable_biometric) { _, _ ->
                biometricHelper.authenticate(
                    title = getString(R.string.biometric_title),
                    subtitle = getString(R.string.biometric_subtitle),
                    onSuccess = {
                        pinManager.setBiometricEnabled(true)
                        openAdmin()
                    },
                    onError = {
                        pinManager.setBiometricEnabled(false)
                        openAdmin()
                    }
                )
            }
            .setNegativeButton(R.string.skip_biometric) { _, _ ->
                pinManager.setBiometricEnabled(false)
                openAdmin()
            }
            .setCancelable(false)
            .show()
    }

    private fun openAdmin() {
        startActivity(Intent(this, AdminWebActivity::class.java))
        finish()
    }

    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
    }

    private fun updateUi() {
        titleText.text = if (confirming) getString(R.string.confirm_pin_title) else getString(R.string.setup_pin_title)
        subtitleText.text = if (confirming) "" else getString(R.string.setup_pin_subtitle)
    }
}
