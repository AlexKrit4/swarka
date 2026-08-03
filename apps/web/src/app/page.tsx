import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSiteData, getServices, getPortfolio, getFaq } from "@/lib/api";
import { getSiteContent, getWhyUsItems } from "@/lib/content";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { Portfolio } from "@/components/Portfolio";
import { Promo } from "@/components/Promo";
import { WhyUs } from "@/components/WhyUs";
import { Reviews } from "@/components/Reviews";
import { FAQ } from "@/components/FAQ";
import { ContactSection } from "@/components/ContactSection";
import { MobileCTA } from "@/components/MobileCTA";
import { CalculatorModal } from "@/components/CalculatorModal";
import { YandexMetrika } from "@/components/YandexMetrika";
import { JsonLd } from "@/components/JsonLd";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function HomePage() {
  try {
    const [siteData, services, portfolio, faq] = await Promise.all([
      getSiteData(),
      getServices(),
      getPortfolio(),
      getFaq(),
    ]);

    const { settings, reviews } = siteData;
    const content = getSiteContent(settings);
    const whyUs = getWhyUsItems(settings);

    return (
      <>
        <JsonLd settings={settings} content={content} />
        <YandexMetrika id={settings.yandexMetrikaId} />
        <Header settings={settings} content={content} />
        <main className="pb-20 sm:pb-0">
          <Hero settings={settings} content={content} />
          {content.visibility.services && (
            <Services services={services} content={content.services} />
          )}
          {content.visibility.portfolio && (
            <Portfolio items={portfolio} content={content.portfolio} />
          )}
          {content.visibility.promo && settings.promoEnabled && (
            <Promo settings={settings} content={content.promo} />
          )}
          {content.visibility.whyUs && <WhyUs items={whyUs} content={content.whyUs} />}
          {content.visibility.reviews && (
            <Reviews reviews={reviews} content={content.reviews} />
          )}
          {content.visibility.faq && <FAQ items={faq} content={content.faq} />}
          <ContactSection settings={settings} services={services} content={content} />
        </main>
        <Footer settings={settings} content={content.footer} />
        {content.visibility.mobileCta && (
          <MobileCTA settings={settings} content={content.mobileCta} />
        )}
        {content.visibility.calculator && (
          <CalculatorModal services={services} content={content.calculator} />
        )}
      </>
    );
  } catch {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">SWARKA</h1>
          <p className="text-gray-600">
            API недоступен. Запустите PostgreSQL и сервер API на порту 4000.
          </p>
          <p className="text-sm text-gray-400 mt-4">
            cd packages/api && npm run dev
          </p>
        </div>
      </main>
    );
  }
}
