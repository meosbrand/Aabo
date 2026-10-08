/**
 * @fileoverview Production RouterServices backed by Prisma and the shared server modules.
 *
 * Two scopes:
 *  - shared: Ààbò's own bot numbers (WhatsApp linked device, Telegram)
 *  - connection: an organisation's own WhatsApp number (Developer Mode). People writing to it are
 *    kept apart from everyone else (identities are namespaced per connection), checks count against
 *    the connection's limits, scans use the organisation's AI settings, and reports wait for review
 *    instead of changing community reputation.
 */

import type { Lang } from '@/core/types';
import { securityAwarenessChatbot } from '@/server/ai/copilot';
import { prisma } from '@/server/db';
import { lookupSummary } from '@/server/lookup';
import { rateLimit } from '@/server/rate-limit-store';
import { markScanSafe, reportScan, runScan } from '@/server/scans';
import { verdictFromScan } from '@/server/verdict-from-scan';
import type { Identity, RouterServices } from './services';

const LINKED_DAILY = 200;
const DAY = 86_400_000;

export type ServicesScope =
  | { kind: 'shared' }
  | {
      kind: 'connection';
      connectionId: string;
      orgId: string;
      dailyLimitPerUser: number;
      orgDailyCap: number;
      copilotEnabled: boolean;
    };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function freeDaily(): number {
  return Number(process.env.FREE_DAILY_CHECKS ?? 20);
}

type IdentityRow = {
  id: string;
  channel: string;
  externalId: string;
  displayName: string | null;
  phone: string | null;
  userId: string | null;
  language: string;
  tipsOptIn: boolean;
  blocked: boolean;
  lastScanId: string | null;
  pendingQuizId: string | null;
  pendingQuizExpires: Date | null;
};

function toIdentity(row: IdentityRow): Identity {
  return {
    id: row.id,
    channel: row.channel,
    externalId: row.externalId,
    displayName: row.displayName,
    phone: row.phone,
    userId: row.userId,
    language: (row.language === 'pidgin' ? 'pidgin' : 'en') as Lang,
    tipsOptIn: row.tipsOptIn,
    blocked: row.blocked,
    lastScanId: row.lastScanId,
    pendingQuizId: row.pendingQuizId,
    pendingQuizExpires: row.pendingQuizExpires?.getTime() ?? null,
  };
}

/** Take one check from today's allowance without ever exceeding it, even under concurrency. */
async function takeCheck(identityId: string, limit: number): Promise<boolean> {
  const day = today();
  await prisma.channelIdentity.updateMany({ where: { id: identityId, OR: [{ checksDay: null }, { checksDay: { not: day } }] }, data: { checksDay: day, checksToday: 0 } });
  const took = await prisma.channelIdentity.updateMany({ where: { id: identityId, checksDay: day, checksToday: { lt: limit } }, data: { checksToday: { increment: 1 } } });
  return took.count === 1;
}

async function firstOrgOf(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const m = await prisma.membership.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
  return m?.orgId ?? null;
}

export function createPrismaServices(scope: ServicesScope): RouterServices {
  const conn = scope.kind === 'connection' ? scope : null;
  const orgFor = async (identity: Identity) => conn?.orgId ?? (await firstOrgOf(identity.userId));

  return {
    async getIdentity(channel, externalId, info) {
      const key = conn ? `c:${conn.connectionId}:${externalId}` : externalId;
      const row = await prisma.channelIdentity.upsert({
        where: { channel_externalId: { channel, externalId: key } },
        create: {
          channel,
          externalId: key,
          displayName: info.displayName ?? null,
          phone: info.phone ?? null,
          ...(conn ? { connectionId: conn.connectionId, address: externalId, lastInboundAt: new Date() } : {}),
        },
        update: {
          ...(info.displayName ? { displayName: info.displayName } : {}),
          ...(info.phone ? { phone: info.phone } : {}),
          ...(conn ? { lastInboundAt: new Date() } : {}),
        },
      });
      return toIdentity(row);
    },

    async updateIdentity(id, patch) {
      const { pendingQuizExpires, ...rest } = patch;
      await prisma.channelIdentity.update({
        where: { id },
        data: { ...rest, ...(pendingQuizExpires !== undefined ? { pendingQuizExpires: pendingQuizExpires === null ? null : new Date(pendingQuizExpires) } : {}) },
      });
    },

    async consumeCheck(identity) {
      const limit = conn ? conn.dailyLimitPerUser : identity.userId ? LINKED_DAILY : freeDaily();
      if (!(await takeCheck(identity.id, limit))) return { ok: false, limit };
      if (conn) {
        const org = await rateLimit(`orgchecks:${conn.orgId}`, conn.orgDailyCap, DAY);
        if (!org.ok) return { ok: false, limit };
      }
      return { ok: true, limit };
    },

    async scan(input, identity) {
      return runScan(input, {
        identityId: identity.id,
        userId: identity.userId,
        orgId: await orgFor(identity),
        storeExcerpt: true,
        connectionId: conn?.connectionId ?? null,
      });
    },

    async getVerdict(scanId) {
      const scan = await prisma.scan.findUnique({ where: { id: scanId } });
      return scan ? verdictFromScan(scan) : null;
    },

    async report(scanId, identity) {
      // Reports from an organisation's own number are kept for review (trust 0).
      return Boolean(await reportScan(scanId, { identityId: identity.id, userId: identity.userId, trust: conn ? 0 : null }));
    },

    async markSafe(scanId) {
      await markScanSafe(scanId);
    },

    async lookup(raw) {
      return lookupSummary(raw, { orgId: conn?.orgId ?? null });
    },

    async linkAccount(code, identity) {
      const row = await prisma.linkCode.findUnique({ where: { code: code.toUpperCase() } });
      if (!row || row.usedAt || row.expiresAt < new Date()) return { ok: false };
      // On an organisation's own number, only that organisation's members can link.
      if (conn) {
        const member = await prisma.membership.findUnique({ where: { userId_orgId: { userId: row.userId, orgId: conn.orgId } } });
        if (!member) return { ok: false };
      }
      const used = await prisma.linkCode.updateMany({ where: { code: row.code, usedAt: null }, data: { usedAt: new Date() } });
      if (used.count !== 1) return { ok: false };
      await prisma.$transaction([
        prisma.channelIdentity.update({ where: { id: identity.id }, data: { userId: row.userId } }),
        ...(identity.phone && identity.channel === 'whatsapp' && !conn ? [prisma.user.update({ where: { id: row.userId }, data: { phone: identity.phone } })] : []),
      ]);
      const user = await prisma.user.findUnique({ where: { id: row.userId } });
      return { ok: true, name: user?.name };
    },

    async ask(question, identity) {
      if (conn && !conn.copilotEnabled) return null;
      const history = await prisma.chatMessage.findMany({
        where: { identityId: identity.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
      });
      const { advice } = await securityAwarenessChatbot(
        {
          query: question,
          language: identity.language,
          history: history.reverse().map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        },
        { orgId: await orgFor(identity) },
      );
      await prisma.chatMessage.createMany({
        data: [
          { identityId: identity.id, userId: identity.userId, role: 'user', content: question.slice(0, 2000) },
          { identityId: identity.id, userId: identity.userId, role: 'assistant', content: advice.slice(0, 4000) },
        ],
      });
      return advice;
    },

    async recordQuiz(identity, quizId, correct) {
      await prisma.quizAttempt.create({
        data: { identityId: identity.id, userId: identity.userId, quizId, correct: correct ? 1 : 0, total: 1 },
      });
    },
  };
}

/** Services for Ààbò's own bot numbers. */
export const prismaServices = createPrismaServices({ kind: 'shared' });
