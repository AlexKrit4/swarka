package ru.swarka.admin

import androidx.appcompat.app.AppCompatActivity
import android.widget.TextView

class PinKeypadHelper(
    activity: AppCompatActivity,
    private val onDigit: (String) -> Unit,
    private val onDelete: () -> Unit
) {
    init {
        val digitIds = listOf(
            R.id.key0 to "0",
            R.id.key1 to "1",
            R.id.key2 to "2",
            R.id.key3 to "3",
            R.id.key4 to "4",
            R.id.key5 to "5",
            R.id.key6 to "6",
            R.id.key7 to "7",
            R.id.key8 to "8",
            R.id.key9 to "9"
        )

        digitIds.forEach { (id, digit) ->
            activity.findViewById<TextView>(id).setOnClickListener { onDigit(digit) }
        }

        activity.findViewById<TextView>(R.id.keyDelete).setOnClickListener { onDelete() }
    }
}
