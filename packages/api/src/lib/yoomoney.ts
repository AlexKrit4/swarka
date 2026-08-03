import { createHmac } from "node:crypto";

const QUICKPAY_URL = "https://yoomoney.ru/quickpay/confirm";

function getConfig() {
  const wallet = process.env.YOOMONEY_WALLET?.trim();
  const secret = process.env.YOOMONEY_NOTIFICATION_SECRET?.trim();
  if (!wallet || !secret) return null;
  return { wallet, secret };
}

export function isYooMoneyConfigured() {
  return getConfig() !== null;
}

export function buildYooMoneyPaymentUrl(input: {
  amountRub: number;
  paymentId: string;
  description: string;
  successUrl: string;
}) {
  const config = getConfig();
  if (!config) {
    throw new Error("ЮMoney не настроена. Добавьте YOOMONEY_WALLET и YOOMONEY_NOTIFICATION_SECRET.");
  }

  const params = new URLSearchParams({
    receiver: config.wallet,
    "quickpay-form": "shop",
    targets: input.description,
    sum: input.amountRub.toFixed(2),
    label: input.paymentId,
    successURL: input.successUrl,
  });

  return `${QUICKPAY_URL}?${params.toString()}`;
}

function buildSignPayload(params: Record<string, string>) {
  return Object.keys(params)
    .filter((key) => key !== "sign")
    .sort()
    .map((key) => {
      const value = params[key] ?? "";
      return `${key}=${encodeURIComponent(value)}`;
    })
    .join("&");
}

export function verifyYooMoneyNotification(
  params: Record<string, string>,
  secret: string
): boolean {
  const received = params.sign?.toLowerCase();
  if (!received) return false;

  const payload = buildSignPayload(params);
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  return expected === received;
}

export type YooMoneyNotification = {
  notification_type: string;
  operation_id: string;
  amount: string;
  withdraw_amount: string;
  currency: string;
  datetime: string;
  sender: string;
  codepro: string;
  label: string;
  unaccepted: string;
  sign: string;
};

export function parseYooMoneyNotification(body: unknown): Record<string, string> | null {
  if (!body || typeof body !== "object") return null;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (value === undefined || value === null) {
      result[key] = "";
    } else {
      result[key] = String(value);
    }
  }
  return result;
}

export function isSuccessfulYooMoneyNotification(params: Record<string, string>) {
  if (params.unaccepted === "true") return false;
  if (params.codepro === "true") return false;
  return params.notification_type === "p2p-incoming" || params.notification_type === "card-incoming";
}

export function parseRubAmount(value: string) {
  const amount = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount);
}
