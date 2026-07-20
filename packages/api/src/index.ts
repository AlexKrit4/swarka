import "./env.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";
import { ensureUploadsDir, getUploadsDir } from "./lib/uploads.js";

const PORT = Number(process.env.API_PORT ?? 4000);
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((s) => s.trim());

async function main() {
  ensureUploadsDir();

  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: CORS_ORIGINS,
    credentials: true,
  });

  await app.register(cookie);

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
    cookie: {
      cookieName: "token",
      signed: false,
    },
  });

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  await app.register(fastifyStatic, {
    root: getUploadsDir(),
    prefix: "/uploads/",
    decorateReply: false,
  });

  await app.register(publicRoutes);
  await app.register(adminRoutes);

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API running on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
