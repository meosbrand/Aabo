/**
 * @fileoverview Daily cap on platform-paid AI calls per organisation (BYOK calls are not capped).
 */

import { rateLimit } from '../rate-limit-store';
import type { AiConfig } from './config';

const DAY = 86_400_000;

function cap(name: string, fallback: number): number {
  const n = Number(process.env[name] ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

/** Counts one platform call; false when today's allowance is used up (0 means unlimited). */
export async function withinPlatformCap(cfg: AiConfig): Promise<boolean> {
  if (cfg.source !== 'platform') return true;
  const limit = cfg.orgId ? cap('AI_PLATFORM_DAILY_CALLS_PER_ORG', 500) : cap('AI_PLATFORM_DAILY_CALLS_PUBLIC', 2000);
  if (limit <= 0) return true;
  const res = await rateLimit(`ai:${cfg.orgId ?? 'public'}`, limit, DAY).catch(() => ({ ok: true }));
  return res.ok;
}
