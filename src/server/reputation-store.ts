/**
 * @fileoverview Prisma-backed reputation store (Indicator table) with a short in-memory
 * cache for fingerprints, plus helpers to record community reports.
 */

import { prisma } from './db';
import { reputationPolicy } from './engine-loader';
import type { Category, FingerprintEntry, IndicatorInfo, IndicatorType, ReputationStore } from '@/core/types';

const FP_TTL_MS = 60_000;

export class PrismaReputationStore implements ReputationStore {
  private fpCache: { at: number; entries: FingerprintEntry[] } | null = null;

  async lookup(type: IndicatorType, value: string): Promise<IndicatorInfo | null> {
    const row = await prisma.indicator.findUnique({ where: { type_value: { type, value } } });
    if (!row) return null;
    // Unconfirmed community entries with too few reports are too noisy to show.
    const policy = await reputationPolicy();
    if (row.source === 'community' && row.reports < policy.minReportsToShow && row.confidence < policy.confirmedAt && !row.safe) return null;
    prisma.indicator.update({ where: { id: row.id }, data: { lastSeen: new Date() } }).catch(() => undefined);
    return {
      type: row.type as IndicatorType,
      value: row.value,
      category: (row.category as Category | null) ?? null,
      source: row.source,
      confidence: row.confidence,
      reports: row.reports,
      label: row.label,
      safe: row.safe,
    };
  }

  async fingerprints(): Promise<FingerprintEntry[]> {
    if (this.fpCache && Date.now() - this.fpCache.at < FP_TTL_MS) return this.fpCache.entries;
    const rows = await prisma.indicator.findMany({
      where: { type: 'fingerprint', safe: false, confidence: { gte: 0.5 } },
      select: { value: true, category: true, label: true, confidence: true },
      take: 20_000,
      orderBy: { lastSeen: 'desc' },
    });
    const entries = rows.map((r) => ({ value: r.value, category: r.category as Category | null, label: r.label, confidence: r.confidence }));
    this.fpCache = { at: Date.now(), entries };
    return entries;
  }

  invalidate(): void {
    this.fpCache = null;
  }
}

export const reputationStore = new PrismaReputationStore();

/** Add one community report to the Indicator table (Truecaller-style aggregation). */
export async function bumpCommunityIndicator(type: IndicatorType, value: string, category?: Category | null, label?: string | null) {
  const { communityConfidence, confirmedAt } = await reputationPolicy();
  const existing = await prisma.indicator.findUnique({ where: { type_value: { type, value } } });
  if (!existing) {
    await prisma.indicator.create({
      data: { type, value, category: category ?? null, label: label ?? null, source: 'community', reports: 1, confidence: communityConfidence(1) },
    });
    return;
  }
  const reports = existing.reports + 1;
  // Confirmed / feed / curated confidence never goes down because of extra reports.
  const confidence = existing.source === 'community' && existing.confidence < confirmedAt ? communityConfidence(reports) : existing.confidence;
  await prisma.indicator.update({
    where: { id: existing.id },
    data: { reports, confidence, lastSeen: new Date(), category: existing.category ?? category ?? null },
  });
}
