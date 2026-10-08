# Contributing to Ààbò

Thanks for helping protect people from scams.

## Before you open a pull request

```bash
npm run typecheck && npm run lint && npm test
npm run eval        # if you changed the community engine
```

- New community engine patterns go in `src/engines/community/signals.ts` with English **and** Pidgin explanations,
  plus labelled examples in `src/engines/community/samples.ts`. Keep false positives at 0% on the sample set.
- Never put real people's messages, phone numbers or account numbers in samples or tests — anonymise them.
- Security problems: please report privately to the maintainers instead of opening a public issue.

## Developer Certificate of Origin

By contributing you certify the [Developer Certificate of Origin 1.1](https://developercertificate.org/): you wrote
the change or have the right to submit it under this project's MIT license. Sign off each commit:

```bash
git commit -s -m "Add a signal for fake POS reversal requests"
```

which adds a `Signed-off-by: Your Name <you@example.com>` line.
