import type { FastifyInstance } from "fastify";
import { prisma } from "@swarka/database";
import { sendTelegramNotification } from "../lib/telegram.js";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  serviceType: z.string().optional(),
  comment: z.string().optional(),
  source: z.string().optional(),
});

export async function publicRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => ({ status: "ok" }));

  app.get("/api/settings", async () => {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
    });
    const reviews = await prisma.review.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    const whyUs = settings?.whyUsJson ? JSON.parse(settings.whyUsJson) : [];
    return { settings, reviews, whyUs };
  });

  app.get("/api/services", async () => {
    return prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  });

  app.get("/api/portfolio", async () => {
    return prisma.portfolioItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  });

  app.get("/api/faq", async () => {
    return prisma.faqItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  });

  app.post("/api/leads", async (request, reply) => {
    const parsed = leadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const lead = await prisma.lead.create({ data: parsed.data });

    const message = [
      "🔔 <b>Новая заявка</b>",
      `Имя: ${lead.name}`,
      `Телефон: ${lead.phone}`,
      lead.serviceType ? `Услуга: ${lead.serviceType}` : "",
      lead.comment ? `Комментарий: ${lead.comment}` : "",
      lead.source ? `Источник: ${lead.source}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await sendTelegramNotification(message);

    return { success: true, id: lead.id };
  });
}
