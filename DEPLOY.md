# SWARKA — деплой на VPS (Beget) + домен swarka-i-voditel.ru

## DNS (уже должно быть)

A-записи на IP VPS:

- `swarka-i-voditel.ru`
- `www.swarka-i-voditel.ru`
- `admin.swarka-i-voditel.ru`
- `api.swarka-i-voditel.ru`

## 1. Подключение

```bash
ssh root@ВАШ_IP_VPS
```

## 2. Docker + git

```bash
curl -fsSL https://get.docker.com | sh
apt update && apt install -y git
```

## 3. Клон и env

```bash
git clone https://github.com/AlexKrit4/swarka.git
cd swarka

cp .env.example .env
nano .env
```

Обязательно поменяйте:

- `JWT_SECRET` — длинная случайная строка
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- `POSTGRES_PASSWORD` (и в `DATABASE_URL` тот же пароль)

**Важно:** пока нет SSL, в `.env` должны быть `http://` (не `https://`) для
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` и `CORS_ORIGINS`.
После SSL — переключите на `https://` и пересоберите: `docker compose up -d --build`.

Готовый шаблон уже с доменом `swarka-i-voditel.ru`.

## 4. Первый запуск (HTTP)

```bash
mkdir -p nginx/ssl certbot/www certbot/conf
docker compose up -d --build
```

Проверка:

```bash
docker compose ps
curl -I http://swarka-i-voditel.ru
curl http://api.swarka-i-voditel.ru/api/health
```

Сайт: http://swarka-i-voditel.ru  
Админка: http://admin.swarka-i-voditel.ru/login  

## 5. SSL (Let's Encrypt)

Остановите nginx-контейнер на время выпуска сертификатов (или используйте standalone):

```bash
docker compose stop nginx

docker run --rm -it \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d swarka-i-voditel.ru \
  -d www.swarka-i-voditel.ru \
  -d admin.swarka-i-voditel.ru \
  -d api.swarka-i-voditel.ru \
  --email ВАШ@EMAIL.RU \
  --agree-tos \
  --non-interactive

docker compose start nginx
```

После получения сертификатов замените `nginx/default.conf` на HTTPS-версию из `nginx/default.ssl.conf`:

```bash
cp nginx/default.ssl.conf nginx/default.conf
docker compose restart nginx
```

## 6. Обновление кода позже

```bash
cd ~/swarka   # или ваш путь
git pull
docker compose up -d --build
```

## Адреса

| URL | Что |
|-----|-----|
| https://swarka-i-voditel.ru | сайт |
| https://admin.swarka-i-voditel.ru | админка |
| https://api.swarka-i-voditel.ru | API |
