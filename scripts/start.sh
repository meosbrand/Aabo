#!/bin/sh
# Start Ààbò. ROLE=web runs the PWA/API, ROLE=gateway runs WhatsApp/Telegram, ROLE=all runs both.
set -e
npx prisma db push --skip-generate
if [ "${SEED_ON_START:-1}" = "1" ]; then npx tsx prisma/seed.ts || true; fi

case "${ROLE:-all}" in
  web) exec npx next start -p "${PORT:-9002}" ;;
  gateway) exec npx tsx src/gateway/index.ts ;;
  all)
    npx tsx src/gateway/index.ts &
    GW=$!
    trap 'kill $GW 2>/dev/null' INT TERM EXIT
    npx next start -p "${PORT:-9002}"
    ;;
  *) echo "Unknown ROLE=$ROLE" >&2; exit 1 ;;
esac
