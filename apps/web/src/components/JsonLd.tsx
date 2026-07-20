import type { SiteSettings } from "@/lib/types";

interface JsonLdProps {
  settings: SiteSettings;
}

export function JsonLd({ settings }: JsonLdProps) {
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
        latitude: 55.7558,
        longitude: 37.6173,
      },
      geoRadius: "100000",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Москва",
      addressRegion: "Московская область",
      addressCountry: "RU",
    },
    priceRange: "$$",
    openingHours: "Mo-Sa 09:00-20:00",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
