"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { PortfolioItem } from "@/lib/types";
import type { SiteContent } from "@swarka/shared";
import { resolveImageUrl } from "@/lib/api";
import { SmartImage } from "./SmartImage";
import { SectionHeading } from "./SectionHeading";
import { Stagger } from "./Stagger";
import { MagneticButton } from "./MagneticButton";

const HERO_FALLBACK =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Carport_with_storage.jpg/1280px-Carport_with_storage.jpg";

const PORTFOLIO_FALLBACKS = [
  HERO_FALLBACK,
  "https://upload.wikimedia.org/wikipedia/commons/d/d7/Black_Cantilever_Carport.gif",
  "https://upload.wikimedia.org/wikipedia/commons/c/c2/Pergola.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Via_Santo_Spirito_27%2C_palazzo_Graziosi_Manetti%2C_androne_01_cancellata.jpg/1280px-Via_Santo_Spirito_27%2C_palazzo_Graziosi_Manetti%2C_androne_01_cancellata.jpg",
];

interface PortfolioProps {
  items: PortfolioItem[];
  content: SiteContent["portfolio"];
}

export function Portfolio({ items, content }: PortfolioProps) {
  const [lightbox, setLightbox] = useState<PortfolioItem | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lightbox || !lightboxRef.current) return;
    gsap.fromTo(
      lightboxRef.current,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.35, ease: "power2.out" }
    );
    gsap.fromTo(
      "[data-lightbox-panel]",
      { y: 28, autoAlpha: 0, scale: 0.98 },
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.45, ease: "power3.out" }
    );
  }, [lightbox]);

  return (
    <section id="portfolio" className="py-20 lg:py-28 bg-ink text-white relative overflow-hidden">
      <div className="absolute inset-0 metal-grid opacity-20 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 lg:px-8">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.title}
          subtitle={content.subtitle}
          light
        />

        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item, index) => {
            const image = resolveImageUrl(item.imageUrl);
            const fallback = PORTFOLIO_FALLBACKS[index] ?? HERO_FALLBACK;
            return (
              <article
                key={item.id}
                data-stagger-item
                className="group opacity-0 relative overflow-hidden cursor-pointer aspect-[3/4] bg-primary-soft border border-white/10"
                onClick={() => setLightbox(item)}
              >
                <SmartImage
                  src={image}
                  fallback={fallback}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent opacity-90" />
                <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/15 transition-colors duration-400" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {item.tag && (
                    <span className="text-[0.65rem] uppercase tracking-[0.16em] bg-accent text-white px-2 py-1 font-bold">
                      {item.tag}
                    </span>
                  )}
                  <h3 className="font-display font-medium mt-2 text-lg">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-white/55 mt-1 line-clamp-2">{item.description}</p>
                  )}
                </div>
              </article>
            );
          })}
        </Stagger>

        <div className="text-center mt-12">
          <MagneticButton href="#contact" className="btn-accent px-8 py-3.5 text-sm">
            {content.cta}
          </MagneticButton>
        </div>
      </div>

      {lightbox && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 z-[100] bg-ink/92 backdrop-blur-sm flex items-center justify-center p-4 opacity-0"
          onClick={() => setLightbox(null)}
        >
          <div
            data-lightbox-panel
            className="max-w-4xl w-full opacity-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveImageUrl(lightbox.imageUrl) ?? ""}
              alt={lightbox.title}
              className="w-full max-h-[75vh] object-contain border border-white/10"
            />
            <div className="text-white mt-5 text-center">
              <h3 className="font-display text-xl font-medium">{lightbox.title}</h3>
              {lightbox.description && (
                <p className="text-white/55 mt-1">{lightbox.description}</p>
              )}
              <a
                href="#contact"
                className="inline-block mt-5 btn-accent px-6 py-2.5 text-sm"
                onClick={() => setLightbox(null)}
              >
                {content.lightboxCta}
              </a>
            </div>
            <button
              type="button"
              className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl"
              onClick={() => setLightbox(null)}
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
