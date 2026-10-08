/**
 * Opt-in daily tip broadcast (people who sent "tips on"). Slow and small on purpose:
 * one message every few seconds, only to users who asked, to stay far from bulk-messaging limits.
 */

import { tipOfTheDay } from '@/core/awareness/content';
import { prisma } from '@/server/db';
import type { ChannelAdapter } from './channels/types';

const SEND_GAP_MS = 4000;
const LAGOS_TIP_HOUR = 9;

function lagosNow(): { hour: number; day: string } {
  const now = new Date(Date.now() + 60 * 60_000); // WAT = UTC+1, no DST
  return { hour: now.getUTCHours(), day: now.toISOString().slice(0, 10) };
}

export function startTipScheduler(adapters: Partial<Record<'whatsapp' | 'telegram', () => ChannelAdapter | null>>) {
  const tick = async () => {
    const { hour, day } = lagosNow();
    if (hour !== LAGOS_TIP_HOUR) return;
    const key = `tips:${day}`;
    const done = await prisma.intelCache.findUnique({ where: { key } });
    if (done) return;
    await prisma.intelCache.create({ data: { key, value: { startedAt: new Date().toISOString() }, expiresAt: new Date(Date.now() + 3 * 86_400_000) } });
    const tip = tipOfTheDay();
    const people = await prisma.channelIdentity.findMany({ where: { tipsOptIn: true, blocked: false } });
    for (const p of people) {
      const adapter = adapters[p.channel as 'whatsapp' | 'telegram']?.();
      if (!adapter) continue;
      const text = `💡 *${p.language === 'pidgin' ? 'Tip of the day' : 'Tip of the day'}*\n${p.language === 'pidgin' ? tip.pidgin : tip.en}\n\n_${p.language === 'pidgin' ? 'Send *stop* to off am.' : 'Send *stop* to unsubscribe.'}_`;
      await adapter.send(p.externalId, text).catch(() => undefined);
      await new Promise((r) => setTimeout(r, SEND_GAP_MS));
    }
  };
  const timer = setInterval(() => tick().catch((e) => console.error('[aabo] tips failed', e)), 10 * 60_000);
  return () => clearInterval(timer);
}
