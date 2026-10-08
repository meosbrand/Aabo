/**
 * @fileoverview Real protection score (0-100) shown on the dashboard, with the next best actions.
 */

import { CHECKUP, CHECKUP_TOTAL_WEIGHT } from '@/core/awareness/checkup';
import { LESSONS } from '@/core/awareness/content';
import type { Bilingual } from '@/core/types';
import { prisma } from './db';

export interface Protection {
  score: number;
  parts: { id: string; label: Bilingual; points: number; max: number; href: string }[];
  next: { label: Bilingual; href: string } | null;
}

export async function protectionFor(userId: string): Promise<Protection> {
  const [guardian, answers, lessons, linkedChats, push] = await Promise.all([
    prisma.waSession.findFirst({ where: { kind: 'GUARDIAN', ownerUserId: userId, status: 'connected', desiredState: 'running' } }),
    prisma.checkupAnswer.findMany({ where: { userId, done: true } }),
    prisma.lessonProgress.count({ where: { userId } }),
    prisma.channelIdentity.count({ where: { userId } }),
    prisma.pushSubscription.count({ where: { userId } }),
  ]);

  const doneWeight = CHECKUP.filter((i) => answers.some((a) => a.itemId === i.id)).reduce((s, i) => s + i.weight, 0);
  const parts = [
    { id: 'guardian', label: { en: 'WhatsApp Guardian on', pidgin: 'WhatsApp Guardian dey on' }, points: guardian ? 30 : 0, max: 30, href: '/app/guardian' },
    { id: 'checkup', label: { en: 'Security checkup', pidgin: 'Security checkup' }, points: Math.round((doneWeight / CHECKUP_TOTAL_WEIGHT) * 40), max: 40, href: '/app/checkup' },
    { id: 'learn', label: { en: 'Lessons completed', pidgin: 'Lessons wey you finish' }, points: Math.round((Math.min(lessons, LESSONS.length) / LESSONS.length) * 15), max: 15, href: '/app/learn' },
    { id: 'bot', label: { en: 'Ààbò saved on WhatsApp/Telegram', pidgin: 'Ààbò dey your WhatsApp/Telegram' }, points: linkedChats > 0 ? 10 : 0, max: 10, href: '/app/settings' },
    { id: 'push', label: { en: 'Alerts on this phone', pidgin: 'Alerts for this phone' }, points: push > 0 ? 5 : 0, max: 5, href: '/app/settings' },
  ];
  const score = parts.reduce((s, p) => s + p.points, 0);
  const gap = [...parts].sort((a, b) => b.max - b.points - (a.max - a.points))[0];
  return { score, parts, next: gap && gap.points < gap.max ? { label: gap.label, href: gap.href } : null };
}
