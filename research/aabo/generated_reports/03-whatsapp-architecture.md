# 03 · WhatsApp without the Cloud API

## How the reference products connect

- **OpenClaw / Abacus Claw:** WhatsApp Web multi-device pairing via Baileys; the gateway is an
  additional *linked device*; auth state persisted so restarts reconnect without a new QR;
  inbound via `messages.upsert` (type `notify`); allow-lists via `channels.whatsapp.allowFrom`;
  LID ↔ phone mapping needed ([linked-device](../sources/whatsapp-linked-device-architecture-search-extract.md)).
- **Evolution API / WAHA:** self-hosted REST gateways over Baileys/whatsmeow with webhooks and
  multi-instance support; Evolution ≥ v2.4.0 reportedly requires licence activation
  ([libs](../sources/whatsapp-unofficial-libs-risk-search-extract.md)).

## Library options

| Library | Lang | Notes | Source |
|---|---|---|---|
| Baileys (`@whiskeysockets/baileys`) | TS/JS | v7 RC addressed LIDs, bans, logouts, encryption errors; community maintained | [libs](../sources/whatsapp-unofficial-libs-risk-search-extract.md) |
| whatsmeow | Go (MPL-2.0) | powers mautrix-whatsapp; no broadcast lists or calls | [libs](../sources/whatsapp-unofficial-libs-risk-search-extract.md) |
| whatsapp-web.js | JS (Puppeteer) | real browser session, heavier | [libs](../sources/whatsapp-unofficial-libs-risk-search-extract.md) |

## Risks and the controls Ààbò applies

| Risk | Evidence | Control in Ààbò |
|---|---|---|
| Account ban (ToS) | "Violates WhatsApp Terms of Service; Risk of account suspension/ban"; Meta mass freezes Aug 2026 | dedicated bot number; reply-only (no cold outbound); per-user daily quota; typing delay; Telegram + web fallback |
| Over-acking | GitHub comment: too many acks → bans | Guardian never sends read receipts or presence (`markOnlineOnConnect: false`) |
| Supply chain | OSV MAL-2026-16070 malicious `@fyxzpediaa/baileys` fork | pin exact `@whiskeysockets/baileys` version; lockfile |
| Session loss on redeploy | auth state must persist | Baileys auth state stored in the database (`WaAuthKey`), not the filesystem |
| Future official API | Cloud API is the sanctioned route | transport-neutral `ChannelAdapter`; `WHATSAPP_TRANSPORT=baileys|cloud` |

## Guardian mode design notes

- Pair by **phone-number pairing code**, because an SME owner on a phone cannot scan a QR shown
  on that same phone (QR remains the desktop fallback).
- Warnings go **only to the owner's own chat** ("Message yourself") — Ààbò never talks to the
  sender, which keeps outbound volume minimal.
- Platform-policy context: Android apps that read WhatsApp notifications have been pulled or
  received cease-and-desist letters ([policy](../sources/platform-policy-search-extract.md)); a PWA share target
  + linked-device Guardian avoids shipping such an app at launch.
