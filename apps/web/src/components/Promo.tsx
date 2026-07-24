"use client";

import type { SiteContent, SiteSettings } from "@/lib/types";
import { ArrowIcon } from "./ArrowIcon";
import { Reveal } from "./Reveal";
import { MagneticButton } from "./MagneticButton";

interface PromoProps {
  settings: SiteSettings;
  content: SiteContent["promo"];
}

export function Promo({ settings, content }: PromoProps) {
  if (!settings.promoEnabled) return null;

  return (
    <section id="promo" className="relative py-16 lg:py-20 overflow-hidden bg-accent-soft">
      <div className="absolute inset-0 metal-grid opacity-50 pointer-events-none" />
      <div className="absolute -left-10 top-1/2 -translate-y-1/2 font-display text-[8rem] lg:text-[12rem] font-semibold text-accent/10 select-none pointer-events-none leading-none">
        %
      </div>
      <div className="relative max-w-7xl mx-auto px-4 lg:px-8">
        <Reveal>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 border border-accent/20 bg-white/50 backdrop-blur-sm p-8 lg:p-10">
            <div>
              {settings.promoBadge && (
                <span className="inline-block bg-accent text-white text-[0.65rem] font-bold uppercase tracking-[0.18em] px-3 py-1.5 mb-4">
                  {settings.promoBadge}
                </span>
              )}
              {settings.promoTitle && (
                <h2 className="font-display text-2xl lg:text-4xl font-semibold text-ink">
                  {settings.promoTitle}
                </h2>
              )}
              {settings.promoSubtitle && (
                <p className="text-steel mt-3 text-lg">{settings.promoSubtitle}</p>
              )}
            </div>
            <MagneticButton href="#contact" className="btn-accent px-8 py-3.5 text-base shrink-0">
              {content.cta}
              <ArrowIcon className="w-5 h-5" />
            </MagneticButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
