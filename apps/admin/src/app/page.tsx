"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { getDashboard, type Lead, type BillingStatus } from "@/lib/api";

function DashboardContent() {
  const [data, setData] = useState<{
    todayCount: number;
    weekCount: number;
    recentLeads: Lead[];
    totalServices: number;
    totalPortfolio: number;
    analytics: {
      visitsToday: number;
      visitsWeek: number;
      uniqueVisitorsToday: number;
      uniqueVisitorsWeek: number;
      newVisitorsToday: number;
      newVisitorsWeek: number;
    };
    billing: BillingStatus;
  } | null>(null);

  useEffect(() => {
    getDashboard().then(setData).catch(console.error);
  }, []);

  if (!data) return <p className="text-gray-500">Загрузка...</p>;

  const conversionToday =
    data.analytics.visitsToday > 0
      ? Math.round((data.todayCount / data.analytics.visitsToday) * 1000) / 10
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <Link href="/analytics" className="text-sm text-gray-500 hover:text-black">
          Подробная статистика →
        </Link>
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Сервер</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/billing" className="card hover:border-[#F7E018] transition-colors">
          <p className="text-sm text-gray-500">Клиентский сайт</p>
          <p className={`text-2xl font-bold mt-1 ${data.billing.isSiteEnabled ? "text-green-700" : "text-red-700"}`}>
            {data.billing.isSiteEnabled ? "Работает" : "Отключён"}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Баланс: {data.billing.balanceRub} ₽ · {data.billing.daysRemaining} дн.
          </p>
        </Link>
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Сайт сегодня</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Просмотры", value: data.analytics.visitsToday },
          { label: "Уникальные посетители", value: data.analytics.uniqueVisitorsToday },
          { label: "Новые посетители", value: data.analytics.newVisitorsToday },
          { label: "Конверсия в заявку", value: `${conversionToday}%` },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Заявки и контент</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Заявки сегодня", value: data.todayCount },
          { label: "Заявки за неделю", value: data.weekCount },
          { label: "Просмотры за неделю", value: data.analytics.visitsWeek },
          { label: "Новые за неделю", value: data.analytics.newVisitorsWeek },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Последние заявки</h2>
        {data.recentLeads.length === 0 ? (
          <p className="text-gray-500 text-sm">Заявок пока нет</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Дата</th>
                <th className="pb-2">Имя</th>
                <th className="pb-2">Телефон</th>
                <th className="pb-2">Услуга</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-50">
                  <td className="py-2">
                    {new Date(lead.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="py-2">{lead.name}</td>
                  <td className="py-2">{lead.phone}</td>
                  <td className="py-2">{lead.serviceType ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
