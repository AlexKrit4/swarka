"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_SITE_CONTENT,
  parseSiteContent,
  type SiteContent,
} from "@swarka/shared";
import { AuthGuard } from "@/components/AuthGuard";
import {
  NavItemsEditor,
  SectionHeadingFields,
  StringListEditor,
  TextField,
  VisibilityToggles,
} from "@/components/ContentEditors";
import { getSettings, updateSettings } from "@/lib/api";

function ContentPageInner() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [privacyContent, setPrivacyContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((settings) => {
      setContent(parseSiteContent(settings.contentJson));
      setPrivacyContent(settings.privacyContent ?? "");
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => {
    setContent((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateSettings({
      contentJson: JSON.stringify(content),
      privacyContent: privacyContent || null,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <p className="text-gray-500">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Контент сайта</h1>
          <p className="text-sm text-gray-500 mt-1">
            Все тексты, кнопки, заголовки секций и навигация
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение..." : saved ? "Сохранено ✓" : "Сохранить"}
        </button>
      </div>

      <div className="space-y-6 max-w-3xl">
        <section className="card space-y-4">
          <h2 className="font-semibold">Видимость секций</h2>
          <VisibilityToggles
            value={content.visibility}
            onChange={(visibility) => update("visibility", visibility as SiteContent["visibility"])}
          />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Шапка и меню</h2>
          <TextField
            label="Кнопка в шапке"
            value={content.header.ctaLabel}
            onChange={(ctaLabel) => update("header", { ...content.header, ctaLabel })}
          />
          <TextField
            label="Кнопка в мобильном меню"
            value={content.header.mobileMenuCta}
            onChange={(mobileMenuCta) => update("header", { ...content.header, mobileMenuCta })}
          />
          <NavItemsEditor
            label="Пункты меню"
            items={content.nav}
            onChange={(nav) => update("nav", nav)}
          />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Hero</h2>
          <TextField
            label="Надпись сверху"
            value={content.hero.eyebrow}
            onChange={(eyebrow) => update("hero", { ...content.hero, eyebrow })}
          />
          <StringListEditor
            label="Преимущества (список)"
            items={content.hero.features}
            onChange={(features) => update("hero", { ...content.hero, features })}
          />
          <TextField
            label="Кнопка «Рассчитать»"
            value={content.hero.ctaPrimary}
            onChange={(ctaPrimary) => update("hero", { ...content.hero, ctaPrimary })}
          />
          <TextField
            label="Кнопка «Смотреть работы»"
            value={content.hero.ctaSecondary}
            onChange={(ctaSecondary) => update("hero", { ...content.hero, ctaSecondary })}
          />
          <TextField
            label="Кнопка в полоске акции"
            value={content.hero.promoCta}
            onChange={(promoCta) => update("hero", { ...content.hero, promoCta })}
          />
          <TextField
            label="Подпись под фото"
            value={content.hero.imageCaption}
            onChange={(imageCaption) => update("hero", { ...content.hero, imageCaption })}
          />
          <TextField
            label="Alt-текст фото"
            value={content.hero.imageAlt}
            onChange={(imageAlt) => update("hero", { ...content.hero, imageAlt })}
          />
        </section>

        <section className="card space-y-4">
          <SectionHeadingFields
            title="Услуги"
            value={content.services}
            onChange={(services) => update("services", { ...content.services, ...services })}
          />
          <TextField
            label="Кнопка «Заказать»"
            value={content.services.orderCta}
            onChange={(orderCta) => update("services", { ...content.services, orderCta })}
          />
          <TextField
            label="Префикс цены"
            value={content.services.priceFromPrefix}
            onChange={(priceFromPrefix) =>
              update("services", { ...content.services, priceFromPrefix })
            }
          />
          <TextField
            label="Текст «Договорная»"
            value={content.services.priceNegotiable}
            onChange={(priceNegotiable) =>
              update("services", { ...content.services, priceNegotiable })
            }
          />
        </section>

        <section className="card space-y-4">
          <SectionHeadingFields
            title="Портфолио"
            value={content.portfolio}
            onChange={(portfolio) => update("portfolio", { ...content.portfolio, ...portfolio })}
          />
          <TextField
            label="Кнопка под галереей"
            value={content.portfolio.cta}
            onChange={(cta) => update("portfolio", { ...content.portfolio, cta })}
          />
          <TextField
            label="Кнопка в лайтбоксе"
            value={content.portfolio.lightboxCta}
            onChange={(lightboxCta) => update("portfolio", { ...content.portfolio, lightboxCta })}
          />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Акция</h2>
          <TextField
            label="Кнопка"
            value={content.promo.cta}
            onChange={(cta) => update("promo", { cta })}
          />
        </section>

        <section className="card space-y-4">
          <SectionHeadingFields
            title="Преимущества"
            value={content.whyUs}
            onChange={(whyUs) => update("whyUs", whyUs)}
            withSubtitle={false}
          />
        </section>

        <section className="card space-y-4">
          <SectionHeadingFields
            title="Отзывы"
            value={content.reviews}
            onChange={(reviews) => update("reviews", reviews)}
            withSubtitle={false}
          />
        </section>

        <section className="card space-y-4">
          <SectionHeadingFields
            title="FAQ"
            value={content.faq}
            onChange={(faq) => update("faq", faq)}
            withSubtitle={false}
          />
        </section>

        <section className="card space-y-4">
          <SectionHeadingFields
            title="Контакты"
            value={content.contact}
            onChange={(contact) => update("contact", { ...content.contact, ...contact })}
          />
          <TextField
            label="Описание"
            value={content.contact.description}
            onChange={(description) => update("contact", { ...content.contact, description })}
            multiline
          />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Форма заявки</h2>
          <TextField
            label="Заголовок успеха"
            value={content.form.successTitle}
            onChange={(successTitle) => update("form", { ...content.form, successTitle })}
          />
          <TextField
            label="Текст успеха"
            value={content.form.successMessage}
            onChange={(successMessage) => update("form", { ...content.form, successMessage })}
            multiline
          />
          <TextField
            label="Кнопка отправки"
            value={content.form.submitLabel}
            onChange={(submitLabel) => update("form", { ...content.form, submitLabel })}
          />
          <TextField
            label="Подпись поля «Имя»"
            value={content.form.nameLabel}
            onChange={(nameLabel) => update("form", { ...content.form, nameLabel })}
          />
          <TextField
            label="Подпись поля «Телефон»"
            value={content.form.phoneLabel}
            onChange={(phoneLabel) => update("form", { ...content.form, phoneLabel })}
          />
          <TextField
            label="Подпись поля «Услуга»"
            value={content.form.serviceLabel}
            onChange={(serviceLabel) => update("form", { ...content.form, serviceLabel })}
          />
          <TextField
            label="Подпись поля «Комментарий»"
            value={content.form.commentLabel}
            onChange={(commentLabel) => update("form", { ...content.form, commentLabel })}
          />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Калькулятор</h2>
          <TextField
            label="Кнопка открытия"
            value={content.calculator.buttonLabel}
            onChange={(buttonLabel) => update("calculator", { ...content.calculator, buttonLabel })}
          />
          <TextField
            label="Заголовок"
            value={content.calculator.title}
            onChange={(title) => update("calculator", { ...content.calculator, title })}
          />
          <TextField
            label="Вопрос шага 1"
            value={content.calculator.step1Question}
            onChange={(step1Question) =>
              update("calculator", { ...content.calculator, step1Question })
            }
          />
          <TextField
            label="Вопрос шага 2"
            value={content.calculator.step2Question}
            onChange={(step2Question) =>
              update("calculator", { ...content.calculator, step2Question })
            }
          />
          <TextField
            label="Вопрос шага 3"
            value={content.calculator.step3Question}
            onChange={(step3Question) =>
              update("calculator", { ...content.calculator, step3Question })
            }
          />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Подвал</h2>
          <StringListEditor
            label="Бегущая строка"
            items={content.footer.marquee}
            onChange={(marquee) => update("footer", { ...content.footer, marquee })}
          />
          <TextField
            label="Копирайт (используйте {year} и {company})"
            value={content.footer.copyright}
            onChange={(copyright) => update("footer", { ...content.footer, copyright })}
          />
          <NavItemsEditor
            label="Ссылки в подвале"
            items={content.footer.navLinks}
            onChange={(navLinks) => update("footer", { ...content.footer, navLinks })}
          />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Мобильные кнопки</h2>
          <TextField
            label="Позвонить"
            value={content.mobileCta.callLabel}
            onChange={(callLabel) => update("mobileCta", { ...content.mobileCta, callLabel })}
          />
          <TextField
            label="Заявка"
            value={content.mobileCta.requestLabel}
            onChange={(requestLabel) =>
              update("mobileCta", { ...content.mobileCta, requestLabel })
            }
          />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">SEO / Schema.org</h2>
          <TextField
            label="Город"
            value={content.jsonLd.addressLocality}
            onChange={(addressLocality) =>
              update("jsonLd", { ...content.jsonLd, addressLocality })
            }
          />
          <TextField
            label="Регион"
            value={content.jsonLd.addressRegion}
            onChange={(addressRegion) =>
              update("jsonLd", { ...content.jsonLd, addressRegion })
            }
          />
          <TextField
            label="Часы работы"
            value={content.jsonLd.openingHours}
            onChange={(openingHours) => update("jsonLd", { ...content.jsonLd, openingHours })}
          />
          <TextField
            label="Ценовой диапазон"
            value={content.jsonLd.priceRange}
            onChange={(priceRange) => update("jsonLd", { ...content.jsonLd, priceRange })}
          />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Политика конфиденциальности</h2>
          <p className="text-sm text-gray-500">
            Используйте пустую строку между абзацами. Заголовки начинайте с ## .
          </p>
          <textarea
            rows={16}
            value={privacyContent}
            onChange={(e) => setPrivacyContent(e.target.value)}
            className="font-mono text-sm"
          />
        </section>
      </div>
    </div>
  );
}

export default function ContentPage() {
  return (
    <AuthGuard>
      <ContentPageInner />
    </AuthGuard>
  );
}
