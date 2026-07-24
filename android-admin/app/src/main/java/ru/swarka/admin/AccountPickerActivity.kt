package ru.swarka.admin

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.launch
import ru.swarka.admin.security.SessionManager

class AccountPickerActivity : AppCompatActivity() {
    private lateinit var sessionManager: SessionManager
    private lateinit var progressBar: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var accountsList: RecyclerView
    private var accounts: List<AdminAccount> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_account_picker)

        sessionManager = SessionManager(this)
        progressBar = findViewById(R.id.progressBar)
        errorText = findViewById(R.id.errorText)
        accountsList = findViewById(R.id.accountsList)
        accountsList.layoutManager = LinearLayoutManager(this)

        loadAccounts()
    }

    private fun loadAccounts() {
        lifecycleScope.launch {
            val result = sessionManager.fetchAccounts()
            progressBar.visibility = View.GONE
            result.onSuccess { list ->
                accounts = list
                if (list.isEmpty()) {
                    showError(getString(R.string.account_picker_empty))
                    return@onSuccess
                }
                accountsList.visibility = View.VISIBLE
                accountsList.adapter = AccountAdapter(list) { account ->
                    onAccountSelected(account)
                }
            }.onFailure {
                showError(getString(R.string.account_picker_error))
            }
        }
    }

    private fun onAccountSelected(account: AdminAccount) {
        val savedPassword = sessionManager.getSavedPassword(account.id)
        if (savedPassword != null) {
            loginAndOpen(account, savedPassword)
            return
        }
        showPasswordDialog(account)
    }

    private fun showPasswordDialog(account: AdminAccount) {
        val input = EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
            hint = getString(R.string.password_hint)
            setPadding(48, 32, 48, 32)
        }

        AlertDialog.Builder(this)
            .setTitle(account.name ?: account.email)
            .setMessage(getString(R.string.enter_password_for_account))
            .setView(input)
            .setPositiveButton(R.string.login_button) { _, _ ->
                val password = input.text.toString()
                if (password.isNotBlank()) {
                    sessionManager.savePassword(account.id, password)
                    loginAndOpen(account, password)
                }
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun loginAndOpen(account: AdminAccount, password: String) {
        progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            val result = sessionManager.login(account.email, password)
            progressBar.visibility = View.GONE
            result.onSuccess {
                startActivity(Intent(this@AccountPickerActivity, AdminWebActivity::class.java))
                finish()
            }.onFailure {
                sessionManager.clearPassword(account.id)
                showError(it.message ?: getString(R.string.login_failed))
            }
        }
    }

    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
    }

    private class AccountAdapter(
        private val items: List<AdminAccount>,
        private val onClick: (AdminAccount) -> Unit
    ) : RecyclerView.Adapter<AccountAdapter.ViewHolder>() {

        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val name: TextView = view.findViewById(R.id.accountName)
            val email: TextView = view.findViewById(R.id.accountEmail)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_account, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val item = items[position]
            holder.name.text = item.name ?: item.email
            holder.email.text = item.email
            holder.itemView.setOnClickListener { onClick(item) }
        }

        override fun getItemCount() = items.size
    }
}
