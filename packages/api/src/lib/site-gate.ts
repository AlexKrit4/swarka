import type { FastifyReply, FastifyRequest } from "fastify";
import { getBillingStatus } from "./billing.js";

const PUBLIC_ALLOWLIST = new Set([
  "/api/health",
  "/api/billing/site-status",
  "/api/billing/yoomoney-webhook",
  "/api/billing/webhook",
  "/api/mobile/accounts",
  "/api/mobile/app-version",
  "/api/mobile/app-download",
]);

export function isPublicRouteAllowedWhenLocked(path: string) {
  return PUBLIC_ALLOWLIST.has(path);
}

export async function assertPublicSiteAvailable(request: FastifyRequest, reply: FastifyReply) {
  const path = request.url.split("?")[0] ?? request.url;
  if (isPublicRouteAllowedWhenLocked(path)) {
    return;
  }

  const status = await getBillingStatus();
  if (!status.isSiteEnabled) {
    reply.status(503).send({
      error: "site_unavailable",
      message: "Сайт временно недоступен",
    });
  }
}
