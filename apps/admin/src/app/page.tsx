"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { getDashboard, type Lead } from "@/lib/api";

function DashboardContent() {
  const [data, setData] = useState<{
    todayCount: number;
    weekCount: number;
    recentLeads: Lead[];
    totalServices: number;
    totalPortfolio: number;
  } | null>(null);

  useEffect(() => {
    getDashboard().then(setData).catch(console.error);
  }, []);

  if (!data) return <p className="text-gray-500">Загрузка...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Дашборд</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Заявки сегодня", value: data.todayCount },
          { label: "Заявки за неделю", value: data.weekCount },
          { label: "Услуг", value: data.totalServices },
          { label: "Работ в портфолио", value: data.totalPortfolio },
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
