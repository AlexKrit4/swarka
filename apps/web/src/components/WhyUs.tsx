"use client";

import type { WhyUsItem } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";
import { Stagger } from "./Stagger";

const ICONS: Record<string, string> = {
  factory: "01",
  shield: "02",
  ruler: "03",
  wrench: "04",
};

interface WhyUsProps {
  items: WhyUsItem[];
}

export function WhyUs({ items }: WhyUsProps) {
  if (!items.length) return null;

  return (
    <section className="py-20 lg:py-28 bg-paper">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <SectionHeading eyebrow="Преимущества" title="Почему мы" align="center" />
        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item, i) => (
            <div
              key={i}
              data-stagger-item
              className="opacity-0 group surface-card p-6 lg:p-7 transition-transform duration-300 hover:-translate-y-1"
            >
              <span className="font-display text-3xl text-accent/40 font-semibold block mb-5 group-hover:text-accent transition-colors">
                {ICONS[item.icon] ?? String(i + 1).padStart(2, "0")}
              </span>
              <div className="spark-line mb-4" />
              <h3 className="font-display font-medium text-lg mb-2 text-ink">{item.title}</h3>
              <p className="text-steel text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
