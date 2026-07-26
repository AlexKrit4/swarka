import type { FastifyInstance } from "fastify";
import { prisma, HostingPaymentStatus } from "@swarka/database";
import {
  applySuccessfulPayment,
  createPendingPayment,
  getBillingHistory,
  getBillingPayments,
  getBillingStatus,
  manualAdjustBalance,
  MIN_TOPUP_RUB,
  updateBillingSettings,
} from "../lib/billing.js";
import {
  buildYooMoneyPaymentUrl,
  isSuccessfulYooMoneyNotification,
  isYooMoneyConfigured,
  parseRubAmount,
  parseYooMoneyNotification,
  verifyYooMoneyNotification,
} from "../lib/yoomoney.js";
import { requireAuth, requireEditor, requireSuperAdmin } from "../plugins/auth.js";
import { z } from "zod";

const createPaymentSchema = z.object({
  amountRub: z.number().int().min(MIN_TOPUP_RUB).max(100000),
});

const manualAdjustSchema = z.object({
  amountRub: z.number().int().min(-100000).max(100000),
  description: z.string().min(3).max(200),
});

const settingsSchema = z.object({
  dailyRateRub: z.number().int().min(1).max(1000).optional(),
  manualSiteEnabled: z.boolean().optional(),
});

function adminReturnUrl(status: "success" | "pending") {
  const base = process.env.ADMIN_PUBLIC_URL ?? "http://localhost:3001";
  return `${base.replace(/\/$/, "")}/billing?status=${status}`;
}

export async function billingRoutes(app: FastifyInstance) {
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (_req, body, done) => {
      try {
        const params = new URLSearchParams(body as string);
        const parsed: Record<string, string> = {};
        params.forEach((value, key) => {
          parsed[key] = value;
        });
        done(null, parsed);
      } catch (error) {
        done(error as Error, undefined);
      }
    }
  );

  app.post("/api/billing/yoomoney-webhook", async (request, reply) => {
    const secret = process.env.YOOMONEY_NOTIFICATION_SECRET?.trim();
    if (!secret) {
      return reply.status(503).send("not configured");
    }

    const params = parseYooMoneyNotification(request.body);
    if (!params || !verifyYooMoneyNotification(params, secret)) {
      return reply.status(403).send("invalid signature");
    }

    if (!isSuccessfulYooMoneyNotification(params)) {
      return reply.status(200).send("ignored");
    }

    const paymentId = params.label?.trim();
    const operationId = params.operation_id?.trim();
    if (!paymentId || !operationId) {
      return reply.status(200).send("missing label");
    }

    const paidAmount = parseRubAmount(params.withdraw_amount || params.amount);
    const payment = await prisma.hostingPayment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      return reply.status(200).send("unknown payment");
    }

    if (payment.status === HostingPaymentStatus.SUCCEEDED) {
      return reply.status(200).send("already applied");
    }

    if (paidAmount === null || paidAmount < payment.amountRub) {
      request.log.warn(
        { paymentId, paidAmount, expected: payment.amountRub },
        "YooMoney amount mismatch"
      );
      return reply.status(200).send("amount mismatch");
    }

    await applySuccessfulPayment(paymentId, operationId);
    return reply.status(200).send("OK");
  });

  app.get("/api/admin/billing/status", { preHandler: requireAuth }, async () => {
    const status = await getBillingStatus();
    return {
      ...status,
      paymentConfigured: isYooMoneyConfigured(),
      yoomoneyConfigured: isYooMoneyConfigured(),
    };
  });

  app.get("/api/admin/billing/history", { preHandler: requireAuth }, async () => {
    const [ledger, payments] = await Promise.all([getBillingHistory(), getBillingPayments()]);
    return { ledger, payments };
  });

  app.post("/api/admin/billing/create-payment", { preHandler: requireEditor }, async (request, reply) => {
    const parsed = createPaymentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: `Минимальное пополнение — ${MIN_TOPUP_RUB} ₽` });
    }

    const user = request.user as { id: string; email: string };

    const payment = await createPendingPayment({
      amountRub: parsed.data.amountRub,
      userId: user.id,
      userEmail: user.email,
      provider: "yoomoney",
    });

    try {
      const confirmationUrl = buildYooMoneyPaymentUrl({
        amountRub: payment.amountRub,
        paymentId: payment.id,
        description: "Оплата работы сервера SWARKA",
        successUrl: adminReturnUrl("success"),
      });

      return {
        paymentId: payment.id,
        confirmationUrl,
      };
    } catch (err) {
      await prisma.hostingPayment.update({
        where: { id: payment.id },
        data: { status: HostingPaymentStatus.FAILED },
      });
      const message = err instanceof Error ? err.message : "Payment creation failed";
      return reply.status(502).send({ error: message });
    }
  });

  app.post("/api/admin/billing/manual-adjust", { preHandler: requireSuperAdmin }, async (request, reply) => {
    const parsed = manualAdjustSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const user = request.user as { id: string; email: string };
    const status = await manualAdjustBalance({
      amountRub: parsed.data.amountRub,
      description: parsed.data.description,
      userId: user.id,
      userEmail: user.email,
    });

    return status;
  });

  app.put("/api/admin/billing/settings", { preHandler: requireSuperAdmin }, async (request, reply) => {
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    return updateBillingSettings(parsed.data);
  });
}
