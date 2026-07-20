import type { FaqItem, PortfolioItem, Service, SiteData } from "./types";

/** Browser / public URL (baked at build). */
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Server-side fetch inside Docker should use internal network. */
function getServerApiUrl() {
  return process.env.INTERNAL_API_URL ?? PUBLIC_API_URL;
}

function getClientApiUrl() {
  return PUBLIC_API_URL;
}

function apiBase() {
  return typeof window === "undefined" ? getServerApiUrl() : getClientApiUrl();
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function getApiUrl(path: string) {
  return `${apiBase()}${path}`;
}

export function resolveImageUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads/")) return `${PUBLIC_API_URL}${url}`;
  if (url.startsWith("/")) return url;
  return `${PUBLIC_API_URL}${url}`;
}

export async function getSiteData(): Promise<SiteData> {
  return fetchApi<SiteData>("/api/settings");
}

export async function getServices(): Promise<Service[]> {
  return fetchApi<Service[]>("/api/services");
}

export async function getPortfolio(): Promise<PortfolioItem[]> {
  return fetchApi<PortfolioItem[]>("/api/portfolio");
}

export async function getFaq(): Promise<FaqItem[]> {
  return fetchApi<FaqItem[]>("/api/faq");
}

export async function submitLead(data: {
  name: string;
  phone: string;
  serviceType?: string;
  comment?: string;
  source?: string;
}) {
  const res = await fetch(`${getClientApiUrl()}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to submit");
  return res.json();
}
