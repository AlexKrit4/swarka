"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard, useAdminUser } from "@/components/AuthGuard";
import {
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  type AdminAccount,
} from "@/lib/api";

function AdminsContent() {
  const router = useRouter();
  const me = useAdminUser();
  const [items, setItems] = useState<AdminAccount[]>([]);
  const [editing, setEditing] = useState<{
    id?: string;
    email: string;
    name: string;
    password: string;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (me && me.role !== "SUPER_ADMIN") {
      router.replace("/");
    }
  }, [me, router]);

  const load = () => getAdmins().then(setItems).catch(() => setItems([]));
  useEffect(() => {
    if (me?.role === "SUPER_ADMIN") load();
  }, [me]);

  if (!me || me.role !== "SUPER_ADMIN") {
    return <p className="text-gray-500">Нет доступа</p>;
  }

  const handleSave = async () => {
    if (!editing?.email) return;
    setError("");
    try {
      if (editing.id) {
        await updateAdmin(editing.id, {
          email: editing.email,
          name: editing.name || null,
          ...(editing.password ? { password: editing.password } : {}),
        });
      } else {
        if (!editing.password || editing.password.length < 6) {
          setError("Пароль минимум 6 символов");
          return;
        }
        await createAdmin({
          email: editing.email,
          password: editing.password,
          name: editing.name || undefined,
        });
      }
      setEditing(null);
      load();
    } catch (e) {
      setError((e as Error).message || "Ошибка сохранения");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить подадмина?")) return;
    try {
      await deleteAdmin(id);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Админы</h1>
          <p className="text-sm text-gray-500 mt-1">
            Подадмины имеют те же права на контент. Управлять ими можете только вы.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setEditing({ email: "", name: "", password: "" })}
        >
          + Добавить
        </button>
      </div>

      {editing && (
        <div className="card mb-6 space-y-3">
          <h2 className="font-semibold">{editing.id ? "Изменить" : "Новый подадмин"}</h2>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={editing.email}
            onChange={(e) => setEditing({ ...editing, email: e.target.value })}
          />
          <input
            placeholder="Имя"
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          />
          <input
            type="password"
            placeholder={editing.id ? "Новый пароль (если меняете)" : "Пароль"}
            value={editing.password}
            onChange={(e) => setEditing({ ...editing, password: e.target.value })}
          />
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={handleSave}>
              Сохранить
            </button>
            <button type="button" className="text-sm text-gray-500" onClick={() => setEditing(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="card flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{item.email}</p>
              <p className="text-sm text-gray-500">
                {item.name || "—"} · {item.role === "SUPER_ADMIN" ? "Главный" : "Подадмин"}
              </p>
            </div>
            {item.role !== "SUPER_ADMIN" && (
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  className="text-sm underline"
                  onClick={() =>
                    setEditing({
                      id: item.id,
                      email: item.email,
                      name: item.name ?? "",
                      password: "",
                    })
                  }
                >
                  Изменить
                </button>
                <button type="button" className="btn-danger" onClick={() => handleDelete(item.id)}>
                  Удалить
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminsPage() {
  return (
    <AuthGuard>
      <AdminsContent />
    </AuthGuard>
  );
}
