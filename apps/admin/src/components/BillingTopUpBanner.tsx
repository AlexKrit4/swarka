"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isMobileApp } from "@/lib/mobile-bridge";

type TopUpDetail = {
  amountRub: number;
  daysRemaining: number;
  paidUntil: string | null;
  isSiteEnabled: boolean;
};

function formatPaidUntil(value: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export function BillingTopUpBanner() {
  const [detail, setDetail] = useState<TopUpDetail | null>(null);

  useEffect(() => {
    if (!isMobileApp()) return;

    const handler = (event: Event) => {
      const custom = event as CustomEvent<TopUpDetail>;
      if (!custom.detail) return;
      setDetail(custom.detail);
      window.setTimeout(() => setDetail(null), 8000);
    };

    window.addEventListener("swarka:billing-topup", handler);
    return () => window.removeEventListener("swarka:billing-topup", handler);
  }, []);

  if (!detail) return null;

  const paidUntil = formatPaidUntil(detail.paidUntil);
  const daysLabel =
    detail.daysRemaining === 1
      ? "1 день"
      : detail.daysRemaining < 5
        ? `${detail.daysRemaining} дня`
        : `${detail.daysRemaining} дней`;

  return (
    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 flex flex-wrap items-center justify-between gap-2">
      <span>
        Баланс пополнен: <strong>+{detail.amountRub} ₽</strong> · хватит на {daysLabel}
        {detail.isSiteEnabled && paidUntil ? ` · сайт работает до ${paidUntil}` : ""}
      </span>
      <Link href="/billing" className="font-semibold underline">
        Открыть →
      </Link>
    </div>
  );
}
