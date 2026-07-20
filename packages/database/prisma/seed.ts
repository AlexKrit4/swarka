import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const whyUs = [
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

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: "Администратор",
    },
  });

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      companyName: "SWARKA",
      phone: "+7 (495) 108-74-86",
      whatsapp: "74951087486",
      telegram: "swarka_moscow",
      email: "info@swarka.ru",
      logoText: "SWARKA",
      heroTitle: "Изготовление и установка навесов в Москве и МО",
      heroSubtitle: "Сварка, проектирование и монтаж металлоконструкций на объекте",
      heroImageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Carport_with_storage.jpg/1280px-Carport_with_storage.jpg",
      promoTitle: "Скидка 10% на монтаж",
      promoSubtitle: "При заказе навеса до конца месяца",
      promoBadge: "Акция",
      promoEnabled: true,
      seoTitle: "Изготовление и установка навесов в Москве и МО | SWARKA",
      seoDescription:
        "Сварочные и монтажные работы: навесы, козырьки, ворота, перголы. Бесплатный замер, гарантия 3 года. Москва и область.",
      whyUsJson: JSON.stringify(whyUs),
      workZone: "Москва и Московская область",
      address: "г. Москва, выезд по всей области",
    },
  });

  const servicesCount = await prisma.service.count();
  if (servicesCount === 0) {
    await prisma.service.createMany({
      data: [
        {
          title: "Навесы для автомобилей",
          description: "Одно- и двухскатные навесы из поликарбоната или металла",
          priceFrom: 45000,
          imageUrl:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Carport_with_storage.jpg/960px-Carport_with_storage.jpg",
          sortOrder: 1,
        },
        {
          title: "Козырьки над входом",
          description: "Кованые и сварные козырьки из металла с покрытием",
          priceFrom: 25000,
          imageUrl:
            "https://upload.wikimedia.org/wikipedia/commons/d/d7/Black_Cantilever_Carport.gif",
          sortOrder: 2,
        },
        {
          title: "Перголы и террасы",
          description: "Металлические перголы для зон отдыха и террас",
          priceFrom: 80000,
          imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c2/Pergola.jpg",
          sortOrder: 3,
        },
        {
          title: "Ворота и калитки",
          description: "Распашные и откатные ворота, заборные секции",
          priceFrom: 55000,
          imageUrl:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Via_Camillo_Cavour_26%2C_Palazzo_Castiglione%2C_androne%2C_cancellata_02_iniziali_LC.jpg/1280px-Via_Camillo_Cavour_26%2C_Palazzo_Castiglione%2C_androne%2C_cancellata_02_iniziali_LC.jpg",
          sortOrder: 4,
        },
        {
          title: "Навесы для бассейнов",
          description: "Защита бассейна от осадков и ультрафиолета",
          priceFrom: 120000,
          imageUrl:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Swimming_pool_at_Hotel_Terra_Barichara.jpg/1280px-Swimming_pool_at_Hotel_Terra_Barichara.jpg",
          sortOrder: 5,
        },
        {
          title: "Сварочные работы",
          description: "Любые сварочные и монтажные работы на объекте",
          priceFrom: 15000,
          imageUrl:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/GMAW.welding.af.ncs.jpg/1280px-GMAW.welding.af.ncs.jpg",
          sortOrder: 6,
        },
      ],
    });
  }

  const portfolioCount = await prisma.portfolioItem.count();
  if (portfolioCount === 0) {
    await prisma.portfolioItem.createMany({
      data: [
        {
          title: "Навес для двух автомобилей",
          description: "Металлокаркас с поликарбонатом, г. Химки",
          imageUrl:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Carport_with_storage.jpg/1280px-Carport_with_storage.jpg",
          tag: "навес",
          sortOrder: 1,
        },
        {
          title: "Козырёк над крыльцом",
          description: "Кованый козырёк с ковкой, Москва",
          imageUrl:
            "https://upload.wikimedia.org/wikipedia/commons/d/d7/Black_Cantilever_Carport.gif",
          tag: "козырёк",
          sortOrder: 2,
        },
        {
          title: "Пергола на террасе",
          description: "Металлическая пергола с деревянными рейками",
          imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c2/Pergola.jpg",
          tag: "пергола",
          sortOrder: 3,
        },
        {
          title: "Откатные ворота",
          description: "Автоматические откатные ворота 4м, МО",
          imageUrl:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Via_Santo_Spirito_27%2C_palazzo_Graziosi_Manetti%2C_androne_01_cancellata.jpg/1280px-Via_Santo_Spirito_27%2C_palazzo_Graziosi_Manetti%2C_androne_01_cancellata.jpg",
          tag: "ворота",
          sortOrder: 4,
        },
      ],
    });
  }

  const faqCount = await prisma.faqItem.count();
  if (faqCount === 0) {
    await prisma.faqItem.createMany({
      data: [
        {
          question: "Сколько времени занимает изготовление навеса?",
          answer:
            "Стандартный навес изготавливаем за 5–10 рабочих дней. Срок зависит от сложности конструкции и загруженности цеха.",
          sortOrder: 1,
        },
        {
          question: "Какие материалы вы используете?",
          answer:
            "Работаем с профильной трубой, листовым металлом, поликарбонатом, фасадными рейками. Покрытие — порошковая краска или цинкование.",
          sortOrder: 2,
        },
        {
          question: "Делаете ли вы бесплатный замер?",
          answer: "Да, выезд замерщика по Москве и Московской области — бесплатно при заказе от 30 000 ₽.",
          sortOrder: 3,
        },
        {
          question: "Какая гарантия на работы?",
          answer: "Предоставляем гарантию 3 года на конструкцию и 1 год на монтажные работы.",
          sortOrder: 4,
        },
        {
          question: "Как происходит оплата?",
          answer: "Предоплата 50% при заключении договора, остаток — после монтажа и приёмки работ.",
          sortOrder: 5,
        },
      ],
    });
  }

  const reviewCount = await prisma.review.count();
  if (reviewCount === 0) {
    await prisma.review.createMany({
      data: [
        {
          authorName: "Алексей М.",
          text: "Сделали навес за неделю, качество отличное. Рекомендую!",
          rating: 5,
          sortOrder: 1,
        },
        {
          authorName: "Елена К.",
          text: "Заказывали козырёк над входом — всё аккуратно, в срок, без лишней пыли.",
          rating: 5,
          sortOrder: 2,
        },
        {
          authorName: "Дмитрий В.",
          text: "Откатные ворота работают без нареканий уже второй год. Спасибо!",
          rating: 5,
          sortOrder: 3,
        },
      ],
    });
  }

  console.log("Seed completed successfully");
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
