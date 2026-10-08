/**
 * @fileoverview Truecaller-style identifier lookup shared by the web page, API and chat bots.
 */

import { normalizePhone, parseUrl } from '@/core/extract';
import type { IndicatorType, Verdict } from '@/core/types';
import { detectIdentifier } from '@/lib/scan-request';
import { analyzeInput } from './engine';
import { reputationPolicy } from './engine-loader';
import { lookupIdentifier } from './scans';

export interface LookupSummary {
  type: string;
  value: string;
  reports: number;
  confirmed: boolean;
  safe: boolean;
  category: string | null;
  label: string | null;
  verdict: Verdict;
}

export async function lookupSummary(raw: string, opts: { orgId?: string | null } = {}): Promise<LookupSummary | null> {
  const id = detectIdentifier(raw.slice(0, 300));
  if (!id) return null;
  let type: IndicatorType = id.type === 'url' ? 'domain' : (id.type as IndicatorType);
  let value = id.value;
  if (id.type === 'phone') value = normalizePhone(id.value) ?? id.value;
  if (id.type === 'url' || id.type === 'domain') {
    const parsed = parseUrl(id.value);
    if (!parsed) return null;
    type = 'domain';
    value = parsed.domain ?? parsed.hostname;
  }
  const [{ indicator, reports }, verdict, policy] = await Promise.all([
    lookupIdentifier(type, value),
    analyzeInput(
      {
        channel: 'web',
        text: id.type === 'url' || id.type === 'domain' ? id.value : undefined,
        phone: id.type === 'phone' ? id.value : undefined,
        account: id.type === 'account' ? id.value : undefined,
      },
      { orgId: opts.orgId, llmMode: 'never' },
    ),
    reputationPolicy(),
  ]);
  return {
    type,
    value,
    reports: Math.max(reports, indicator?.reports ?? 0),
    confirmed: (indicator?.confidence ?? 0) >= policy.confirmedAt && !indicator?.safe,
    safe: Boolean(indicator?.safe),
    category: indicator?.category ?? null,
    label: indicator?.label ?? null,
    verdict,
  };
}
