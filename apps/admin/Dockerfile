FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY packages/shared ./packages/shared
COPY apps/admin/package.json apps/admin/package-lock.json* ./apps/admin/
WORKDIR /app/apps/admin
RUN npm install

FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY packages/shared ./packages/shared
COPY --from=deps /app/apps/admin/node_modules ./apps/admin/node_modules
COPY apps/admin ./apps/admin
WORKDIR /app/apps/admin
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/admin/public ./public
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./.next/static

EXPOSE 3001
CMD ["node", "server.js"]
