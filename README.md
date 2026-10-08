# Ààbò — WhatsApp-first scam shield for Nigerian SMEs

Ààbò ("protection" in Yoruba) checks WhatsApp messages, SMS, links, QR codes, screenshots and phone/account
numbers for Nigerian scams, warns business owners automatically on their own WhatsApp, and trains staff to spot
fraud — in English and Pidgin.

| What | How |
|---|---|
| **Free checker (PWA)** | `/check` — paste text, a link or number, upload a screenshot or scan a QR code. Installable; on Android, *Share → Ààbò* from any app. |
| **Truecaller-style lookup** | `/lookup` and `check 0803…` in chat — community-reported numbers, accounts, links, wallets. |
| **WhatsApp bot** | Forward anything to the Ààbò number (linked device via Baileys — no WhatsApp Business API needed). Reply `REPORT`, `SAFE`, `WARN`, `quiz`, `tip`, `pidgin`. |
| **WhatsApp Guardian** | A business owner links their own WhatsApp with a pairing code; incoming scams trigger a private warning in their "Message yourself" chat + push notification. |
| **Telegram bot** | Same router, official Bot API. |
| **Awareness** | 2-minute lessons + quizzes, security checkup, protection score, daily tips. |
| **SME team** | Invite staff, see scams hitting the team, CheckMate-style review queue for reports. |
| **Incidents** | Playbooks for hijacked WhatsApp, money sent to scammers, leaked PIN/OTP, malicious APKs. |
| **Partner API** | `POST /api/v1/scan`, `GET /api/v1/lookup`, `POST /api/v1/report` with API keys. |
| **Any AI model** | Any OpenAI-compatible API: OpenAI, OpenRouter, Groq, Together, DeepSeek, Gemini, Azure, or your own Ollama / LM Studio / vLLM. |

## Open source and the detection engine

This repository is open source under the MIT license: the web app, API, WhatsApp/Telegram gateway, Guardian,
awareness and team features, the AI integration and the **community detection engine**
([`src/engines/community`](src/engines/community)).

Ààbò's production detection engine — the full Nigerian scam signal set, look-alike and similar-message detection,
the Guardian scanning policy and curated threat data — is proprietary and distributed separately. The app talks to
any engine only through the public contract in [`src/core/engine.ts`](src/core/engine.ts) and loads it at runtime.
See [docs/open-core.md](docs/open-core.md) and [NOTICE.md](NOTICE.md).

Whatever engine runs, the app itself guarantees that a verdict is never below the hard floor of its own signals (so
an AI model can never talk a hard signal down), that Guardian never stores message text and only messages its
owner, and that engine internals (signal weights and ids) never reach browsers or API clients.

## Architecture

```
Next.js 15 PWA + API (web)              Gateway (long-running: npm run gateway)
  /check /lookup /learn /app/* /api/v1     ChannelAdapter: WhatsApp bot | Guardian | Telegram
            \                              /   (Baileys linked device, grammY)
             src/server — scans, reputation, threat feeds, AI (OpenAI-compatible), engine loader
             src/core   — engine contract, verdict rules, shared helpers (pure TS)
             detection engine — community (bundled) or a separately distributed module
             Prisma DB (SQLite locally, Postgres in production)
```

**Detection layers**, cheapest first, every signal explained in English + Pidgin:

1. Normalisation and extraction (zero-width characters, homoglyphs, `hxxp`/`[.]`; Nigerian phones, NUBAN accounts, ₦ amounts, wallets)
2. Message patterns (code/PIN theft, fee-first offers, fake prizes, threats, payment redirection, malicious apps)
3. Link checks (look-alike names, raw IPs, punycode, short links)
4. Community reputation (reports, reviewer-confirmed indicators) and threat feeds (OpenPhish, URLhaus, PhishTank)
5. Optional network intel: Google Safe Browsing, URLhaus, RDAP domain age, SSRF-safe unshortening
6. Optional AI second opinion for grey-zone messages, screenshots (OCR) and Guardian conversations

The web app and gateway share the database; the web app writes `WaSession.desiredState` and the gateway reconciles.

## Quick start

Node.js 22 or newer.

```bash
cp .env.example .env            # set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:setup                # create the SQLite DB (+ any curated indicators the engine ships)
npm run dev                     # web on http://localhost:9002
npm run gateway                 # in a second terminal: WhatsApp + Telegram
```

Everything works without API keys (patterns + link checks + community reputation). Add keys to unlock more:

| Variable | Unlocks |
|---|---|
| `AI_PROVIDER`, `AI_API_KEY` (+ optional `AI_BASE_URL`, `AI_MODEL`) | AI analysis of grey-zone messages, screenshot OCR, Co-pilot answers |
| `GOOGLE_SAFE_BROWSING_API_KEY`, `URLHAUS_AUTH_KEY` | Live URL reputation lookups |
| `WA_BOT_PHONE` | Link the shared bot number with a pairing code (printed by `npm run gateway`) instead of a QR |
| `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_TELEGRAM_BOT` | Telegram bot |
| `NEXT_PUBLIC_WA_BOT_NUMBER` | "Chat with Ààbò on WhatsApp" buttons |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Push notifications (`npx web-push generate-vapid-keys`) |
| `ADMIN_EMAILS` | Accounts that can review community reports at `/admin/review` |
| `AABO_ENGINE`, `AABO_ENGINE_MODULE`, `AABO_ENGINE_REQUIRED` | Which detection engine runs (see [docs/open-core.md](docs/open-core.md)) |

### AI providers

Set `AI_PROVIDER` to one of the presets below; the base URL, JSON mode and image support are filled in for you.
Model ids are suggestions — override with `AI_MODEL`.

| `AI_PROVIDER` | Notes |
|---|---|
| `openai` | default model `gpt-5.4-mini`; strict JSON schema; reads screenshots |
| `openrouter` | any OpenRouter model id, e.g. `openai/gpt-5.4-mini` |
| `groq`, `together`, `deepseek` | JSON-object mode; text only by default |
| `gemini` | Google's OpenAI-compatible endpoint; reads screenshots |
| `azure` | set `AI_BASE_URL=https://<resource>.openai.azure.com/openai/v1/` and `AI_MODEL=<deployment>` |
| `ollama`, `lmstudio`, `vllm` | local or self-hosted; set `AI_BASE_URL` if not on the default port |
| `custom` | any other OpenAI-compatible API: set `AI_BASE_URL` and `AI_MODEL` |

If a provider rejects strict JSON schemas, Ààbò steps down to JSON-object mode, then to plain prompting, and
remembers that for an hour. Requests never pick up stray `OPENAI_*` environment variables, never follow redirects,
and a customer-supplied endpoint can't be pointed at private network addresses.

### Linking WhatsApp

- **Bot number:** use a dedicated SIM/number. Run `npm run gateway`; it prints a pairing code (if `WA_BOT_PHONE` is set)
  or a QR. On that phone: WhatsApp › Linked devices › Link a device › *Link with phone number instead*.
- **Guardian:** each user does this from `/app/guardian` (consent + phone number → pairing code shown in the app).

### Threat feeds

`npm run feeds:sync` imports OpenPhish (no key), URLhaus and PhishTank (with keys). Run it every few hours (cron).

## Testing

```bash
npm run typecheck && npm run lint
npm test          # unit + integration tests (engine contract, router via FakeChannel, AI layer, DB services, Guardian)
npm run eval      # confusion matrix of the loaded engine on the labelled sample set
```

The community sample set (`src/engines/community/samples.ts`) was written for this project, so its scores are
optimistic; add real (anonymised) messages from reports to keep the evaluation honest. To check that a separately
built engine works with this version of the app: `AABO_ENGINE=module AABO_ENGINE_MODULE=<path> npx tsx scripts/smoke-engine.ts`.

## Deployment

`docker compose up -d` runs web + gateway in one container with SQLite on a volume — enough for a pilot on a small VPS.
For scale: switch `provider` in `prisma/schema.prisma` to `postgresql`, run the web app on Vercel/any Node host
(`ROLE=web`) and the gateway on an always-on server (`ROLE=gateway`). If you run a separately distributed engine, set
`AABO_ENGINE_REQUIRED=1` so a missing engine fails loudly instead of falling back to the community engine.

## Risks you should know about

- **WhatsApp terms.** Linked-device automation (Baileys) is not an official WhatsApp API; numbers can be restricted or
  banned. Ààbò limits this: dedicated bot number, replies only (no cold or bulk messages), per-user daily quota, no
  read receipts or presence, slow opt-in tips, and Telegram/web fallbacks. Guardian sessions only ever message their
  owner. Only install the official `@whiskeysockets/baileys` package — a malicious look-alike exists (OSV MAL-2026-16070).
- **Privacy (NDPA 2023).** Guardian requires explicit consent and stores only verdict metadata (no message text).
  User-submitted checks keep a short masked excerpt for 30 days; scans are deleted after 180 days (`src/server/retention.ts`).
  When AI is configured, the message text (and screenshot) is sent to that AI provider.
- **Detection is probabilistic.** Ààbò always tells people to verify payments in their bank app and to use a second
  channel for any bank-detail change.

## Research

The product decisions come from the research in [`research/aabo/generated_reports`](research/aabo/generated_reports)
(competitors, SME security business models, linked-device WhatsApp, Nigerian scam taxonomy, detection techniques).
Re-run it with the project skill: `.claude/skills/aabo-research` (uses the vendored `deep-research` skill).

## Roadmap

- Developer Mode: bring your own AI key, threat-intel keys and WhatsApp API (Meta Cloud API, Twilio, 360dialog)
- Android companion app (notification screening across SMS/WhatsApp/Telegram) using `POST /api/v1/scan`
- Yoruba, Hausa and Igbo; partner dashboards for MSPs, telcos and POS networks

## License

MIT for this repository — see [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md). Contributions are welcome under the
[Developer Certificate of Origin](CONTRIBUTING.md).
