/**
 * @fileoverview Fixed-window counters stored in the database (work across processes).
 * No Next.js imports: shared by the web app and the gateway.
 */

import { prisma } from './db';

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: Date;
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = new Date();
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  if (!row || row.resetAt <= now) {
    const resetAt = new Date(now.getTime() + windowMs);
    await prisma.rateLimit.upsert({ where: { key }, create: { key, count: 1, resetAt }, update: { count: 1, resetAt } });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  if (row.count >= limit) return { ok: false, remaining: 0, resetAt: row.resetAt };
  await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return { ok: true, remaining: limit - row.count - 1, resetAt: row.resetAt };
}
