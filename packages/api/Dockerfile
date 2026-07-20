FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/api/package.json ./packages/api/
RUN pnpm install --filter @swarka/api --filter @swarka/database

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY packages/database ./packages/database
COPY packages/api ./packages/api
RUN pnpm --filter @swarka/database generate
RUN pnpm --filter @swarka/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package.json ./
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder /app/packages/api/node_modules ./node_modules_api
RUN mkdir -p /app/uploads \
  && npm install -g prisma@6.5.0 tsx@4.19.3
EXPOSE 4000
CMD ["sh", "-c", "prisma migrate deploy --schema=packages/database/prisma/schema.prisma && tsx packages/database/prisma/seed.ts && node dist/index.js"]
