import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma, LeadStatus } from "@swarka/database";
import { requireAuth, requireEditor, requireSuperAdmin } from "../plugins/auth.js";
import { deleteUpload, saveUpload } from "../lib/uploads.js";
import {
  createSiteSnapshot,
  getAuditUser,
  logChange,
  restoreChangeLog,
  restoreSiteSnapshot,
} from "../lib/audit.js";
import { getAnalyticsSummary, getDashboardAnalytics } from "../lib/analytics.js";
import { z } from "zod";

const pushRegisterSchema = z.object({
  token: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().min(1).max(120),
  password: z.string().min(1),
});

const userCreateSchema = z.object({
  email: z.string().min(1).max(120),
  password: z.string().min(6),
  name: z.string().optional(),
  role: z.enum(["ADMIN", "VIEWER"]).default("ADMIN"),
});

const userUpdateSchema = z.object({
  email: z.string().min(1).max(120).optional(),
  password: z.string().min(6).optional(),
  name: z.string().nullable().optional(),
  role: z.enum(["ADMIN", "VIEWER"]).optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  app.post("/api/admin/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid credentials" });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });

    reply.setCookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return {
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  });

  app.post("/api/admin/logout", async (_request, reply) => {
    reply.clearCookie("token", { path: "/" });
    return { success: true };
  });

  app.get("/api/admin/me", { preHandler: requireAuth }, async (request) => {
    const payload = request.user as { id: string; email: string };
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    return {
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        role: user?.role ?? "ADMIN",
      },
    };
  });

  // Sub-admins — only SUPER_ADMIN
  app.get("/api/admin/users", { preHandler: requireSuperAdmin }, async () => {
    return prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  });

  app.post("/api/admin/users", { preHandler: requireSuperAdmin }, async (request, reply) => {
    const parsed = userCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data" });
    }

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (exists) {
      return reply.status(400).send({ error: "Email already exists" });
    }

    const password = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        password,
        name: parsed.data.name || "Администратор",
        role: parsed.data.role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return user;
  });

  app.put("/api/admin/users/:id", { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = userUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data" });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return reply.status(404).send({ error: "Not found" });
    }
    if (target.role === "SUPER_ADMIN") {
      return reply.status(403).send({ error: "Cannot edit main admin" });
    }

    const data: { email?: string; name?: string | null; password?: string; role?: string } = {};
    if (parsed.data.email) data.email = parsed.data.email;
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.password) data.password = await bcrypt.hash(parsed.data.password, 10);
    if (parsed.data.role) data.role = parsed.data.role;

    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  });

  app.delete("/api/admin/users/:id", { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const me = request.user as { id: string };
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return reply.status(404).send({ error: "Not found" });
    }
    if (target.role === "SUPER_ADMIN" || target.id === me.id) {
      return reply.status(403).send({ error: "Cannot delete main admin" });
    }
    await prisma.user.delete({ where: { id } });
    return { success: true };
  });

  app.get("/api/admin/dashboard", { preHandler: requireAuth }, async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [todayCount, weekCount, recentLeads, totalServices, totalPortfolio, analytics] =
      await Promise.all([
        prisma.lead.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.lead.count({ where: { createdAt: { gte: weekStart } } }),
        prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.service.count(),
        prisma.portfolioItem.count(),
        getDashboardAnalytics(),
      ]);

    return { todayCount, weekCount, recentLeads, totalServices, totalPortfolio, analytics };
  });

  app.get("/api/admin/analytics", { preHandler: requireAuth }, async (request) => {
    const { days } = request.query as { days?: string };
    const parsedDays = Number(days ?? 7);
    return getAnalyticsSummary(Number.isFinite(parsedDays) ? parsedDays : 7);
  });

  // Settings
  app.get("/api/admin/settings", { preHandler: requireAuth }, async () => {
    return prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  });

  app.put("/api/admin/settings", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const before = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    await createSiteSnapshot(user, "Автоснимок перед изменением настроек");
    const data = request.body as Record<string, unknown>;
    const after = await prisma.siteSettings.update({
      where: { id: "singleton" },
      data,
    });
    await logChange({
      user,
      entityType: "settings",
      entityId: "singleton",
      action: "update",
      label: "Настройки сайта",
      before,
      after,
    });
    return after;
  });

  // Services CRUD
  app.get("/api/admin/services", { preHandler: requireAuth }, async () => {
    return prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
  });

  app.post("/api/admin/services", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const data = request.body as Parameters<typeof prisma.service.create>[0]["data"];
    const created = await prisma.service.create({ data });
    await logChange({
      user,
      entityType: "service",
      entityId: created.id,
      action: "create",
      label: `Создана услуга: ${created.title}`,
      after: created,
    });
    return created;
  });

  app.put("/api/admin/services/:id", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const { id } = request.params as { id: string };
    const before = await prisma.service.findUnique({ where: { id } });
    const data = request.body as Parameters<typeof prisma.service.update>[0]["data"];
    const updated = await prisma.service.update({ where: { id }, data });
    await logChange({
      user,
      entityType: "service",
      entityId: id,
      action: "update",
      label: `Изменена услуга: ${updated.title}`,
      before,
      after: updated,
    });
    return updated;
  });

  app.delete("/api/admin/services/:id", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const { id } = request.params as { id: string };
    const item = await prisma.service.findUnique({ where: { id } });
    if (item?.imageUrl?.startsWith("/uploads/")) deleteUpload(item.imageUrl);
    await prisma.service.delete({ where: { id } });
    if (item) {
      await logChange({
        user,
        entityType: "service",
        entityId: id,
        action: "delete",
        label: `Удалена услуга: ${item.title}`,
        before: item,
      });
    }
    return { success: true };
  });

  // Portfolio CRUD
  app.get("/api/admin/portfolio", { preHandler: requireAuth }, async () => {
    return prisma.portfolioItem.findMany({ orderBy: { sortOrder: "asc" } });
  });

  app.post("/api/admin/portfolio", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const data = request.body as Parameters<typeof prisma.portfolioItem.create>[0]["data"];
    const created = await prisma.portfolioItem.create({ data });
    await logChange({
      user,
      entityType: "portfolio",
      entityId: created.id,
      action: "create",
      label: `Добавлена работа: ${created.title}`,
      after: created,
    });
    return created;
  });

  app.put("/api/admin/portfolio/:id", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const { id } = request.params as { id: string };
    const before = await prisma.portfolioItem.findUnique({ where: { id } });
    const data = request.body as Parameters<typeof prisma.portfolioItem.update>[0]["data"];
    const updated = await prisma.portfolioItem.update({ where: { id }, data });
    await logChange({
      user,
      entityType: "portfolio",
      entityId: id,
      action: "update",
      label: `Изменена работа: ${updated.title}`,
      before,
      after: updated,
    });
    return updated;
  });

  app.delete("/api/admin/portfolio/:id", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const { id } = request.params as { id: string };
    const item = await prisma.portfolioItem.findUnique({ where: { id } });
    if (item?.imageUrl?.startsWith("/uploads/")) deleteUpload(item.imageUrl);
    await prisma.portfolioItem.delete({ where: { id } });
    if (item) {
      await logChange({
        user,
        entityType: "portfolio",
        entityId: id,
        action: "delete",
        label: `Удалена работа: ${item.title}`,
        before: item,
      });
    }
    return { success: true };
  });

  // FAQ CRUD
  app.get("/api/admin/faq", { preHandler: requireAuth }, async () => {
    return prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } });
  });

  app.post("/api/admin/faq", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const data = request.body as Parameters<typeof prisma.faqItem.create>[0]["data"];
    const created = await prisma.faqItem.create({ data });
    await logChange({
      user,
      entityType: "faq",
      entityId: created.id,
      action: "create",
      label: `Добавлен FAQ: ${created.question}`,
      after: created,
    });
    return created;
  });

  app.put("/api/admin/faq/:id", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const { id } = request.params as { id: string };
    const before = await prisma.faqItem.findUnique({ where: { id } });
    const data = request.body as Parameters<typeof prisma.faqItem.update>[0]["data"];
    const updated = await prisma.faqItem.update({ where: { id }, data });
    await logChange({
      user,
      entityType: "faq",
      entityId: id,
      action: "update",
      label: `Изменён FAQ: ${updated.question}`,
      before,
      after: updated,
    });
    return updated;
  });

  app.delete("/api/admin/faq/:id", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const { id } = request.params as { id: string };
    const item = await prisma.faqItem.findUnique({ where: { id } });
    await prisma.faqItem.delete({ where: { id } });
    if (item) {
      await logChange({
        user,
        entityType: "faq",
        entityId: id,
        action: "delete",
        label: `Удалён FAQ: ${item.question}`,
        before: item,
      });
    }
    return { success: true };
  });

  // Reviews CRUD
  app.get("/api/admin/reviews", { preHandler: requireAuth }, async () => {
    return prisma.review.findMany({ orderBy: { sortOrder: "asc" } });
  });

  app.post("/api/admin/reviews", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const data = request.body as Parameters<typeof prisma.review.create>[0]["data"];
    const created = await prisma.review.create({ data });
    await logChange({
      user,
      entityType: "review",
      entityId: created.id,
      action: "create",
      label: `Добавлен отзыв: ${created.authorName}`,
      after: created,
    });
    return created;
  });

  app.put("/api/admin/reviews/:id", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const { id } = request.params as { id: string };
    const before = await prisma.review.findUnique({ where: { id } });
    const data = request.body as Parameters<typeof prisma.review.update>[0]["data"];
    const updated = await prisma.review.update({ where: { id }, data });
    await logChange({
      user,
      entityType: "review",
      entityId: id,
      action: "update",
      label: `Изменён отзыв: ${updated.authorName}`,
      before,
      after: updated,
    });
    return updated;
  });

  app.delete("/api/admin/reviews/:id", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const { id } = request.params as { id: string };
    const item = await prisma.review.findUnique({ where: { id } });
    await prisma.review.delete({ where: { id } });
    if (item) {
      await logChange({
        user,
        entityType: "review",
        entityId: id,
        action: "delete",
        label: `Удалён отзыв: ${item.authorName}`,
        before: item,
      });
    }
    return { success: true };
  });

  // Leads
  app.get("/api/admin/leads", { preHandler: requireAuth }, async () => {
    return prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
  });

  app.put("/api/admin/leads/:id", { preHandler: requireEditor }, async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as { status?: LeadStatus; note?: string };
    return prisma.lead.update({ where: { id }, data });
  });

  app.delete("/api/admin/leads/:id", { preHandler: requireEditor }, async (request) => {
    const { id } = request.params as { id: string };
    await prisma.lead.delete({ where: { id } });
    return { success: true };
  });

  app.get("/api/mobile/leads/check", { preHandler: requireAuth }, async (request) => {
    const { since } = request.query as { since?: string };
    const sinceDate = since ? new Date(since) : null;
    const leads = await prisma.lead.findMany({
      where: sinceDate && !Number.isNaN(sinceDate.getTime())
        ? { createdAt: { gt: sinceDate } }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        phone: true,
        serviceType: true,
        createdAt: true,
      },
    });
    return { leads };
  });

  app.post("/api/mobile/push/register", { preHandler: requireAuth }, async (request) => {
    const parsed = pushRegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return { success: false };
    }

    const user = request.user as { id: string };
    await prisma.pushToken.upsert({
      where: { token: parsed.data.token },
      create: {
        userId: user.id,
        token: parsed.data.token,
      },
      update: {
        userId: user.id,
      },
    });

    return { success: true };
  });

  app.delete("/api/mobile/push/register", { preHandler: requireAuth }, async (request) => {
    const parsed = pushRegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return { success: false };
    }

    await prisma.pushToken.deleteMany({
      where: { token: parsed.data.token },
    });

    return { success: true };
  });

  // Versions & audit log
  app.get("/api/admin/changelog", { preHandler: requireAuth }, async () => {
    return prisma.changeLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  });

  app.get("/api/admin/snapshots", { preHandler: requireAuth }, async () => {
    return prisma.siteSnapshot.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        label: true,
        userEmail: true,
        createdAt: true,
      },
    });
  });

  app.post("/api/admin/snapshots", { preHandler: requireEditor }, async (request) => {
    const user = getAuditUser(request);
    const body = (request.body ?? {}) as { label?: string };
    const snapshot = await createSiteSnapshot(user, body.label);
    await logChange({
      user,
      entityType: "snapshot",
      entityId: snapshot.id,
      action: "create",
      label: snapshot.label ?? "Ручной снимок сайта",
      after: { snapshotId: snapshot.id },
    });
    return snapshot;
  });

  app.post("/api/admin/changelog/:id/restore", { preHandler: requireEditor }, async (request, reply) => {
    const user = getAuditUser(request);
    const { id } = request.params as { id: string };
    try {
      await createSiteSnapshot(user, "Перед откатом изменения");
      await restoreChangeLog(id);
      await logChange({
        user,
        entityType: "changelog",
        entityId: id,
        action: "restore",
        label: "Откат отдельного изменения",
      });
      return { success: true };
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  app.post("/api/admin/snapshots/:id/restore", { preHandler: requireEditor }, async (request, reply) => {
    const user = getAuditUser(request);
    const { id } = request.params as { id: string };
    try {
      await createSiteSnapshot(user, "Перед восстановлением снимка");
      await restoreSiteSnapshot(id);
      await logChange({
        user,
        entityType: "snapshot",
        entityId: id,
        action: "restore",
        label: "Восстановление полного снимка сайта",
      });
      return { success: true };
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // Upload
  app.post("/api/admin/upload", { preHandler: requireEditor }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    try {
      const url = await saveUpload(file.file, file.filename);
      return { url };
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });
}
