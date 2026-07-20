"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { SiteSettings } from "@/lib/types";
import { ArrowIcon } from "./ArrowIcon";
import { MagneticButton } from "./MagneticButton";

const NAV_ITEMS = [
  { label: "Услуги", href: "#services" },
  { label: "Работы", href: "#portfolio" },
  { label: "Акции", href: "#promo" },
  { label: "Контакты", href: "#contact" },
];

interface HeaderProps {
  settings: SiteSettings;
}

export function Header({ settings }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const logo = settings.logoText ?? settings.companyName;
  const phone = settings.phone.replace(/\s/g, "");
  const waLink = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`
    : null;
  const tgLink = settings.telegram ? `https://t.me/${settings.telegram}` : null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { y: -24, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", delay: 0.1 }
    );
  }, []);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 text-white transition-all duration-300 ${
        scrolled
          ? "bg-primary/95 backdrop-blur-md shadow-[0_12px_40px_-20px_rgba(0,0,0,0.55)] border-b border-white/5"
          : "bg-primary"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-[76px] gap-4">
          <a
            href="#"
            className="font-display text-lg lg:text-xl font-semibold tracking-[0.08em] shrink-0"
          >
            {logo}
          </a>

          <nav className="hidden lg:flex items-center gap-8 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-white/55">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-white transition-colors relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-accent after:transition-all hover:after:w-full"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 lg:gap-3">
            <a
              href={`tel:${phone}`}
              className="hidden md:block text-sm font-medium text-white/80 hover:text-white whitespace-nowrap"
              data-goal="phone"
            >
              {settings.phone}
            </a>
            <div className="hidden sm:flex items-center gap-1.5">
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 border border-white/15 flex items-center justify-center text-[0.65rem] font-bold hover:border-accent hover:bg-accent transition-colors"
                  data-goal="whatsapp"
                  aria-label="WhatsApp"
                >
                  WA
                </a>
              )}
              {tgLink && (
                <a
                  href={tgLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 border border-white/15 flex items-center justify-center text-[0.65rem] font-bold hover:border-accent hover:bg-accent transition-colors"
                  aria-label="Telegram"
                >
                  TG
                </a>
              )}
            </div>
            <MagneticButton
              href="#contact"
              className="btn-accent hidden sm:inline-flex text-sm px-4 py-2.5"
            >
              Заявка
              <ArrowIcon className="w-4 h-4" />
            </MagneticButton>
            <button
              type="button"
              className="lg:hidden p-2 border border-white/15 hover:bg-white/10"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Меню"
            >
              <span className="flex flex-col gap-1.5">
                <span
                  className={`w-5 h-0.5 bg-white transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`}
                />
                <span
                  className={`w-5 h-0.5 bg-white transition-opacity ${menuOpen ? "opacity-0" : ""}`}
                />
                <span
                  className={`w-5 h-0.5 bg-white transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}
                />
              </span>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="lg:hidden pb-5 flex flex-col gap-3 border-t border-white/10 pt-4">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70 hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a
              href={`tel:${phone}`}
              className="text-sm font-semibold text-weld"
              data-goal="phone"
            >
              {settings.phone}
            </a>
            <a
              href="#contact"
              className="btn-accent text-sm px-4 py-2.5 w-fit"
              onClick={() => setMenuOpen(false)}
            >
              Оставить заявку
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
