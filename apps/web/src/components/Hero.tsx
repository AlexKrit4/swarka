"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { SiteContent, SiteSettings } from "@/lib/types";
import { resolveImageUrl } from "@/lib/api";
import { ArrowIcon } from "./ArrowIcon";
import { SmartImage } from "./SmartImage";
import { MagneticButton } from "./MagneticButton";

const FALLBACK_HERO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Carport_with_storage.jpg/1280px-Carport_with_storage.jpg";

interface HeroProps {
  settings: SiteSettings;
  content: SiteContent;
}

export function Hero({ settings, content }: HeroProps) {
  const hero = content.hero;
  const resolved = resolveImageUrl(settings.heroImageUrl);
  const rootRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        "[data-hero-brand]",
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.7 }
      )
        .fromTo(
          "[data-hero-title]",
          { autoAlpha: 0, y: 36 },
          { autoAlpha: 1, y: 0, duration: 0.9 },
          "-=0.35"
        )
        .fromTo(
          "[data-hero-sub]",
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.7 },
          "-=0.5"
        )
        .fromTo(
          "[data-hero-cta]",
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 },
          "-=0.4"
        )
        .fromTo(
          "[data-hero-feature]",
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06 },
          "-=0.35"
        )
        .fromTo(
          imageRef.current,
          { autoAlpha: 0, y: 48, scale: 1.04 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 1.1 },
          "-=0.55"
        );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden bg-primary text-white metal-noise"
    >
      <div className="absolute inset-0 metal-grid opacity-40 pointer-events-none" />
      <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-accent/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-primary to-transparent pointer-events-none" />

      <div className="relative z-[2] max-w-7xl mx-auto px-4 lg:px-8 pt-12 pb-8 lg:pt-20 lg:pb-12">
        <div className="max-w-4xl">
          <div data-hero-brand className="opacity-0 flex items-center gap-3 mb-6">
            <span className="spark-line" />
            <span className="section-eyebrow text-weld">
              {hero.eyebrow || settings.workZone}
            </span>
          </div>

          <p
            data-hero-brand
            className="opacity-0 font-display text-4xl sm:text-5xl lg:text-7xl font-semibold tracking-tight text-white mb-4"
          >
            {settings.logoText ?? settings.companyName}
          </p>

          <h1
            data-hero-title
            className="opacity-0 font-display text-2xl sm:text-3xl lg:text-4xl font-medium leading-tight tracking-tight text-white/90 max-w-3xl"
          >
            {settings.heroTitle}
          </h1>

          {settings.heroSubtitle && (
            <p
              data-hero-sub
              className="opacity-0 mt-5 text-white/60 text-lg leading-relaxed max-w-2xl"
            >
              {settings.heroSubtitle}
            </p>
          )}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-3">
          <div data-hero-cta className="opacity-0">
            <MagneticButton href="#contact" className="btn-accent px-7 py-4 text-base">
              {hero.ctaPrimary}
              <ArrowIcon />
            </MagneticButton>
          </div>
          <a
            href="#portfolio"
            data-hero-cta
            className="btn-outline opacity-0 px-7 py-4 text-base"
          >
            {hero.ctaSecondary}
            <ArrowIcon />
          </a>
          <a
            href={`tel:${settings.phone.replace(/\s/g, "")}`}
            data-hero-cta
            className="opacity-0 inline-flex items-center gap-2 px-5 py-4 text-base text-white/75 hover:text-white transition-colors"
            data-goal="phone"
          >
            <span className="w-2 h-2 rounded-full bg-accent spark-dot" />
            {settings.phone}
          </a>
        </div>

        {hero.features.length > 0 && (
          <ul className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {hero.features.map((item) => (
              <li
                key={item}
                data-hero-feature
                className="opacity-0 flex items-center gap-3 border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70"
              >
                <span className="w-1.5 h-1.5 bg-accent shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative z-[2] max-w-7xl mx-auto px-4 lg:px-8 pb-12 lg:pb-16">
        <div
          ref={imageRef}
          className="opacity-0 relative overflow-hidden aspect-[16/9] lg:aspect-[21/9] bg-primary-soft border border-white/10 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]"
        >
          <SmartImage
            src={resolved}
            fallback={FALLBACK_HERO}
            alt={hero.imageAlt}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent pointer-events-none" />
          {hero.imageCaption && (
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70 font-semibold">
                {hero.imageCaption}
              </p>
            </div>
          )}
        </div>
      </div>

      {settings.promoEnabled && (settings.promoTitle || settings.promoSubtitle) && (
        <div className="relative z-[2] border-t border-white/10 bg-primary-soft/80">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {settings.promoBadge && (
                <span className="inline-block bg-accent text-white text-[0.65rem] font-bold uppercase tracking-[0.18em] px-3 py-1.5">
                  {settings.promoBadge}
                </span>
              )}
              <div>
                {settings.promoTitle && (
                  <p className="font-display text-lg lg:text-xl font-medium text-white">
                    {settings.promoTitle}
                  </p>
                )}
                {settings.promoSubtitle && (
                  <p className="text-white/55 text-sm mt-0.5">{settings.promoSubtitle}</p>
                )}
              </div>
            </div>
            <MagneticButton href="#contact" className="btn-accent px-5 py-2.5 text-sm shrink-0 w-fit">
              {hero.promoCta}
              <ArrowIcon className="w-4 h-4" />
            </MagneticButton>
          </div>
        </div>
      )}
    </section>
  );
}
