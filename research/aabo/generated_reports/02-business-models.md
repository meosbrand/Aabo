# 02 · Business models that worked in SME security

| Company | Model | Evidence | Lesson for Ààbò | Source |
|---|---|---|---|---|
| Huntress | Sell through MSPs, not to SMBs directly | ~4,000 MSPs reaching ~110,000 SMBs; >70% annual growth, ~$100M ARR expected 2024; entered Africa via distributor QBS Software Africa (South Africa first) | Build a partner/API layer early (MSPs, telcos, banks, POS networks) so others resell Ààbò to their SME base | [models](../sources/business-models-search-extract.md) |
| Huntress (origin) | Services revenue funded product build | founders' defence-contracting firm funded early ops | Offer paid "WhatsApp security setup" services to SMEs while the product matures | [models](../sources/business-models-search-extract.md) |
| Hoxhunt | Train *all* staff, reward success not punish failure, gamified, AI-personalised | $40M raise; enterprise buyers | Lessons + quizzes + streaks for every staff member, positive tone | [models](../sources/business-models-search-extract.md) |
| CybSafe | Behavioural awareness, enterprise-led, telco partnership (Vodafone) | $40M total funding; est. $7.7M (2023) → $11.5M (2024, est.) revenue | Telco bundling is a proven route — MTN/Airtel SME bundles are the Nigerian analogue | [models](../sources/business-models-search-extract.md) |
| AI Scam Detector | Consumer freemium on WhatsApp | 5 free checks/day, ₹199/month unlimited | Free daily quota on the bot; unlimited + Guardian + team in paid tier | [indie](../sources/competitors-indie-scam-checkers-search-extract.md) |

## Market signals (Africa)

- WhatsApp is the top work app (93%, up from 89% in 2023); up to 80% use personal devices for
  work, many unmanaged ([KnowBe4 via extract](../sources/business-models-search-extract.md)).
- Informal platforms "lack the audit trails necessary for compliance" — an SME governance wedge
  ([models](../sources/business-models-search-extract.md)).
- Well-funded incumbents exist (KnowBe4 raised $393.5M, SoSafe $73M) — compete on local
  language/scam depth and WhatsApp-native delivery, not on enterprise LMS features.
- Nigerian SMEs underestimate exposure; weak points are password reuse, unpatched software,
  weak access control ([stats](../sources/ng-threat-stats-search-extract.md)).

## Recommended model

1. **Free tier** (growth): public `/check` page + WhatsApp/Telegram bot with a daily quota.
2. **SME plan** (revenue): Guardian mode for owner + staff, team alert feed, awareness
   programme, panic playbooks, monthly report.
3. **Partner API** (scale, Huntress/CybSafe route): `/api/v1` with API keys for MSPs, telcos,
   POS/agent-banking networks and banks.
