# Helpdesk frontend - termelési image (multi-stage)
#
# Build (EKS / x86 node-okhoz linux/amd64-re):
#   docker build --platform linux/amd64 -t helpdesk-frontend:local .
# Futtatás:
#   docker run --rm -p 8081:8080 helpdesk-frontend:local
#   majd: http://localhost:8081  (az /api hívásokhoz a Gateway / docker compose kell)
# Ellenőrzés:
#   curl http://localhost:8081/healthz
# Build idejű API URL nincs: a kód relatív /api/... útvonalakat hív, ugyanaz az
# image minden környezetben használható.

# ---- 1. szakasz: build ----
FROM node:24.22.1-slim AS build
WORKDIR /app
# Előbb csak a package*.json, hogy a függőség réteg cache-elhető legyen
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- 2. szakasz: statikus kiszolgálás nem root nginx-szel ----
FROM nginxinc/nginx-unprivileged:1.30.6-alpine
# Saját konfiguráció (listen 8080, SPA fallback, /healthz, cache szabályok)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
# Csak a kész build kimenet kerül az image-be
COPY --from=build /app/dist /usr/share/nginx/html
# Az image alapból a 101-es (nginx) numerikus felhasználóval fut
USER 101
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
