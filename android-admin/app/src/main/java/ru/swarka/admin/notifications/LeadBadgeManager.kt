package ru.swarka.admin.notifications

import android.content.Context

object LeadBadgeManager {
    private const val PREFS_NAME = "lead_badge"
    private const val KEY_UNREAD = "unread_count"

    fun getCount(context: Context): Int {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getInt(KEY_UNREAD, 0)
    }

    fun increment(context: Context, by: Int = 1) {
        setCount(context, getCount(context) + by)
    }

    fun clear(context: Context) {
        setCount(context, 0)
    }

    private fun setCount(context: Context, count: Int) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_UNREAD, count.coerceAtLeast(0))
            .apply()
        applyLauncherBadge(context, count)
    }

    private fun applyLauncherBadge(context: Context, count: Int) {
        try {
            me.leolin.shortcutbadger.ShortcutBadger.applyCount(context, count)
        } catch (_: Exception) {
        }
    }
}
