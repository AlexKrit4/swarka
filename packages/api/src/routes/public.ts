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

const blockRushScoreSchema = z.object({
  playerId: z.string().min(12).max(64).regex(/^[a-zA-Z0-9-]+$/),
  playerName: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[\p{L}\p{N} _.-]+$/u),
  score: z.number().int().min(0).max(100_000_000),
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

  app.get("/api/blockrush/leaderboard", async () => {
    const scores = await prisma.blockRushScore.findMany({
      orderBy: [{ score: "desc" }, { updatedAt: "asc" }],
      take: 50,
      select: {
        playerId: true,
        playerName: true,
        score: true,
        updatedAt: true,
      },
    });
    return { scores };
  });

  app.post("/api/blockrush/leaderboard", async (request, reply) => {
    const parsed = blockRushScoreSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid score" });
    }

    const { playerId, playerName, score } = parsed.data;
    const current = await prisma.blockRushScore.findUnique({
      where: { playerId },
    });
    const saved =
      current == null
        ? await prisma.blockRushScore.create({
            data: { playerId, playerName, score },
          })
        : await prisma.blockRushScore.update({
            where: { playerId },
            data: {
              playerName,
              score: Math.max(score, current.score),
            },
          });
    const rank =
      (await prisma.blockRushScore.count({
        where: { score: { gt: saved.score } },
      })) + 1;
    return { success: true, score: saved.score, rank };
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
