import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@swarka/database";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const decoded = await request.server.jwt.verify<AuthUser>(token);
      request.user = decoded;
      return;
    }
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;

  const payload = request.user as AuthUser;
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.role !== "SUPER_ADMIN") {
    return reply.status(403).send({ error: "Forbidden" });
  }
  request.user = { id: user.id, email: user.email, role: user.role };
}
