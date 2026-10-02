# =====================================================================
# Образ приложения: кабинет участницы как статический сайт.
#
# Два этапа:
#   1. build — Node собирает React-приложение в папку dist;
#   2. runtime — nginx без прав root отдаёт готовые файлы.
# В итоговый образ не попадают ни Node, ни исходники, ни node_modules —
# только ~1 МБ статики и веб-сервер.
#
# Сборка и запуск:
#   docker build -t lerree-cabinet \
#     --build-arg VITE_SUPABASE_URL=https://<проект>.supabase.co \
#     --build-arg VITE_SUPABASE_ANON_KEY=<публичный ключ anon> .
#   docker run --rm -p 8080:8080 lerree-cabinet   → http://localhost:8080
#
# Или одной командой через compose: docker compose --profile app up --build
#
# Серверные функции /api/health и /api/log живут на Vercel и в образ не
# входят; для проверки контейнера есть свой адрес /healthz.
# =====================================================================

# ---------- 1. Сборка ----------
FROM node:22-alpine AS build
WORKDIR /app

# Сначала только описания зависимостей: этот слой кешируется и не
# пересобирается, пока package*.json не меняются.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Адрес базы и публичный ключ «вшиваются» в сборку (так устроен Vite).
# Оба значения не секретные — их видно в запросах браузера.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# ---------- 2. Запуск ----------
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
