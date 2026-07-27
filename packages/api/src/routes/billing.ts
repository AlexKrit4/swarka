import type { FastifyInstance } from "fastify";
import { prisma, HostingPaymentStatus } from "@swarka/database";
import {
  applySuccessfulPayment,
  createHostingTariff,
  createPendingPayment,
  deleteHostingTariff,
  getBillingHistory,
  getBillingPayments,
  getBillingStatus,
  listHostingTariffs,
  manualAdjustBalance,
  MIN_TOPUP_RUB,
  removeLedgerEntries,
  selectHostingTariff,
  updateBillingSettings,
  updateHostingTariff,
} from "../lib/billing.js";
import {
  buildYooMoneyPaymentUrl,
  isSuccessfulYooMoneyNotification,
  isYooMoneyConfigured,
  parseRubAmount,
  parseYooMoneyNotification,
  verifyYooMoneyNotification,
} from "../lib/yoomoney.js";
import { sendBillingTopUpPushNotification } from "../lib/fcm.js";
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
  manualSiteEnabled: z.boolean().optional(),
});

const removeLedgerSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

const selectTariffSchema = z.object({
  tariffId: z.string().min(1),
});

const tariffBodySchema = z.object({
  name: z.string().min(1).max(80),
  tagline: z.string().max(200).optional(),
  cpuLabel: z.string().min(1).max(80),
  ramLabel: z.string().min(1).max(80),
  storageLabel: z.string().min(1).max(80),
  extrasLabel: z.string().max(120).optional(),
  dailyRateRub: z.number().int().min(1).max(10000),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});

const tariffUpdateSchema = tariffBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Empty update" }
);

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

    const result = await applySuccessfulPayment(paymentId, operationId);
    if (result.applied && result.payment?.createdByUserId) {
      const status = await getBillingStatus();
      await sendBillingTopUpPushNotification(result.payment.createdByUserId, {
        amountRub: result.payment.amountRub,
        balanceRub: status.balanceRub,
        daysRemaining: status.daysRemaining,
        paidUntil: status.paidUntil,
        isSiteEnabled: status.isSiteEnabled,
      });
    }

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

  app.get("/api/admin/billing/tariffs", { preHandler: requireAuth }, async (request) => {
    const user = request.user as { role?: string };
    const includeInactive = user.role === "SUPER_ADMIN";
    const tariffs = await listHostingTariffs({ includeInactive });
    return {
      tariffs: tariffs.map((tariff) => ({
        ...tariff,
        monthlyEstimateRub: tariff.dailyRateRub * 30,
      })),
    };
  });

  app.post("/api/admin/billing/tariff/select", { preHandler: requireEditor }, async (request, reply) => {
    const parsed = selectTariffSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    try {
      return await selectHostingTariff(parsed.data.tariffId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сменить тариф";
      return reply.status(400).send({ error: message });
    }
  });

  app.post("/api/admin/billing/tariffs", { preHandler: requireSuperAdmin }, async (request, reply) => {
    const parsed = tariffBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    try {
      return await createHostingTariff(parsed.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось создать тариф";
      return reply.status(400).send({ error: message });
    }
  });

  app.put("/api/admin/billing/tariffs/:id", { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = tariffUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    try {
      return await updateHostingTariff(id, parsed.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось обновить тариф";
      return reply.status(400).send({ error: message });
    }
  });

  app.delete("/api/admin/billing/tariffs/:id", { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await deleteHostingTariff(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось удалить тариф";
      return reply.status(400).send({ error: message });
    }
  });

  app.post("/api/admin/billing/ledger/remove", { preHandler: requireSuperAdmin }, async (request, reply) => {
    const parsed = removeLedgerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const user = request.user as { id: string; email: string };

    try {
      return await removeLedgerEntries({
        ids: parsed.data.ids,
        userId: user.id,
        userEmail: user.email,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось удалить операции";
      return reply.status(400).send({ error: message });
    }
  });
}
