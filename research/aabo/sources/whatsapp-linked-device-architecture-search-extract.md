---
capture: web-search extract (full-page fetch blocked by sandbox egress policy)
captured: 2026-10-07
query: "OpenClaw WhatsApp linked device Baileys architecture github / Abakus WhatsApp chat assistant app"
category: vendor docs + community
---

# Linked-device WhatsApp architectures (search extract)

Sources: https://docs.openclaw.ai , https://claw.abacus.ai/claw_faq , https://personal-agents.abacus.ai/claw_faq ,
https://aicybr.com/blog/abacusai-bot-open-source-personal-agents , https://www.kdnuggets.com/2026/05/abacus/abacus-ai-review ,
https://aiskill.market/blog/openclaw-multi-channel-architecture-whatsapp-slack , https://composio.dev/blog/building-openclaw-from-scratch ,
https://www.rapidevelopers.com/md/openclaw-integrations/whatsapp-business , https://openclaw.im/docs

## OpenClaw
- "OpenClaw bridges WhatsApp (via WhatsApp Web / Baileys), Telegram (Bot API / grammY), Discord (Bot API / channels.discord.js), and iMessage (imsg CLI) to coding agents like Pi."
- "OpenClaw connects to WhatsApp the same way the web client does—through multi-device pairing. The WhatsApp account remains on a phone, while OpenClaw appears as an additional linked device."
- "The openclaw channels login command shows a QR code for pairing WhatsApp Web."
- "The connection persists because Baileys stores authentication credentials locally."
- Inbound: "Baileys connects to WhatsApp Web's WebSocket ... Baileys emits a messages.upsert event with type 'notify'."
- LID issue: "WhatsApp doesn't use phone numbers directly in the WebSocket connection, it uses link IDs" — needed bidirectional phone/LID conversion for allow-listing.
- Access control: "start with channels.whatsapp.allowFrom and (for groups) mention rules."
- Third-party: Baileys "carries the risk of account termination if WhatsApp detects automation"; "The Cloud API is recommended for production use".

## Abacus Claw / AbacusAI Bot
- "Abacus Claw is a cloud-hosted version of OpenClaw, the open-source AI agent framework."
- "an always-on AI assistant that works across WhatsApp, Telegram, Slack, and other messaging platforms – all at once"; "runs 24/7, remembers past conversations".
- AbacusAI Bot (MIT desktop app): "WhatsApp can be linked as a device"; "Incoming messages are recorded, with inbound responses disabled by default until the user enables them."
- Security docs: "unattended remote tools are enabled by default once inbound work is enabled".
- v1.0.81 released September 21 (2026) for Windows, macOS, Linux.
