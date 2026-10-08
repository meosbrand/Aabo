# 01 · Competitors and analogues

Every row is grounded in the cited extract. "Idea to borrow" is the Ààbò design consequence.

## Feature matrix

| Product | Channels | Inputs accepted | How it decides | Verdict UX | Price | Idea to borrow | Source |
|---|---|---|---|---|---|---|---|
| Bitdefender Scamio | Web, Messenger, WhatsApp, Discord | text, screenshots, links, QR codes, job posts, "how it was received" context | Bitdefender threat detection + AI, "probability of malicious activity based on message content and context" | verdict "within seconds" + recommended next steps | free | Forward-to-check bot that users save as a contact; ask *how* the message arrived | [scamio](../sources/competitors-scamio-search-extract.md) |
| ScamShield bot (SG) | WhatsApp, Telegram (bot later retired in favour of app) | pasted text, screenshot, forwarded message, scammer contact | match vs previously reviewed/blacklisted messages, numbers, URLs; report counts; ML classifier | scam / not | free (govt) | Similar-message matching + report counts + classifier, in that order | [scamshield](../sources/competitors-scamshield-checkmate-search-extract.md) |
| CheckMate (SG) | WhatsApp | forwarded messages, images, screenshots | volunteer checkers vote; NLP/GenAI for fast first reply | crowd verdict | free (volunteer) | Reviewer voting queue behind an instant AI answer | [checkmate](../sources/competitors-scamshield-checkmate-search-extract.md) |
| Cofacts (TW) | LINE | forwarded messages, URLs | open DB of articles + editor replies; url-resolver summarises linked pages | community reply | free, open source | Open "scam wiki" of confirmed messages; URL resolver/unshortener service | [cofacts](../sources/competitors-cofacts-search-extract.md) |
| Truecaller | Android/iOS app; WhatsApp caller ID | SMS, calls; WhatsApp/Telegram caller ID via setting | crowd spam-number DB + on-device ML for SMS | red persistent alert; links disabled until sender marked safe | freemium | Disable links on flagged messages; crowd number DB; on-device processing for SMS | [truecaller](../sources/competitors-truecaller-search-extract.md) |
| Whoscall | Android/iOS | calls, SMS, URLs | 2.6B+ entry DB, police DB, Scamadviser | auto link warnings; premium auto-scan | freemium | Partner DBs (police/regulator) + leak check by phone number | [whoscall](../sources/competitors-whoscall-genie-scamcheck-search-extract.md) |
| Norton Genie | web, iOS, Android | screenshot, pasted text | OCR + link scan + ML; follow-up chat | scam / not sure + Q&A | free | Conversational follow-up after a verdict; screenshot OCR | [genie](../sources/competitors-whoscall-genie-scamcheck-search-extract.md) |
| Trend Micro ScamCheck / Scam Radar | mobile app | screenshot, text, URL, phone number; link detection inside LINE/Messenger (Android) | product detection + "Scam Radar" cross-channel tactic correlation | real-time early alerts | paid tiers | Cross-channel correlation (same scam via SMS + WhatsApp + web) | [scamcheck](../sources/competitors-whoscall-genie-scamcheck-search-extract.md) |
| AI Scam Detector | WhatsApp | messages, links, screenshots | LLM (not disclosed) | risk verdict | 5 free checks/day; ₹199/mo unlimited | Freemium daily-limit model; hashed phone numbers | [indie](../sources/competitors-indie-scam-checkers-search-extract.md) |
| SpamBlocker Extended | Android (F-Droid) | notifications from any app incl. WhatsApp, Signal, RCS, email | user regex/text rules + contacts/STIR/time rules | block/allow | free, MIT | Rule format portable to an on-device notification screener | [spamblocker](../sources/spamblocker-extended-search-extract.md) |

## Gaps none of them cover (Ààbò's opening)

1. **Nigeria-specific scam knowledge in English + Pidgin.** None of the products above is
   documented as targeting Nigerian patterns (fake transfer alerts, BVN/NIN threats, EFCC
   impersonation) ([ng scams](../sources/ng-scam-types-2026-search-extract.md)); the search found no African SME
   WhatsApp forward-to-check bot ([africa](../sources/africa-whatsapp-scam-detection-search-extract.md)).
2. **SME workflows.** Supplier "new bank account" messages are a documented SME loss path
   ([bec](../sources/bec-supplier-bank-change-search-extract.md)); consumer checkers do not model it.
3. **Automatic WhatsApp screening without a native app.** Truecaller/Whoscall need an installed
   app with OS permissions; Scamio/ScamShield need the user to forward. A linked-device
   "Guardian" that warns in the user's own chat sits between the two.
4. **Weak spots to beat:** Genie missed conversational "are you free for coffee" scams and
   returned "Not sure" on an obvious one ([genie](../sources/competitors-whoscall-genie-scamcheck-search-extract.md)).
