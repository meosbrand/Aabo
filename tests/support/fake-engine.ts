/**
 * A tiny deterministic engine for testing the app shell (router, services, Guardian host)
 * independently of any real detection engine.
 */

import { ENGINE_API_VERSION, type ScanEngine } from '../../src/core/engine';
import { extract } from '../../src/core/extract';
import { contentHashOf } from '../../src/core/hash';
import { LEVEL_MIN_SCORE, maxLevel } from '../../src/core/levels';
import type { Category, Level, Reason } from '../../src/core/types';

interface FakeRule {
  test: (t: string, fileName?: string) => boolean;
  level: Level;
  category: Category;
  en: string;
  pidgin: string;
}

const RULES: FakeRule[] = [
  { test: (t) => /\b(code|otp)\b/.test(t) && /\b(send|forward)\b/.test(t), level: 'DANGEROUS', category: 'account_takeover', en: 'Asks you to pass on a one-time code.', pidgin: 'E dey ask make you send code.' },
  { test: (_t, f) => Boolean(f && /\.apk$/i.test(f)), level: 'DANGEROUS', category: 'malware', en: 'This is an app/program file.', pidgin: 'Na app/program file.' },
  { test: (t) => /processing fee|appointment letter/.test(t), level: 'LIKELY_SCAM', category: 'job', en: 'Pay-to-get-hired job offer.', pidgin: 'Job wey dem dey collect money.' },
  { test: (t) => /secure-login|free-data/.test(t), level: 'LIKELY_SCAM', category: 'phishing', en: 'Fake login or giveaway link.', pidgin: 'Fake link.' },
  { test: (t) => /\befcc\b|warrant of arrest/.test(t), level: 'DANGEROUS', category: 'impersonation', en: 'Pretends to be law enforcement asking for money.', pidgin: 'E dey pretend say na police.' },
  { test: (t) => /\bblocked\b|reactivation fee/.test(t), level: 'LIKELY_SCAM', category: 'phishing', en: 'Threatens to block your account.', pidgin: 'E dey threaten to block your account.' },
];

export function createFakeEngine(): ScanEngine {
  return {
    id: 'fake',
    version: '0.0.1',
    apiVersion: ENGINE_API_VERSION,
    async analyze(input, deps) {
      const x = extract({ text: input.text, url: input.url, phone: input.phone, account: input.account });
      const reasons: Reason[] = [];
      let level: Level = 'SAFE';
      let category: Category | null = null;
      for (const [i, r] of RULES.entries()) {
        if (!r.test(x.text, input.fileName)) continue;
        reasons.push({ id: `fake.rule${i}`, weight: 0.8, source: 'rule', category: r.category, floor: r.level, text: { en: r.en, pidgin: r.pidgin } });
        if (maxLevel(level, r.level) !== level) category = r.category;
        level = maxLevel(level, r.level);
      }
      for (const phone of x.phones) {
        const info = await deps.reputation?.lookup('phone', phone);
        if (!info || info.safe) continue;
        const confirmed = info.confidence >= 0.85;
        const lv: Level = confirmed ? 'DANGEROUS' : 'SUSPICIOUS';
        reasons.push({
          id: 'fake.rep.phone',
          weight: confirmed ? 0.9 : 0.3,
          source: 'reputation',
          category: info.category ?? undefined,
          text: { en: `The number ${phone} is a ${confirmed ? 'confirmed scam' : 'reported number'}.`, pidgin: `This number ${phone} na ${confirmed ? 'confirmed scam' : 'number wey people report'}.` },
        });
        if (maxLevel(level, lv) !== level) category = info.category ?? category;
        level = maxLevel(level, lv);
      }
      return {
        level,
        score: level === 'SAFE' ? 0 : LEVEL_MIN_SCORE[level] + 10,
        category: level === 'SAFE' ? null : category,
        reasons,
        actions: [],
        summary: { en: '', pidgin: '' },
        indicators: {
          urls: x.urls.map((u) => u.href),
          domains: [...new Set(x.urls.map((u) => u.domain ?? u.hostname))],
          phones: x.phones,
          accounts: x.accounts,
          emails: x.emails,
          wallets: x.wallets,
        },
        usedLlm: false,
        fingerprint: null,
        contentHash: contentHashOf(input),
      };
    },
  };
}
