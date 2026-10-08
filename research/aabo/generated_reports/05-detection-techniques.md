# 05 · Detection techniques

## What the evidence says

- **LLMs alone are not enough.** Best models reached ~64–65% micro-F1 on a real-world scam
  benchmark; prompting helps small models; LLMs generalise to unfamiliar scam types better than
  fine-tuned BERT ([llm](../sources/detection-llm-research-search-extract.md)).
- **Link-centric scams are easy, conversational ones are hard** ("LLM precision is insufficient
  for real-world deployment in mobile messaging contexts") ([llm](../sources/detection-llm-research-search-extract.md)).
  Genie also missed "are you free for coffee" style openers ([genie](../sources/competitors-whoscall-genie-scamcheck-search-extract.md)).
- **Adversarial rewording** (synonym substitution) fools LLMs ([llm](../sources/detection-llm-research-search-extract.md)).
- **Layering works in production:** ScamShield = similar-message/number/URL match → report
  counts → ML classifier ([scamshield](../sources/competitors-scamshield-checkmate-search-extract.md)); Whoscall =
  own DB + police DB + Scamadviser ([whoscall](../sources/competitors-whoscall-genie-scamcheck-search-extract.md)).

## Ààbò pipeline (cheap → expensive)

| Layer | Technique | Borrowed from | Source |
|---|---|---|---|
| 1 Normalise/extract | NFKC, zero-width removal, de-obfuscation (`hxxp`, `[.]`), Nigerian phone/NUBAN/amount extraction | homoglyph tooling | [url](../sources/detection-url-heuristics-search-extract.md) |
| 2 Rules | weighted regex rules per category, English + Pidgin explanations | SpamBlocker text rules; ScamShield | [spamblocker](../sources/spamblocker-extended-search-extract.md) |
| 3 URL heuristics | punycode/mixed script, brand lookalike (edit distance), brand-in-subdomain, shorteners, risky TLDs, raw IPs | ipfy/Homoglyph, openSquat, phishnano | [url](../sources/detection-url-heuristics-search-extract.md) |
| 4 Reputation feeds | Google Safe Browsing (free), URLhaus (free Auth-Key), OpenPhish community, PhishTank | — | [feeds](../sources/detection-feeds-search-extract.md) |
| 5 Crowd reputation | reports on numbers/accounts/domains, reviewer confirmation | Truecaller, CheckMate | [truecaller](../sources/competitors-truecaller-search-extract.md) |
| 6 Similar-message match | near-duplicate fingerprints of confirmed scams | ScamShield, FRAUDAPT (embeddings) | [indie](../sources/competitors-indie-scam-checkers-search-extract.md) |
| 7 LLM | an OpenAI-compatible model for grey-zone cases, screenshots (OCR) and Guardian conversation context; never lowers a hard-rule verdict | Genie, Scamio | [scamio](../sources/competitors-scamio-search-extract.md) |

## Datasets for evaluation

Nigerian SMS-Spam-Dataset (5,240 texts) and MOZ-Smishing are the closest African corpora;
both are general spam or non-English, so Ààbò evaluates its engines on its own labelled Nigerian
messages (`npm run eval`) ([datasets](../sources/datasets-search-extract.md)).
