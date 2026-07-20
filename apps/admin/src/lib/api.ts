const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

import { getToken, clearToken } from "./auth";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const result = await apiFetch<{
    success: boolean;
    token: string;
    user: { id: string; email: string; name: string | null; role: string };
  }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const { setToken } = await import("./auth");
  setToken(result.token);
  return result;
}

export async function logout() {
  return apiFetch("/api/admin/logout", { method: "POST" });
}

export async function getMe() {
  return apiFetch<{
    user: { id: string; email: string; name: string | null; role: string };
  }>("/api/admin/me");
}

export interface AdminAccount {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export async function getAdmins() {
  return apiFetch<AdminAccount[]>("/api/admin/users");
}

export async function createAdmin(data: {
  email: string;
  password: string;
  name?: string;
}) {
  return apiFetch<AdminAccount>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAdmin(
  id: string,
  data: { email?: string; password?: string; name?: string | null }
) {
  return apiFetch<AdminAccount>(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAdmin(id: string) {
  return apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
}

export async function getDashboard() {
  return apiFetch<{
    todayCount: number;
    weekCount: number;
    recentLeads: Lead[];
    totalServices: number;
    totalPortfolio: number;
  }>("/api/admin/dashboard");
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  serviceType: string | null;
  comment: string | null;
  source: string | null;
  status: "NEW" | "IN_PROGRESS" | "CLOSED";
  note: string | null;
  createdAt: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  priceFrom: number | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  tag: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Review {
  id: string;
  authorName: string;
  text: string;
  rating: number;
  sortOrder: number;
  isActive: boolean;
}

export interface SiteSettings {
  id: string;
  companyName: string;
  phone: string;
  whatsapp: string | null;
  telegram: string | null;
  email: string | null;
  logoText: string | null;
  logoUrl: string | null;
  heroTitle: string;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  promoTitle: string | null;
  promoSubtitle: string | null;
  promoBadge: string | null;
  promoEnabled: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  yandexMetrikaId: string | null;
  whyUsJson: string | null;
  address: string | null;
  workZone: string;
}

export function imageUrl(url: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}

export async function getSettings() {
  return apiFetch<SiteSettings>("/api/admin/settings");
}

export async function updateSettings(data: Partial<SiteSettings>) {
  return apiFetch<SiteSettings>("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getServices() {
  return apiFetch<Service[]>("/api/admin/services");
}

export async function createService(data: Omit<Service, "id">) {
  return apiFetch<Service>("/api/admin/services", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateService(id: string, data: Partial<Service>) {
  return apiFetch<Service>(`/api/admin/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteService(id: string) {
  return apiFetch(`/api/admin/services/${id}`, { method: "DELETE" });
}

export async function getPortfolio() {
  return apiFetch<PortfolioItem[]>("/api/admin/portfolio");
}

export async function createPortfolio(data: Omit<PortfolioItem, "id">) {
  return apiFetch<PortfolioItem>("/api/admin/portfolio", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePortfolio(id: string, data: Partial<PortfolioItem>) {
  return apiFetch<PortfolioItem>(`/api/admin/portfolio/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePortfolio(id: string) {
  return apiFetch(`/api/admin/portfolio/${id}`, { method: "DELETE" });
}

export async function getFaq() {
  return apiFetch<FaqItem[]>("/api/admin/faq");
}

export async function createFaq(data: Omit<FaqItem, "id">) {
  return apiFetch<FaqItem>("/api/admin/faq", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFaq(id: string, data: Partial<FaqItem>) {
  return apiFetch<FaqItem>(`/api/admin/faq/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteFaq(id: string) {
  return apiFetch(`/api/admin/faq/${id}`, { method: "DELETE" });
}

export async function getReviews() {
  return apiFetch<Review[]>("/api/admin/reviews");
}

export async function createReview(data: Omit<Review, "id">) {
  return apiFetch<Review>("/api/admin/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateReview(id: string, data: Partial<Review>) {
  return apiFetch<Review>(`/api/admin/reviews/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteReview(id: string) {
  return apiFetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
}

export async function getLeads() {
  return apiFetch<Lead[]>("/api/admin/leads");
}

export async function updateLead(id: string, data: { status?: string; note?: string }) {
  return apiFetch<Lead>(`/api/admin/leads/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteLead(id: string) {
  return apiFetch(`/api/admin/leads/${id}`, { method: "DELETE" });
}

export async function uploadFile(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const { getToken } = await import("./auth");
  const token = getToken();

  const res = await fetch(`${API_URL}/api/admin/upload`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}
