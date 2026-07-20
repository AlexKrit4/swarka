FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY apps/admin/package.json ./
RUN npm install

FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY apps/admin ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
