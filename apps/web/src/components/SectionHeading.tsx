"use client";

import { Reveal } from "./Reveal";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  light?: boolean;
  align?: "left" | "center";
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light = false,
  align = "left",
}: SectionHeadingProps) {
  return (
    <Reveal className={`mb-12 lg:mb-16 ${align === "center" ? "text-center" : ""}`}>
      {eyebrow && (
        <p
          className={`section-eyebrow mb-3 ${light ? "text-copper" : "text-accent"}`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] ${
          light ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-base lg:text-lg max-w-2xl leading-relaxed ${
            align === "center" ? "mx-auto" : ""
          } ${light ? "text-white/65" : "text-steel"}`}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
