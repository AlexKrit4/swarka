FROM node:20-alpine AS base
WORKDIR /app

FROM base AS builder
COPY packages/database ./packages/database
COPY packages/api ./packages/api

WORKDIR /app/packages/database
RUN npm install && npx prisma generate

WORKDIR /app/packages/api
RUN npm install && npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/api ./packages/api

WORKDIR /app/packages/api
RUN mkdir -p /app/uploads

ENV UPLOADS_DIR=/app/uploads
EXPOSE 4000

# tsx runs compiled JS + resolves @swarka/database TS entry; prisma CLI from database deps
CMD ["sh", "-c", "cd /app/packages/database && npx prisma migrate deploy && npx tsx prisma/seed.ts && cd /app/packages/api && npx tsx src/index.ts"]
