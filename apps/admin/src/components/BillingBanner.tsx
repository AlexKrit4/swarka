"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBillingStatus, type BillingStatus } from "@/lib/api";

export function BillingBanner() {
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    getBillingStatus().then(setStatus).catch(() => {});
  }, []);

  if (!status) return null;

  if (!status.isSiteEnabled) {
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex flex-wrap items-center justify-between gap-2">
        <span>
          Сайт отключён — недостаточно средств на балансе сервера ({status.dailyRateRub} ₽/сутки).
        </span>
        <Link href="/billing" className="font-semibold underline">
          Пополнить →
        </Link>
      </div>
    );
  }

  if (status.lowBalanceWarning) {
    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
        <span>
          Баланс сервера: осталось {status.daysRemaining}{" "}
          {status.daysRemaining === 1 ? "день" : status.daysRemaining < 5 ? "дня" : "дней"}.
        </span>
        <Link href="/billing" className="font-semibold underline">
          Оплатить →
        </Link>
      </div>
    );
  }

  return null;
}
