'use server';

import type { Verdict } from '@/core/types';
import { detectIdentifier, IMAGE_MIMES, MAX_IMAGE_BYTES } from '@/lib/scan-request';
import { lookupSummary, type LookupSummary } from '@/server/lookup';
import { clientIp, rateLimit } from '@/server/rate-limit';
import { markScanSafe, reportScan, runScan } from '@/server/scans';
import { getSessionUser } from '@/server/session';
import { toPublicVerdict } from '@/server/verdict-public';

export type CheckResult =
  | { ok: true; scanId: string; verdict: Verdict; seenCount: number }
  | { ok: false; error: string };

const HOUR = 3_600_000;

export async function checkAction(formData: FormData): Promise<CheckResult> {
  const text = String(formData.get('text') ?? '').slice(0, 6000);
  const context = String(formData.get('context') ?? '').slice(0, 200) || undefined;
  const file = formData.get('screenshot');

  let imageBase64: string | undefined;
  let imageMime: string | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'Screenshot is too large (max 5 MB).' };
    if (!(IMAGE_MIMES as readonly string[]).includes(file.type)) return { ok: false, error: 'Please upload a PNG, JPG or WEBP screenshot.' };
    imageBase64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    imageMime = file.type;
  }
  if (!text.trim() && !imageBase64) return { ok: false, error: 'Paste a message, link or number — or add a screenshot.' };

  const limit = await rateLimit(`check:${await clientIp()}`, 40, HOUR);
  if (!limit.ok) return { ok: false, error: 'Too many checks from your network. Please try again in a little while.' };

  const user = await getSessionUser();
  const res = await runScan(
    { text, context, imageBase64, imageMime, channel: 'web' },
    { userId: user?.id, orgId: user?.orgId, storeExcerpt: true },
  );
  return { ok: true, scanId: res.scanId, verdict: toPublicVerdict(res.verdict), seenCount: res.seenCount };
}

export async function reportAction(scanId: string, note?: string): Promise<{ ok: boolean; error?: string }> {
  const limit = await rateLimit(`report:${await clientIp()}`, 20, HOUR);
  if (!limit.ok) return { ok: false, error: 'Too many reports. Please try again later.' };
  const user = await getSessionUser();
  const scan = await reportScan(scanId, { userId: user?.id }, note?.slice(0, 500));
  return scan ? { ok: true } : { ok: false, error: 'Scan not found.' };
}

export async function safeAction(scanId: string): Promise<{ ok: boolean }> {
  await markScanSafe(scanId);
  return { ok: true };
}

export type LookupResult = ({ ok: true } & LookupSummary) | { ok: false; error: string };

export async function lookupAction(raw: string): Promise<LookupResult> {
  if (!detectIdentifier(raw.slice(0, 300))) {
    return { ok: false, error: 'Enter a phone number, 10-digit account number, link, email or wallet.' };
  }
  const limit = await rateLimit(`lookup:${await clientIp()}`, 60, HOUR);
  if (!limit.ok) return { ok: false, error: 'Too many lookups. Please try again later.' };
  const user = await getSessionUser();
  const res = await lookupSummary(raw, { orgId: user?.orgId });
  return res ? { ok: true, ...res, verdict: toPublicVerdict(res.verdict) } : { ok: false, error: 'That does not look like a valid number, account or link.' };
}
