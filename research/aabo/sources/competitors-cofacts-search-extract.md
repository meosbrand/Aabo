---
capture: web-search extract (full-page fetch blocked by sandbox egress policy)
captured: 2026-10-07
query: "Cofacts LINE bot open source github rumors scam architecture"
category: community (developer docs)
---

# Cofacts (Taiwan) architecture (search extract)

Source: https://hackmd.io/@mrorz/r1nfwTrgM (Cofacts developer page; may be dated)

- rumors-line-bot: server behind the public LINE account where users forward messages for verification; Node.js with Svelte.js for LIFF; README includes a state diagram.
- rumors-api: "serves as an API for listing, searching, and submitting forwarded messages (Articles) and replies"; Node.js, GraphQL, koa2.
- rumors-site: public website listing all submitted messages; editors submit replies there; Next.js (React).
- url-resolver: when rumors-api receives a URL it hands it to url-resolver, which crawls and analyses the page and returns a summary of its text; Puppeteer, YouTube API, Mozilla readability; talks to rumors-api over gRPC.
- Each component has its own GitHub repository with "good first issue" labels.
- The search found nothing specific about scam handling; Cofacts is framed around rumour verification.
