package ru.swarka.admin.notifications

import android.content.Context

class LeadCheckPrefs(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getLastCheckedAt(): String? = prefs.getString(KEY_LAST_CHECKED, null)

    fun setLastCheckedAt(isoTimestamp: String) {
        prefs.edit().putString(KEY_LAST_CHECKED, isoTimestamp).apply()
    }

    fun getKnownLeadIds(): Set<String> {
        return prefs.getStringSet(KEY_KNOWN_IDS, emptySet()) ?: emptySet()
    }

    fun addKnownLeadIds(ids: Collection<String>) {
        val updated = getKnownLeadIds().toMutableSet()
        updated.addAll(ids)
        prefs.edit().putStringSet(KEY_KNOWN_IDS, updated).apply()
    }

    companion object {
        private const val PREFS_NAME = "swarka_lead_check"
        private const val KEY_LAST_CHECKED = "last_checked_at"
        private const val KEY_KNOWN_IDS = "known_lead_ids"
    }
}
