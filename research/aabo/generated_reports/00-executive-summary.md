# 00 · Executive summary — Ààbò research run (2026-10-07)

Pipeline: vendored `deep-research` skill + `aabo-research` overlay. 21 source extracts
covering 100+ origin URLs across 6 source categories (vendor docs, news, industry/analyst,
government/regulator via press, academic abstracts, open-source/community).

## Headline findings

1. **Nobody owns Nigerian WhatsApp scam checking.** Forward-to-check bots exist (Scamio,
   ScamShield, CheckMate) but none is documented for Nigerian patterns or Pidgin, and the search
   found no African SME WhatsApp checker ([01](01-competitors.md)).
2. **WhatsApp is where African work happens** — 93% use it for work, up to 80% on personal,
   often unmanaged devices ([02](02-business-models.md)).
3. **Layered detection beats LLM-only.** Best LLMs scored ~64–65% micro-F1 on a real-world
   benchmark and struggle with conversational scams; ScamShield/Whoscall layer similarity
   matching, crowd reports, reputation DBs and a classifier ([05](05-detection-techniques.md)).
4. **The Nigerian threat mix is concrete and rule-friendly:** fake transfer alerts, 6-digit code
   hijacks, BVN/NIN threats, EFCC "bail", CBEX-style ROI promises with withdrawal fees, fake loan
   APKs, fake job letters, supplier bank-detail changes ([04](04-ng-scam-taxonomy.md)).
5. **Linked-device WhatsApp works but is a ToS risk.** OpenClaw/Abacus Claw prove the model;
   Meta enforcement (mass freezes Aug 2026) and a malicious Baileys fork (OSV MAL-2026-16070)
   mean behaviour controls, pinned packages and a transport-neutral design are mandatory
   ([03](03-whatsapp-architecture.md)).
6. **Grow like Huntress, train like Hoxhunt:** partner/API distribution (MSPs, telcos) and
   positive, gamified awareness for every staff member ([02](02-business-models.md)).

## Key numbers

| Figure | Value | Source |
|---|---|---|
| WhatsApp work use (Africa survey) | 93% (89% in 2023) | [business-models](../sources/business-models-search-extract.md) |
| Weekly attack attempts per Nigerian org | 4,200 (Africa 3,153; global 1,963) | [ng-threat-stats](../sources/ng-threat-stats-search-extract.md) |
| Financial phishing in Nigeria | +46% while overall phishing −52% | [ng-threat-stats](../sources/ng-threat-stats-search-extract.md) |
| Best LLM scam-detection score | ~64–65% micro-F1 | [detection-llm-research](../sources/detection-llm-research-search-extract.md) |
| Huntress MSP reach | ~4,000 MSPs → ~110,000 SMBs | [business-models](../sources/business-models-search-extract.md) |
| Freemium benchmark | 5 free checks/day; ₹199/month unlimited | [indie](../sources/competitors-indie-scam-checkers-search-extract.md) |

## Coverage gaps and method deviation

- **Full-page reads were impossible.** The sandbox egress proxy refused curl and WebFetch for
  every target host ([failed.log](../sources/failed.log)). Sources are therefore web-search
  extracts (quoted passages + URLs), not full documents — a deviation from the skill's
  "mandatory full read" rule. Re-run `/aabo-research` from an environment with open network
  access (or add the hosts to the environment allow-list) to upgrade the corpus.
- **Reddit and arXiv** were blocked; academic findings come from abstracts surfaced by search.
- **No primary Nigerian regulator statistics** (ngCERT, EFCC) were retrievable; numbers above
  are vendor telemetry and survey data.
- **Task scams** were not confirmed by Nigerian sources.
