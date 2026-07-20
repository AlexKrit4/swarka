"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { ImageUpload } from "@/components/ImageUpload";
import {
  getServices,
  createService,
  updateService,
  deleteService,
  type Service,
} from "@/lib/api";

function formatPrice(priceFrom: number | null | undefined) {
  if (priceFrom == null) return "Договорная";
  return `от ${priceFrom.toLocaleString("ru-RU")} ₽`;
}

function ServicesContent() {
  const [items, setItems] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [negotiable, setNegotiable] = useState(false);

  const load = () => getServices().then(setItems);
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setNegotiable(false);
    setEditing({
      title: "",
      description: "",
      priceFrom: null,
      sortOrder: items.length + 1,
      isActive: true,
    });
  };

  const openEdit = (item: Service) => {
    setNegotiable(item.priceFrom == null);
    setEditing(item);
  };

  const handleSave = async () => {
    if (!editing?.title || !editing.description) return;
    const priceFrom = negotiable ? null : (editing.priceFrom ?? null);
    if (editing.id) {
      await updateService(editing.id, { ...editing, priceFrom });
    } else {
      await createService({
        title: editing.title,
        description: editing.description,
        priceFrom,
        imageUrl: editing.imageUrl ?? null,
        sortOrder: editing.sortOrder ?? 0,
        isActive: editing.isActive ?? true,
      });
    }
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить услугу?")) return;
    await deleteService(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Услуги</h1>
        <button type="button" className="btn-primary" onClick={openCreate}>
          + Добавить
        </button>
      </div>

      {editing && (
        <div className="card mb-6 space-y-3">
          <h2 className="font-semibold">{editing.id ? "Редактировать" : "Новая услуга"}</h2>
          <input
            placeholder="Название"
            value={editing.title ?? ""}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
          />
          <textarea
            placeholder="Описание"
            rows={3}
            value={editing.description ?? ""}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
          />

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={negotiable}
              onChange={(e) => {
                const next = e.target.checked;
                setNegotiable(next);
                if (next) setEditing({ ...editing, priceFrom: null });
              }}
            />
            Договорная цена
          </label>

          {!negotiable && (
            <input
              type="number"
              min={0}
              placeholder="Цена от, ₽"
              value={editing.priceFrom ?? ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  priceFrom: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          )}

          <input
            type="number"
            placeholder="Порядок"
            value={editing.sortOrder ?? 0}
            onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
          />
          <ImageUpload
            value={editing.imageUrl ?? null}
            onChange={(url) => setEditing({ ...editing, imageUrl: url })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editing.isActive ?? true}
              onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
            />
            Активна
          </label>
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
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-gray-500">{item.description}</p>
              <p className="text-sm mt-1 font-medium">{formatPrice(item.priceFrom)}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" className="text-sm underline" onClick={() => openEdit(item)}>
                Изменить
              </button>
              <button type="button" className="btn-danger" onClick={() => handleDelete(item.id)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <AuthGuard>
      <ServicesContent />
    </AuthGuard>
  );
}
