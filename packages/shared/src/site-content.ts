export interface NavItem {
  label: string;
  href: string;
}

export interface SectionHeadingContent {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export interface WhyUsItem {
  title: string;
  description: string;
  icon: string;
}

export interface SiteContent {
  visibility: {
    services: boolean;
    portfolio: boolean;
    promo: boolean;
    whyUs: boolean;
    reviews: boolean;
    faq: boolean;
    calculator: boolean;
    mobileCta: boolean;
  };
  header: {
    ctaLabel: string;
    mobileMenuCta: string;
  };
  nav: NavItem[];
  hero: {
    eyebrow: string;
    features: string[];
    ctaPrimary: string;
    ctaSecondary: string;
    promoCta: string;
    imageCaption: string;
    imageAlt: string;
  };
  services: SectionHeadingContent & {
    orderCta: string;
    priceFromPrefix: string;
    priceNegotiable: string;
  };
  portfolio: SectionHeadingContent & {
    cta: string;
    lightboxCta: string;
  };
  promo: {
    cta: string;
  };
  whyUs: SectionHeadingContent;
  reviews: SectionHeadingContent;
  faq: SectionHeadingContent;
  contact: SectionHeadingContent & {
    description: string;
  };
  form: {
    nameLabel: string;
    namePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    serviceLabel: string;
    servicePlaceholder: string;
    commentLabel: string;
    commentPlaceholder: string;
    privacyText: string;
    privacyLink: string;
    submitLabel: string;
    submittingLabel: string;
    errorMessage: string;
    successTitle: string;
    successMessage: string;
  };
  calculator: {
    buttonLabel: string;
    eyebrow: string;
    title: string;
    stepLabel: string;
    step1Question: string;
    step2Question: string;
    step2Placeholder: string;
    step2Next: string;
    step3Question: string;
    step3Placeholder: string;
    step3Submit: string;
    step3Submitting: string;
    successTitle: string;
    successMessage: string;
    closeLabel: string;
  };
  footer: {
    contactsLabel: string;
    navLabel: string;
    messengersLabel: string;
    privacyLabel: string;
    copyright: string;
    marquee: string[];
    navLinks: NavItem[];
  };
  mobileCta: {
    callLabel: string;
    requestLabel: string;
  };
  jsonLd: {
    latitude: number;
    longitude: number;
    geoRadius: string;
    addressLocality: string;
    addressRegion: string;
    priceRange: string;
    openingHours: string;
  };
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  visibility: {
    services: true,
    portfolio: true,
    promo: true,
    whyUs: true,
    reviews: true,
    faq: true,
    calculator: true,
    mobileCta: true,
  },
  header: {
    ctaLabel: "Заявка",
    mobileMenuCta: "Оставить заявку",
  },
  nav: [
    { label: "Услуги", href: "#services" },
    { label: "Работы", href: "#portfolio" },
    { label: "Акции", href: "#promo" },
    { label: "Контакты", href: "#contact" },
  ],
  hero: {
    eyebrow: "Москва и Московская область",
    features: ["Бесплатный замер", "Свой цех", "Гарантия 3 года", "Монтаж под ключ"],
    ctaPrimary: "Рассчитать стоимость",
    ctaSecondary: "Смотреть работы",
    promoCta: "Узнать подробнее",
    imageCaption: "Металлоконструкции · под ключ",
    imageAlt: "Пример металлического навеса",
  },
  services: {
    eyebrow: "Каталог",
    title: "Услуги",
    subtitle: "Изготовление и монтаж металлоконструкций под ключ",
    orderCta: "Заказать расчёт",
    priceFromPrefix: "от",
    priceNegotiable: "Договорная",
  },
  portfolio: {
    eyebrow: "Портфолио",
    title: "Наши работы",
    subtitle: "Реализованные проекты в Москве и области",
    cta: "Хочу так же — оставить заявку",
    lightboxCta: "Хочу так же",
  },
  promo: {
    cta: "Получить предложение",
  },
  whyUs: {
    eyebrow: "Преимущества",
    title: "Почему мы",
  },
  reviews: {
    eyebrow: "Отзывы",
    title: "Клиенты о нас",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Частые вопросы",
  },
  contact: {
    eyebrow: "Связь",
    title: "Оставить заявку",
    description: "Оставьте контакты — перезвоним и рассчитаем стоимость бесплатно",
  },
  form: {
    nameLabel: "Ваше имя",
    namePlaceholder: "Иван",
    phoneLabel: "Телефон",
    phonePlaceholder: "+7 (___) ___-__-__",
    serviceLabel: "Тип работ",
    servicePlaceholder: "Выберите услугу",
    commentLabel: "Комментарий",
    commentPlaceholder: "Опишите задачу или адрес объекта",
    privacyText: "Согласен с",
    privacyLink: "политикой конфиденциальности",
    submitLabel: "Отправить заявку",
    submittingLabel: "Отправка...",
    errorMessage: "Проверьте данные и попробуйте снова",
    successTitle: "Заявка отправлена!",
    successMessage: "Перезвоним в течение 15 минут в рабочее время.",
  },
  calculator: {
    buttonLabel: "Быстрый расчёт",
    eyebrow: "Калькулятор",
    title: "Быстрый расчёт",
    stepLabel: "Шаг {step} из 3",
    step1Question: "Какой тип конструкции вам нужен?",
    step2Question: "Примерная площадь (м²)",
    step2Placeholder: "Например, 20",
    step2Next: "Далее",
    step3Question: "Оставьте телефон — пришлём расчёт",
    step3Placeholder: "+7 (___) ___-__-__",
    step3Submit: "Получить расчёт",
    step3Submitting: "Отправка...",
    successTitle: "Спасибо!",
    successMessage: "Мы перезвоним с расчётом в ближайшее время.",
    closeLabel: "Закрыть",
  },
  footer: {
    contactsLabel: "Контакты",
    navLabel: "Навигация",
    messengersLabel: "Мессенджеры",
    privacyLabel: "Политика конфиденциальности",
    copyright: "© {year} {company}. Все права защищены.",
    marquee: ["Навесы", "Козырьки", "Перголы", "Ворота", "Сварка", "Монтаж", "Москва", "МО"],
    navLinks: [
      { label: "Услуги", href: "#services" },
      { label: "Наши работы", href: "#portfolio" },
      { label: "Контакты", href: "#contact" },
      { label: "Политика конфиденциальности", href: "/privacy" },
    ],
  },
  mobileCta: {
    callLabel: "Позвонить",
    requestLabel: "Заявка",
  },
  jsonLd: {
    latitude: 55.7558,
    longitude: 37.6173,
    geoRadius: "100000",
    addressLocality: "Москва",
    addressRegion: "Московская область",
    priceRange: "$$",
    openingHours: "Mo-Sa 09:00-20:00",
  },
};

export const DEFAULT_PRIVACY_CONTENT = `Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей сайта (далее — «Сайт»), оставляющих заявки через форму обратной связи.

## 1. Какие данные мы собираем

При заполнении формы заявки мы можем запрашивать: имя, номер телефона, тип услуги и комментарий к заказу.

## 2. Цели обработки

- Обработка заявки и обратная связь с клиентом
- Расчёт стоимости работ
- Улучшение качества обслуживания

## 3. Передача данных третьим лицам

Персональные данные не передаются третьим лицам, за исключением случаев, предусмотренных законодательством Российской Федерации.

## 4. Хранение данных

Данные хранятся на защищённом сервере в течение срока, необходимого для обработки заявки и ведения деловой переписки.

## 5. Права пользователя

Вы вправе запросить удаление или уточнение своих персональных данных, обратившись по контактному телефону, указанному на Сайте.

## 6. Согласие

Отправляя форму на Сайте, вы даёте согласие на обработку персональных данных в соответствии с настоящей Политикой и Федеральным законом № 152-ФЗ.`;

export const DEFAULT_WHY_US: WhyUsItem[] = [
  {
    title: "Свой цех",
    description: "Изготавливаем конструкции на собственном производстве без посредников",
    icon: "factory",
  },
  {
    title: "Гарантия 3 года",
    description: "Даём гарантию на все виды работ и используемые материалы",
    icon: "shield",
  },
  {
    title: "Бесплатный замер",
    description: "Выезжаем на объект в Москве и МО для точного расчёта",
    icon: "ruler",
  },
  {
    title: "Монтаж под ключ",
    description: "Доставка, сварка, установка и уборка — всё включено",
    icon: "wrench",
  },
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base;
  if (Array.isArray(override)) return override as T;
  if (!isPlainObject(base) || !isPlainObject(override)) return override as T;

  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(override)) {
    const baseVal = (base as Record<string, unknown>)[key];
    const overrideVal = override[key];
    if (overrideVal === undefined) continue;
    result[key] = isPlainObject(baseVal) && isPlainObject(overrideVal)
      ? deepMerge(baseVal, overrideVal)
      : overrideVal;
  }
  return result as T;
}

export function parseSiteContent(contentJson: string | null | undefined): SiteContent {
  if (!contentJson) return DEFAULT_SITE_CONTENT;
  try {
    const parsed = JSON.parse(contentJson) as Partial<SiteContent>;
    return deepMerge(DEFAULT_SITE_CONTENT, parsed);
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

export function parseWhyUs(whyUsJson: string | null | undefined): WhyUsItem[] {
  if (!whyUsJson) return DEFAULT_WHY_US;
  try {
    const parsed = JSON.parse(whyUsJson) as WhyUsItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_WHY_US;
  } catch {
    return DEFAULT_WHY_US;
  }
}

export function parsePrivacyContent(content: string | null | undefined): string {
  return content?.trim() || DEFAULT_PRIVACY_CONTENT;
}

export function formatTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
