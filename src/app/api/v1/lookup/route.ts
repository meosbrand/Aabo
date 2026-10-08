/** GET /api/v1/lookup?value=08031234567 — Truecaller-style reputation lookup. */

import { NextResponse } from 'next/server';
import { normalizePhone, parseUrl } from '@/core/extract';
import { detectIdentifier } from '@/lib/scan-request';
import { apiGuard, badRequest } from '@/server/api';
import { reputationPolicy } from '@/server/engine-loader';
import { lookupIdentifier } from '@/server/scans';

export async function GET(req: Request) {
  const guard = await apiGuard(req, 'lookup', 60);
  if (guard.error) return guard.error;
  const raw = new URL(req.url).searchParams.get('value') ?? '';
  const id = detectIdentifier(raw.slice(0, 300));
  if (!id) return badRequest('value must be a phone number, 10-digit account, link, email or wallet');
  let type = id.type as string;
  let value = id.value;
  if (id.type === 'phone') value = normalizePhone(id.value) ?? id.value;
  if (id.type === 'url' || id.type === 'domain') {
    const p = parseUrl(id.value);
    if (!p) return badRequest('invalid link');
    type = 'domain';
    value = p.domain ?? p.hostname;
  }
  const [{ indicator, reports }, policy] = await Promise.all([lookupIdentifier(type as never, value), reputationPolicy()]);
  return NextResponse.json({
    type,
    value,
    reports: Math.max(reports, indicator?.reports ?? 0),
    confidence: indicator?.confidence ?? 0,
    confirmed: (indicator?.confidence ?? 0) >= policy.confirmedAt && !indicator?.safe,
    safe: Boolean(indicator?.safe),
    category: indicator?.category ?? null,
    label: indicator?.label ?? null,
  });
}
