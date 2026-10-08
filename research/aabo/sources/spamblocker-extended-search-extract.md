---
capture: web-search extract (full-page fetch blocked by sandbox egress policy)
captured: 2026-10-07
query: "github open source SMS spam scam detection android notification listener multi app"
category: community (open source)
---

# Open-source Android spam blocking (search extract)

Sources: https://apt.izzysoft.de/fdroid/index/apk/dev.kerballone.spamblocker?repo=main , https://f-droid.org/packages/dev.kerballone.spamblocker/ ,
https://github.com/KerballOne/SpamBlocker-Extended , https://awesome.ecosyste.ms/projects/github.com%2Fpikastunner%2Fsms-spam-detection ,
https://github.com/The-Fuse/SMS-Phishing-Detection

- SpamBlocker Extended (MIT, v6.1.2): "Notification Screening applies your blocking rules to RCS, Signal, WhatsApp, email, and any other messaging app that posts a notification."
- Filters: "1. Number Rules & Text Rules 2. Contact 3. STIR attestation 4. Repeated call 5. Dialed number 6. Recently used apps 7. Time schedule 8. Notification Screening (title/body of chosen apps' notifications)".
- Rule-based (regex/text), not an ML scam classifier; no phishing/link analysis listed.
- pikastunner/sms-spam-detection: Kotlin + TensorFlow Lite, real-time SMS scanning; low activity.
- The-Fuse/SMS-Phishing-Detection: classifier behind a hosted API that learns from user reports.
