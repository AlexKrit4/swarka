import type { FastifyReply, FastifyRequest } from "fastify";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const decoded = await request.server.jwt.verify(token);
      request.user = decoded;
      return;
    }
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}
