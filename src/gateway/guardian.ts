/**
 * @fileoverview Guardian host: scans messages arriving on a user's own WhatsApp (linked device)
 * and warns ONLY in the owner's "Message yourself" chat. It never replies to senders, never
 * sends read receipts, and stores verdict metadata only (no message text).
 *
 * What to scan and how to word the warning comes from the engine's Guardian policy; this host
 * enforces the privacy rules and the owner's alert threshold whatever the policy says.
 */

import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { GuardianMessage, GuardianPolicy, GuardianPrefs } from '@/core/engine';
import { levelAtLeast } from '@/core/levels';
import type { Level } from '@/core/types';
import { prisma } from '@/server/db';
import { analyzeInput } from '@/server/engine';
import { guardianPolicy } from '@/server/engine-loader';
import { sendPushToUser } from '@/server/push';
import { persistScan } from '@/server/scans';
import { toPublicReason } from '@/server/verdict-public';
import type { InboundMessage } from './channels/types';

const MAX_NOTICE = 1500;
const MAX_CONTEXT = 20;
const MAX_TRACKED = 5000;

interface ChatContext {
  messages: string[];
  updated: number;
}

export interface GuardianOwner {
  userId: string;
  sessionId: string;
  scanGroups: boolean;
}

export interface GuardianSink {
  /** Sends to the owner's self chat. */
  notifyOwner(text: string): Promise<void>;
}

function maskPhone(p?: string): string {
  return p ? `${p.slice(0, 7)}•••${p.slice(-2)}` : '';
}

function prune<V>(map: Map<string, V>, isStale: (v: V) => boolean) {
  if (map.size < MAX_TRACKED) return;
  for (const [k, v] of map) if (isStale(v)) map.delete(k);
}

export class GuardianHost {
  private contexts = new Map<string, ChatContext>();
  private recent = new Map<string, number>();

  constructor(private readonly policyFor: () => Promise<GuardianPolicy> = guardianPolicy) {}

  async handle(owner: GuardianOwner, msg: InboundMessage, sink: GuardianSink): Promise<void> {
    if (msg.isGroup && !owner.scanGroups) return;
    const text = msg.text?.trim() ?? '';
    if (!text && !msg.document) return;
    const policy = await this.policyFor();
    const now = Date.now();
    const size = Math.max(0, Math.min(MAX_CONTEXT, Math.floor(policy.contextSize)));

    const key = `${owner.sessionId}:${msg.chatId}`;
    const ctx = this.contexts.get(key);
    const history = ctx && now - ctx.updated < policy.contextTtlMs ? ctx.messages : [];
    if (text && size > 0) {
      prune(this.contexts, (c) => now - c.updated >= policy.contextTtlMs);
      this.contexts.set(key, { messages: [...history, text].slice(-size), updated: now });
    }

    const gm: GuardianMessage = {
      chatId: msg.chatId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderPhone: msg.senderPhone,
      text,
      isGroup: msg.isGroup,
      isForwarded: msg.isForwarded,
      document: msg.document ? { fileName: msg.document.fileName, mime: msg.document.mime } : undefined,
    };
    const proposed = policy.toScanInput(gm, history.slice(-size));
    if (!proposed) return;
    const input = { ...proposed, channel: 'guardian' as const };

    const user = await prisma.user.findUnique({
      where: { id: owner.userId },
      include: { memberships: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (!user) return;
    const orgId = user.memberships[0]?.orgId ?? null;
    const prefs: GuardianPrefs = {
      threshold: (['SUSPICIOUS', 'LIKELY_SCAM', 'DANGEROUS'].includes(user.alertThreshold) ? user.alertThreshold : 'SUSPICIOUS') as Level,
      language: user.language === 'pidgin' ? 'pidgin' : 'en',
      scanGroups: owner.scanGroups,
    };

    const verdict = await analyzeInput(input, { orgId });
    const { scanId } = await persistScan(input, verdict, { userId: user.id, orgId, storeExcerpt: false });

    // The policy can only suppress alerts below the owner's threshold, never add them.
    if (!levelAtLeast(verdict.level, prefs.threshold) || !policy.shouldAlert(verdict, prefs)) return;

    const dedupeKey = createHash('sha256').update(`${owner.sessionId}|${msg.senderId}|${verdict.contentHash}`).digest('hex');
    const last = this.recent.get(dedupeKey);
    if (last && now - last < policy.dedupeMs) return;
    prune(this.recent, (t) => now - t >= policy.dedupeMs);
    this.recent.set(dedupeKey, now);

    await sink.notifyOwner(policy.notice(verdict, gm, prefs).slice(0, MAX_NOTICE));

    const who = [msg.senderName, msg.senderPhone].filter(Boolean).join(' · ') || 'unknown sender';
    await prisma.alert.create({
      data: {
        userId: user.id,
        sessionId: owner.sessionId,
        level: verdict.level,
        score: verdict.score,
        category: verdict.category,
        sender: [msg.senderName, maskPhone(msg.senderPhone)].filter(Boolean).join(' · ') || null,
        summary: verdict.summary.en,
        reasons: verdict.reasons
          .filter((r) => r.weight > 0)
          .slice(0, 3)
          .map((r) => {
            const p = toPublicReason(r);
            return { id: p.id, text: p.text };
          }) as unknown as Prisma.InputJsonValue,
        scanId,
      },
    });
    await sendPushToUser(user.id, {
      title: `Ààbò: ${verdict.summary.en}`,
      body: `From ${who}. Open Ààbò for details.`,
      url: '/app/dashboard',
      tag: `guardian-${dedupeKey.slice(0, 8)}`,
    });
  }
}
