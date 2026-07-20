import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { getSiteData } from "@/lib/api";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-unbounded",
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { settings } = await getSiteData();
    return {
      title: settings.seoTitle ?? settings.companyName,
      description: settings.seoDescription ?? undefined,
      openGraph: {
        title: settings.seoTitle ?? settings.companyName,
        description: settings.seoDescription ?? undefined,
        locale: "ru_RU",
        type: "website",
      },
    };
  } catch {
    return {
      title: "SWARKA — Навесы в Москве",
      description: "Изготовление и установка навесов в Москве и МО",
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let metrikaId: string | null = null;
  try {
    const { settings } = await getSiteData();
    metrikaId = settings.yandexMetrikaId;
  } catch {
    // API may be unavailable during build
  }

  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${unbounded.variable} antialiased`}>
        <SmoothScroll>{children}</SmoothScroll>
        {metrikaId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__METRIKA_ID__="${metrikaId}"`,
            }}
          />
        )}
      </body>
    </html>
  );
}
