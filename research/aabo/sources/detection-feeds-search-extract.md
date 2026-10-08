---
capture: web-search extract (full-page fetch blocked by sandbox egress policy)
captured: 2026-10-07
query: "free phishing threat intelligence feeds API URLhaus PhishTank OpenPhish Google Safe Browsing ..."
category: vendor docs + industry
---

# Free threat-intel feeds (search extract)

Sources: https://developers.google.com/safe-browsing/v4/pricing , https://xsoar.pan.dev/docs/reference/integrations/feed-ur-lhaus ,
https://threatcluster.io/free-threat-intelligence-feeds , https://phishunt.io/api/ , https://phishunt.io/llms-full.txt ,
https://apispine.com/phishstats , https://www.cyware.com/blog/best-threat-intelligence-feeds , https://apify.com/seemuapps/google-safe-browsing

- Google: "all use of Safe Browsing APIs is free of charge" (pricing page last updated 2024; v5 API also listed). Apify listing claims v4 Lookup is free for non-commercial use and commercial use requires registration — conflicts with Google's page.
- URLhaus (abuse.ch / Spamhaus): malware-distribution URLs; "Starting June 30th 2025, abuse.ch requires the 'Auth-Key' header"; free key at https://auth.abuse.ch/; POST lookups by url=/host=/payload=.
- PhishTank: verified URLs as JSON/CSV/API, "Continuous, free key".
- OpenPhish community feed: plain-text URLs "Every 12 hours (community)".
- phishunt.io: CC0, "no account, key, or rate limit on read endpoints" (self-described); hourly.
- PhishStats: free tier 50 requests/hour; $20/month for 2,000/hour (as of 2026-05-28).
