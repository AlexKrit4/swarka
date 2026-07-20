# SWARKA — сайт навесных работ + админка

Одностраничный сайт для бизнеса по изготовлению и установке навесов (Москва и МО) с админ-панелью.

## Стек

- **Публичный сайт** — Next.js 15 (`:3000`)
- **Админка** — Next.js 15 (`:3001`)
- **API** — Fastify + Prisma (`:4000`)
- **БД** — PostgreSQL
- **Деплой** — Docker Compose + nginx

Домен продакшена: **swarka-i-voditel.ru**

Подробная инструкция по VPS: см. [DEPLOY.md](./DEPLOY.md)

## Быстрый старт (локально)

### 1. PostgreSQL

```bash
docker run -d --name swarka-db \
  -e POSTGRES_USER=swarka \
  -e POSTGRES_PASSWORD=swarka \
  -e POSTGRES_DB=swarka \
  -p 5432:5432 postgres:16-alpine
```

### 2. Переменные окружения

```bash
cp .env.example .env
```

Для локалки в `.env` и `packages/database/.env`:

```env
DATABASE_URL=postgresql://swarka:swarka@localhost:5432/swarka
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

Также `apps/web/.env.local` и `apps/admin/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Установка и БД

```bash
npm install
cd packages/database && npm install && npx prisma generate && npx prisma migrate deploy && npx tsx prisma/seed.ts && cd ../..
cd packages/api && npm install && cd ../..
cd apps/web && npm install && cd ../..
cd apps/admin && npm install && cd ../..
```

### 4. Запуск

```bash
# Терминал 1
cd packages/api && npm run dev

# Терминал 2
cd apps/web && npm run dev

# Терминал 3
cd apps/admin && npm run dev
```

**Админка:** http://localhost:3001/login  
**Логин по умолчанию:** `admin@example.com` / `admin123`

## Деплой на VPS

См. [DEPLOY.md](./DEPLOY.md). Кратко:

```bash
git clone https://github.com/AlexKrit4/swarka.git
cd swarka
cp .env.example .env   # поменять секреты
docker compose up -d --build
```

| Поддомен | Назначение |
|----------|------------|
| `swarka-i-voditel.ru` | Публичный сайт |
| `admin.swarka-i-voditel.ru` | Админ-панель |
| `api.swarka-i-voditel.ru` | REST API + загрузки |

## Telegram-уведомления

Создайте бота через @BotFather. Укажите `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в `.env`.
