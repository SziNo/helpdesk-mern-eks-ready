# Helpdesk backend - termelési image (multi-stage)
#
# Build (EKS / x86 node-okhoz linux/amd64-re):
#   docker build --platform linux/amd64 -t helpdesk-backend:local .
# Futtatás (a változókat a .env fájlból adja át, a titok nem kerül az image-be):
#   docker run --rm -p 8080:8080 --env-file .env helpdesk-backend:local
#   (Ha a MongoDB a gépeden fut: MONGO_URI=mongodb://host.docker.internal:27017/helpdesk)
# Ellenőrzés:
#   curl http://localhost:8080/healthz   curl http://localhost:8080/readyz

# ---- 1. szakasz: csak a termelési függőségek ----
FROM node:24.22.1-slim AS deps
WORKDIR /app
# Előbb csak a package*.json, hogy a függőség réteg cache-elhető legyen
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- 2. szakasz: futtató image ----
FROM node:24.22.1-slim
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
# A fájlok root tulajdonban maradnak: a futó (nem root) folyamat csak olvasni tudja őket
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Numerikus, nem root felhasználó (Kubernetes runAsNonRoot ezt tudja ellenőrizni)
USER 1000:1000
EXPOSE 8080
# Exec forma: a node PID 1-ként fut, így közvetlenül megkapja a SIGTERM-et
CMD ["node", "server.js"]
