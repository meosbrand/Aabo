/**
 * @fileoverview Data retention (NDPA data minimisation): drop message excerpts after 30 days,
 * delete scans after 180 days, clear webhook payloads as soon as they are handled (and delete the
 * events after 7 days), keep the Developer audit log for a year, and clear expired caches,
 * rate-limit rows and link codes.
 */

import { prisma } from './db';

const DAY = 86_400_000;

export async function runRetention(now = Date.now()) {
  const [excerpts, scans, cache, limits, codes, payloads, stale, events, audit] = await Promise.all([
    prisma.scan.updateMany({ where: { createdAt: { lt: new Date(now - 30 * DAY) }, excerpt: { not: null } }, data: { excerpt: null } }),
    prisma.scan.deleteMany({ where: { createdAt: { lt: new Date(now - 180 * DAY) } } }),
    prisma.intelCache.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(now) } } }),
    prisma.linkCode.deleteMany({ where: { expiresAt: { lt: new Date(now - DAY) } } }),
    prisma.inboundEvent.updateMany({ where: { status: { in: ['done', 'failed', 'skipped'] }, payload: { not: null } }, data: { payload: null } }),
    prisma.inboundEvent.updateMany({
      where: { status: { in: ['pending', 'processing'] }, createdAt: { lt: new Date(now - DAY) } },
      data: { status: 'failed', payload: null, error: 'expired' },
    }),
    prisma.inboundEvent.deleteMany({ where: { createdAt: { lt: new Date(now - 7 * DAY) } } }),
    prisma.auditEvent.deleteMany({ where: { createdAt: { lt: new Date(now - 365 * DAY) } } }),
  ]);
  return {
    excerpts: excerpts.count,
    scans: scans.count,
    cache: cache.count,
    limits: limits.count,
    codes: codes.count,
    inboundPayloads: payloads.count + stale.count,
    inboundEvents: events.count,
    audit: audit.count,
  };
}
