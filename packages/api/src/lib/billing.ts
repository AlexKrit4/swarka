import { prisma, HostingLedgerType, HostingPaymentStatus } from "@swarka/database";

export const MIN_TOPUP_RUB = 100;

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

function mskDateKey(date = new Date()) {
  const msk = new Date(date.getTime() + MSK_OFFSET_MS);
  return msk.toISOString().slice(0, 10);
}

export async function ensureHostingBalance() {
  const existing = await prisma.hostingBalance.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;

  return prisma.hostingBalance.create({
    data: {
      id: "singleton",
      balanceRub: 660,
      dailyRateRub: 22,
      manualSiteEnabled: true,
    },
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

export async function getBillingStatus() {
  const balance = await ensureHostingBalance();
  const active = isSiteActive(balance.balanceRub, balance.dailyRateRub, balance.manualSiteEnabled);
  const days = daysRemaining(balance.balanceRub, balance.dailyRateRub);

  return {
    balanceRub: balance.balanceRub,
    dailyRateRub: balance.dailyRateRub,
    daysRemaining: days,
    isSiteEnabled: active,
    manualSiteEnabled: balance.manualSiteEnabled,
    paidUntil: estimatePaidUntil(balance.balanceRub, balance.dailyRateRub),
    monthlyEstimateRub: balance.dailyRateRub * 30,
    minTopupRub: MIN_TOPUP_RUB,
    lowBalanceWarning: days > 0 && days <= 3,
  };
}

async function appendLedger(input: {
  type: HostingLedgerType;
  amountRub: number;
  balanceAfter: number;
  description: string;
  paymentId?: string;
  userId?: string;
  userEmail?: string;
}) {
  return prisma.hostingLedger.create({ data: input });
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
  dailyRateRub?: number;
  manualSiteEnabled?: boolean;
}) {
  await ensureHostingBalance();
  await prisma.hostingBalance.update({
    where: { id: "singleton" },
    data: {
      dailyRateRub: input.dailyRateRub,
      manualSiteEnabled: input.manualSiteEnabled,
    },
  });
  return getBillingStatus();
}

export async function runDailyChargeIfDue(now = new Date()) {
  const balance = await ensureHostingBalance();
  const todayKey = mskDateKey(now);

  if (balance.lastDailyChargeAt) {
    const lastKey = mskDateKey(balance.lastDailyChargeAt);
    if (lastKey === todayKey) {
      return { charged: false, reason: "already_charged_today" as const };
    }
  }

  if (balance.balanceRub < balance.dailyRateRub) {
    await prisma.hostingBalance.update({
      where: { id: "singleton" },
      data: { lastDailyChargeAt: now },
    });
    return { charged: false, reason: "insufficient_balance" as const };
  }

  const nextBalance = balance.balanceRub - balance.dailyRateRub;

  await prisma.$transaction(async (tx) => {
    await tx.hostingBalance.update({
      where: { id: "singleton" },
      data: {
        balanceRub: nextBalance,
        lastDailyChargeAt: now,
      },
    });

    await tx.hostingLedger.create({
      data: {
        type: HostingLedgerType.DAILY_CHARGE,
        amountRub: -balance.dailyRateRub,
        balanceAfter: nextBalance,
        description: `Списание за сутки работы сервера (${todayKey})`,
      },
    });
  });

  return { charged: true, balanceRub: nextBalance };
}

export async function getBillingHistory(limit = 50) {
  return prisma.hostingLedger.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getBillingPayments(limit = 30) {
  return prisma.hostingPayment.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
