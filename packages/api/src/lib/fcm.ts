import { prisma } from "@swarka/database";

export interface LeadPushPayload {
  id: string;
  name: string;
  phone: string;
  serviceType?: string | null;
}

async function getAdminPushTokens(): Promise<string[]> {
  const adminUsers = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "VIEWER"] } },
    select: { id: true },
  });

  if (adminUsers.length === 0) return [];

  const rows = await prisma.pushToken.findMany({
    where: { userId: { in: adminUsers.map((user) => user.id) } },
    select: { token: true },
  });

  return rows.map((row) => row.token);
}

export async function sendLeadPushNotification(lead: LeadPushPayload): Promise<void> {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) return;

  const tokens = await getAdminPushTokens();
  if (tokens.length === 0) return;

  const data = {
    type: "new_lead",
    leadId: lead.id,
    name: lead.name,
    phone: lead.phone,
    serviceType: lead.serviceType ?? "",
  };

  const chunkSize = 500;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    try {
      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${serverKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registration_ids: chunk,
          priority: "high",
          data,
        }),
      });

      if (!response.ok) {
        console.error("FCM send failed:", response.status, await response.text());
      }
    } catch (error) {
      console.error("FCM send error:", error);
    }
  }
}
