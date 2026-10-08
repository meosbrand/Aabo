/**
 * @fileoverview Fixed-window counters stored in the database (work across processes).
 * Atomic: concurrent requests can never push a counter past its limit.
 * No Next.js imports: shared by the web app and the gateway.
 */

import { Prisma } from '@prisma/client';
import { prisma } from './db';

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: Date;
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  // 1. Make sure the row exists (a concurrent create is fine).
  await prisma.rateLimit.create({ data: { key, count: 0, resetAt } }).catch((err: unknown) => {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
  });
  // 2. Start a new window if the old one is over.
  await prisma.rateLimit.updateMany({ where: { key, resetAt: { lte: now } }, data: { count: 0, resetAt } });
  // 3. Take one unit only while under the limit.
  const took = await prisma.rateLimit.updateMany({ where: { key, count: { lt: limit } }, data: { count: { increment: 1 } } });
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  return { ok: took.count === 1, remaining: Math.max(0, limit - (row?.count ?? limit)), resetAt: row?.resetAt ?? resetAt };
}
