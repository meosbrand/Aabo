# Developer Mode

Developer Mode lets a business plug its own providers into Ààbò:

- **its own AI model** — any OpenAI-compatible API, with its own key (BYOK)
- **its own threat-intel keys** — Google Safe Browsing and URLhaus
- **its own WhatsApp number** on an official API — Meta WhatsApp Cloud API, Twilio or 360dialog
  (see [whatsapp-cloud-setup.md](whatsapp-cloud-setup.md))

It lives at **App › Developer** (`/app/developer`).

## Who can do what

| | Owner | Admin | Member |
|---|---|---|---|
| See the Developer page | ✅ | ✅ | — (404) |
| Switch Developer Mode on/off | ✅ | — | — |
| Change AI, keys and WhatsApp numbers | ✅ | ✅ | — |

Every change is written to the audit log at the bottom of the page (who, what, when — never secret values).

## How secrets are kept

- Keys and tokens are encrypted (AES-256-GCM) before they are stored, bound to the organisation and the setting they
  belong to. The page only ever shows the last four characters.
- Leave a key field blank to keep the stored key. Webhook secrets and verify tokens are shown **once**, when a number is
  added or its secret is rotated.

## AI provider

| Mode | What happens |
|---|---|
| **Ààbò's AI** | Uses the server's AI (if the operator configured one), within a daily allowance per business |
| **Our own key** | Uses your provider only. If it fails, checks continue **without AI** — never on Ààbò's key |
| **No AI** | Checks use patterns, reputation and threat feeds; the Co-pilot answers with saved tips |

Pick a preset (OpenAI, OpenRouter, Groq, Together, DeepSeek, Gemini, Azure, Ollama, LM Studio, vLLM or any other
OpenAI-compatible API), then **Test connection**. Results: *Connected*, *key rejected*, *model not found*,
*could not reach the server*, *address not allowed* (private network), *unexpected format*, *timed out*, or
*rate-limited*. The test also checks whether the model can read images (screenshots).

Privacy: with your own key, message text (and screenshots, if the model reads images) goes to your provider. Your
provider receives Ààbò's open community prompt, not the production engine's prompt.

## WhatsApp numbers

Each number has its own settings:

- **Checks per person per day** and **checks per day for the business** — stop abuse and runaway costs.
- **Answer security questions (Co-pilot)** — turn off if you only want message checks. WhatsApp's 2026 policy
  restricts general-purpose AI assistants on business numbers, so keep the Co-pilot scoped to security.
- **Read receipts + typing** (Meta and 360dialog) — off by default.
- **Daily tips** — off by default. When on, tips only go to people who messaged you in the last 23 hours (outside
  WhatsApp's 24-hour window a paid template would be needed).

People who write to your number are kept separate from Ààbò's own bot users. Reports they make wait for review before
they affect community reputation.

## Running a server with Developer Mode

| Variable | Purpose |
|---|---|
| `AABO_SECRET_KEYS` | Required. `k1:<base64 of 32 bytes>` (`openssl rand -base64 32`). Without it Developer Mode cannot be switched on. |
| `DEVELOPER_MODE` | `off` disables it for every organisation |
| `PUBLIC_WEBHOOK_BASE_URL` | Public HTTPS base URL for WhatsApp webhooks (defaults to `BETTER_AUTH_URL`) |
| `AI_PLATFORM_DAILY_CALLS_PER_ORG` | Daily allowance of the server's AI per business (default 500; 0 = unlimited) |
| `AI_ALLOW_PRIVATE_ENDPOINTS` | `1` lets organisations point their AI at private/local addresses. Keep `0` on shared servers. |

**Rotating the encryption key:** add the new key in front (`AABO_SECRET_KEYS="k2:<new>,k1:<old>"`), restart, run
`npx tsx scripts/rotate-secrets.ts`, then remove the old key once it reports 0 failures.

**Database:** SQLite is fine for a pilot. Once organisations connect busy WhatsApp numbers, move to Postgres (webhooks
write concurrently with the web app and the gateway).
