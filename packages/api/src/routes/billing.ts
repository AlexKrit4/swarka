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
import { createYooKassaPayment, fetchYooKassaPayment, isYooKassaConfigured } from "../lib/yookassa.js";
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
  app.post("/api/billing/webhook", async (request, reply) => {
    const body = request.body as {
      event?: string;
      object?: {
        id?: string;
        status?: string;
        paid?: boolean;
        metadata?: { internalPaymentId?: string };
      };
    };

    const paymentObject = body.object;
    if (!paymentObject?.id) {
      return reply.status(400).send({ error: "Invalid webhook" });
    }

    const remote = await fetchYooKassaPayment(paymentObject.id);
    if (!remote) {
      return reply.status(502).send({ error: "Unable to verify payment" });
    }

    const internalPaymentId = remote.metadata?.internalPaymentId;
    if (!internalPaymentId) {
      return reply.status(400).send({ error: "Missing internal payment id" });
    }

    if (remote.status === "succeeded" || remote.paid) {
      await applySuccessfulPayment(internalPaymentId, remote.id);
    } else if (remote.status === "canceled") {
      await prisma.hostingPayment.updateMany({
        where: { id: internalPaymentId, status: HostingPaymentStatus.PENDING },
        data: { status: HostingPaymentStatus.CANCELED, externalId: remote.id },
      });
    }

    return { success: true };
  });

  app.get("/api/admin/billing/status", { preHandler: requireAuth }, async () => {
    const status = await getBillingStatus();
    return {
      ...status,
      yookassaConfigured: isYooKassaConfigured(),
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
    });

    try {
      const yookassa = await createYooKassaPayment({
        amountRub: payment.amountRub,
        paymentId: payment.id,
        description: "Оплата работы сервера SWARKA",
        returnUrl: adminReturnUrl("success"),
      });

      await prisma.hostingPayment.update({
        where: { id: payment.id },
        data: { externalId: yookassa.externalId },
      });

      return {
        paymentId: payment.id,
        confirmationUrl: yookassa.confirmationUrl,
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

  app.post("/api/admin/billing/sync-payment/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const payment = await prisma.hostingPayment.findUnique({ where: { id } });
    if (!payment?.externalId) {
      return reply.status(404).send({ error: "Payment not found" });
    }

    const remote = await fetchYooKassaPayment(payment.externalId);
    if (!remote) {
      return reply.status(502).send({ error: "Unable to fetch payment status" });
    }

    if (remote.status === "succeeded" || remote.paid) {
      await applySuccessfulPayment(payment.id, remote.id);
    }

    return getBillingStatus();
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
