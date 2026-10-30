# syntax=docker/dockerfile:1
# Ààbò — one image for the web app (Next.js PWA + API + webhooks), the messaging gateway and the
# feed-sync job. Which one runs is chosen at start with ROLE=web | gateway | all (scripts/start.sh).
#
# Production build (Postgres, with the separately distributed detection engine) — see docs/deploy.md:
#   (cd ../aabo-engine && npm ci && npm run build && npm pack --pack-destination ../engine-pack)
#   docker build --build-context engine-src=../engine-pack \
#     --build-arg NEXT_PUBLIC_APP_URL=https://aabo.example \
#     --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY=... --build-arg NEXT_PUBLIC_WA_BOT_NUMBER=234... \
#     -t you/aabo:2026-10-30.1 .
# Without --build-context engine-src the image runs the bundled community engine.

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM deps AS build
# "postgresql" (production) or "sqlite" (single-file database, small pilots only).
ARG DB_PROVIDER=postgresql
# Public settings are fixed into the browser code at build time; runtime values are ignored.
ARG NEXT_PUBLIC_APP_URL=""
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
ARG NEXT_PUBLIC_WA_BOT_NUMBER=""
ARG NEXT_PUBLIC_TELEGRAM_BOT=""
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_PUBLIC_WA_BOT_NUMBER=$NEXT_PUBLIC_WA_BOT_NUMBER \
    NEXT_PUBLIC_TELEGRAM_BOT=$NEXT_PUBLIC_TELEGRAM_BOT \
    NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN if [ "$DB_PROVIDER" = "postgresql" ]; then \
      node scripts/prisma-schema.mjs --check && npx prisma generate --schema prisma/postgres/schema.prisma; \
    else npx prisma generate; fi \
 && npx next build \
 && echo "$DB_PROVIDER" > .db-provider \
 && npm prune --omit=dev --no-audit --no-fund \
 && rm -rf .next/cache

# Optional detection engine: a packed tarball (npm pack) passed with --build-context engine-src=<dir>,
# or a package from a private npm registry (AABO_ENGINE_PKG plus --secret id=npmrc).
FROM scratch AS engine-src

FROM ${NODE_IMAGE} AS engine
ARG AABO_ENGINE_PKG=""
COPY --from=engine-src / /tmp/engine-src/
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    mkdir -p /opt/aabo-engine && \
    for f in /tmp/engine-src/*.tgz; do \
      if [ -e "$f" ]; then npm install --prefix /opt/aabo-engine --omit=dev --ignore-scripts --no-audit --no-fund "$f"; fi; \
    done && \
    if [ -n "$AABO_ENGINE_PKG" ]; then npm install --prefix /opt/aabo-engine --omit=dev --ignore-scripts --no-audit --no-fund "$AABO_ENGINE_PKG"; fi

FROM ${NODE_IMAGE} AS run
WORKDIR /app
ENV NODE_ENV=production PORT=9002 NEXT_TELEMETRY_DISABLED=1 \
    AABO_ENGINE_MODULE=/opt/aabo-engine/node_modules/@meosbrand/aabo-engine/dist/index.js
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates tini && rm -rf /var/lib/apt/lists/* \
 && chown node:node /app
COPY --from=build --chown=node:node /app ./
COPY --from=engine /opt/aabo-engine /opt/aabo-engine
EXPOSE 9002
USER node
# -g: forward shutdown signals to every process the start script runs.
ENTRYPOINT ["/usr/bin/tini", "-g", "--"]
# ROLE=web | gateway | all (default: all — fine for a single small server).
# `sh scripts/start.sh predeploy` applies database migrations once per release (Render pre-deploy command).
CMD ["sh", "scripts/start.sh"]
