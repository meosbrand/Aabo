# Ààbò — notes for Claude sessions

WhatsApp-first scam shield for Nigerian SMEs. See README.md for the product and architecture, docs/open-core.md
for how detection engines plug in.

## Commands
- `npm run dev` (web, port 9002) · `npm run gateway` (WhatsApp/Telegram worker)
- `npm run typecheck && npm run lint && npm test` before every commit; `npm run eval` after changing the community engine
- `npm run db:setup` creates/seeds the SQLite DB (`prisma/dev.db`); tests use `prisma/test.db`
- `npx tsx scripts/smoke-engine.ts` checks whichever engine `AABO_ENGINE*` selects

## Layout
- `src/core` — the engine contract (`engine.ts`), shell guarantees (`normalize.ts`) and shared helpers. Pure TS:
  no Next/Prisma imports. Client components may import only `advice`, `defang`, `format/chat`, `types`, `levels`,
  `awareness/*` (ESLint enforces this).
- `src/engines/community` — the open community engine; `src/engines/contract-suite.ts` — behaviour every engine must have.
  Other engines are separate packages loaded by `src/server/engine-loader.ts`; never import one or add it to package.json.
- `src/server` — Prisma-backed services shared by web and gateway. Do not import `next/headers` in modules the
  gateway uses (`scans`, `lookup`, `engine`, `reputation-store`, `push`, `feeds`, `ai/*`, `rate-limit-store`).
- `src/server/ai` — OpenAI-compatible AI (presets, config, JSON-mode cascade, analyzer, Co-pilot, connection test).
  Outbound calls to user-chosen hosts go through `src/server/net/safe-fetch.ts`; log errors with `logError`.
- `src/server/devmode.ts` — Developer Mode rules (roles, sealed secrets via `secrets/crypto.ts`, audit). Web actions in
  `src/app/app/developer/actions.ts` stay thin wrappers. Never return a secret or sealed value to the browser.
- `src/server/channels/cloud` — official WhatsApp APIs (Meta, Twilio, 360dialog), fetch-only. The webhook route queues
  `InboundEvent`s; `src/gateway/inbound.ts` runs them through the same router with `createPrismaServices({kind:'connection'})`.
- `src/gateway` — channel adapters + router. Keep Baileys types inside `channels/whatsapp/`.
- `src/app` — Next.js routes; `src/components` — UI (shadcn). Strings are bilingual via `L(en, pidgin)` + `tr()`.

## Conventions
- New community patterns: add a signal in `src/engines/community/signals.ts` (id starts with `c.`, English + Pidgin text),
  add labelled samples to `src/engines/community/samples.ts`, keep `npm run eval` at 0% false positives.
- Every verdict goes through `analyzeInput` → `normalizeVerdict`; the LLM may raise but never lower a hard floor.
- Apply `toPublicVerdict` to any verdict sent to a browser or API client.
- A customer's own AI endpoint (BYOK) gets the community prompt only, never the loaded engine's prompt.
- Guardian never messages anyone but its owner and never stores message text.
- Webhook payloads are never logged and are cleared once handled; organisation-scoped queries always filter by `orgId`.
- `npm run test:e2e` before changing the Developer page (Prisma refuses `--force-reset` from agents; the E2E server
  deletes its own throwaway `prisma/e2e.db` instead).
- Do not reference proprietary engine internals (rule ids, weights, file names) in this repository.
