import {
  parseSiteContent,
  parseWhyUs,
  parsePrivacyContent,
  type SiteContent,
  type WhyUsItem,
} from "@swarka/shared";
import type { SiteSettings } from "./types";

export function getSiteContent(settings: SiteSettings): SiteContent {
  return parseSiteContent(settings.contentJson);
}

export function getWhyUsItems(settings: SiteSettings): WhyUsItem[] {
  return parseWhyUs(settings.whyUsJson);
}

export function getPrivacyContent(settings: SiteSettings): string {
  return parsePrivacyContent(settings.privacyContent);
}
