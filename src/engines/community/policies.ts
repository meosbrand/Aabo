/**
 * @fileoverview Community defaults for feed imports.
 * Only exact URLs from threat feeds become indicators; whole domains are never blocked.
 */

import type { FeedPolicy } from '@/core/engine';
import { parseUrl } from '@/core/extract';

export const COMMUNITY_FEED_POLICY: FeedPolicy = {
  indicators(entry) {
    const p = parseUrl(entry.url);
    if (!p) return [];
    return [
      {
        type: 'url',
        value: p.href,
        category: entry.threat === 'malware' ? 'malware' : 'phishing',
        source: `feed:${entry.source}`,
        confidence: 0.9,
      },
    ];
  },
  pruneAfterDays: 30,
};
