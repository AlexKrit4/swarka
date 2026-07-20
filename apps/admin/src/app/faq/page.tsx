"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { getFaq, createFaq, updateFaq, deleteFaq, type FaqItem } from "@/lib/api";

function FaqContent() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [editing, setEditing] = useState<Partial<FaqItem> | null>(null);

  const load = () => getFaq().then(setItems);
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing?.question || !editing.answer) return;
    if (editing.id) {
      await updateFaq(editing.id, editing);
    } else {
      await createFaq({
        question: editing.question,
        answer: editing.answer,
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
        <h1 className="text-2xl font-bold">FAQ</h1>
        <button type="button" className="btn-primary" onClick={() => setEditing({ question: "", answer: "", sortOrder: items.length + 1, isActive: true })}>
          + Добавить
        </button>
      </div>

      {editing && (
        <div className="card mb-6 space-y-3">
          <input placeholder="Вопрос" value={editing.question ?? ""} onChange={(e) => setEditing({ ...editing, question: e.target.value })} />
          <textarea placeholder="Ответ" rows={3} value={editing.answer ?? ""} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} />
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={handleSave}>Сохранить</button>
            <button type="button" className="text-sm text-gray-500" onClick={() => setEditing(null)}>Отмена</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="card">
            <p className="font-semibold">{item.question}</p>
            <p className="text-sm text-gray-600 mt-1">{item.answer}</p>
            <div className="flex gap-2 mt-3">
              <button type="button" className="text-sm underline" onClick={() => setEditing(item)}>Изменить</button>
              <button type="button" className="btn-danger" onClick={async () => { if (confirm("Удалить?")) { await deleteFaq(item.id); load(); } }}>Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FaqPage() {
  return (
    <AuthGuard>
      <FaqContent />
    </AuthGuard>
  );
}
