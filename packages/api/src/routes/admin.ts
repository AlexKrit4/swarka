import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma, LeadStatus } from "@swarka/database";
import { requireAuth, requireSuperAdmin } from "../plugins/auth.js";
import { deleteUpload, saveUpload } from "../lib/uploads.js";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().nullable().optional(),
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
        role: "ADMIN",
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

    const data: { email?: string; name?: string | null; password?: string } = {};
    if (parsed.data.email) data.email = parsed.data.email;
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.password) data.password = await bcrypt.hash(parsed.data.password, 10);

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

    const [todayCount, weekCount, recentLeads, totalServices, totalPortfolio] =
      await Promise.all([
        prisma.lead.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.lead.count({ where: { createdAt: { gte: weekStart } } }),
        prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.service.count(),
        prisma.portfolioItem.count(),
      ]);

    return { todayCount, weekCount, recentLeads, totalServices, totalPortfolio };
  });

  // Settings
  app.get("/api/admin/settings", { preHandler: requireAuth }, async () => {
    return prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  });

  app.put("/api/admin/settings", { preHandler: requireAuth }, async (request) => {
    const data = request.body as Record<string, unknown>;
    return prisma.siteSettings.update({
      where: { id: "singleton" },
      data,
    });
  });

  // Services CRUD
  app.get("/api/admin/services", { preHandler: requireAuth }, async () => {
    return prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
  });

  app.post("/api/admin/services", { preHandler: requireAuth }, async (request) => {
    const data = request.body as Parameters<typeof prisma.service.create>[0]["data"];
    return prisma.service.create({ data });
  });

  app.put("/api/admin/services/:id", { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as Parameters<typeof prisma.service.update>[0]["data"];
    return prisma.service.update({ where: { id }, data });
  });

  app.delete("/api/admin/services/:id", { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const item = await prisma.service.findUnique({ where: { id } });
    if (item?.imageUrl?.startsWith("/uploads/")) deleteUpload(item.imageUrl);
    await prisma.service.delete({ where: { id } });
    return { success: true };
  });

  // Portfolio CRUD
  app.get("/api/admin/portfolio", { preHandler: requireAuth }, async () => {
    return prisma.portfolioItem.findMany({ orderBy: { sortOrder: "asc" } });
  });

  app.post("/api/admin/portfolio", { preHandler: requireAuth }, async (request) => {
    const data = request.body as Parameters<typeof prisma.portfolioItem.create>[0]["data"];
    return prisma.portfolioItem.create({ data });
  });

  app.put("/api/admin/portfolio/:id", { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as Parameters<typeof prisma.portfolioItem.update>[0]["data"];
    return prisma.portfolioItem.update({ where: { id }, data });
  });

  app.delete("/api/admin/portfolio/:id", { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const item = await prisma.portfolioItem.findUnique({ where: { id } });
    if (item?.imageUrl?.startsWith("/uploads/")) deleteUpload(item.imageUrl);
    await prisma.portfolioItem.delete({ where: { id } });
    return { success: true };
  });

  // FAQ CRUD
  app.get("/api/admin/faq", { preHandler: requireAuth }, async () => {
    return prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } });
  });

  app.post("/api/admin/faq", { preHandler: requireAuth }, async (request) => {
    const data = request.body as Parameters<typeof prisma.faqItem.create>[0]["data"];
    return prisma.faqItem.create({ data });
  });

  app.put("/api/admin/faq/:id", { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as Parameters<typeof prisma.faqItem.update>[0]["data"];
    return prisma.faqItem.update({ where: { id }, data });
  });

  app.delete("/api/admin/faq/:id", { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    await prisma.faqItem.delete({ where: { id } });
    return { success: true };
  });

  // Reviews CRUD
  app.get("/api/admin/reviews", { preHandler: requireAuth }, async () => {
    return prisma.review.findMany({ orderBy: { sortOrder: "asc" } });
  });

  app.post("/api/admin/reviews", { preHandler: requireAuth }, async (request) => {
    const data = request.body as Parameters<typeof prisma.review.create>[0]["data"];
    return prisma.review.create({ data });
  });

  app.put("/api/admin/reviews/:id", { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as Parameters<typeof prisma.review.update>[0]["data"];
    return prisma.review.update({ where: { id }, data });
  });

  app.delete("/api/admin/reviews/:id", { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    await prisma.review.delete({ where: { id } });
    return { success: true };
  });

  // Leads
  app.get("/api/admin/leads", { preHandler: requireAuth }, async () => {
    return prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
  });

  app.put("/api/admin/leads/:id", { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as { status?: LeadStatus; note?: string };
    return prisma.lead.update({ where: { id }, data });
  });

  app.delete("/api/admin/leads/:id", { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    await prisma.lead.delete({ where: { id } });
    return { success: true };
  });

  // Upload
  app.post("/api/admin/upload", { preHandler: requireAuth }, async (request, reply) => {
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
