"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { useAdminUser } from "@/components/AdminUserContext";
import {
  createBillingPayment,
  getBillingHistory,
  getBillingStatus,
  manualBillingAdjust,
  updateBillingSettings,
  type BillingLedgerItem,
  type BillingStatus,
} from "@/lib/api";
import { isMobileApp, openExternalUrl } from "@/lib/mobile-bridge";

const PRESETS = [
  { label: "100 ₽", amount: 100 },
  { label: "220 ₽ (10 дней)", amount: 220 },
  { label: "660 ₽ (30 дней)", amount: 660 },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ledgerLabel(type: BillingLedgerItem["type"]) {
  switch (type) {
    case "PAYMENT":
      return "Пополнение";
    case "DAILY_CHARGE":
      return "Списание";
    case "MANUAL_ADJUSTMENT":
      return "Корректировка";
    default:
      return type;
  }
}

function BillingContentInner() {
  const user = useAdminUser();
  const searchParams = useSearchParams();
  const isSuper = user?.role === "SUPER_ADMIN";
  const canPay = user?.role === "ADMIN" || isSuper;

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [ledger, setLedger] = useState<BillingLedgerItem[]>([]);
  const [customAmount, setCustomAmount] = useState("220");
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [manualAmount, setManualAmount] = useState("220");
  const [manualDescription, setManualDescription] = useState("Корректировка баланса");
  const [savingSettings, setSavingSettings] = useState(false);

  const reload = async () => {
    const [nextStatus, history] = await Promise.all([getBillingStatus(), getBillingHistory()]);
    setStatus(nextStatus);
    setLedger(history.ledger);
  };

  useEffect(() => {
    reload().catch(console.error);
  }, []);

  useEffect(() => {
    const paymentStatus = searchParams.get("status");
    if (paymentStatus === "success") {
      setMessage("Если оплата прошла, баланс обновится в течение минуты.");
      reload().catch(console.error);
    }
  }, [searchParams]);

  const handlePay = async (amountRub: number) => {
    if (!canPay) return;
    setPaying(true);
    setMessage(null);
    try {
      const result = await createBillingPayment(amountRub);
      if (isMobileApp()) {
        openExternalUrl(result.confirmationUrl);
        setPaying(false);
      } else {
        window.location.href = result.confirmationUrl;
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Не удалось создать платёж");
      setPaying(false);
    }
  };

  const handleCustomPay = () => {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount)) return;
    void handlePay(amount);
  };

  const handleManualAdjust = async () => {
    const amount = Number(manualAmount);
    if (!Number.isFinite(amount) || !manualDescription.trim()) return;
    setSavingSettings(true);
    try {
      await manualBillingAdjust(amount, manualDescription.trim());
      await reload();
      setMessage("Баланс обновлён");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleSite = async () => {
    if (!status) return;
    setSavingSettings(true);
    try {
      await updateBillingSettings({ manualSiteEnabled: !status.manualSiteEnabled });
      await reload();
    } finally {
      setSavingSettings(false);
    }
  };

  if (!status) return <p className="text-gray-500">Загрузка...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Оплата сервера</h1>
        <p className="text-gray-600 max-w-3xl">
          Клиентский сайт размещён на домашнем мини-компьютере и работает круглосуточно.
          Каждый день списывается плата за электроэнергию и обслуживание оборудования.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {message}
        </div>
      )}

      <div className="card border-2 border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Статус клиентского сайта</p>
            <p className={`text-2xl font-bold ${status.isSiteEnabled ? "text-green-700" : "text-red-700"}`}>
              {status.isSiteEnabled ? "Работает" : "Приостановлен"}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {status.isSiteEnabled
                ? `Оплачено примерно до ${formatDate(status.paidUntil)}`
                : "Недостаточно средств — пополните баланс"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Тариф</p>
            <p className="text-3xl font-black">{status.dailyRateRub} ₽</p>
            <p className="text-sm text-gray-500">за сутки (~{status.monthlyEstimateRub} ₽/мес)</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Баланс</p>
          <p className="text-3xl font-bold mt-1">{status.balanceRub} ₽</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Хватит на</p>
          <p className="text-3xl font-bold mt-1">{status.daysRemaining} дн.</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Мини-сервер</p>
          <p className="text-lg font-semibold mt-2">Домашний ПК 24/7</p>
          <p className="text-sm text-gray-500 mt-1">Электричество + обслуживание</p>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg mb-2">Пополнение через ЮMoney</h2>
        <p className="text-sm text-gray-600 mb-4">
          Минимальное пополнение — {status.minTopupRub} ₽. Откроется страница ЮMoney — можно
          оплатить с кошелька или банковской карты. После оплаты баланс обновится автоматически.
        </p>

        {!status.paymentConfigured && !status.yoomoneyConfigured && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            ЮMoney ещё не настроена на сервере. Попросите администратора добавить ключи оплаты.
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.amount}
              type="button"
              className="btn-primary"
              disabled={!canPay || paying || !(status.paymentConfigured ?? status.yoomoneyConfigured)}
              onClick={() => handlePay(preset.amount)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <label className="block">
            <span className="text-sm text-gray-500">Своя сумма, ₽</span>
            <input
              type="number"
              min={status.minTopupRub}
              step={1}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="mt-1 block w-40 rounded-lg border border-gray-200 px-3 py-2"
              disabled={!canPay}
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={!canPay || paying || !(status.paymentConfigured ?? status.yoomoneyConfigured)}
            onClick={handleCustomPay}
          >
            {paying ? "Переход к оплате..." : "Оплатить через ЮMoney"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg mb-3">Как это работает</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Мини-компьютер потребляет электричество и работает без перерыва.</li>
          <li>Каждый день автоматически списывается {status.dailyRateRub} ₽ за сутки работы сервера.</li>
          <li>Пока на балансе достаточно средств — клиентский сайт доступен посетителям.</li>
          <li>Если баланс закончился — сайт отключается. Админ-панель продолжает работать.</li>
        </ol>
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg mb-4">История операций</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-gray-500">Операций пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4">Дата</th>
                  <th className="pb-2 pr-4">Тип</th>
                  <th className="pb-2 pr-4">Описание</th>
                  <th className="pb-2 pr-4">Сумма</th>
                  <th className="pb-2">Баланс</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="py-2 pr-4">{ledgerLabel(item.type)}</td>
                    <td className="py-2 pr-4">{item.description}</td>
                    <td className={`py-2 pr-4 font-medium ${item.amountRub >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {item.amountRub >= 0 ? "+" : ""}
                      {item.amountRub} ₽
                    </td>
                    <td className="py-2">{item.balanceAfter} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isSuper && (
        <div className="card border border-dashed border-gray-300">
          <h2 className="font-semibold text-lg mb-3">Управление (главный админ)</h2>
          <div className="flex flex-wrap gap-3 items-end mb-4">
            <label className="block">
              <span className="text-sm text-gray-500">Сумма +/-, ₽</span>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                className="mt-1 block w-40 rounded-lg border border-gray-200 px-3 py-2"
              />
            </label>
            <label className="block flex-1 min-w-[220px]">
              <span className="text-sm text-gray-500">Комментарий</span>
              <input
                type="text"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </label>
            <button
              type="button"
              className="btn-primary"
              disabled={savingSettings}
              onClick={handleManualAdjust}
            >
              Применить
            </button>
          </div>
          <button
            type="button"
            className="text-sm underline"
            disabled={savingSettings}
            onClick={handleToggleSite}
          >
            {status.manualSiteEnabled
              ? "Принудительно отключить клиентский сайт"
              : "Принудительно включить клиентский сайт"}
          </button>
        </div>
      )}
    </div>
  );
}

function BillingContent() {
  return (
    <Suspense fallback={<p className="text-gray-500">Загрузка...</p>}>
      <BillingContentInner />
    </Suspense>
  );
}

export default function BillingPage() {
  return (
    <AuthGuard>
      <BillingContent />
    </AuthGuard>
  );
}
