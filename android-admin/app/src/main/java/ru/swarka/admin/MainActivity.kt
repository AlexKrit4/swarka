package ru.swarka.admin

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import ru.swarka.admin.security.PinManager

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val pinManager = PinManager(this)
        val target = if (pinManager.isPinSet) PinUnlockActivity::class.java else PinSetupActivity::class.java
        startActivity(Intent(this, target))
        finish()
    }
}
