"use client";

import type { SiteSettings } from "@/lib/types";

interface MobileCTAProps {
  settings: SiteSettings;
}

export function MobileCTA({ settings }: MobileCTAProps) {
  const phone = settings.phone.replace(/\s/g, "");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-ink/95 backdrop-blur-md border-t border-white/10 p-3 flex gap-3">
      <a
        href={`tel:${phone}`}
        className="flex-1 border border-white/20 text-white text-center py-3 font-semibold text-sm hover:bg-white/5"
        data-goal="phone"
      >
        Позвонить
      </a>
      <a href="#contact" className="flex-1 btn-accent text-center py-3 text-sm">
        Заявка
      </a>
    </div>
  );
}
