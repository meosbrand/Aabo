# Deploying Ààbò

Production runs one Docker image in three roles, sharing one Postgres database:

| Role | What it does | How many |
|---|---|---|
| `ROLE=web` | PWA, API, WhatsApp webhooks | 1 or more |
| `ROLE=gateway` | WhatsApp linked device, Telegram, webhook retries, tips, data retention | **exactly 1** (a database lease enforces it) |
| `sh scripts/start.sh feeds` | imports threat feeds | scheduled, every 6 hours |

`sh scripts/start.sh predeploy` applies database migrations (and seeds curated data) once per release.
`GET /api/health` reports the database, the loaded engine and — with `?gateway=1` — whether the gateway is running.

## 1. Build the image (on your machine)

Requirements: Docker, Node.js 22, and a checkout of the private engine next to this repository (optional — without it
the image runs the community engine).

```bash
# Pack the detection engine into a file (no registry needed)
(cd ../aabo-engine && npm ci && npm run build && npm pack --pack-destination ../engine-pack)

docker build \
  --build-context engine-src=../engine-pack \
  --build-arg NEXT_PUBLIC_APP_URL=https://your-domain \
  --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid public key> \
  --build-arg NEXT_PUBLIC_WA_BOT_NUMBER=<bot number, digits> \
  --build-arg NEXT_PUBLIC_TELEGRAM_BOT=<bot username> \
  -t <registry-user>/aabo:<version> .
```

`NEXT_PUBLIC_*` values are fixed into the browser code at build time: rebuild the image to change them.
Tag every release with its own version (e.g. `2026-11-02.1`); that tag is what you roll back to.

Check the image before pushing it (needs any reachable Postgres for the first command):

```bash
docker run --rm -e AABO_ENGINE=module -e AABO_ENGINE_REQUIRED=1 <image> node --import tsx scripts/smoke-engine.ts
docker push <registry-user>/aabo:<version>
```

Use a **private** repository on your registry (Docker Hub or any other) — the image contains the private engine.

## 2. Environment

Put these in one shared environment group (all three roles read the same values):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | `postgresql://…` (use the platform's internal URL) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL`, `PUBLIC_WEBHOOK_BASE_URL` | `https://your-domain` |
| `AABO_SECRET_KEYS` | `k1:` + `openssl rand -base64 32` — **back it up**: without it, saved customer keys can't be read |
| `AABO_ENGINE=module`, `AABO_ENGINE_REQUIRED=1` | the image already sets `AABO_ENGINE_MODULE` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | push notifications (`npx web-push generate-vapid-keys`); the gateway reads the public key at runtime too |
| `WA_BOT_PHONE` | the bot's dedicated number (digits, international format) |
| `TELEGRAM_BOT_TOKEN` | optional |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_PLATFORM_DAILY_CALLS_PER_ORG` | optional; see README |
| `GOOGLE_SAFE_BROWSING_API_KEY`, `URLHAUS_AUTH_KEY`, `PHISHTANK_APP_KEY` | optional |
| `ADMIN_EMAILS` | accounts that review community reports |
| `DB_SYNC_ON_START=0` | migrations run in the pre-deploy step, not at every start |

## 3. Render (example platform)

All in one region (Frankfurt is closest to Nigeria):

1. **Postgres** — a paid plan with backups.
2. **Web service** — *Deploy an existing image* from your private registry (add the registry credential). Env group
   above plus `ROLE=web`. Health check path `/api/health`. Pre-deploy command `sh scripts/start.sh predeploy`.
3. **Background worker** — same image, `ROLE=gateway`, 1 instance.
4. **Cron job** — same image, command `sh scripts/start.sh feeds`, schedule `0 */6 * * *`.
5. **Custom domain** on the web service; then set `BETTER_AUTH_URL` / `PUBLIC_WEBHOOK_BASE_URL` to it.

Free instances sleep and are not suitable: the gateway must stay connected.

**First start:** the worker's log prints a WhatsApp pairing code (when `WA_BOT_PHONE` is set). On the bot phone:
WhatsApp › Linked devices › Link a device › *Link with phone number instead*.

## 4. Releases and rollback

1. Build and push a new tag. 2. Point the web service, worker and cron job at it and deploy (the web service's
pre-deploy step migrates the database first). During the switch the new gateway waits until the old one has stopped.

**Rollback:** point the services back at the previous tag. Migrations only ever add to the schema; if a release needs
a destructive change, take a database backup first.

## 5. Changing the database schema

Edit only `prisma/schema.prisma` (SQLite, used locally and in tests), then:

```bash
npm run db:pg:schema                                   # regenerate prisma/postgres/schema.prisma
SHADOW_DATABASE_URL=postgresql://…/aabo_shadow npm run db:pg:migration -- <name>   # empty, throwaway database
TEST_DATABASE_URL=postgresql://…/aabo_test npm run test:pg                           # the whole suite on Postgres
```

Review and commit the new folder under `prisma/postgres/migrations/`. A quick local Postgres:
`docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16`.

## 6. Single server instead

`docker-compose.yml` runs Postgres, a one-off migration job, the web app and the gateway on one machine:
`cp .env.example .env`, fill it in (plus `POSTGRES_PASSWORD`), `docker compose up -d --build`. Put a reverse proxy with
HTTPS (e.g. Caddy) in front of port 9002, and back up the `aabo-db` volume.
