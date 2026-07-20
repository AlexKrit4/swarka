"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { Service } from "@/lib/types";
import { submitLead } from "@/lib/api";
import { MagneticButton } from "./MagneticButton";

interface CalculatorModalProps {
  services: Service[];
}

export function CalculatorModal({ services }: CalculatorModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    gsap.fromTo(
      panelRef.current,
      { y: 24, autoAlpha: 0, scale: 0.97 },
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.4, ease: "power3.out" }
    );
  }, [open]);

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

  const handleSubmit = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 11) return;
    setStatus("loading");
    try {
      await submitLead({
        name: "Калькулятор",
        phone,
        serviceType,
        comment: `Площадь: ${area} м²`,
        source: "calculator",
      });
      setStatus("success");
      setStep(4);
    } catch {
      setStatus("idle");
    }
  };

  const reset = () => {
    setOpen(false);
    setStep(1);
    setServiceType("");
    setArea("");
    setPhone("");
    setStatus("idle");
  };

  return (
    <>
      <MagneticButton
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 hidden sm:flex items-center gap-2 bg-ink text-paper px-5 py-3 text-sm font-semibold shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)] border border-white/10"
      >
        Быстрый расчёт
      </MagneticButton>

      {open && (
        <div className="fixed inset-0 z-[100] bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            ref={panelRef}
            className="bg-paper max-w-md w-full p-6 relative border border-line opacity-0"
          >
            <button
              type="button"
              onClick={reset}
              className="absolute top-4 right-4 text-2xl text-steel hover:text-ink"
              aria-label="Закрыть"
            >
              ×
            </button>

            <p className="section-eyebrow text-accent mb-2">Калькулятор</p>
            <h3 className="font-display text-xl font-semibold mb-1 text-ink">Быстрый расчёт</h3>
            <p className="text-steel text-sm mb-6">Шаг {Math.min(step, 3)} из 3</p>

            {step === 1 && (
              <div>
                <p className="font-medium mb-3 text-ink">Какой тип конструкции вам нужен?</p>
                <div className="space-y-2">
                  {services.slice(0, 5).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setServiceType(s.title);
                        setStep(2);
                      }}
                      className="w-full text-left border border-line px-4 py-3 hover:border-accent hover:bg-accent-soft transition-colors"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="font-medium mb-3 text-ink">Примерная площадь (м²)</p>
                <input
                  type="number"
                  min="1"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="input-field mb-4"
                  placeholder="Например, 20"
                />
                <button
                  type="button"
                  onClick={() => area && setStep(3)}
                  disabled={!area}
                  className="w-full btn-accent py-3 disabled:opacity-50"
                >
                  Далее
                </button>
              </div>
            )}

            {step === 3 && status !== "success" && (
              <div>
                <p className="font-medium mb-3 text-ink">Оставьте телефон — пришлём расчёт</p>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="input-field mb-4"
                  placeholder="+7 (___) ___-__-__"
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={status === "loading"}
                  className="w-full btn-ink py-3 disabled:opacity-50"
                >
                  {status === "loading" ? "Отправка..." : "Получить расчёт"}
                </button>
              </div>
            )}

            {step === 4 && status === "success" && (
              <div className="text-center py-4">
                <p className="font-display text-xl font-semibold text-ink mb-2">Спасибо!</p>
                <p className="text-steel">Мы перезвоним с расчётом в ближайшее время.</p>
                <button type="button" onClick={reset} className="mt-4 text-sm underline text-ink">
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
