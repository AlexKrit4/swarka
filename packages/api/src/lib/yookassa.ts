import { randomUUID } from "node:crypto";

const YOOKASSA_API = "https://api.yookassa.ru/v3";

function getCredentials() {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim();
  if (!shopId || !secretKey) return null;
  return { shopId, secretKey };
}

function authHeader(shopId: string, secretKey: string) {
  const token = Buffer.from(`${shopId}:${secretKey}`).toString("base64");
  return `Basic ${token}`;
}

export function isYooKassaConfigured() {
  return getCredentials() !== null;
}

export async function createYooKassaPayment(input: {
  amountRub: number;
  paymentId: string;
  description: string;
  returnUrl: string;
}) {
  const creds = getCredentials();
  if (!creds) {
    throw new Error("ЮKassa не настроена. Добавьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY.");
  }

  const value = input.amountRub.toFixed(2);

  const response = await fetch(`${YOOKASSA_API}/payments`, {
    method: "POST",
    headers: {
      Authorization: authHeader(creds.shopId, creds.secretKey),
      "Content-Type": "application/json",
      "Idempotence-Key": randomUUID(),
    },
    body: JSON.stringify({
      amount: { value, currency: "RUB" },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: input.returnUrl,
      },
      payment_method_data: {
        type: "sbp",
      },
      description: input.description,
      metadata: {
        internalPaymentId: input.paymentId,
      },
    }),
  });

  const data = (await response.json()) as {
    id?: string;
    status?: string;
    confirmation?: { confirmation_url?: string };
    description?: string;
    type?: string;
  };

  if (!response.ok) {
    const message = data.description ?? data.type ?? "YooKassa payment failed";
    throw new Error(message);
  }

  if (!data.id || !data.confirmation?.confirmation_url) {
    throw new Error("YooKassa did not return payment URL");
  }

  return {
    externalId: data.id,
    confirmationUrl: data.confirmation.confirmation_url,
    status: data.status ?? "pending",
  };
}

export async function fetchYooKassaPayment(externalId: string) {
  const creds = getCredentials();
  if (!creds) return null;

  const response = await fetch(`${YOOKASSA_API}/payments/${externalId}`, {
    headers: {
      Authorization: authHeader(creds.shopId, creds.secretKey),
    },
  });

  if (!response.ok) return null;
  return response.json() as Promise<{
    id: string;
    status: string;
    paid: boolean;
    metadata?: { internalPaymentId?: string };
  }>;
}
