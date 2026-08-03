"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const COOKIE_NAME = "swarka_vid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function getOrCreateVisitorId(): string {
  const existing = readCookie(COOKIE_NAME);
  if (existing) return existing;
  const id = crypto.randomUUID();
  writeCookie(COOKIE_NAME, id);
  return id;
}

function SiteTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef("");

  useEffect(() => {
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    if (lastTracked.current === path) return;
    lastTracked.current = path;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const pageUrl = new URL(window.location.href);

    fetch(`${apiUrl}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: getOrCreateVisitorId(),
        path,
        referer: document.referrer || undefined,
        utmSource: pageUrl.searchParams.get("utm_source") ?? undefined,
        utmMedium: pageUrl.searchParams.get("utm_medium") ?? undefined,
        utmCampaign: pageUrl.searchParams.get("utm_campaign") ?? undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname, searchParams]);

  return null;
}

export function SiteTracker() {
  return (
    <Suspense fallback={null}>
      <SiteTrackerInner />
    </Suspense>
  );
}
