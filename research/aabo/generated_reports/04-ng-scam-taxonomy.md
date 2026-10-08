# 04 · Nigerian scam taxonomy

Each category lists the documented tell and its source. How the detection engine covers each
category is documented with the engine, not in this public report.

| Category | Documented pattern | Source |
|---|---|---|
| WhatsApp account hijack | Victim tricked into reading out/forwarding the 6-digit activation code; hijacked account then asks contacts for money or pushes investment schemes; fake pairing pages | [hijack](../sources/ng-whatsapp-hijack-search-extract.md) |
| Fake transfer alert / "transfer successful" screen | App-generated fake alerts; customer pleads for goods before the real alert arrives; wrong-PIN trick | [pos](../sources/ng-pos-fake-alert-search-extract.md) |
| Card reversal / overpayment | "reverse the money" to another account | [pos](../sources/ng-pos-fake-alert-search-extract.md) |
| Brand giveaway impersonation | Paga WhatsApp cash-reward campaign (2026); "free data and ₦5,000 airtime" phishing (NCC-CSIRT, Aug 2026) | [pos](../sources/ng-pos-fake-alert-search-extract.md), [hijack](../sources/ng-whatsapp-hijack-search-extract.md) |
| BVN/NIN deactivation threat | "your BVN is about to be deactivated", request for verification details | [types](../sources/ng-scam-types-2026-search-extract.md) |
| EFCC / police impersonation | pressure to pay "fines" or "bail" by transfer; EFCC does not demand payment by phone/messaging | [types](../sources/ng-scam-types-2026-search-extract.md) |
| Ponzi / crypto doubling | CBEX: "100 percent profit in 30 days", then "deposit verification" fee to withdraw | [types](../sources/ng-scam-types-2026-search-extract.md) |
| Fake loan apps | APKs (e.g. counterfeit OKash/FairMoney) shared via WhatsApp; contact-list harassment | [types](../sources/ng-scam-types-2026-search-extract.md) |
| Fake jobs / recruitment | fake FAAN offer letters (Aug 2026); EFCC "not hiring"; overseas job trafficking; upfront payments | [types](../sources/ng-scam-types-2026-search-extract.md) |
| Admission / NYSC / JAMB "assistance" | fees to "secure" placements | [types](../sources/ng-scam-types-2026-search-extract.md) |
| Supplier bank-detail change (BEC) | "new account number" on a regular supplier invoice; instant transfer makes recovery near impossible; often no link | [bec](../sources/bec-supplier-bank-change-search-extract.md) |
| Generic social engineering | urgency, secrecy, authority, reward bait (also highlighted by Sentinel AI) | [indie](../sources/competitors-indie-scam-checkers-search-extract.md) |

## Advice that the sources agree on (used in verdict "what to do now")

- Confirm any payment **inside your bank app** or with the bank before releasing goods/cash
  ([pos](../sources/ng-pos-fake-alert-search-extract.md)).
- Never share a WhatsApp code; turn on **two-step verification** (Settings › Account ›
  Two-step verification); if hijacked: log out of all devices, reinstall, request a new code,
  enable 2-step, warn groups via another app ([hijack](../sources/ng-whatsapp-hijack-search-extract.md)).
- Verify any change of bank details through a **second channel** (call a number you already
  have) ([bec](../sources/bec-supplier-bank-change-search-extract.md)).
- Legitimate employers and agencies do not demand upfront payment
  ([types](../sources/ng-scam-types-2026-search-extract.md)).

## Gaps

- "Task scams" (paid online tasks) were not confirmed by the retrieved Nigerian sources, although
  the pattern (a fee to unlock earnings) is generic and widely reported elsewhere.
- No primary ngCERT/EFCC statistics were retrievable; figures in 00 are vendor telemetry.
