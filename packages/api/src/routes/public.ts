import type { FastifyInstance } from "fastify";
import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@swarka/database";
import { sendTelegramNotification } from "../lib/telegram.js";
import { sendLeadPushNotification } from "../lib/fcm.js";
import { recordSiteVisit } from "../lib/analytics.js";
import { getMobileAppVersionInfo } from "../lib/mobile-app.js";
import { getBillingStatus } from "../lib/billing.js";
import { assertPublicSiteAvailable } from "../lib/site-gate.js";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  serviceType: z.string().optional(),
  comment: z.string().optional(),
  source: z.string().optional(),
});

const trackSchema = z.object({
  visitorId: z.string().min(8).max(64).optional(),
  path: z.string().min(1).max(500),
  referer: z.string().max(2000).optional(),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
});

export async function publicRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request, reply) => {
    await assertPublicSiteAvailable(request, reply);
  });

  app.get("/api/health", async () => ({ status: "ok" }));

  app.get("/api/billing/site-status", async () => {
    const status = await getBillingStatus();
    return { isSiteEnabled: status.isSiteEnabled };
  });

  app.get("/api/mobile/accounts", async () => {
    return prisma.user.findMany({
      where: { role: { in: ["ADMIN", "VIEWER"] } },
      select: { id: true, email: true, name: true },
      orderBy: { createdAt: "asc" },
    });
  });

  app.get("/api/mobile/app-version", async () => getMobileAppVersionInfo());

  app.get("/api/mobile/app-download", async (request, reply) => {
    const candidates = [
      process.env.MOBILE_APP_APK_PATH,
      "/app/mobile/SWARKA-Admin.apk",
      join(process.cwd(), "..", "..", "mobile", "SWARKA-Admin.apk"),
      join(process.cwd(), "..", "..", "releases", "SWARKA-Admin.apk"),
    ].filter(Boolean) as string[];

    const apkPath = candidates.find((path) => existsSync(path));
    if (!apkPath) {
      const { downloadUrl } = getMobileAppVersionInfo();
      if (downloadUrl.includes("/api/mobile/app-download")) {
        return reply.status(404).send({ error: "APK not found on server" });
      }
      return reply.redirect(downloadUrl);
    }

    reply.header("Content-Type", "application/vnd.android.package-archive");
    reply.header("Content-Disposition", 'attachment; filename="SWARKA-Admin.apk"');
    return reply.send(createReadStream(apkPath));
  });

  app.post("/api/track", async (request, reply) => {
    const parsed = trackSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    try {
      const result = await recordSiteVisit(request, parsed.data);
      return { success: true, ...result };
    } catch {
      return reply.status(500).send({ error: "Track failed" });
    }
  });

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
    await sendLeadPushNotification({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      serviceType: lead.serviceType,
    });

    return { success: true, id: lead.id };
  });
}
