import type { SiteSettings } from "@/lib/types";

interface FooterProps {
  settings: SiteSettings;
}

export function Footer({ settings }: FooterProps) {
  const phone = settings.phone.replace(/\s/g, "");
  const waLink = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`
    : null;
  const tgLink = settings.telegram ? `https://t.me/${settings.telegram}` : null;
  const year = new Date().getFullYear();

  const marqueeItems = [
    "Навесы",
    "Козырьки",
    "Перголы",
    "Ворота",
    "Сварка",
    "Монтаж",
    "Москва",
    "МО",
  ];

  return (
    <footer className="bg-ink text-white overflow-hidden">
      <div className="border-y border-white/10 py-4 overflow-hidden">
        <div className="marquee-track gap-10 text-white/25 font-display text-sm uppercase tracking-[0.28em] font-semibold">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={`${item}-${i}`} className="flex items-center gap-10">
              {item}
              <span className="w-1.5 h-1.5 bg-accent" />
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <p className="font-display text-xl font-semibold tracking-[0.08em] mb-4">
              {settings.logoText ?? settings.companyName}
            </p>
            <p className="text-white/45 text-sm leading-relaxed">{settings.workZone}</p>
          </div>
          <div>
            <p className="section-eyebrow text-white/40 mb-4">Контакты</p>
            <a href={`tel:${phone}`} className="block text-white/75 hover:text-weld mb-2 transition-colors">
              {settings.phone}
            </a>
            {settings.email && (
              <a
                href={`mailto:${settings.email}`}
                className="block text-white/75 hover:text-weld transition-colors"
              >
                {settings.email}
              </a>
            )}
          </div>
          <div>
            <p className="section-eyebrow text-white/40 mb-4">Навигация</p>
            <nav className="flex flex-col gap-2 text-white/60 text-sm">
              <a href="#services" className="hover:text-white transition-colors">
                Услуги
              </a>
              <a href="#portfolio" className="hover:text-white transition-colors">
                Наши работы
              </a>
              <a href="#contact" className="hover:text-white transition-colors">
                Контакты
              </a>
              <a href="/privacy" className="hover:text-white transition-colors">
                Политика конфиденциальности
              </a>
            </nav>
          </div>
          <div>
            <p className="section-eyebrow text-white/40 mb-4">Мессенджеры</p>
            <div className="flex gap-2">
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 border border-white/15 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors text-xs font-bold"
                  data-goal="whatsapp"
                >
                  WA
                </a>
              )}
              {tgLink && (
                <a
                  href={tgLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 border border-white/15 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors text-xs font-bold"
                >
                  TG
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 text-center text-white/35 text-sm">
          © {year} {settings.companyName}. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
