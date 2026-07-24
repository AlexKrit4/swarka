"use client";

import type { SiteContent, SiteSettings } from "@/lib/types";

interface MobileCTAProps {
  settings: SiteSettings;
  content: SiteContent["mobileCta"];
}

export function MobileCTA({ settings, content }: MobileCTAProps) {
  const phone = settings.phone.replace(/\s/g, "");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-ink/95 backdrop-blur-md border-t border-white/10 p-3 flex gap-3">
      <a
        href={`tel:${phone}`}
        className="flex-1 border border-white/20 text-white text-center py-3 font-semibold text-sm hover:bg-white/5"
        data-goal="phone"
      >
        {content.callLabel}
      </a>
      <a href="#contact" className="flex-1 btn-accent text-center py-3 text-sm">
        {content.requestLabel}
      </a>
    </div>
  );
}
