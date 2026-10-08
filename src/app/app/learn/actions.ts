'use server';

import { revalidatePath } from 'next/cache';
import { LESSONS } from '@/core/awareness/content';
import { CHECKUP } from '@/core/awareness/checkup';
import { prisma } from '@/server/db';
import { getSessionUser } from '@/server/session';

export async function completeLesson(lessonId: string, correct: number, total: number) {
  const user = await getSessionUser();
  if (!user || !LESSONS.some((l) => l.id === lessonId)) return { ok: false };
  const score = total > 0 ? Math.round((correct / total) * 100) : 100;
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: { userId: user.id, lessonId, score },
    update: { score, completedAt: new Date() },
  });
  await prisma.quizAttempt.create({ data: { userId: user.id, quizId: lessonId, correct, total } });
  revalidatePath('/app/learn');
  return { ok: true };
}

export async function setCheckupItem(itemId: string, done: boolean) {
  const user = await getSessionUser();
  if (!user || !CHECKUP.some((i) => i.id === itemId)) return { ok: false };
  await prisma.checkupAnswer.upsert({
    where: { userId_itemId: { userId: user.id, itemId } },
    create: { userId: user.id, itemId, done },
    update: { done },
  });
  revalidatePath('/app/checkup');
  return { ok: true };
}
