'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db';
import { reputationPolicy } from '@/server/engine-loader';
import { reputationStore } from '@/server/reputation-store';
import { getSessionUser } from '@/server/session';

const REVIEWER_QUORUM = 2;

/**
 * CheckMate-style review: reviewers vote on a reported identifier. One admin vote, or two
 * matching reviewer votes, decides it. Confirmed identifiers become high-confidence indicators.
 */
export async function voteOnReport(type: string, value: string, vote: 'confirm' | 'reject') {
  const user = await getSessionUser();
  if (!user || !['admin', 'reviewer'].includes(user.role)) return { ok: false, error: 'Not allowed' };

  const reports = await prisma.report.findMany({ where: { type, value, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
  if (!reports.length) return { ok: false, error: 'Nothing pending' };
  await prisma.reviewVote.upsert({
    where: { reportId_reviewerId: { reportId: reports[0].id, reviewerId: user.id } },
    create: { reportId: reports[0].id, reviewerId: user.id, vote },
    update: { vote },
  });

  const votes = await prisma.reviewVote.findMany({ where: { report: { type, value } } });
  const same = votes.filter((v) => v.vote === vote).length;
  const decided = user.role === 'admin' || same >= REVIEWER_QUORUM;
  if (!decided) {
    revalidatePath('/admin/review');
    return { ok: true, decided: false };
  }

  await prisma.report.updateMany({ where: { type, value, status: 'PENDING' }, data: { status: vote === 'confirm' ? 'CONFIRMED' : 'REJECTED' } });
  const category = reports.find((r) => r.category)?.category ?? null;
  if (vote === 'confirm') {
    const { reviewerConfidence } = await reputationPolicy();
    await prisma.indicator.upsert({
      where: { type_value: { type, value } },
      create: { type, value, category, source: 'community', confidence: reviewerConfidence, reports: reports.length },
      update: { confidence: reviewerConfidence, category: category ?? undefined, lastSeen: new Date() },
    });
  } else {
    await prisma.indicator.deleteMany({ where: { type, value, source: 'community' } });
  }
  reputationStore.invalidate();
  revalidatePath('/admin/review');
  return { ok: true, decided: true };
}
