"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { ImageUpload } from "@/components/ImageUpload";
import { getSettings, updateSettings, type SiteSettings } from "@/lib/api";

function SettingsContent() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    await updateSettings(settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (key: keyof SiteSettings, value: unknown) => {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  };

  if (!settings) return <p className="text-gray-500">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Настройки сайта</h1>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение..." : saved ? "Сохранено ✓" : "Сохранить"}
        </button>
      </div>

      <div className="space-y-6 page-stack">
        <section className="card space-y-3">
          <h2 className="font-semibold">Контакты</h2>
          <input placeholder="Название компании" value={settings.companyName} onChange={(e) => update("companyName", e.target.value)} />
          <input placeholder="Телефон" value={settings.phone} onChange={(e) => update("phone", e.target.value)} />
          <input placeholder="WhatsApp (номер)" value={settings.whatsapp ?? ""} onChange={(e) => update("whatsapp", e.target.value)} />
          <input placeholder="Telegram (username)" value={settings.telegram ?? ""} onChange={(e) => update("telegram", e.target.value)} />
          <input placeholder="Email" value={settings.email ?? ""} onChange={(e) => update("email", e.target.value)} />
          <input placeholder="Зона работы" value={settings.workZone} onChange={(e) => update("workZone", e.target.value)} />
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">Главная страница</h2>
          <input placeholder="Текст логотипа" value={settings.logoText ?? ""} onChange={(e) => update("logoText", e.target.value)} />
          <input placeholder="Заголовок Hero" value={settings.heroTitle} onChange={(e) => update("heroTitle", e.target.value)} />
          <textarea placeholder="Подзаголовок Hero" rows={2} value={settings.heroSubtitle ?? ""} onChange={(e) => update("heroSubtitle", e.target.value)} />
          <ImageUpload label="Фото Hero" value={settings.heroImageUrl} onChange={(url) => update("heroImageUrl", url)} />
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">Акция</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.promoEnabled} onChange={(e) => update("promoEnabled", e.target.checked)} />
            Показывать блок акции
          </label>
          <input placeholder="Заголовок акции" value={settings.promoTitle ?? ""} onChange={(e) => update("promoTitle", e.target.value)} />
          <input placeholder="Подзаголовок" value={settings.promoSubtitle ?? ""} onChange={(e) => update("promoSubtitle", e.target.value)} />
          <input placeholder="Бейдж" value={settings.promoBadge ?? ""} onChange={(e) => update("promoBadge", e.target.value)} />
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">SEO и аналитика</h2>
          <input placeholder="SEO Title" value={settings.seoTitle ?? ""} onChange={(e) => update("seoTitle", e.target.value)} />
          <textarea placeholder="SEO Description" rows={2} value={settings.seoDescription ?? ""} onChange={(e) => update("seoDescription", e.target.value)} />
          <input placeholder="ID Яндекс.Метрики" value={settings.yandexMetrikaId ?? ""} onChange={(e) => update("yandexMetrikaId", e.target.value)} />
        </section>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
