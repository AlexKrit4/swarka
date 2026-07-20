"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { getReviews, createReview, updateReview, deleteReview, type Review } from "@/lib/api";

function ReviewsContent() {
  const [items, setItems] = useState<Review[]>([]);
  const [editing, setEditing] = useState<Partial<Review> | null>(null);

  const load = () => getReviews().then(setItems);
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing?.authorName || !editing.text) return;
    if (editing.id) {
      await updateReview(editing.id, editing);
    } else {
      await createReview({
        authorName: editing.authorName,
        text: editing.text,
        rating: editing.rating ?? 5,
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
        <h1 className="text-2xl font-bold">Отзывы</h1>
        <button type="button" className="btn-primary" onClick={() => setEditing({ authorName: "", text: "", rating: 5, sortOrder: items.length + 1, isActive: true })}>
          + Добавить
        </button>
      </div>

      {editing && (
        <div className="card mb-6 space-y-3">
          <input placeholder="Имя" value={editing.authorName ?? ""} onChange={(e) => setEditing({ ...editing, authorName: e.target.value })} />
          <textarea placeholder="Текст отзыва" rows={3} value={editing.text ?? ""} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
          <input type="number" min={1} max={5} placeholder="Рейтинг" value={editing.rating ?? 5} onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })} />
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={handleSave}>Сохранить</button>
            <button type="button" className="text-sm text-gray-500" onClick={() => setEditing(null)}>Отмена</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="card">
            <p className="font-semibold">{item.authorName} — {"★".repeat(item.rating)}</p>
            <p className="text-sm text-gray-600 mt-1">{item.text}</p>
            <div className="flex gap-2 mt-3">
              <button type="button" className="text-sm underline" onClick={() => setEditing(item)}>Изменить</button>
              <button type="button" className="btn-danger" onClick={async () => { if (confirm("Удалить?")) { await deleteReview(item.id); load(); } }}>Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <AuthGuard>
      <ReviewsContent />
    </AuthGuard>
  );
}
