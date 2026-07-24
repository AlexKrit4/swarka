"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { getLeads, updateLead, deleteLead, type Lead } from "@/lib/api";
import { clearLeadBadge, openDialer, openWhatsApp } from "@/lib/mobile-bridge";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  CLOSED: "Закрыта",
};

function LeadsContent() {
  const searchParams = useSearchParams();
  const highlightLeadId = searchParams.get("lead");
  const [items, setItems] = useState<Lead[]>([]);

  const load = () => getLeads().then(setItems);
  useEffect(() => {
    load();
    clearLeadBadge();
  }, []);

  const sortedItems = useMemo(() => {
    if (!highlightLeadId) return items;
    return [...items].sort((a, b) => {
      if (a.id === highlightLeadId) return -1;
      if (b.id === highlightLeadId) return 1;
      return 0;
    });
  }, [items, highlightLeadId]);

  const handleStatus = async (id: string, status: string) => {
    await updateLead(id, { status });
    load();
  };

  const whatsappText = (lead: Lead) => {
    const parts = [`Здравствуйте, ${lead.name}!`];
    if (lead.serviceType) parts.push(`По заявке: ${lead.serviceType}`);
    parts.push("Компания SWARKA.");
    return parts.join(" ");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Заявки</h1>

      {sortedItems.length === 0 ? (
        <p className="text-gray-500">Заявок пока нет</p>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((lead) => {
            const highlighted = lead.id === highlightLeadId;
            return (
              <div
                key={lead.id}
                className={`card ${highlighted ? "ring-2 ring-[#F7E018]" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{lead.name}</p>
                    <button
                      type="button"
                      onClick={() => openDialer(lead.phone)}
                      className="text-blue-600 hover:underline text-left"
                    >
                      {lead.phone}
                    </button>
                    {lead.serviceType && (
                      <p className="text-sm text-gray-600 mt-1">Услуга: {lead.serviceType}</p>
                    )}
                    {lead.comment && (
                      <p className="text-sm text-gray-600 mt-1">{lead.comment}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(lead.createdAt).toLocaleString("ru-RU")}
                      {lead.source && ` · ${lead.source}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={() => openDialer(lead.phone)}
                    >
                      Позвонить
                    </button>
                    <button
                      type="button"
                      className="border border-gray-300 text-gray-800 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                      onClick={() => openWhatsApp(lead.phone, whatsappText(lead))}
                    >
                      WhatsApp
                    </button>
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatus(lead.id, e.target.value)}
                      className="text-sm"
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={async () => {
                        await deleteLead(lead.id);
                        load();
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<p className="text-gray-500">Загрузка...</p>}>
        <LeadsContent />
      </Suspense>
    </AuthGuard>
  );
}
