/**
 * @fileoverview Scan + report services used by web pages, the public API and the gateway.
 */

import type { Prisma } from '@prisma/client';
import { levelAtLeast } from '@/core/levels';
import type { Category, IndicatorType, ScanInput, Verdict, VerdictIndicators } from '@/core/types';
import { prisma } from './db';
import { analyzeInput } from './engine';
import { bumpCommunityIndicator, reputationStore } from './reputation-store';

export interface ScanOptions {
  userId?: string | null;
  orgId?: string | null;
  identityId?: string | null;
  /** Store a short redacted excerpt (user-initiated checks). Never for Guardian scans. */
  storeExcerpt?: boolean;
}

export interface ScanResult {
  scanId: string;
  verdict: Verdict;
  /** How many times this exact content was checked in the last 30 days (including this one). */
  seenCount: number;
}

/** Mask codes, account and card numbers before storing an excerpt. */
export function redact(text: string): string {
  return text
    .replace(/\b(\d{3})[- ]?(\d{3})\b/g, '•••-•••')
    .replace(/\b(\d{2})\d{6}(\d{2})\b/g, '$1••••••$2')
    .replace(/\b(\d{4})\d{8,11}(\d{4})\b/g, '$1••••$2')
    .slice(0, 280);
}

function inputType(input: ScanInput): string {
  if (input.fileName) return 'file';
  if (input.imageBase64) return 'image';
  if (input.text?.trim()) return 'text';
  if (input.url) return 'url';
  if (input.phone) return 'phone';
  if (input.account) return 'account';
  return 'text';
}

export async function runScan(input: ScanInput, opts: ScanOptions = {}): Promise<ScanResult> {
  const verdict = await analyzeInput(input, { orgId: opts.orgId });
  return persistScan(input, verdict, opts);
}

/** Store a verdict. Guardian scans (other people's messages) never keep any message text. */
export async function persistScan(input: ScanInput, verdict: Verdict, opts: ScanOptions = {}): Promise<ScanResult> {
  const storeExcerpt = input.channel !== 'guardian' && opts.storeExcerpt !== false;
  const since = new Date(Date.now() - 30 * 86_400_000);
  const previous = await prisma.scan.count({ where: { contentHash: verdict.contentHash, createdAt: { gte: since } } });
  const excerptSource = input.text?.trim() || verdict.ocrText || input.url || input.phone || input.account || input.fileName || '';
  const scan = await prisma.scan.create({
    data: {
      channel: input.channel,
      inputType: inputType(input),
      contentHash: verdict.contentHash,
      excerpt: storeExcerpt ? redact(excerptSource) : null,
      level: verdict.level,
      score: verdict.score,
      category: verdict.category,
      reasons: verdict.reasons as unknown as Prisma.InputJsonValue,
      indicators: { ...verdict.indicators, fingerprint: verdict.fingerprint } as unknown as Prisma.InputJsonValue,
      usedLlm: verdict.usedLlm,
      userId: opts.userId ?? null,
      orgId: opts.orgId ?? null,
      identityId: opts.identityId ?? null,
    },
  });
  return { scanId: scan.id, verdict, seenCount: previous + 1 };
}

export async function getScan(id: string) {
  return prisma.scan.findUnique({ where: { id } });
}

export interface ReportInput {
  type: IndicatorType | 'message';
  value: string;
  category?: Category | null;
  note?: string;
  excerpt?: string;
  scanId?: string;
  reporterUserId?: string | null;
  reporterIdentityId?: string | null;
}

/** Record a community report and aggregate it into the reputation table. */
export async function submitReport(input: ReportInput) {
  const report = await prisma.report.create({
    data: {
      type: input.type,
      value: input.value,
      category: input.category ?? null,
      note: input.note?.slice(0, 500) ?? null,
      excerpt: input.excerpt ? redact(input.excerpt) : null,
      scanId: input.scanId ?? null,
      reporterUserId: input.reporterUserId ?? null,
      reporterIdentityId: input.reporterIdentityId ?? null,
    },
  });
  if (input.type !== 'message') await bumpCommunityIndicator(input.type, input.value, input.category ?? null);
  return report;
}

/**
 * Report everything in a scan: the message fingerprint and each identifier in it.
 * Domains the engine recognised as legitimate are skipped so a scam that quotes a bank's
 * real website doesn't taint it.
 */
export async function reportScan(scanId: string, reporter: { userId?: string | null; identityId?: string | null }, note?: string) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) return null;
  const ind = scan.indicators as unknown as Partial<VerdictIndicators> & { fingerprint?: string | null };
  const trusted = new Set(ind.trustedDomains ?? []);
  const category = (scan.category as Category | null) ?? null;
  const base = { category, scanId, reporterUserId: reporter.userId, reporterIdentityId: reporter.identityId, note };

  await submitReport({ ...base, type: 'message', value: scan.contentHash, excerpt: scan.excerpt ?? undefined });
  if (ind.fingerprint) await submitReport({ ...base, type: 'fingerprint', value: ind.fingerprint });
  for (const v of ind.phones ?? []) await submitReport({ ...base, type: 'phone', value: v });
  for (const v of ind.accounts ?? []) await submitReport({ ...base, type: 'account', value: v });
  for (const v of ind.wallets ?? []) await submitReport({ ...base, type: 'wallet', value: v });
  for (const v of ind.domains ?? []) if (!trusted.has(v)) await submitReport({ ...base, type: 'domain', value: v });
  await prisma.scan.update({ where: { id: scanId }, data: { feedback: 'scam' } });
  reputationStore.invalidate();
  return scan;
}

export async function markScanSafe(scanId: string) {
  return prisma.scan.update({ where: { id: scanId }, data: { feedback: 'safe' } }).catch(() => null);
}

/** Truecaller-style lookup for one identifier, with counts from reports. */
export async function lookupIdentifier(type: IndicatorType, value: string) {
  const indicator = await prisma.indicator.findUnique({ where: { type_value: { type, value } } });
  const reports = await prisma.report.count({ where: { type, value, status: { not: 'REJECTED' } } });
  return { indicator, reports };
}

export function isFlagged(v: Verdict): boolean {
  return levelAtLeast(v.level, 'LIKELY_SCAM');
}
