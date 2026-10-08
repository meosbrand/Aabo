/**
 * @fileoverview Production RouterServices backed by Prisma and the shared server modules.
 */

import { securityAwarenessChatbot } from '@/server/ai/copilot';
import type { Lang } from '@/core/types';
import { prisma } from '@/server/db';
import { lookupSummary } from '@/server/lookup';
import { markScanSafe, reportScan, runScan } from '@/server/scans';
import { verdictFromScan } from '@/server/verdict-from-scan';
import type { Identity, RouterServices } from './services';

const FREE_DAILY = Number(process.env.FREE_DAILY_CHECKS ?? 20);
const LINKED_DAILY = 200;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toIdentity(row: {
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
}): Identity {
  return { ...row, language: (row.language === 'pidgin' ? 'pidgin' : 'en') as Lang };
}

export const prismaServices: RouterServices = {
  async getIdentity(channel, externalId, info) {
    const row = await prisma.channelIdentity.upsert({
      where: { channel_externalId: { channel, externalId } },
      create: { channel, externalId, displayName: info.displayName ?? null, phone: info.phone ?? null },
      update: {
        ...(info.displayName ? { displayName: info.displayName } : {}),
        ...(info.phone ? { phone: info.phone } : {}),
      },
    });
    return toIdentity(row);
  },

  async updateIdentity(id, patch) {
    await prisma.channelIdentity.update({ where: { id }, data: patch });
  },

  async consumeCheck(identity) {
    const limit = identity.userId ? LINKED_DAILY : FREE_DAILY;
    const row = await prisma.channelIdentity.findUnique({ where: { id: identity.id } });
    if (!row) return { ok: false, limit };
    const used = row.checksDay === today() ? row.checksToday : 0;
    if (used >= limit) return { ok: false, limit };
    await prisma.channelIdentity.update({ where: { id: identity.id }, data: { checksDay: today(), checksToday: used + 1 } });
    return { ok: true, limit };
  },

  async scan(input, identity) {
    let orgId: string | null = null;
    if (identity.userId) {
      const m = await prisma.membership.findFirst({ where: { userId: identity.userId }, orderBy: { createdAt: 'asc' } });
      orgId = m?.orgId ?? null;
    }
    return runScan(input, { identityId: identity.id, userId: identity.userId, orgId, storeExcerpt: true });
  },

  async getVerdict(scanId) {
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    return scan ? verdictFromScan(scan) : null;
  },

  async report(scanId, identity) {
    return Boolean(await reportScan(scanId, { identityId: identity.id, userId: identity.userId }));
  },

  async markSafe(scanId) {
    await markScanSafe(scanId);
  },

  lookup: lookupSummary,

  async linkAccount(code, identity) {
    const row = await prisma.linkCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!row || row.usedAt || row.expiresAt < new Date()) return { ok: false };
    await prisma.$transaction([
      prisma.linkCode.update({ where: { code: row.code }, data: { usedAt: new Date() } }),
      prisma.channelIdentity.update({ where: { id: identity.id }, data: { userId: row.userId } }),
      ...(identity.phone && identity.channel === 'whatsapp'
        ? [prisma.user.update({ where: { id: row.userId }, data: { phone: identity.phone } })]
        : []),
    ]);
    const user = await prisma.user.findUnique({ where: { id: row.userId } });
    return { ok: true, name: user?.name };
  },

  async ask(question, identity) {
    const history = await prisma.chatMessage.findMany({
      where: { identityId: identity.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    const membership = identity.userId
      ? await prisma.membership.findFirst({ where: { userId: identity.userId }, orderBy: { createdAt: 'asc' } })
      : null;
    const { advice } = await securityAwarenessChatbot(
      {
        query: question,
        language: identity.language,
        history: history.reverse().map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      },
      { orgId: membership?.orgId ?? null },
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
