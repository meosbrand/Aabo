import type { Scan } from '@prisma/client';
import { actionsFor, summaryFor } from '@/core/advice';
import type { Category, Level, Reason, Verdict, VerdictIndicators } from '@/core/types';
import { toPublicVerdict } from './verdict-public';

/** Rebuild a client-renderable (public) verdict from a stored scan row. */
export function verdictFromScan(scan: Scan): Verdict {
  const level = scan.level as Level;
  const category = (scan.category as Category | null) ?? null;
  const ind = scan.indicators as unknown as VerdictIndicators & { fingerprint?: string | null };
  return toPublicVerdict({
    level,
    score: scan.score,
    category,
    reasons: scan.reasons as unknown as Reason[],
    actions: actionsFor(level, category),
    summary: summaryFor(level, category),
    indicators: {
      urls: ind.urls ?? [],
      domains: ind.domains ?? [],
      phones: ind.phones ?? [],
      accounts: ind.accounts ?? [],
      emails: ind.emails ?? [],
      wallets: ind.wallets ?? [],
    },
    usedLlm: scan.usedLlm,
    fingerprint: null,
    contentHash: scan.contentHash,
  });
}
