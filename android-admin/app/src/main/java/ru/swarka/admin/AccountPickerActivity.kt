package ru.swarka.admin

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch
import ru.swarka.admin.security.SessionManager

class AccountPickerActivity : AppCompatActivity() {
    private lateinit var sessionManager: SessionManager
    private lateinit var progressBar: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var accountsList: RecyclerView
    private lateinit var manualLoginSection: LinearLayout
    private lateinit var emailInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var manualLoginButton: MaterialButton
    private lateinit var retryButton: MaterialButton
    private var accounts: List<AdminAccount> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_account_picker)

        sessionManager = SessionManager(this)
        progressBar = findViewById(R.id.progressBar)
        errorText = findViewById(R.id.errorText)
        accountsList = findViewById(R.id.accountsList)
        manualLoginSection = findViewById(R.id.manualLoginSection)
        emailInput = findViewById(R.id.emailInput)
        passwordInput = findViewById(R.id.passwordInput)
        manualLoginButton = findViewById(R.id.manualLoginButton)
        retryButton = findViewById(R.id.retryButton)
        accountsList.layoutManager = LinearLayoutManager(this)

        manualLoginButton.setOnClickListener { loginManually() }
        retryButton.setOnClickListener { loadAccounts() }

        loadAccounts()
    }

    private fun loadAccounts() {
        progressBar.visibility = View.VISIBLE
        errorText.visibility = View.GONE
        accountsList.visibility = View.GONE
        manualLoginSection.visibility = View.GONE

        lifecycleScope.launch {
            val result = sessionManager.fetchAccounts()
            progressBar.visibility = View.GONE
            result.onSuccess { list ->
                accounts = list
                if (list.isEmpty()) {
                    showManualLogin(getString(R.string.account_picker_empty))
                    return@onSuccess
                }
                accountsList.visibility = View.VISIBLE
                accountsList.adapter = AccountAdapter(list) { account ->
                    onAccountSelected(account)
                }
            }.onFailure {
                showManualLogin(getString(R.string.manual_login_hint))
            }
        }
    }

    private fun showManualLogin(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
        manualLoginSection.visibility = View.VISIBLE
    }

    private fun onAccountSelected(account: AdminAccount) {
        val savedPassword = sessionManager.getSavedPassword(account.id)
        if (savedPassword != null) {
            loginAndOpen(account.email, savedPassword, account.id)
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
                    loginAndOpen(account.email, password, account.id)
                }
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun loginManually() {
        val email = emailInput.text.toString().trim()
        val password = passwordInput.text.toString()
        if (email.isBlank() || password.isBlank()) {
            showManualLogin(getString(R.string.login_failed))
            return
        }
        loginAndOpen(email, password, null)
    }

    private fun loginAndOpen(email: String, password: String, userId: String?) {
        progressBar.visibility = View.VISIBLE
        errorText.visibility = View.GONE
        lifecycleScope.launch {
            val result = sessionManager.login(email, password)
            progressBar.visibility = View.GONE
            result.onSuccess {
                if (userId != null) {
                    sessionManager.savePassword(userId, password)
                }
                startActivity(Intent(this@AccountPickerActivity, AdminWebActivity::class.java))
                finish()
            }.onFailure {
                if (userId != null) {
                    sessionManager.clearPassword(userId)
                }
                showManualLogin(it.message ?: getString(R.string.login_failed))
            }
        }
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
