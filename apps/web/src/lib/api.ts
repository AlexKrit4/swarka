import type { FaqItem, PortfolioItem, Service, SiteData } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function getApiUrl(path: string) {
  return `${API_URL}${path}`;
}

export function resolveImageUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return url;
  return `${API_URL}${url}`;
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
  const res = await fetch(`${API_URL}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to submit");
  return res.json();
}
