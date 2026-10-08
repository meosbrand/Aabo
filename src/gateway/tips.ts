/**
 * Opt-in daily tip broadcast (people who sent "tips on"). Slow and small on purpose:
 * one message every few seconds, only to users who asked, to stay far from bulk-messaging limits.
 *
 * Organisations' own numbers (official WhatsApp API) only get tips when the organisation turned
 * them on, and only for people who wrote within the last 23 hours: outside WhatsApp's 24-hour
 * window a free-form message would need a paid template.
 */

import { tipOfTheDay } from '@/core/awareness/content';
import { CloudWhatsAppAdapter } from '@/server/channels/cloud/adapter';
import { connectionById } from '@/server/channels/cloud/connections';
import { CloudError } from '@/server/channels/cloud/types';
import { prisma } from '@/server/db';
import { logError } from '@/server/log';
import type { ChannelAdapter } from './channels/types';

const LAGOS_TIP_HOUR = 9;
const WINDOW_MS = 23 * 3_600_000;
const MAX_FAILURES = 3;

export interface TipOptions {
  /** Pause between messages (ms). */
  gapMs?: number;
  now?: number;
}

function lagosNow(now: number): { hour: number; day: string } {
  const t = new Date(now + 60 * 60_000); // WAT = UTC+1, no DST
  return { hour: t.getUTCHours(), day: t.toISOString().slice(0, 10) };
}

function tipText(language: string, tip: { en: string; pidgin: string }): string {
  const p = language === 'pidgin';
  return `💡 *Tip of the day*\n${p ? tip.pidgin : tip.en}\n\n_${p ? 'Send *stop* to off am.' : 'Send *stop* to unsubscribe.'}_`;
}

/** Claim today's run for a key (true once per day). */
async function claim(key: string, now: number): Promise<boolean> {
  try {
    await prisma.intelCache.create({ data: { key, value: { startedAt: new Date(now).toISOString() }, expiresAt: new Date(now + 3 * 86_400_000) } });
    return true;
  } catch {
    return false;
  }
}

async function noteFailure(identityId: string, now: number): Promise<void> {
  const key = `tipfail:${identityId}`;
  const row = await prisma.intelCache.findUnique({ where: { key } });
  const count = ((row?.value as { count?: number } | undefined)?.count ?? 0) + 1;
  await prisma.intelCache.upsert({ where: { key }, create: { key, value: { count }, expiresAt: new Date(now + 30 * 86_400_000) }, update: { value: { count } } });
  if (count >= MAX_FAILURES) await prisma.channelIdentity.update({ where: { id: identityId }, data: { tipsOptIn: false } });
}

export async function runTips(adapters: Partial<Record<'whatsapp' | 'telegram', () => ChannelAdapter | null>>, opts: TipOptions = {}): Promise<{ sent: number }> {
  const now = opts.now ?? Date.now();
  const gap = opts.gapMs ?? 4000;
  const pause = () => (gap > 0 ? new Promise((r) => setTimeout(r, gap)) : Promise.resolve());
  const { day } = lagosNow(now);
  const tip = tipOfTheDay();
  let sent = 0;

  // Ààbò's own numbers.
  if (await claim(`tips:${day}`, now)) {
    const people = await prisma.channelIdentity.findMany({ where: { tipsOptIn: true, blocked: false, connectionId: null } });
    for (const p of people) {
      const adapter = adapters[p.channel as 'whatsapp' | 'telegram']?.();
      if (!adapter) continue;
      await adapter.send(p.externalId, tipText(p.language, tip)).then(
        () => sent++,
        () => undefined,
      );
      await pause();
    }
  }

  // Organisations' own numbers.
  const connections = await prisma.channelConnection.findMany({ where: { tipsEnabled: true, enabled: true, status: { in: ['verified', 'active'] } }, select: { id: true } });
  for (const { id } of connections) {
    const conn = await connectionById(id);
    if (!conn?.orgDeveloperMode || !conn.tipsEnabled) continue;
    if (!(await claim(`tips:${day}:${id}`, now))) continue;
    const adapter = new CloudWhatsAppAdapter(conn);
    const people = await prisma.channelIdentity.findMany({
      where: { connectionId: id, tipsOptIn: true, blocked: false, lastInboundAt: { gt: new Date(now - WINDOW_MS) } },
    });
    for (const p of people) {
      if (!p.address) continue;
      try {
        await adapter.send(p.address, tipText(p.language, tip));
        await prisma.intelCache.deleteMany({ where: { key: `tipfail:${p.id}` } });
        sent++;
      } catch (err) {
        if (!(err instanceof CloudError)) logError('tips', err);
        await noteFailure(p.id, now);
      }
      await pause();
    }
  }
  return { sent };
}

export function startTipScheduler(adapters: Partial<Record<'whatsapp' | 'telegram', () => ChannelAdapter | null>>) {
  const tick = async () => {
    if (lagosNow(Date.now()).hour !== LAGOS_TIP_HOUR) return;
    await runTips(adapters);
  };
  const timer = setInterval(() => tick().catch((e) => logError('tips', e)), 10 * 60_000);
  return () => clearInterval(timer);
}
