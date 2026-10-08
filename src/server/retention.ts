/**
 * @fileoverview Data retention (NDPA data minimisation): drop message excerpts after 30 days,
 * delete scans after 180 days, and clear expired caches, rate-limit rows and link codes.
 */

import { prisma } from './db';

const DAY = 86_400_000;

export async function runRetention(now = Date.now()) {
  const [excerpts, scans, cache, limits, codes] = await Promise.all([
    prisma.scan.updateMany({ where: { createdAt: { lt: new Date(now - 30 * DAY) }, excerpt: { not: null } }, data: { excerpt: null } }),
    prisma.scan.deleteMany({ where: { createdAt: { lt: new Date(now - 180 * DAY) } } }),
    prisma.intelCache.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(now) } } }),
    prisma.linkCode.deleteMany({ where: { expiresAt: { lt: new Date(now - DAY) } } }),
  ]);
  return { excerpts: excerpts.count, scans: scans.count, cache: cache.count, limits: limits.count, codes: codes.count };
}
