"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { getLeads, updateLead, deleteLead, type Lead } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  CLOSED: "Закрыта",
};

function LeadsContent() {
  const [items, setItems] = useState<Lead[]>([]);

  const load = () => getLeads().then(setItems);
  useEffect(() => { load(); }, []);

  const handleStatus = async (id: string, status: string) => {
    await updateLead(id, { status });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Заявки</h1>

      {items.length === 0 ? (
        <p className="text-gray-500">Заявок пока нет</p>
      ) : (
        <div className="space-y-3">
          {items.map((lead) => (
            <div key={lead.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{lead.name}</p>
                  <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                    {lead.phone}
                  </a>
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
                <div className="flex flex-col gap-2">
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
                      if (confirm("Удалить заявку?")) {
                        await deleteLead(lead.id);
                        load();
                      }
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <AuthGuard>
      <LeadsContent />
    </AuthGuard>
  );
}
