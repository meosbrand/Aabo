# syntax=docker/dockerfile:1
# Ààbò — one image that runs the web app (Next.js PWA + API) and the messaging gateway.
#   docker compose up -d        (see docker-compose.yml)
#
# Optional: bundle a separately distributed detection engine (see docs/open-core.md):
#   docker build --build-arg AABO_ENGINE_PKG=@meosbrand/aabo-engine@1 --secret id=npmrc,src=$HOME/.npmrc .
# then run with AABO_ENGINE=module AABO_ENGINE_MODULE=/opt/aabo-engine/node_modules/@meosbrand/aabo-engine/dist/index.js
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS engine
ARG AABO_ENGINE_PKG=""
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    mkdir -p /opt/aabo-engine && \
    if [ -n "$AABO_ENGINE_PKG" ]; then npm install --prefix /opt/aabo-engine --ignore-scripts --omit=dev "$AABO_ENGINE_PKG"; fi

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=9002
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates tini && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
COPY --from=engine /opt/aabo-engine /opt/aabo-engine
EXPOSE 9002
ENTRYPOINT ["/usr/bin/tini", "--"]
# ROLE=web | gateway | all (default: all — fine for a single small server)
CMD ["sh", "scripts/start.sh"]
