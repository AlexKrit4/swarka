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

export interface WhyUsItem {
  title: string;
  description: string;
  icon: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  priceFrom: number | null;
  imageUrl: string | null;
  sortOrder: number;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  tag: string | null;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface Review {
  id: string;
  authorName: string;
  text: string;
  rating: number;
}

export interface SiteData {
  settings: SiteSettings;
  reviews: Review[];
  whyUs: WhyUsItem[];
}
