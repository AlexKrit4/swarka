import type { SiteContent, SiteSettings } from "@/lib/types";

interface JsonLdProps {
  settings: SiteSettings;
  content: SiteContent;
}

export function JsonLd({ settings, content }: JsonLdProps) {
  const jsonLd = content.jsonLd;

  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: settings.companyName,
    description: settings.seoDescription,
    telephone: settings.phone,
    email: settings.email,
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: jsonLd.latitude,
        longitude: jsonLd.longitude,
      },
      geoRadius: jsonLd.geoRadius,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address ?? undefined,
      addressLocality: jsonLd.addressLocality,
      addressRegion: jsonLd.addressRegion,
      addressCountry: "RU",
    },
    priceRange: jsonLd.priceRange,
    openingHours: jsonLd.openingHours,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
