/**
 * Pull free threat feeds into the reputation table:  npm run feeds:sync
 *   - OpenPhish community feed (no key, refreshed ~12h)
 *   - URLhaus recent URLs (uses URLHAUS_AUTH_KEY when set)
 *   - PhishTank verified online URLs (only when PHISHTANK_APP_KEY is set)
 * Safe to run on a schedule (e.g. every 6 hours via cron).
 */

import 'dotenv/config';
import { importFeed, parseTextFeed, pruneFeeds, type FeedEntry } from '../src/server/feeds';
import { prisma } from '../src/server/db';

async function fetchText(url: string, headers: Record<string, string> = {}): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'aabo-feed-sync/0.2', ...headers }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      console.warn(`  ${url} → HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`  ${url} → ${(err as Error).message}`);
    return null;
  }
}

async function main() {
  const batches: Array<{ name: string; entries: FeedEntry[] }> = [];

  const openphish = await fetchText('https://openphish.com/feed.txt');
  if (openphish) batches.push({ name: 'openphish', entries: parseTextFeed(openphish, 'openphish', 'phishing') });

  const urlhausKey = process.env.URLHAUS_AUTH_KEY;
  const urlhaus = await fetchText('https://urlhaus.abuse.ch/downloads/text_recent/', urlhausKey ? { 'Auth-Key': urlhausKey } : {});
  if (urlhaus) batches.push({ name: 'urlhaus', entries: parseTextFeed(urlhaus, 'urlhaus', 'malware') });

  const ptKey = process.env.PHISHTANK_APP_KEY;
  if (ptKey) {
    const pt = await fetchText(`https://data.phishtank.com/data/${encodeURIComponent(ptKey)}/online-valid.json`);
    if (pt) {
      try {
        const rows = JSON.parse(pt) as Array<{ url: string }>;
        batches.push({ name: 'phishtank', entries: rows.map((r) => ({ url: r.url, source: 'phishtank', threat: 'phishing' as const })) });
      } catch {
        console.warn('  phishtank → invalid JSON');
      }
    }
  }

  for (const b of batches) {
    const res = await importFeed(b.entries.slice(0, 20_000));
    console.log(`${b.name}: ${b.entries.length} entries → ${res.created} new, ${res.updated} refreshed indicators`);
  }
  const pruned = await pruneFeeds();
  console.log(`pruned ${pruned.count} stale feed indicators`);
  await prisma.$disconnect();
}

main();
