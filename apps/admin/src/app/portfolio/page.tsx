"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { ImageUpload } from "@/components/ImageUpload";
import {
  getPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  type PortfolioItem,
} from "@/lib/api";

function PortfolioContent() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [editing, setEditing] = useState<Partial<PortfolioItem> | null>(null);

  const load = () => getPortfolio().then(setItems);
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing?.title || !editing.imageUrl) return;
    if (editing.id) {
      await updatePortfolio(editing.id, editing);
    } else {
      await createPortfolio({
        title: editing.title,
        description: editing.description ?? null,
        imageUrl: editing.imageUrl,
        tag: editing.tag ?? null,
        sortOrder: editing.sortOrder ?? 0,
        isActive: editing.isActive ?? true,
      });
    }
    setEditing(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Наши работы</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setEditing({ title: "", imageUrl: "", sortOrder: items.length + 1, isActive: true })}
        >
          + Добавить
        </button>
      </div>

      {editing && (
        <div className="card mb-6 space-y-3">
          <input placeholder="Название" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          <textarea placeholder="Описание" rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          <input placeholder="Тег (навес, козырёк...)" value={editing.tag ?? ""} onChange={(e) => setEditing({ ...editing, tag: e.target.value })} />
          <ImageUpload value={editing.imageUrl ?? null} onChange={(url) => setEditing({ ...editing, imageUrl: url })} />
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={handleSave}>Сохранить</button>
            <button type="button" className="text-sm text-gray-500" onClick={() => setEditing(null)}>Отмена</button>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="card">
            <p className="font-semibold">{item.title}</p>
            {item.tag && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{item.tag}</span>}
            <div className="flex gap-2 mt-3">
              <button type="button" className="text-sm underline" onClick={() => setEditing(item)}>Изменить</button>
              <button type="button" className="btn-danger" onClick={async () => { if (confirm("Удалить?")) { await deletePortfolio(item.id); load(); } }}>Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <AuthGuard>
      <PortfolioContent />
    </AuthGuard>
  );
}
