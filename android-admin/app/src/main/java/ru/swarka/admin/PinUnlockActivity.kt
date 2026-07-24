package ru.swarka.admin

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import ru.swarka.admin.security.BiometricHelper
import ru.swarka.admin.security.PinManager

class PinUnlockActivity : AppCompatActivity() {
    private lateinit var pinManager: PinManager
    private lateinit var biometricHelper: BiometricHelper
    private lateinit var dotsHelper: PinDotsHelper
    private lateinit var errorText: TextView
    private var currentPin = StringBuilder()
    private var failedAttempts = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pin)

        pinManager = PinManager(this)
        biometricHelper = BiometricHelper(this)

        findViewById<TextView>(R.id.titleText).text = getString(R.string.unlock_pin_title)
        findViewById<TextView>(R.id.subtitleText).text = getString(R.string.unlock_pin_subtitle)
        errorText = findViewById(R.id.errorText)
        dotsHelper = PinDotsHelper(
            listOf(
                findViewById(R.id.dot1),
                findViewById(R.id.dot2),
                findViewById(R.id.dot3),
                findViewById(R.id.dot4)
            )
        )

        PinKeypadHelper(
            activity = this,
            onDigit = { addDigit(it) },
            onDelete = { deleteDigit() }
        )

        val biometricButton = findViewById<MaterialButton>(R.id.biometricButton)
        if (pinManager.isBiometricEnabled && biometricHelper.isAvailable()) {
            biometricButton.visibility = View.VISIBLE
            biometricButton.setOnClickListener { showBiometric() }
            window.decorView.postDelayed({ showBiometric() }, 300)
        } else {
            biometricButton.visibility = View.GONE
        }
    }

    private fun showBiometric() {
        biometricHelper.authenticate(
            title = getString(R.string.biometric_title),
            subtitle = getString(R.string.biometric_subtitle),
            onSuccess = { openAdmin() },
            onError = { message ->
                if (message.isNotBlank()) {
                    showError(message)
                }
            }
        )
    }

    private fun addDigit(digit: String) {
        if (currentPin.length >= 4) return
        errorText.visibility = View.GONE
        currentPin.append(digit)
        dotsHelper.update(currentPin.length)
        if (currentPin.length == 4) {
            window.decorView.postDelayed({ verifyPin() }, 120)
        }
    }

    private fun deleteDigit() {
        if (currentPin.isNotEmpty()) {
            currentPin.deleteCharAt(currentPin.length - 1)
            dotsHelper.update(currentPin.length)
        }
        errorText.visibility = View.GONE
    }

    private fun verifyPin() {
        val pin = currentPin.toString()
        currentPin = StringBuilder()
        dotsHelper.clear()

        if (pinManager.verifyPin(pin)) {
            openAdmin()
            return
        }

        failedAttempts++
        showError(getString(R.string.pin_invalid))
        if (failedAttempts >= 5) {
            currentPin = StringBuilder()
            dotsHelper.clear()
        }
    }

    private fun openAdmin() {
        startActivity(Intent(this, AdminWebActivity::class.java))
        finish()
    }

    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        moveTaskToBack(true)
    }
}
