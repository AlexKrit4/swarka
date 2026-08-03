import { prisma, HostingLedgerType, HostingPaymentStatus } from "@swarka/database";

export const MIN_TOPUP_RUB = 100;

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

const DEFAULT_TARIFFS = [
  {
    id: "tariff_basic",
    name: "Базовый",
    tagline: "Сайт работает стабильно",
    cpuLabel: "2 ядра",
    ramLabel: "2 ГБ RAM",
    storageLabel: "SSD 20 ГБ",
    extrasLabel: "",
    dailyRateRub: 22,
    sortOrder: 10,
  },
  {
    id: "tariff_standard",
    name: "Стандарт",
    tagline: "Быстрее открывается, запас под пики",
    cpuLabel: "4 ядра",
    ramLabel: "4 ГБ RAM",
    storageLabel: "SSD 40 ГБ",
    extrasLabel: "",
    dailyRateRub: 35,
    sortOrder: 20,
  },
  {
    id: "tariff_pro",
    name: "Про",
    tagline: "Для рекламы и большой нагрузки",
    cpuLabel: "6 ядер",
    ramLabel: "8 ГБ RAM",
    storageLabel: "SSD 80 ГБ",
    extrasLabel: "Приоритет",
    dailyRateRub: 55,
    sortOrder: 30,
  },
  {
    id: "tariff_max",
    name: "Максимум",
    tagline: "Как у серьёзного хостинга",
    cpuLabel: "8 ядер",
    ramLabel: "16 ГБ RAM",
    storageLabel: "SSD 160 ГБ",
    extrasLabel: "Резерв питания",
    dailyRateRub: 80,
    sortOrder: 40,
  },
] as const;

function mskDateKey(date = new Date()) {
  const msk = new Date(date.getTime() + MSK_OFFSET_MS);
  return msk.toISOString().slice(0, 10);
}

export async function ensureHostingTariffs() {
  const count = await prisma.hostingTariff.count();
  if (count > 0) return;

  await prisma.hostingTariff.createMany({
    data: DEFAULT_TARIFFS.map((tariff) => ({ ...tariff, isActive: true })),
  });
}

export async function ensureHostingBalance() {
  await ensureHostingTariffs();

  const existing = await prisma.hostingBalance.findUnique({
    where: { id: "singleton" },
    include: { tariff: true },
  });
  if (existing) {
    if (!existing.tariffId) {
      const basic = await prisma.hostingTariff.findFirst({
        where: { name: "Базовый", isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      if (basic) {
        return prisma.hostingBalance.update({
          where: { id: "singleton" },
          data: { tariffId: basic.id },
          include: { tariff: true },
        });
      }
    }
    return existing;
  }

  const basic = await prisma.hostingTariff.findFirst({
    where: { OR: [{ id: "tariff_basic" }, { name: "Базовый" }] },
    orderBy: { sortOrder: "asc" },
  });

  return prisma.hostingBalance.create({
    data: {
      id: "singleton",
      balanceRub: 660,
      dailyRateRub: basic?.dailyRateRub ?? 22,
      tariffId: basic?.id,
      manualSiteEnabled: true,
    },
    include: { tariff: true },
  });
}

export function daysRemaining(balanceRub: number, dailyRateRub: number) {
  if (dailyRateRub <= 0) return 0;
  return Math.floor(balanceRub / dailyRateRub);
}

export function isSiteActive(balanceRub: number, dailyRateRub: number, manualSiteEnabled: boolean) {
  return manualSiteEnabled && balanceRub >= dailyRateRub;
}

export function estimatePaidUntil(balanceRub: number, dailyRateRub: number) {
  const days = daysRemaining(balanceRub, dailyRateRub);
  if (days <= 0) return null;
  const until = new Date();
  until.setUTCDate(until.getUTCDate() + days);
  return until.toISOString();
}

function serializeTariff(tariff: {
  id: string;
  name: string;
  tagline: string;
  cpuLabel: string;
  ramLabel: string;
  storageLabel: string;
  extrasLabel: string;
  dailyRateRub: number;
  sortOrder: number;
  isActive: boolean;
}) {
  return {
    id: tariff.id,
    name: tariff.name,
    tagline: tariff.tagline,
    cpuLabel: tariff.cpuLabel,
    ramLabel: tariff.ramLabel,
    storageLabel: tariff.storageLabel,
    extrasLabel: tariff.extrasLabel,
    dailyRateRub: tariff.dailyRateRub,
    sortOrder: tariff.sortOrder,
    isActive: tariff.isActive,
    monthlyEstimateRub: tariff.dailyRateRub * 30,
  };
}

export async function listHostingTariffs(options?: { includeInactive?: boolean }) {
  await ensureHostingTariffs();
  return prisma.hostingTariff.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getBillingStatus() {
  const balance = await ensureHostingBalance();
  const selectedTariff = balance.tariff;
  const selectedRate = selectedTariff?.dailyRateRub ?? balance.dailyRateRub;
  const ratePending = selectedRate !== balance.dailyRateRub;
  // Days / paid-until preview uses the selected plan (what they'll pay going forward)
  const previewRate = selectedRate;
  const active = isSiteActive(balance.balanceRub, balance.dailyRateRub, balance.manualSiteEnabled);
  const days = daysRemaining(balance.balanceRub, previewRate);
  const tariffs = await listHostingTariffs({ includeInactive: false });

  return {
    balanceRub: balance.balanceRub,
    dailyRateRub: balance.dailyRateRub,
    selectedDailyRateRub: selectedRate,
    rateChangePending: ratePending,
    daysRemaining: days,
    isSiteEnabled: active,
    manualSiteEnabled: balance.manualSiteEnabled,
    paidUntil: estimatePaidUntil(balance.balanceRub, previewRate),
    monthlyEstimateRub: previewRate * 30,
    minTopupRub: MIN_TOPUP_RUB,
    lowBalanceWarning: days > 0 && days <= 3,
    tariffId: balance.tariffId,
    tariff: selectedTariff ? serializeTariff(selectedTariff) : null,
    tariffs: tariffs.map(serializeTariff),
  };
}

export async function applySuccessfulPayment(paymentId: string, externalId: string) {
  const payment = await prisma.hostingPayment.findUnique({ where: { id: paymentId } });
  if (!payment) return { applied: false, reason: "not_found" as const };
  if (payment.status === HostingPaymentStatus.SUCCEEDED) {
    return { applied: false, reason: "already_applied" as const };
  }

  const balance = await ensureHostingBalance();

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.hostingPayment.update({
      where: { id: paymentId },
      data: {
        status: HostingPaymentStatus.SUCCEEDED,
        externalId,
        paidAt: new Date(),
      },
    });

    const updatedBalance = await tx.hostingBalance.update({
      where: { id: "singleton" },
      data: { balanceRub: balance.balanceRub + payment.amountRub },
    });

    await tx.hostingLedger.create({
      data: {
        type: HostingLedgerType.PAYMENT,
        amountRub: payment.amountRub,
        balanceAfter: updatedBalance.balanceRub,
        description:
          payment.provider === "yoomoney"
            ? "Пополнение через ЮMoney"
            : "Пополнение через СБП (ЮKassa)",
        paymentId: payment.id,
        userId: payment.createdByUserId ?? undefined,
        userEmail: payment.createdByEmail ?? undefined,
      },
    });

    return updatedPayment;
  });

  return { applied: true, payment: result };
}

export async function createPendingPayment(input: {
  amountRub: number;
  userId: string;
  userEmail: string;
  provider?: string;
}) {
  if (input.amountRub < MIN_TOPUP_RUB) {
    throw new Error(`Минимальное пополнение — ${MIN_TOPUP_RUB} ₽`);
  }

  return prisma.hostingPayment.create({
    data: {
      amountRub: input.amountRub,
      status: HostingPaymentStatus.PENDING,
      provider: input.provider ?? "yoomoney",
      createdByUserId: input.userId,
      createdByEmail: input.userEmail,
    },
  });
}

export async function markPaymentFailed(paymentId: string) {
  await prisma.hostingPayment.update({
    where: { id: paymentId },
    data: { status: HostingPaymentStatus.FAILED },
  });
}

export async function manualAdjustBalance(input: {
  amountRub: number;
  description: string;
  userId: string;
  userEmail: string;
}) {
  const balance = await ensureHostingBalance();
  const nextBalance = Math.max(0, balance.balanceRub + input.amountRub);

  await prisma.$transaction(async (tx) => {
    await tx.hostingBalance.update({
      where: { id: "singleton" },
      data: { balanceRub: nextBalance },
    });

    await tx.hostingLedger.create({
      data: {
        type: HostingLedgerType.MANUAL_ADJUSTMENT,
        amountRub: input.amountRub,
        balanceAfter: nextBalance,
        description: input.description,
        userId: input.userId,
        userEmail: input.userEmail,
      },
    });
  });

  return getBillingStatus();
}

export async function updateBillingSettings(input: {
  manualSiteEnabled?: boolean;
}) {
  await ensureHostingBalance();
  await prisma.hostingBalance.update({
    where: { id: "singleton" },
    data: {
      manualSiteEnabled: input.manualSiteEnabled,
    },
  });
  return getBillingStatus();
}

export async function selectHostingTariff(tariffId: string) {
  await ensureHostingBalance();
  const tariff = await prisma.hostingTariff.findUnique({ where: { id: tariffId } });
  if (!tariff || !tariff.isActive) {
    throw new Error("Тариф не найден или отключён");
  }

  await prisma.hostingBalance.update({
    where: { id: "singleton" },
    data: { tariffId: tariff.id },
  });

  return getBillingStatus();
}

export type TariffInput = {
  name: string;
  tagline?: string;
  cpuLabel: string;
  ramLabel: string;
  storageLabel: string;
  extrasLabel?: string;
  dailyRateRub: number;
  sortOrder?: number;
  isActive?: boolean;
};

export async function createHostingTariff(input: TariffInput) {
  await ensureHostingTariffs();
  const created = await prisma.hostingTariff.create({
    data: {
      name: input.name.trim(),
      tagline: (input.tagline ?? "").trim(),
      cpuLabel: input.cpuLabel.trim(),
      ramLabel: input.ramLabel.trim(),
      storageLabel: input.storageLabel.trim(),
      extrasLabel: (input.extrasLabel ?? "").trim(),
      dailyRateRub: input.dailyRateRub,
      sortOrder: input.sortOrder ?? 100,
      isActive: input.isActive ?? true,
    },
  });
  return serializeTariff(created);
}

export async function updateHostingTariff(id: string, input: Partial<TariffInput>) {
  const existing = await prisma.hostingTariff.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Тариф не найден");
  }

  const updated = await prisma.hostingTariff.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      tagline: input.tagline !== undefined ? input.tagline.trim() : undefined,
      cpuLabel: input.cpuLabel?.trim(),
      ramLabel: input.ramLabel?.trim(),
      storageLabel: input.storageLabel?.trim(),
      extrasLabel: input.extrasLabel !== undefined ? input.extrasLabel.trim() : undefined,
      dailyRateRub: input.dailyRateRub,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });

  return serializeTariff(updated);
}

export async function deleteHostingTariff(id: string) {
  const existing = await prisma.hostingTariff.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Тариф не найден");
  }

  const balance = await ensureHostingBalance();
  if (balance.tariffId === id) {
    throw new Error("Нельзя удалить активный тариф. Сначала выберите другой.");
  }

  const activeCount = await prisma.hostingTariff.count({ where: { isActive: true } });
  if (existing.isActive && activeCount <= 1) {
    throw new Error("Должен остаться хотя бы один активный тариф");
  }

  await prisma.hostingTariff.delete({ where: { id } });
  return { success: true };
}

/**
 * Syncs HostingBalance.dailyRateRub from the selected tariff, then charges.
 * New tariff price applies starting from this daily charge (00:05).
 */
export async function runDailyChargeIfDue(now = new Date()) {
  const balance = await ensureHostingBalance();
  const todayKey = mskDateKey(now);

  if (balance.lastDailyChargeAt) {
    const lastKey = mskDateKey(balance.lastDailyChargeAt);
    if (lastKey === todayKey) {
      return { charged: false, reason: "already_charged_today" as const };
    }
  }

  const selectedRate = balance.tariff?.dailyRateRub ?? balance.dailyRateRub;
  if (selectedRate !== balance.dailyRateRub) {
    await prisma.hostingBalance.update({
      where: { id: "singleton" },
      data: { dailyRateRub: selectedRate },
    });
  }

  const chargeRate = selectedRate;

  if (balance.balanceRub < chargeRate) {
    await prisma.hostingBalance.update({
      where: { id: "singleton" },
      data: {
        dailyRateRub: chargeRate,
        lastDailyChargeAt: now,
      },
    });
    return { charged: false, reason: "insufficient_balance" as const };
  }

  const nextBalance = balance.balanceRub - chargeRate;
  const tariffName = balance.tariff?.name;

  await prisma.$transaction(async (tx) => {
    await tx.hostingBalance.update({
      where: { id: "singleton" },
      data: {
        balanceRub: nextBalance,
        dailyRateRub: chargeRate,
        lastDailyChargeAt: now,
      },
    });

    await tx.hostingLedger.create({
      data: {
        type: HostingLedgerType.DAILY_CHARGE,
        amountRub: -chargeRate,
        balanceAfter: nextBalance,
        description: tariffName
          ? `Списание за сутки · тариф «${tariffName}» (${todayKey})`
          : `Списание за сутки работы сервера (${todayKey})`,
      },
    });
  });

  return { charged: true, balanceRub: nextBalance, dailyRateRub: chargeRate };
}

export async function getBillingHistory(limit = 50) {
  return prisma.hostingLedger.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function removeLedgerEntries(input: {
  ids: string[];
  userId: string;
  userEmail: string;
}) {
  const uniqueIds = [...new Set(input.ids)];
  if (uniqueIds.length === 0) {
    throw new Error("Не выбраны операции для удаления");
  }

  const entries = await prisma.hostingLedger.findMany({
    where: { id: { in: uniqueIds }, deletedAt: null },
  });

  if (entries.length === 0) {
    throw new Error("Операции не найдены или уже удалены");
  }

  const now = new Date();
  await prisma.hostingLedger.updateMany({
    where: { id: { in: entries.map((entry) => entry.id) } },
    data: {
      deletedAt: now,
      deletedByUserId: input.userId,
      deletedByEmail: input.userEmail,
    },
  });

  return { removed: entries.length };
}

export async function getBillingPayments(limit = 30) {
  return prisma.hostingPayment.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
