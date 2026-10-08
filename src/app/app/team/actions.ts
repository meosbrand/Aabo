'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db';
import { getSessionUser } from '@/server/session';

export async function createInvite() {
  const user = await getSessionUser();
  if (!user?.orgId) return { ok: false as const, error: 'No business workspace found.' };
  const m = await prisma.membership.findUnique({ where: { userId_orgId: { userId: user.id, orgId: user.orgId } } });
  if (!m || !['owner', 'admin'].includes(m.role)) return { ok: false as const, error: 'Only the owner can invite staff.' };
  const code = randomBytes(9).toString('base64url');
  await prisma.invite.create({ data: { orgId: user.orgId, code, createdBy: user.id, expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
  return { ok: true as const, code };
}

export async function removeMember(membershipId: string) {
  const user = await getSessionUser();
  if (!user?.orgId) return { ok: false };
  const me = await prisma.membership.findUnique({ where: { userId_orgId: { userId: user.id, orgId: user.orgId } } });
  if (!me || me.role !== 'owner') return { ok: false };
  await prisma.membership.deleteMany({ where: { id: membershipId, orgId: user.orgId, role: { not: 'owner' } } });
  revalidatePath('/app/team');
  return { ok: true };
}

/** Accept an invite: the signed-in user joins the business workspace (as their primary org). */
export async function acceptInvite(code: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: 'Please sign in first.' };
  const invite = await prisma.invite.findUnique({ where: { code }, include: { org: true } });
  if (!invite || invite.expiresAt < new Date()) return { ok: false as const, error: 'This invite link is invalid or expired.' };
  const existing = await prisma.membership.findUnique({ where: { userId_orgId: { userId: user.id, orgId: invite.orgId } } });
  if (!existing) {
    // Staff join the employer's workspace; their own empty starter workspace is removed.
    const own = await prisma.membership.findMany({ where: { userId: user.id, role: 'owner' }, include: { org: { include: { members: true } } } });
    for (const m of own) if (m.org.members.length === 1) await prisma.organization.delete({ where: { id: m.orgId } });
    await prisma.membership.create({ data: { userId: user.id, orgId: invite.orgId, role: invite.role } });
  }
  return { ok: true as const, orgName: invite.org.name };
}
