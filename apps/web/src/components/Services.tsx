"use client";

import type { Service } from "@/lib/types";
import type { SiteContent } from "@swarka/shared";
import { resolveImageUrl } from "@/lib/api";
import { SmartImage } from "./SmartImage";
import { SectionHeading } from "./SectionHeading";
import { Stagger } from "./Stagger";
import { ArrowIcon } from "./ArrowIcon";

const HERO_FALLBACK =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Carport_with_storage.jpg/1280px-Carport_with_storage.jpg";

const SERVICE_FALLBACKS = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Carport_with_storage.jpg/960px-Carport_with_storage.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/d/d7/Black_Cantilever_Carport.gif",
  "https://upload.wikimedia.org/wikipedia/commons/c/c2/Pergola.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Via_Camillo_Cavour_26%2C_Palazzo_Castiglione%2C_androne%2C_cancellata_02_iniziali_LC.jpg/1280px-Via_Camillo_Cavour_26%2C_Palazzo_Castiglione%2C_androne%2C_cancellata_02_iniziali_LC.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Swimming_pool_at_Hotel_Terra_Barichara.jpg/1280px-Swimming_pool_at_Hotel_Terra_Barichara.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/GMAW.welding.af.ncs.jpg/1280px-GMAW.welding.af.ncs.jpg",
];

interface ServicesProps {
  services: Service[];
  content: SiteContent["services"];
}

export function Services({ services, content }: ServicesProps) {
  return (
    <section id="services" className="relative py-20 lg:py-28 bg-paper metal-grid">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.title}
          subtitle={content.subtitle}
        />

        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {services.map((service, index) => {
            const image = resolveImageUrl(service.imageUrl);
            const fallback = SERVICE_FALLBACKS[index] ?? HERO_FALLBACK;
            return (
              <article
                key={service.id}
                data-stagger-item
                className="group opacity-0 surface-card overflow-hidden transition-shadow duration-300 hover:shadow-[0_24px_50px_-28px_rgba(26,23,20,0.35)]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-paper-deep relative">
                  <SmartImage
                    src={image}
                    fallback={fallback}
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 font-display text-xs text-white/80 bg-ink/55 backdrop-blur-sm px-2.5 py-1">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="p-5 lg:p-6">
                  <h3 className="font-display text-lg font-medium mb-2 text-ink">
                    {service.title}
                  </h3>
                  <p className="text-steel text-sm mb-4 leading-relaxed">
                    {service.description}
                  </p>
                  {service.priceFrom != null ? (
                    <p className="font-display text-xl font-medium text-accent mb-3">
                      {content.priceFromPrefix}{" "}
                      {service.priceFrom.toLocaleString("ru-RU")} ₽
                    </p>
                  ) : (
                    <p className="font-display text-xl font-medium text-accent mb-3">
                      {content.priceNegotiable}
                    </p>
                  )}
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-accent transition-colors"
                  >
                    {content.orderCta}
                    <ArrowIcon className="w-4 h-4" />
                  </a>
                </div>
              </article>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
