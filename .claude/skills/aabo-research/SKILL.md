---
name: aabo-research
description: Research overlay for Ààbò (WhatsApp-first scam shield for Nigerian SMEs). Use when asked to refresh competitive, architecture, scam-taxonomy or business-model research for this repo. Runs the vendored deep-research pipeline with Ààbò-specific angles.
allowed-tools: Bash, Read, Write, Glob, Grep, WebSearch, WebFetch
---

# Ààbò research overlay

ROLE: You are the lead product strategist and threat-intelligence analyst for Ààbò, a
WhatsApp-first security assistant for Nigerian SMEs (awareness, scam protection, and
Truecaller-style spam/scam filtering across messaging apps). The output must be usable to
make build decisions: every finding ends in a "so what for Ààbò" and the idea backlog maps
borrowed ideas to concrete features.

METHODOLOGY: Load the `deep-research` skill first and follow its three-phase pipeline,
folder layout, save-with-fallback chain, source-count gate, anti-hallucination guardrails
and final self-review. Everything below is the topic overlay.

TOPIC SLUG: `aabo` (artifacts under `research/aabo/`)

SOURCE-COUNT TARGET: 25+

Recency: prefer sources from the last 3 years; older only for context.

Environment note: in the cloud sandbox `reddit.com` and `arxiv.org` may be blocked by the
network policy. Use mirrors (e.g. Hugging Face paper pages) and log blocked hosts in
`sources/failed.log`; record the gap in the executive summary. The fetch helper
`research/aabo/agent_scripts/fetch_sources.py` downloads a URL list to markdown/text.

## Phase 1 angles

- **A. Direct competitors / analogues** — Bitdefender Scamio, Truecaller (SMS, WhatsApp
  caller ID), Singapore ScamShield bot, CheckMate SG, Cofacts, Whoscall, AI Scam Detector,
  Norton Genie, Trend Micro ScamCheck, SpamBlocker Extended. Capture channels, inputs
  accepted (text/screenshot/link/QR), verdict format, pricing, data handling.
- **B. SME security business models** — Huntress (MSP channel), Hoxhunt (gamified
  awareness), CybSafe (telco partnership), KnowBe4 Africa, African cyber startups.
- **C. WhatsApp without the Cloud API** — OpenClaw / Abacus Claw linked-device model,
  Baileys, whatsmeow, Evolution API, WAHA; ban risk, enforcement events, supply-chain risks.
- **D. Nigerian scam taxonomy & statistics** — POS fake alerts, WhatsApp OTP hijack,
  impersonation giveaways, BEC, loan/job/investment scams; ngCERT/EFCC/NITDA, Kaspersky,
  Check Point figures.
- **E. Detection techniques** — rule/regex, URL reputation feeds (Safe Browsing, URLhaus,
  PhishTank, OpenPhish), homoglyph/typosquat, LLM scam-detection benchmarks.
- **F. Datasets** — Nigerian/African SMS spam & smishing corpora.
- **G. Community discourse** — indie builders' scam-checker projects, forum threads.
- **H. Platform policy** — Google Play notification-listener rules, WhatsApp terms.

## Extraction fields

Product, channels, inputs, detection method, verdict UX, pricing, data/privacy stance,
traction numbers (with date), failure modes, and the "idea to borrow".

## Reports (`research/aabo/generated_reports/`)

1. `00-executive-summary.md`
2. `01-competitors.md` — feature matrix table
3. `02-business-models.md`
4. `03-whatsapp-architecture.md` — linked-device vs Cloud API, risk controls
5. `04-ng-scam-taxonomy.md` — categories and documented tells, with sources
6. `05-detection-techniques.md`
7. `99-sources.md`
