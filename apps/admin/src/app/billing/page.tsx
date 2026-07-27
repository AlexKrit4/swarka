"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { useAdminUser } from "@/components/AdminUserContext";
import {
  createBillingPayment,
  createBillingTariff,
  deleteBillingTariff,
  getBillingHistory,
  getBillingStatus,
  getBillingTariffs,
  manualBillingAdjust,
  removeBillingLedgerEntries,
  selectBillingTariff,
  updateBillingSettings,
  updateBillingTariff,
  type BillingLedgerItem,
  type BillingStatus,
  type BillingTariff,
} from "@/lib/api";
import { isMobileApp, openExternalUrl } from "@/lib/mobile-bridge";

const PRESETS = [
  { label: "100 ₽", amount: 100 },
  { label: "220 ₽ (10 дней)", amount: 220 },
  { label: "660 ₽ (30 дней)", amount: 660 },
];

const EMPTY_TARIFF_FORM = {
  name: "",
  tagline: "",
  cpuLabel: "",
  ramLabel: "",
  storageLabel: "",
  extrasLabel: "",
  dailyRateRub: "35",
  sortOrder: "50",
  isActive: true,
};

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

function tariffSpecs(tariff: BillingTariff) {
  return [tariff.cpuLabel, tariff.ramLabel, tariff.storageLabel, tariff.extrasLabel]
    .filter(Boolean)
    .join(" · ");
}

function BillingContentInner() {
  const user = useAdminUser();
  const searchParams = useSearchParams();
  const isSuper = user?.role === "SUPER_ADMIN";
  const canPay = user?.role === "ADMIN" || isSuper;
  const canSelectTariff = canPay;

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [ledger, setLedger] = useState<BillingLedgerItem[]>([]);
  const [allTariffs, setAllTariffs] = useState<BillingTariff[]>([]);
  const [customAmount, setCustomAmount] = useState("220");
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [manualAmount, setManualAmount] = useState("220");
  const [manualDescription, setManualDescription] = useState("Корректировка баланса");
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedLedgerIds, setSelectedLedgerIds] = useState<string[]>([]);
  const [removingLedger, setRemovingLedger] = useState(false);
  const [selectingTariffId, setSelectingTariffId] = useState<string | null>(null);
  const [tariffModalOpen, setTariffModalOpen] = useState(false);
  const [tariffForm, setTariffForm] = useState(EMPTY_TARIFF_FORM);
  const [editingTariffId, setEditingTariffId] = useState<string | null>(null);
  const [savingTariff, setSavingTariff] = useState(false);

  const reload = async () => {
    const [nextStatus, history, tariffsRes] = await Promise.all([
      getBillingStatus(),
      getBillingHistory(),
      isSuper ? getBillingTariffs() : Promise.resolve(null),
    ]);
    setStatus(nextStatus);
    setLedger(history.ledger);
    setSelectedLedgerIds((prev) => prev.filter((id) => history.ledger.some((item) => item.id === id)));
    if (tariffsRes) {
      setAllTariffs(tariffsRes.tariffs);
    } else {
      setAllTariffs(nextStatus.tariffs ?? []);
    }
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

  const handleSelectTariff = async (tariffId: string) => {
    if (!canSelectTariff) return;
    setSelectingTariffId(tariffId);
    setMessage(null);
    try {
      await selectBillingTariff(tariffId);
      await reload();
      setTariffModalOpen(false);
      setMessage("Тариф выбран. Новая плата начнёт списываться с 00:05.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Не удалось сменить тариф");
    } finally {
      setSelectingTariffId(null);
    }
  };

  const startEditTariff = (tariff: BillingTariff) => {
    setEditingTariffId(tariff.id);
    setTariffForm({
      name: tariff.name,
      tagline: tariff.tagline,
      cpuLabel: tariff.cpuLabel,
      ramLabel: tariff.ramLabel,
      storageLabel: tariff.storageLabel,
      extrasLabel: tariff.extrasLabel,
      dailyRateRub: String(tariff.dailyRateRub),
      sortOrder: String(tariff.sortOrder),
      isActive: tariff.isActive,
    });
  };

  const resetTariffForm = () => {
    setEditingTariffId(null);
    setTariffForm(EMPTY_TARIFF_FORM);
  };

  const handleSaveTariff = async () => {
    const dailyRateRub = Number(tariffForm.dailyRateRub);
    const sortOrder = Number(tariffForm.sortOrder);
    if (
      !tariffForm.name.trim() ||
      !tariffForm.cpuLabel.trim() ||
      !tariffForm.ramLabel.trim() ||
      !tariffForm.storageLabel.trim() ||
      !Number.isFinite(dailyRateRub) ||
      dailyRateRub < 1
    ) {
      setMessage("Заполните название, характеристики и цену тарифа");
      return;
    }

    setSavingTariff(true);
    setMessage(null);
    try {
      const payload = {
        name: tariffForm.name.trim(),
        tagline: tariffForm.tagline.trim(),
        cpuLabel: tariffForm.cpuLabel.trim(),
        ramLabel: tariffForm.ramLabel.trim(),
        storageLabel: tariffForm.storageLabel.trim(),
        extrasLabel: tariffForm.extrasLabel.trim(),
        dailyRateRub,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 50,
        isActive: tariffForm.isActive,
      };
      if (editingTariffId) {
        await updateBillingTariff(editingTariffId, payload);
        setMessage("Тариф обновлён");
      } else {
        await createBillingTariff(payload);
        setMessage("Тариф создан");
      }
      resetTariffForm();
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Не удалось сохранить тариф");
    } finally {
      setSavingTariff(false);
    }
  };

  const handleDeleteTariff = async (tariff: BillingTariff) => {
    if (!window.confirm(`Удалить тариф «${tariff.name}»?`)) return;
    setSavingTariff(true);
    setMessage(null);
    try {
      await deleteBillingTariff(tariff.id);
      if (editingTariffId === tariff.id) resetTariffForm();
      await reload();
      setMessage("Тариф удалён");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Не удалось удалить тариф");
    } finally {
      setSavingTariff(false);
    }
  };

  const toggleLedgerSelection = (id: string) => {
    setSelectedLedgerIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const toggleAllLedgerSelection = () => {
    if (selectedLedgerIds.length === ledger.length) {
      setSelectedLedgerIds([]);
      return;
    }
    setSelectedLedgerIds(ledger.map((item) => item.id));
  };

  const handleRemoveSelectedLedger = async () => {
    if (selectedLedgerIds.length === 0) return;

    const count = selectedLedgerIds.length;
    const confirmed = window.confirm(
      count === 1
        ? "Удалить выбранную операцию из истории? Баланс не изменится."
        : `Удалить ${count} операций из истории? Баланс не изменится.`
    );
    if (!confirmed) return;

    setRemovingLedger(true);
    setMessage(null);
    try {
      const result = await removeBillingLedgerEntries(selectedLedgerIds);
      setSelectedLedgerIds([]);
      await reload();
      setMessage(
        result.removed === 1
          ? "Операция удалена из истории"
          : `Удалено операций: ${result.removed}`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Не удалось удалить операции");
    } finally {
      setRemovingLedger(false);
    }
  };

  if (!status) return <p className="text-gray-500">Загрузка...</p>;

  const visibleTariffs = (status.tariffs ?? []).filter((t) => t.isActive);
  const currentTariff = status.tariff;

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
          <div className="text-right min-w-[180px]">
            <p className="text-sm text-gray-500 mb-1">Текущий тариф</p>
            <p className="text-xl font-bold">
              {currentTariff ? `«${currentTariff.name}»` : "Не выбран"}
            </p>
            <p className="text-3xl font-black mt-1">
              {status.selectedDailyRateRub ?? status.dailyRateRub} ₽
            </p>
            <p className="text-sm text-gray-500">за сутки (~{status.monthlyEstimateRub} ₽/мес)</p>
            {currentTariff && (
              <p className="text-xs text-gray-500 mt-2 max-w-[240px] ml-auto">
                {tariffSpecs(currentTariff)}
              </p>
            )}
            {currentTariff?.tagline && (
              <p className="text-xs text-gray-400 mt-1 max-w-[240px] ml-auto">{currentTariff.tagline}</p>
            )}
            {status.rateChangePending && (
              <p className="text-xs text-amber-700 mt-2 max-w-[240px] ml-auto">
                Сейчас списывается {status.dailyRateRub} ₽/сутки. Новая цена — с 00:05.
              </p>
            )}
            {canSelectTariff && (
              <button
                type="button"
                className="btn-primary mt-3"
                onClick={() => setTariffModalOpen(true)}
              >
                Поменять
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Баланс</p>
          <p className="text-3xl font-bold mt-1">{status.balanceRub} ₽</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Хватит на</p>
          <p className="text-3xl font-bold mt-1">{status.daysRemaining} дн.</p>
        </div>
      </div>

      {tariffModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!selectingTariffId) setTariffModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tariff-modal-title"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2 id="tariff-modal-title" className="text-lg font-semibold">
                  Выберите тариф
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Новая плата начнёт списываться только в 00:05.
                </p>
              </div>
              <button
                type="button"
                className="w-9 h-9 rounded-lg border border-gray-200 text-lg leading-none"
                aria-label="Закрыть"
                disabled={!!selectingTariffId}
                onClick={() => setTariffModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {visibleTariffs.map((tariff) => {
                const selected = status.tariffId === tariff.id;
                return (
                  <div
                    key={tariff.id}
                    className={`rounded-xl border p-4 ${
                      selected ? "border-[#F7E018] bg-[#F7E018]/10" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-semibold text-base">{tariff.name}</p>
                        {tariff.tagline && (
                          <p className="text-sm text-gray-600 mt-0.5">{tariff.tagline}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-black">{tariff.dailyRateRub} ₽</p>
                        <p className="text-xs text-gray-500">/сутки</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{tariffSpecs(tariff)}</p>
                    <p className="text-xs text-gray-500 mb-3">≈ {tariff.monthlyEstimateRub} ₽/мес</p>
                    <button
                      type="button"
                      className={
                        selected
                          ? "rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600"
                          : "btn-primary"
                      }
                      disabled={selected || selectingTariffId === tariff.id}
                      onClick={() => handleSelectTariff(tariff.id)}
                    >
                      {selected
                        ? "Текущий тариф"
                        : selectingTariffId === tariff.id
                          ? "Сохранение..."
                          : "Выбрать"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
          <li>
            Каждый день в 00:05 списывается плата по выбранному тарифу (
            {status.selectedDailyRateRub ?? status.dailyRateRub} ₽/сутки).
          </li>
          <li>Смена тарифа применяется со следующего списания в 00:05.</li>
          <li>Пока на балансе достаточно средств — клиентский сайт доступен посетителям.</li>
          <li>Если баланс закончился — сайт отключается. Админ-панель продолжает работать.</li>
        </ol>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-lg">История операций</h2>
          {isSuper && ledger.length > 0 && (
            <button
              type="button"
              className="btn-danger"
              disabled={selectedLedgerIds.length === 0 || removingLedger}
              onClick={handleRemoveSelectedLedger}
            >
              {removingLedger
                ? "Удаление..."
                : selectedLedgerIds.length > 0
                  ? `Удалить выбранные (${selectedLedgerIds.length})`
                  : "Удалить выбранные"}
            </button>
          )}
        </div>
        {isSuper && ledger.length > 0 && (
          <p className="text-sm text-gray-500 mb-4">
            Выберите операции, которые нужно убрать из истории. Баланс и работа сайта не изменятся.
          </p>
        )}
        {ledger.length === 0 ? (
          <p className="text-sm text-gray-500">Операций пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  {isSuper && (
                    <th className="pb-2 pr-3">
                      <input
                        type="checkbox"
                        aria-label="Выбрать все операции"
                        checked={ledger.length > 0 && selectedLedgerIds.length === ledger.length}
                        onChange={toggleAllLedgerSelection}
                      />
                    </th>
                  )}
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
                    {isSuper && (
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          aria-label={`Выбрать операцию ${item.description}`}
                          checked={selectedLedgerIds.includes(item.id)}
                          onChange={() => toggleLedgerSelection(item.id)}
                        />
                      </td>
                    )}
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
        <div className="card border border-dashed border-gray-300 space-y-6">
          <div>
            <h2 className="font-semibold text-lg mb-1">Редактор тарифов (главный админ)</h2>
            <p className="text-sm text-gray-600 mb-4">
              Можно менять названия, характеристики, цены, порядок и активность. Изменение цены
              активного тарифа тоже применится со следующего списания в 00:05.
            </p>

            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-3">Название</th>
                    <th className="pb-2 pr-3">Характеристики</th>
                    <th className="pb-2 pr-3">₽/сутки</th>
                    <th className="pb-2 pr-3">Порядок</th>
                    <th className="pb-2 pr-3">Активен</th>
                    <th className="pb-2">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {allTariffs.map((tariff) => (
                    <tr key={tariff.id} className="border-b border-gray-50 align-top">
                      <td className="py-2 pr-3">
                        <p className="font-medium">{tariff.name}</p>
                        <p className="text-xs text-gray-500">{tariff.tagline}</p>
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-700 max-w-[220px]">
                        {tariffSpecs(tariff)}
                      </td>
                      <td className="py-2 pr-3 font-medium">{tariff.dailyRateRub}</td>
                      <td className="py-2 pr-3">{tariff.sortOrder}</td>
                      <td className="py-2 pr-3">{tariff.isActive ? "Да" : "Нет"}</td>
                      <td className="py-2 space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          className="text-sm underline"
                          onClick={() => startEditTariff(tariff)}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          className="text-sm text-red-700 underline"
                          disabled={savingTariff || status.tariffId === tariff.id}
                          onClick={() => handleDeleteTariff(tariff)}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="font-medium mb-3">
              {editingTariffId ? "Редактирование тарифа" : "Новый тариф"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="text-sm text-gray-500">Название</span>
                <input
                  type="text"
                  value={tariffForm.name}
                  onChange={(e) => setTariffForm({ ...tariffForm, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-500">Краткое описание</span>
                <input
                  type="text"
                  value={tariffForm.tagline}
                  onChange={(e) => setTariffForm({ ...tariffForm, tagline: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-500">CPU</span>
                <input
                  type="text"
                  value={tariffForm.cpuLabel}
                  onChange={(e) => setTariffForm({ ...tariffForm, cpuLabel: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="4 ядра"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-500">RAM</span>
                <input
                  type="text"
                  value={tariffForm.ramLabel}
                  onChange={(e) => setTariffForm({ ...tariffForm, ramLabel: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="4 ГБ RAM"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-500">Диск</span>
                <input
                  type="text"
                  value={tariffForm.storageLabel}
                  onChange={(e) => setTariffForm({ ...tariffForm, storageLabel: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="SSD 40 ГБ"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-500">Дополнительно</span>
                <input
                  type="text"
                  value={tariffForm.extrasLabel}
                  onChange={(e) => setTariffForm({ ...tariffForm, extrasLabel: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Приоритет"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-500">Цена, ₽/сутки</span>
                <input
                  type="number"
                  min={1}
                  value={tariffForm.dailyRateRub}
                  onChange={(e) => setTariffForm({ ...tariffForm, dailyRateRub: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-500">Порядок сортировки</span>
                <input
                  type="number"
                  value={tariffForm.sortOrder}
                  onChange={(e) => setTariffForm({ ...tariffForm, sortOrder: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 mb-4 text-sm">
              <input
                type="checkbox"
                checked={tariffForm.isActive}
                onChange={(e) => setTariffForm({ ...tariffForm, isActive: e.target.checked })}
              />
              Активен (виден админам для выбора)
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-primary"
                disabled={savingTariff}
                onClick={handleSaveTariff}
              >
                {savingTariff
                  ? "Сохранение..."
                  : editingTariffId
                    ? "Сохранить тариф"
                    : "Добавить тариф"}
              </button>
              {editingTariffId && (
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
                  onClick={resetTariffForm}
                >
                  Отмена
                </button>
              )}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-lg mb-3">Прочее управление</h2>
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
