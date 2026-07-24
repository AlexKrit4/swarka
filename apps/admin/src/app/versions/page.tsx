"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import {
  createSnapshot,
  getChangelog,
  getSnapshots,
  restoreChangelog,
  restoreSnapshot,
  type ChangeLogItem,
  type SiteSnapshotItem,
} from "@/lib/api";
import { notifySaved } from "@/lib/mobile-bridge";

function VersionsContent() {
  const [changelog, setChangelog] = useState<ChangeLogItem[]>([]);
  const [snapshots, setSnapshots] = useState<SiteSnapshotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [log, snaps] = await Promise.all([getChangelog(), getSnapshots()]);
    setChangelog(log);
    setSnapshots(snaps);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateSnapshot = async () => {
    setBusyId("new-snapshot");
    await createSnapshot("Ручной снимок перед правками");
    setMessage("Снимок сохранён");
    notifySaved();
    await load();
    setBusyId(null);
    setTimeout(() => setMessage(null), 2000);
  };

  const handleRestoreLog = async (id: string) => {
    setBusyId(id);
    try {
      await restoreChangelog(id);
      setMessage("Изменение откачено");
      notifySaved();
      await load();
    } catch {
      setMessage("Не удалось откатить");
    }
    setBusyId(null);
    setTimeout(() => setMessage(null), 2500);
  };

  const handleRestoreSnapshot = async (id: string) => {
    setBusyId(id);
    try {
      await restoreSnapshot(id);
      setMessage("Сайт восстановлен из снимка");
      notifySaved();
      await load();
    } catch {
      setMessage("Не удалось восстановить снимок");
    }
    setBusyId(null);
    setTimeout(() => setMessage(null), 2500);
  };

  if (loading) return <p className="text-gray-500">Загрузка...</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Версии и логи</h1>
          <p className="text-sm text-gray-500 mt-1">
            История изменений с возможностью отката. Перед каждым изменением настроек создаётся автоснимок.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={handleCreateSnapshot}
          disabled={busyId === "new-snapshot"}
        >
          {busyId === "new-snapshot" ? "Сохранение..." : "Сохранить снимок"}
        </button>
      </div>

      {message && (
        <div className="card mb-6 bg-green-50 border-green-200 text-green-800 text-sm">
          {message}
        </div>
      )}

      <section className="card mb-6">
        <h2 className="font-semibold mb-4">Снимки сайта</h2>
        {snapshots.length === 0 ? (
          <p className="text-sm text-gray-500">Снимков пока нет</p>
        ) : (
          <div className="space-y-3">
            {snapshots.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-gray-100 rounded-lg p-4"
              >
                <div>
                  <p className="font-medium">{item.label ?? "Снимок"}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.createdAt).toLocaleString("ru-RU")}
                    {item.userEmail ? ` · ${item.userEmail}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  disabled={busyId === item.id}
                  onClick={() => handleRestoreSnapshot(item.id)}
                >
                  Восстановить
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="font-semibold mb-4">Журнал изменений</h2>
        {changelog.length === 0 ? (
          <p className="text-sm text-gray-500">Изменений пока нет</p>
        ) : (
          <div className="space-y-3">
            {changelog.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-gray-100 rounded-lg p-4"
              >
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.createdAt).toLocaleString("ru-RU")}
                    {item.userEmail ? ` · ${item.userEmail}` : ""}
                    {` · ${item.action}`}
                  </p>
                </div>
                {item.beforeJson && item.entityType !== "snapshot" && item.action !== "restore" && (
                  <button
                    type="button"
                    className="text-sm font-semibold text-amber-700 hover:underline"
                    disabled={busyId === item.id}
                    onClick={() => handleRestoreLog(item.id)}
                  >
                    Откатить
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function VersionsPage() {
  return (
    <AuthGuard>
      <VersionsContent />
    </AuthGuard>
  );
}
