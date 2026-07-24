"use client";

import { useEffect, useState } from "react";
import { DEFAULT_WHY_US, parseWhyUs, type WhyUsItem } from "@swarka/shared";
import { AuthGuard } from "@/components/AuthGuard";
import { TextField } from "@/components/ContentEditors";
import { getSettings, updateSettings } from "@/lib/api";

const ICON_OPTIONS = [
  { value: "factory", label: "01 — Цех" },
  { value: "shield", label: "02 — Гарантия" },
  { value: "ruler", label: "03 — Замер" },
  { value: "wrench", label: "04 — Монтаж" },
];

function WhyUsPageInner() {
  const [items, setItems] = useState<WhyUsItem[]>(DEFAULT_WHY_US);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((settings) => {
      setItems(parseWhyUs(settings.whyUsJson));
      setLoading(false);
    });
  }, []);

  const updateItem = (index: number, patch: Partial<WhyUsItem>) => {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await updateSettings({ whyUsJson: JSON.stringify(items) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <p className="text-gray-500">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Преимущества</h1>
          <p className="text-sm text-gray-500 mt-1">Блок «Почему мы» на главной</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            onClick={() =>
              setItems([
                ...items,
                { title: "", description: "", icon: "factory" },
              ])
            }
          >
            + Добавить
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Сохранение..." : saved ? "Сохранено ✓" : "Сохранить"}
          </button>
        </div>
      </div>

      <div className="space-y-4 max-w-2xl">
        {items.map((item, index) => (
          <section key={index} className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Карточка {index + 1}</h2>
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                Удалить
              </button>
            </div>
            <TextField
              label="Заголовок"
              value={item.title}
              onChange={(title) => updateItem(index, { title })}
            />
            <TextField
              label="Описание"
              value={item.description}
              onChange={(description) => updateItem(index, { description })}
              multiline
            />
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">Иконка</span>
              <select
                value={item.icon}
                onChange={(e) => updateItem(index, { icon: e.target.value })}
                className="w-full"
              >
                {ICON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function WhyUsPage() {
  return (
    <AuthGuard>
      <WhyUsPageInner />
    </AuthGuard>
  );
}
