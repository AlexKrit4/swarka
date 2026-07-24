import { prisma } from "@swarka/database";

export interface AuditUser {
  id: string;
  email: string;
}

export async function buildSiteSnapshot() {
  const [settings, services, portfolio, faq, reviews] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    prisma.service.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.portfolioItem.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.review.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return { settings, services, portfolio, faq, reviews };
}

export async function createSiteSnapshot(
  user: AuditUser | null,
  label?: string
) {
  const snapshot = await buildSiteSnapshot();
  return prisma.siteSnapshot.create({
    data: {
      label: label ?? `Снимок ${new Date().toLocaleString("ru-RU")}`,
      userId: user?.id,
      userEmail: user?.email,
      snapshotJson: JSON.stringify(snapshot),
    },
  });
}

export async function logChange(params: {
  user: AuditUser | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  label: string;
  before?: unknown;
  after?: unknown;
}) {
  return prisma.changeLog.create({
    data: {
      userId: params.user?.id,
      userEmail: params.user?.email,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      action: params.action,
      label: params.label,
      beforeJson: params.before != null ? JSON.stringify(params.before) : null,
      afterJson: params.after != null ? JSON.stringify(params.after) : null,
    },
  });
}

export function getAuditUser(request: { user?: unknown }): AuditUser | null {
  const payload = request.user as { id?: string; email?: string } | undefined;
  if (!payload?.id || !payload?.email) return null;
  return { id: payload.id, email: payload.email };
}

export async function restoreSiteSnapshot(snapshotId: string) {
  const snapshot = await prisma.siteSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot) throw new Error("Snapshot not found");

  const data = JSON.parse(snapshot.snapshotJson) as {
    settings: Record<string, unknown> | null;
    services: Array<Record<string, unknown>>;
    portfolio: Array<Record<string, unknown>>;
    faq: Array<Record<string, unknown>>;
    reviews: Array<Record<string, unknown>>;
  };

  await prisma.$transaction(async (tx) => {
    if (data.settings) {
      const { id: _id, updatedAt: _updatedAt, ...settingsData } = data.settings as {
        id: string;
        updatedAt?: string;
        [key: string]: unknown;
      };
      await tx.siteSettings.update({
        where: { id: "singleton" },
        data: settingsData,
      });
    }

    await tx.service.deleteMany();
    if (data.services.length) {
      await tx.service.createMany({
        data: data.services.map((item) => {
          const { createdAt: _c, updatedAt: _u, ...rest } = item as {
            createdAt?: string;
            updatedAt?: string;
            [key: string]: unknown;
          };
          return rest;
        }) as Parameters<typeof tx.service.createMany>[0]["data"],
      });
    }

    await tx.portfolioItem.deleteMany();
    if (data.portfolio.length) {
      await tx.portfolioItem.createMany({
        data: data.portfolio.map((item) => {
          const { createdAt: _c, updatedAt: _u, ...rest } = item as {
            createdAt?: string;
            updatedAt?: string;
            [key: string]: unknown;
          };
          return rest;
        }) as Parameters<typeof tx.portfolioItem.createMany>[0]["data"],
      });
    }

    await tx.faqItem.deleteMany();
    if (data.faq.length) {
      await tx.faqItem.createMany({
        data: data.faq as Parameters<typeof tx.faqItem.createMany>[0]["data"],
      });
    }

    await tx.review.deleteMany();
    if (data.reviews.length) {
      await tx.review.createMany({
        data: data.reviews as Parameters<typeof tx.review.createMany>[0]["data"],
      });
    }
  });
}

export async function restoreChangeLog(changeId: string) {
  const change = await prisma.changeLog.findUnique({ where: { id: changeId } });
  if (!change?.beforeJson) throw new Error("Nothing to restore");

  const before = JSON.parse(change.beforeJson);

  switch (change.entityType) {
    case "settings": {
      const { id: _id, updatedAt: _updatedAt, ...data } = before as {
        id: string;
        updatedAt?: string;
        [key: string]: unknown;
      };
      await prisma.siteSettings.update({ where: { id: "singleton" }, data });
      break;
    }
    case "service": {
      if (change.action === "create") {
        await prisma.service.delete({ where: { id: change.entityId! } });
      } else if (change.action === "delete") {
        await prisma.service.create({ data: before });
      } else {
        const { createdAt: _c, updatedAt: _u, ...data } = before;
        await prisma.service.update({ where: { id: change.entityId! }, data });
      }
      break;
    }
    case "portfolio": {
      if (change.action === "create") {
        await prisma.portfolioItem.delete({ where: { id: change.entityId! } });
      } else if (change.action === "delete") {
        await prisma.portfolioItem.create({ data: before });
      } else {
        const { createdAt: _c, updatedAt: _u, ...data } = before;
        await prisma.portfolioItem.update({ where: { id: change.entityId! }, data });
      }
      break;
    }
    case "faq": {
      if (change.action === "create") {
        await prisma.faqItem.delete({ where: { id: change.entityId! } });
      } else if (change.action === "delete") {
        await prisma.faqItem.create({ data: before });
      } else {
        await prisma.faqItem.update({ where: { id: change.entityId! }, data: before });
      }
      break;
    }
    case "review": {
      if (change.action === "create") {
        await prisma.review.delete({ where: { id: change.entityId! } });
      } else if (change.action === "delete") {
        await prisma.review.create({ data: before });
      } else {
        await prisma.review.update({ where: { id: change.entityId! }, data: before });
      }
      break;
    }
    default:
      throw new Error(`Unsupported entity type: ${change.entityType}`);
  }
}
