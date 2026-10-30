#!/bin/sh
# Start Ààbò. ROLE=web runs the PWA/API, ROLE=gateway runs WhatsApp/Telegram, ROLE=all runs both.
#   sh scripts/start.sh            start (and, unless DB_SYNC_ON_START=0, update the database first)
#   sh scripts/start.sh predeploy  only update the database (run once per release, e.g. Render pre-deploy)
#   sh scripts/start.sh feeds      import threat feeds once (scheduled job)
set -e

sync_db() {
  if [ -f .db-provider ] && [ "$(cat .db-provider)" = "postgresql" ]; then
    case "$DATABASE_URL" in
      postgres*) ;;
      *) echo "This image is built for Postgres: set DATABASE_URL to a postgresql:// URL." >&2; exit 1 ;;
    esac
    npx prisma migrate deploy --schema prisma/postgres/schema.prisma
  else
    npx prisma db push --skip-generate
  fi
  if [ "${SEED_ON_START:-1}" = "1" ]; then npx tsx prisma/seed.ts || true; fi
}

case "${1:-}" in
  predeploy) sync_db; exit 0 ;;
  feeds) exec node --import tsx scripts/sync-feeds.ts ;;
esac

if [ "${DB_SYNC_ON_START:-1}" = "1" ]; then sync_db; fi

case "${ROLE:-all}" in
  # Started directly (not through npx) so shutdown signals reach the app: the gateway must release
  # its lease quickly when the platform replaces it during a deploy.
  web) exec node_modules/.bin/next start -p "${PORT:-9002}" ;;
  gateway) exec node --import tsx src/gateway/index.ts ;;
  all)
    node --import tsx src/gateway/index.ts &
    GW=$!
    trap 'kill -TERM $GW 2>/dev/null; wait $GW' INT TERM EXIT
    node_modules/.bin/next start -p "${PORT:-9002}"
    ;;
  *) echo "Unknown ROLE=$ROLE" >&2; exit 1 ;;
esac
