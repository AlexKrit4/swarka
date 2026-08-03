import { prisma } from "@swarka/database";

export type SupportActor = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

function serializeMessage(message: {
  id: string;
  threadId: string;
  senderUserId: string;
  senderEmail: string;
  senderName: string | null;
  senderRole: string;
  body: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  createdAt: Date;
  readByAdminAt: Date | null;
  readBySupportAt: Date | null;
}) {
  return {
    id: message.id,
    threadId: message.threadId,
    senderUserId: message.senderUserId,
    senderEmail: message.senderEmail,
    senderName: message.senderName,
    senderRole: message.senderRole,
    body: message.body,
    attachmentUrl: message.attachmentUrl,
    attachmentName: message.attachmentName,
    attachmentMime: message.attachmentMime,
    createdAt: message.createdAt.toISOString(),
    readByAdminAt: message.readByAdminAt?.toISOString() ?? null,
    readBySupportAt: message.readBySupportAt?.toISOString() ?? null,
  };
}

export async function getOrCreateSupportThread(adminUserId: string) {
  const existing = await prisma.supportThread.findUnique({
    where: { adminUserId },
  });
  if (existing) return existing;

  return prisma.supportThread.create({
    data: { adminUserId },
  });
}

export async function getSupportThreadMessages(threadId: string, limit = 200) {
  const messages = await prisma.supportMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  return messages.map(serializeMessage);
}

export async function getAdminOwnSupportChat(actor: SupportActor) {
  if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
    throw new Error("Нет доступа к поддержке");
  }
  // Regular admin always chats as themselves. Super admin uses thread list UI.
  if (actor.role !== "ADMIN") {
    throw new Error("Используйте список диалогов");
  }

  const thread = await getOrCreateSupportThread(actor.id);
  const messages = await getSupportThreadMessages(thread.id);
  return {
    thread: {
      id: thread.id,
      adminUserId: thread.adminUserId,
      updatedAt: thread.updatedAt.toISOString(),
    },
    messages,
  };
}

export async function listSupportThreadsForSuperAdmin() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, email: true, name: true },
  });

  const threads = await prisma.supportThread.findMany({
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const threadByAdmin = new Map(threads.map((t) => [t.adminUserId, t]));

  const unreadCounts = await prisma.supportMessage.groupBy({
    by: ["threadId"],
    where: {
      senderRole: "ADMIN",
      readBySupportAt: null,
    },
    _count: { _all: true },
  });
  const unreadByThread = new Map(unreadCounts.map((row) => [row.threadId, row._count._all]));

  return admins.map((admin) => {
    const thread = threadByAdmin.get(admin.id);
    const last = thread?.messages[0] ?? null;
    return {
      adminUserId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      threadId: thread?.id ?? null,
      updatedAt: thread?.updatedAt.toISOString() ?? null,
      unreadCount: thread ? unreadByThread.get(thread.id) ?? 0 : 0,
      lastMessage: last
        ? {
            body: last.body,
            attachmentName: last.attachmentName,
            createdAt: last.createdAt.toISOString(),
            senderRole: last.senderRole,
          }
        : null,
    };
  });
}

export async function getSupportThreadForSuperAdmin(threadId: string) {
  const thread = await prisma.supportThread.findUnique({ where: { id: threadId } });
  if (!thread) throw new Error("Диалог не найден");

  const admin = await prisma.user.findUnique({
    where: { id: thread.adminUserId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!admin || admin.role !== "ADMIN") throw new Error("Админ не найден");

  const messages = await getSupportThreadMessages(thread.id);
  return {
    thread: {
      id: thread.id,
      adminUserId: thread.adminUserId,
      adminEmail: admin.email,
      adminName: admin.name,
      updatedAt: thread.updatedAt.toISOString(),
    },
    messages,
  };
}

export async function getOrOpenThreadForAdmin(adminUserId: string) {
  const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
  if (!admin || admin.role !== "ADMIN") {
    throw new Error("Можно писать только подадминам");
  }
  const thread = await getOrCreateSupportThread(adminUserId);
  return getSupportThreadForSuperAdmin(thread.id);
}

export async function postSupportMessage(input: {
  actor: SupportActor;
  threadId?: string;
  adminUserId?: string;
  body?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
}) {
  const body = (input.body ?? "").trim();
  const hasAttachment = !!input.attachmentUrl;
  if (!body && !hasAttachment) {
    throw new Error("Напишите сообщение или прикрепите файл");
  }
  if (body.length > 4000) {
    throw new Error("Слишком длинное сообщение");
  }

  let threadId = input.threadId;

  if (input.actor.role === "ADMIN") {
    const thread = await getOrCreateSupportThread(input.actor.id);
    threadId = thread.id;
  } else if (input.actor.role === "SUPER_ADMIN") {
    if (!threadId && input.adminUserId) {
      const thread = await getOrCreateSupportThread(input.adminUserId);
      threadId = thread.id;
    }
    if (!threadId) throw new Error("Не выбран диалог");
    const thread = await prisma.supportThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new Error("Диалог не найден");
  } else {
    throw new Error("Нет доступа");
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.supportMessage.create({
      data: {
        threadId: threadId!,
        senderUserId: input.actor.id,
        senderEmail: input.actor.email,
        senderName: input.actor.name,
        senderRole: input.actor.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN",
        body,
        attachmentUrl: input.attachmentUrl ?? null,
        attachmentName: input.attachmentName ?? null,
        attachmentMime: input.attachmentMime ?? null,
        readByAdminAt: input.actor.role === "ADMIN" ? new Date() : null,
        readBySupportAt: input.actor.role === "SUPER_ADMIN" ? new Date() : null,
      },
    });

    await tx.supportThread.update({
      where: { id: threadId! },
      data: { updatedAt: new Date() },
    });

    return created;
  });

  const thread = await prisma.supportThread.findUniqueOrThrow({ where: { id: threadId! } });

  return {
    message: serializeMessage(message),
    threadId: thread.id,
    adminUserId: thread.adminUserId,
  };
}

export async function markSupportThreadRead(input: {
  actor: SupportActor;
  threadId: string;
}) {
  const thread = await prisma.supportThread.findUnique({ where: { id: input.threadId } });
  if (!thread) throw new Error("Диалог не найден");

  if (input.actor.role === "ADMIN") {
    if (thread.adminUserId !== input.actor.id) throw new Error("Нет доступа");
    await prisma.supportMessage.updateMany({
      where: {
        threadId: thread.id,
        senderRole: "SUPER_ADMIN",
        readByAdminAt: null,
      },
      data: { readByAdminAt: new Date() },
    });
  } else if (input.actor.role === "SUPER_ADMIN") {
    await prisma.supportMessage.updateMany({
      where: {
        threadId: thread.id,
        senderRole: "ADMIN",
        readBySupportAt: null,
      },
      data: { readBySupportAt: new Date() },
    });
  } else {
    throw new Error("Нет доступа");
  }

  return { success: true };
}

export async function countUnreadForActor(actor: SupportActor) {
  if (actor.role === "ADMIN") {
    const thread = await prisma.supportThread.findUnique({ where: { adminUserId: actor.id } });
    if (!thread) return 0;
    return prisma.supportMessage.count({
      where: {
        threadId: thread.id,
        senderRole: "SUPER_ADMIN",
        readByAdminAt: null,
      },
    });
  }

  if (actor.role === "SUPER_ADMIN") {
    return prisma.supportMessage.count({
      where: {
        senderRole: "ADMIN",
        readBySupportAt: null,
      },
    });
  }

  return 0;
}
