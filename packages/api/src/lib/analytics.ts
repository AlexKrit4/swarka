import { createHash, randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { prisma } from "@swarka/database";

const BOT_PATTERN =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|yandexbot|googlebot|bingbot|duckduckbot|baiduspider|telegrambot|whatsapp|curl|wget|python-requests|headless/i;

const RATE_LIMIT_PER_HOUR = 120;

function analyticsSalt(): string {
  return process.env.ANALYTICS_IP_SALT ?? process.env.JWT_SECRET ?? "swarka-analytics-salt";
}

export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${analyticsSalt()}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export function getClientIp(request: FastifyRequest): string {
  const realIp = request.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }

  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return request.ip;
}

export function isBotUserAgent(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return BOT_PATTERN.test(userAgent);
}

export function detectDevice(userAgent: string | undefined): string {
  if (!userAgent) return "unknown";
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
}

function normalizePath(path: string): string {
  const trimmed = path.trim().slice(0, 500);
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeReferer(referer: string | undefined): string | null {
  if (!referer?.trim()) return null;
  try {
    const url = new URL(referer);
    if (url.hostname.endsWith("swarka-i-voditel.ru")) return null;
    return `${url.hostname}${url.pathname}`.slice(0, 500);
  } catch {
    return referer.slice(0, 500);
  }
}

export interface TrackPayload {
  visitorId?: string;
  path: string;
  referer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export async function recordSiteVisit(
  request: FastifyRequest,
  payload: TrackPayload
): Promise<{ visitorId: string; recorded: boolean }> {
  const userAgent = request.headers["user-agent"];
  const isBot = isBotUserAgent(userAgent);
  const ipHash = hashIp(getClientIp(request));
  const visitorId = payload.visitorId?.trim() || randomUUID();
  const path = normalizePath(payload.path);

  if (!isBot) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.siteVisit.count({
      where: {
        visitor: { ipHash },
        isBot: false,
        createdAt: { gte: hourAgo },
      },
    });
    if (recentCount >= RATE_LIMIT_PER_HOUR) {
      return { visitorId, recorded: false };
    }
  }

  const existingVisitor = await prisma.visitor.findUnique({ where: { id: visitorId } });

  if (existingVisitor) {
    await prisma.visitor.update({
      where: { id: visitorId },
      data: {
        ipHash,
        lastSeenAt: new Date(),
        visitCount: { increment: 1 },
      },
    });
  } else {
    await prisma.visitor.create({
      data: {
        id: visitorId,
        ipHash,
      },
    });
  }

  await prisma.siteVisit.create({
    data: {
      visitorId,
      path,
      referer: normalizeReferer(payload.referer),
      utmSource: payload.utmSource?.slice(0, 200) ?? null,
      utmMedium: payload.utmMedium?.slice(0, 200) ?? null,
      utmCampaign: payload.utmCampaign?.slice(0, 200) ?? null,
      userAgent: userAgent?.slice(0, 500) ?? null,
      device: detectDevice(userAgent),
      isBot,
    },
  });

  return { visitorId, recorded: true };
}

function periodStart(days: number): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getAnalyticsSummary(days: number) {
  const safeDays = Math.min(Math.max(days, 1), 90);
  const from = periodStart(safeDays);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const visitFilter = {
    isBot: false,
    createdAt: { gte: from },
  };

  const [
    visits,
    uniqueVisitorsRows,
    newVisitors,
    leads,
    leadsToday,
    visitsToday,
    uniqueTodayRows,
    newVisitorsToday,
    visitsRaw,
    topPagesRaw,
    topReferrersRaw,
    deviceRaw,
  ] = await Promise.all([
    prisma.siteVisit.count({ where: visitFilter }),
    prisma.siteVisit.findMany({
      where: visitFilter,
      distinct: ["visitorId"],
      select: { visitorId: true },
    }),
    prisma.visitor.count({
      where: {
        firstSeenAt: { gte: from },
        visits: { some: { isBot: false } },
      },
    }),
    prisma.lead.count({ where: { createdAt: { gte: from } } }),
    prisma.lead.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.siteVisit.count({
      where: { isBot: false, createdAt: { gte: todayStart } },
    }),
    prisma.siteVisit.findMany({
      where: { isBot: false, createdAt: { gte: todayStart } },
      distinct: ["visitorId"],
      select: { visitorId: true },
    }),
    prisma.visitor.count({
      where: {
        firstSeenAt: { gte: todayStart },
        visits: { some: { isBot: false } },
      },
    }),
    prisma.siteVisit.findMany({
      where: visitFilter,
      select: { createdAt: true, visitorId: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.siteVisit.groupBy({
      by: ["path"],
      where: visitFilter,
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
    prisma.siteVisit.groupBy({
      by: ["referer"],
      where: {
        ...visitFilter,
        referer: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { referer: "desc" } },
      take: 10,
    }),
    prisma.siteVisit.groupBy({
      by: ["device"],
      where: visitFilter,
      _count: { _all: true },
    }),
  ]);

  const uniqueVisitors = uniqueVisitorsRows.length;
  const uniqueVisitorsToday = uniqueTodayRows.length;
  const conversionRate = visits > 0 ? Math.round((leads / visits) * 1000) / 10 : 0;

  const dayMap = new Map<string, { visits: number; visitors: Set<string> }>();
  for (let i = 0; i < safeDays; i++) {
    const day = new Date(from);
    day.setDate(from.getDate() + i);
    dayMap.set(dateKey(day), { visits: 0, visitors: new Set() });
  }

  for (const row of visitsRaw) {
    const key = dateKey(row.createdAt);
    const bucket = dayMap.get(key);
    if (!bucket) continue;
    bucket.visits += 1;
    bucket.visitors.add(row.visitorId);
  }

  const visitsByDay = Array.from(dayMap.entries()).map(([date, stats]) => ({
    date,
    visits: stats.visits,
    uniqueVisitors: stats.visitors.size,
  }));

  return {
    periodDays: safeDays,
    from: from.toISOString(),
    to: new Date().toISOString(),
    visits,
    uniqueVisitors,
    newVisitors,
    leads,
    conversionRate,
    today: {
      visits: visitsToday,
      uniqueVisitors: uniqueVisitorsToday,
      newVisitors: newVisitorsToday,
      leads: leadsToday,
    },
    visitsByDay,
    topPages: topPagesRaw.map((row) => ({
      path: row.path,
      visits: row._count._all,
    })),
    topReferrers: topReferrersRaw
      .filter((row) => row.referer)
      .map((row) => ({
        referer: row.referer as string,
        visits: row._count._all,
      })),
    devices: deviceRaw.map((row) => ({
      device: row.device ?? "unknown",
      visits: row._count._all,
    })),
  };
}

export async function getDashboardAnalytics() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const visitBase = { isBot: false as const };

  const [visitsToday, visitsWeek, uniqueTodayRows, uniqueWeekRows, newVisitorsToday, newVisitorsWeek] =
    await Promise.all([
      prisma.siteVisit.count({ where: { ...visitBase, createdAt: { gte: todayStart } } }),
      prisma.siteVisit.count({ where: { ...visitBase, createdAt: { gte: weekStart } } }),
      prisma.siteVisit.findMany({
        where: { ...visitBase, createdAt: { gte: todayStart } },
        distinct: ["visitorId"],
        select: { visitorId: true },
      }),
      prisma.siteVisit.findMany({
        where: { ...visitBase, createdAt: { gte: weekStart } },
        distinct: ["visitorId"],
        select: { visitorId: true },
      }),
      prisma.visitor.count({
        where: {
          firstSeenAt: { gte: todayStart },
          visits: { some: { isBot: false } },
        },
      }),
      prisma.visitor.count({
        where: {
          firstSeenAt: { gte: weekStart },
          visits: { some: { isBot: false } },
        },
      }),
    ]);

  return {
    visitsToday,
    visitsWeek,
    uniqueVisitorsToday: uniqueTodayRows.length,
    uniqueVisitorsWeek: uniqueWeekRows.length,
    newVisitorsToday,
    newVisitorsWeek,
  };
}
