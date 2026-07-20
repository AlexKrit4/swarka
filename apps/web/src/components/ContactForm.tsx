"use client";

import { useState } from "react";
import type { Service } from "@/lib/types";
import { submitLead } from "@/lib/api";
import { MagneticButton } from "./MagneticButton";

interface ContactFormProps {
  services: Service[];
  defaultService?: string;
}

export function ContactForm({ services, defaultService }: ContactFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState(defaultService ?? "");
  const [comment, setComment] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (!digits) return "";
    let formatted = "+7";
    if (digits.length > 1) formatted += ` (${digits.slice(1, 4)}`;
    if (digits.length >= 4) formatted += `) ${digits.slice(4, 7)}`;
    if (digits.length >= 7) formatted += `-${digits.slice(7, 9)}`;
    if (digits.length >= 9) formatted += `-${digits.slice(9, 11)}`;
    return formatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 11) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      await submitLead({
        name,
        phone,
        serviceType: serviceType || undefined,
        comment: comment || undefined,
        source: "form",
      });
      setStatus("success");
      const ym = (window as Window & { ym?: (id: number, method: string, goal: string) => void }).ym;
      const metrikaId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
      if (ym && metrikaId) {
        ym(Number(metrikaId), "reachGoal", "form_submit");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="border border-accent/20 bg-accent-soft p-8 text-center">
        <p className="font-display text-2xl font-semibold text-ink mb-2">Заявка отправлена!</p>
        <p className="text-steel">Перезвоним в течение 15 минут в рабочее время.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-steel mb-2">
          Ваше имя
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          placeholder="Иван"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-steel mb-2">
          Телефон
        </label>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          className="input-field"
          placeholder="+7 (___) ___-__-__"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-steel mb-2">
          Тип работ
        </label>
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className="input-field bg-white"
        >
          <option value="">Выберите услугу</option>
          {services.map((s) => (
            <option key={s.id} value={s.title}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-steel mb-2">
          Комментарий
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="input-field resize-none"
          placeholder="Опишите задачу или адрес объекта"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-steel">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 accent-[var(--accent)]"
          required
        />
        <span>
          Согласен с{" "}
          <a href="/privacy" className="underline text-ink">
            политикой конфиденциальности
          </a>
        </span>
      </label>
      {status === "error" && (
        <p className="text-accent text-sm">Проверьте данные и попробуйте снова</p>
      )}
      <MagneticButton
        type="submit"
        disabled={status === "loading"}
        className="w-full btn-accent py-4 text-base disabled:opacity-50"
      >
        {status === "loading" ? "Отправка..." : "Отправить заявку"}
      </MagneticButton>
    </form>
  );
}
