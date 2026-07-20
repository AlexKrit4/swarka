"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { FaqItem } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

interface FAQProps {
  items: FaqItem[];
}

export function FAQ({ items }: FAQProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const answerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    items.forEach((item) => {
      const el = answerRefs.current[item.id];
      if (!el) return;
      if (openId === item.id) {
        gsap.fromTo(
          el,
          { height: 0, autoAlpha: 0 },
          { height: "auto", autoAlpha: 1, duration: 0.35, ease: "power2.out" }
        );
      } else {
        gsap.set(el, { height: 0, autoAlpha: 0 });
      }
    });
  }, [openId, items]);

  return (
    <section className="py-20 lg:py-28 bg-paper">
      <div className="max-w-3xl mx-auto px-4 lg:px-8">
        <SectionHeading eyebrow="FAQ" title="Частые вопросы" align="center" />
        <Reveal>
          <div className="space-y-3">
            {items.map((item) => {
              const open = openId === item.id;
              return (
                <div
                  key={item.id}
                  className="surface-card overflow-hidden transition-shadow hover:shadow-[0_16px_40px_-28px_rgba(26,23,20,0.3)]"
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-5 text-left font-display font-medium text-ink"
                    onClick={() => setOpenId(open ? null : item.id)}
                  >
                    {item.question}
                    <span
                      className={`text-accent text-xl shrink-0 ml-4 transition-transform duration-300 ${
                        open ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>
                  <div
                    ref={(node) => {
                      answerRefs.current[item.id] = node;
                    }}
                    className="overflow-hidden"
                    style={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                  >
                    <div className="px-5 pb-5 text-steel text-sm leading-relaxed">
                      {item.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
