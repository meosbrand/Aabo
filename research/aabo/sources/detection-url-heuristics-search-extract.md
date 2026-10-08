---
capture: web-search extract (full-page fetch blocked by sandbox egress policy)
captured: 2026-10-07
query: "phishing URL detection open source library typosquatting homoglyph github"
category: community (open source)
---

# URL heuristics libraries (search extract)

Sources: https://packagist.org/packages/ipfy/homoglyph , https://openapps.pro/packages/confusable-homoglyphs , https://github.com/topics/typosquatting ,
https://aur.archlinux.org/packages/urlcrazy , https://rust-digger.code-maven.com/crates/nettfiske , https://docs.rs/crate/phishnano/0.1.1 ,
https://clickpy.clickhouse.com/dashboard/phishing-detection-engine

- ipfy/Homoglyph: checks domains against Unicode UTS #39 confusables; "not a blacklist, reputation service, DNS client, or TLD policy engine".
- confusable_homoglyphs (Python, MIT): flags strings mixing lookalike characters from other scripts; moved to SourceHut Jan 2024.
- openSquat: finds newly registered lookalike domains impersonating brands. urlcrazy: typo/variant domain generator (custom licence).
- nettfiske (Rust): watches certificate-transparency streams for homoglyph domains (last updated 2021-01-13).
- phishnano (Rust, MIT): embedded Random Forest "about 110 KB", "roughly 20 microseconds per URL", trained on PhishTank/OpenPhish feeds, runs locally.
- Suggested combination: homoglyph checker + permutation tool for brand monitoring + local classifier + reputation feed.
