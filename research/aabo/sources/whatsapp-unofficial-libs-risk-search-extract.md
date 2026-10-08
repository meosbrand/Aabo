---
capture: web-search extract (full-page fetch blocked by sandbox egress policy)
captured: 2026-10-07
query: "Baileys WhiskeySockets ban risk 2026 ... / Evolution API WAHA ..."
category: community + government (OSV)
---

# Unofficial WhatsApp libraries: options and risks (search extract)

Sources: https://zylos.ai/research/2026-01-26-whatsapp-api-automation , https://whatsapp.checkleaked.cc/blog/best-open-source-whatsapp-libraries ,
https://newreleases.io/project/github/WhiskeySockets/Baileys/release/v7.0.0-rc10 , https://osv.dev/vulnerability/MAL-2026-16070 ,
https://github.com/devlikeapro/waha/issues/1538 , https://help.chatdaddy.tech/article/ban-type-distribution ,
https://propakistani.pk/2026/08/04/thousands-of-whatsapp-users-suddenly-lose-account-access/ ,
https://www.intradyn.com/whatsapp-blocked-linked-device-archiving/ ,
https://www.indiehackers.com/post/best-10-evolution-api-alternatives-in-2026-tested-9fc702d744 ,
https://railway.com/deploy/whatsapp-api-self-host-evolution-no-meta-approval-updated-oct26--evolution-api-whatsapp

- Baileys downsides: "Not officially affiliated with WhatsApp; Violates WhatsApp Terms of Service; Risk of account suspension/ban".
- Baileys v7 RC notes: "We faced a lot of challenges: LIDs, restrictions, WAM, warnings, bans, random logouts, decryption & encryption errors".
- GitHub issue comment: "Sending too many Ack when sending messages will get users banned!" (user comment).
- Vendor claim (unverified): Meta actively banning unofficial APIs; since H2 2025 a single complaint can trigger monitoring.
- OSV MAL-2026-16070: lookalike npm package @fyxzpediaa/baileys (Sept 2026) "injects a covert remote-directed action into the WhatsApp socket"; upstream Baileys does not contain it.
- Aug 2026: mass account freezes; Meta: "Sometimes we get this wrong, and if we do, we try to fix it as quickly as possible".
- 2025: Meta listed Telemessage as an "unofficial app".
- whatsmeow (Go, MPL-2.0) powers mautrix-whatsapp; lacks broadcast lists and calls.
- whatsapp-web.js: Puppeteer-driven, "potentially lower detection"; WPPConnect for multi-session; Venom's last stable release late 2024.
- Evolution API: "a free, open-source REST layer over WhatsApp Web with multi-instance support, webhooks, and n8n-friendly integrations"; "built on Baileys and Whatsmeow", 8.3k+ stars; "QR scan only. No Meta Business Manager"; from v2.4.0 instances must activate against Evolution Foundation licensing server (third-party claim).
- WAHA: "Docker-first WhatsApp HTTP API ... zero per-message fees", multiple engines.
- "One architecture does not grant ban immunity; behavior does."
