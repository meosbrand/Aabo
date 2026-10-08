/**
 * @fileoverview Imports free phishing/malware URL feeds into the Indicator table.
 * Which indicators a feed entry produces is decided by the engine's feed policy; the community
 * policy stores exact URLs only.
 */

import type { FeedEntry, FeedPolicy } from '@/core/engine';
import { prisma } from './db';
import { feedPolicy } from './engine-loader';

export type { FeedEntry };

/** Parse a plain-text feed (one URL per line, # comments). */
export function parseTextFeed(body: string, source: string, threat: FeedEntry['threat']): FeedEntry[] {
  return body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && /^https?:\/\//i.test(l))
    .map((url) => ({ url, source, threat }));
}

/**
 * Upsert the indicators each entry produces. Existing indicators only get `lastSeen` refreshed:
 * feeds never lower a confidence, overwrite a category or touch an indicator marked safe.
 */
export async function importFeed(entries: FeedEntry[], policy?: FeedPolicy): Promise<{ created: number; updated: number }> {
  const p = policy ?? (await feedPolicy());
  let created = 0;
  let updated = 0;
  const seen = new Set<string>();
  for (const e of entries) {
    for (const seed of p.indicators(e)) {
      if (!seed.source.startsWith('feed:')) continue;
      const key = `${seed.type}:${seed.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const existing = await prisma.indicator.findUnique({ where: { type_value: { type: seed.type, value: seed.value } } });
      if (!existing) {
        await prisma.indicator.create({
          data: {
            type: seed.type,
            value: seed.value,
            category: seed.category ?? null,
            source: seed.source,
            confidence: Math.max(0, Math.min(1, seed.confidence)),
            label: seed.label ?? null,
          },
        });
        created++;
      } else if (!existing.safe) {
        await prisma.indicator.update({ where: { id: existing.id }, data: { lastSeen: new Date() } });
        updated++;
      }
    }
  }
  return { created, updated };
}

/** Forget feed entries not seen for `days` (feeds churn fast). */
export async function pruneFeeds(days?: number) {
  const keep = days ?? (await feedPolicy()).pruneAfterDays;
  const cutoff = new Date(Date.now() - keep * 86_400_000);
  return prisma.indicator.deleteMany({ where: { source: { startsWith: 'feed:' }, lastSeen: { lt: cutoff } } });
}
