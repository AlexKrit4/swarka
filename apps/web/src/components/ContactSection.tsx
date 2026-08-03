"use client";

import type { SiteContent, SiteSettings } from "@/lib/types";
import type { Service } from "@/lib/types";
import { ContactForm } from "./ContactForm";
import { Reveal } from "./Reveal";

interface ContactSectionProps {
  settings: SiteSettings;
  services: Service[];
  content: SiteContent;
}

export function ContactSection({ settings, services, content }: ContactSectionProps) {
  const phone = settings.phone.replace(/\s/g, "");
  const contact = content.contact;

  return (
    <section id="contact" className="relative py-20 lg:py-28 bg-primary text-white overflow-hidden">
      <div className="absolute inset-0 metal-grid opacity-25 pointer-events-none" />
      <div className="absolute -right-20 top-10 w-80 h-80 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          <Reveal>
            <p className="section-eyebrow text-weld mb-4">{contact.eyebrow}</p>
            <h2 className="font-display text-3xl lg:text-5xl font-semibold mb-4 leading-tight">
              {contact.title}
            </h2>
            <p className="text-white/60 mb-8 text-lg leading-relaxed max-w-md">
              {contact.description}
            </p>
            <div className="space-y-4">
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-3 font-display text-xl lg:text-2xl font-medium hover:text-weld transition-colors"
                data-goal="phone"
              >
                {settings.phone}
              </a>
              {settings.email && (
                <a
                  href={`mailto:${settings.email}`}
                  className="flex items-center gap-3 text-white/55 hover:text-white transition-colors"
                >
                  {settings.email}
                </a>
              )}
              <p className="text-white/45 pt-2 border-t border-white/10">{settings.workZone}</p>
              {settings.address && (
                <p className="text-white/45">{settings.address}</p>
              )}
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="bg-white text-ink p-6 lg:p-8 border border-white/10 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]">
              <ContactForm services={services} content={content.form} />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
