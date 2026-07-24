package ru.swarka.admin

import android.view.View

class PinDotsHelper(private val dots: List<View>) {
    fun update(length: Int) {
        dots.forEachIndexed { index, dot ->
            dot.setBackgroundResource(
                if (index < length) R.drawable.pin_dot_filled else R.drawable.pin_dot_empty
            )
        }
    }

    fun clear() = update(0)
}
