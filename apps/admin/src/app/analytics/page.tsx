"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { getAnalytics, type AnalyticsSummary } from "@/lib/api";

const PERIODS = [
  { label: "7 дней", days: 7 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
];

const DEVICE_LABELS: Record<string, string> = {
  mobile: "Телефон",
  desktop: "Компьютер",
  tablet: "Планшет",
  unknown: "Другое",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function AnalyticsContent() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAnalytics(days)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading || !data) {
    return <p className="text-gray-500">Загрузка статистики...</p>;
  }

  const maxVisits = Math.max(...data.visitsByDay.map((d) => d.visits), 1);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Статистика сайта</h1>
          <p className="text-sm text-gray-500 mt-1">
            Собственная аналитика посещений swarka-i-voditel.ru (без ботов)
          </p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((period) => (
            <button
              key={period.days}
              type="button"
              onClick={() => setDays(period.days)}
              className={`px-3 py-2 rounded-lg text-sm ${
                days === period.days
                  ? "bg-[#F7E018] text-black font-semibold"
                  : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Просмотры", value: data.visits },
          { label: "Уникальные посетители", value: data.uniqueVisitors },
          { label: "Новые посетители", value: data.newVisitors },
          { label: "Конверсия в заявку", value: `${data.conversionRate}%` },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-4">Посещения по дням</h2>
          <div className="space-y-2">
            {data.visitsByDay.map((day) => (
              <div key={day.date} className="grid grid-cols-[72px_1fr_48px] items-center gap-3 text-sm">
                <span className="text-gray-500">{formatDate(day.date)}</span>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F7E018] rounded-full"
                    style={{ width: `${Math.max((day.visits / maxVisits) * 100, day.visits > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-right font-medium">{day.visits}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Сегодня</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Просмотры</span><span className="font-semibold">{data.today.visits}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Уникальные</span><span className="font-semibold">{data.today.uniqueVisitors}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Новые</span><span className="font-semibold">{data.today.newVisitors}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Заявки</span><span className="font-semibold">{data.today.leads}</span></div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card">
          <h2 className="font-semibold mb-4">Популярные страницы</h2>
          {data.topPages.length === 0 ? (
            <p className="text-gray-500 text-sm">Пока нет данных</p>
          ) : (
            <div className="space-y-2 text-sm">
              {data.topPages.map((page) => (
                <div key={page.path} className="flex justify-between gap-3">
                  <span className="truncate">{page.path}</span>
                  <span className="font-semibold shrink-0">{page.visits}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Источники переходов</h2>
          {data.topReferrers.length === 0 ? (
            <p className="text-gray-500 text-sm">Прямые заходы или нет данных</p>
          ) : (
            <div className="space-y-2 text-sm">
              {data.topReferrers.map((item) => (
                <div key={item.referer} className="flex justify-between gap-3">
                  <span className="truncate">{item.referer}</span>
                  <span className="font-semibold shrink-0">{item.visits}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Устройства</h2>
          <div className="space-y-2 text-sm">
            {data.devices.map((item) => (
              <div key={item.device} className="flex justify-between gap-3">
                <span>{DEVICE_LABELS[item.device] ?? item.device}</span>
                <span className="font-semibold">{item.visits}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        IP-адреса хранятся в обезличенном виде. «Новые посетители» — те, кто зашёл на сайт впервые за выбранный период.
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <AnalyticsContent />
    </AuthGuard>
  );
}
