import type { FastifyInstance } from "fastify";
import { prisma } from "@swarka/database";
import { requireEditor, requireSuperAdmin, type AuthUser } from "../plugins/auth.js";
import {
  countUnreadForActor,
  getAdminOwnSupportChat,
  getOrOpenThreadForAdmin,
  getSupportThreadForSuperAdmin,
  listSupportThreadsForSuperAdmin,
  markSupportThreadRead,
  postSupportMessage,
} from "../lib/support.js";
import {
  sendSupportMessageToAdminPush,
  sendSupportMessageToSuperAdminsPush,
} from "../lib/fcm.js";
import { saveUpload, SUPPORT_UPLOAD_EXTS } from "../lib/uploads.js";
import { z } from "zod";

const postMessageSchema = z.object({
  body: z.string().max(4000).optional(),
  threadId: z.string().min(1).optional(),
  adminUserId: z.string().min(1).optional(),
  attachmentUrl: z.string().min(1).nullable().optional(),
  attachmentName: z.string().max(255).nullable().optional(),
  attachmentMime: z.string().max(120).nullable().optional(),
});

async function loadActor(user: AuthUser) {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return null;
  if (dbUser.role !== "ADMIN" && dbUser.role !== "SUPER_ADMIN") return null;
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
  };
}

export async function supportRoutes(app: FastifyInstance) {
  app.get("/api/admin/support/unread-count", { preHandler: requireEditor }, async (request, reply) => {
    const actor = await loadActor(request.user as AuthUser);
    if (!actor) return reply.status(403).send({ error: "Forbidden" });
    return { unreadCount: await countUnreadForActor(actor) };
  });

  app.get("/api/admin/support/my-thread", { preHandler: requireEditor }, async (request, reply) => {
    const actor = await loadActor(request.user as AuthUser);
    if (!actor) return reply.status(403).send({ error: "Forbidden" });
    if (actor.role === "SUPER_ADMIN") {
      // Super admins use the inbox UI; never error here (avoids mobile toast spam).
      return { mode: "super" as const, thread: null, messages: [] };
    }

    try {
      const chat = await getAdminOwnSupportChat(actor);
      return { mode: "admin" as const, ...chat };
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Ошибка" });
    }
  });

  app.get("/api/admin/support/threads", { preHandler: requireSuperAdmin }, async () => {
    return { threads: await listSupportThreadsForSuperAdmin() };
  });

  app.get("/api/admin/support/threads/:id", { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await getSupportThreadForSuperAdmin(id);
    } catch (err) {
      return reply.status(404).send({ error: err instanceof Error ? err.message : "Не найдено" });
    }
  });

  app.post("/api/admin/support/threads/open", { preHandler: requireSuperAdmin }, async (request, reply) => {
    const parsed = z.object({ adminUserId: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid payload" });
    try {
      return await getOrOpenThreadForAdmin(parsed.data.adminUserId);
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Ошибка" });
    }
  });

  app.post("/api/admin/support/messages", { preHandler: requireEditor }, async (request, reply) => {
    const actor = await loadActor(request.user as AuthUser);
    if (!actor) return reply.status(403).send({ error: "Forbidden" });

    const parsed = postMessageSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid payload" });

    try {
      const result = await postSupportMessage({
        actor,
        threadId: parsed.data.threadId,
        adminUserId: parsed.data.adminUserId,
        body: parsed.data.body,
        attachmentUrl: parsed.data.attachmentUrl,
        attachmentName: parsed.data.attachmentName,
        attachmentMime: parsed.data.attachmentMime,
      });

      if (actor.role === "ADMIN") {
        await sendSupportMessageToSuperAdminsPush({
          threadId: result.threadId,
          preview: result.message.body || result.message.attachmentName || "Вложение",
          adminEmail: actor.email,
        });
      } else {
        await sendSupportMessageToAdminPush(result.adminUserId, {
          threadId: result.threadId,
          preview: result.message.body || result.message.attachmentName || "Вложение",
        });
      }

      return result;
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Ошибка" });
    }
  });

  app.post("/api/admin/support/threads/:id/read", { preHandler: requireEditor }, async (request, reply) => {
    const actor = await loadActor(request.user as AuthUser);
    if (!actor) return reply.status(403).send({ error: "Forbidden" });
    const { id } = request.params as { id: string };

    try {
      return await markSupportThreadRead({ actor, threadId: id });
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Ошибка" });
    }
  });

  app.post("/api/admin/support/upload", { preHandler: requireEditor }, async (request, reply) => {
    const actor = await loadActor(request.user as AuthUser);
    if (!actor) return reply.status(403).send({ error: "Forbidden" });

    const file = await request.file();
    if (!file) return reply.status(400).send({ error: "Файл не передан" });

    try {
      const url = await saveUpload(file.file, file.filename, { allowedExts: SUPPORT_UPLOAD_EXTS });
      return {
        url,
        name: file.filename,
        mime: file.mimetype,
      };
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Ошибка загрузки" });
    }
  });
}
