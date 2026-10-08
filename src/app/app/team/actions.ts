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
  const target = await prisma.membership.findFirst({ where: { id: membershipId, orgId: user.orgId, role: { not: 'owner' } } });
  if (!target) return { ok: false };
  await prisma.$transaction([
    prisma.membership.delete({ where: { id: target.id } }),
    // Their API keys for this organisation stop working too.
    prisma.apiKey.updateMany({ where: { userId: target.userId, orgId: user.orgId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  revalidatePath('/app/team');
  return { ok: true };
}

/** True for a workspace nobody has used yet (only its creator, no settings, numbers or history). */
async function untouchedStarter(orgId: string): Promise<boolean> {
  const [org, members, integrations, connections, scans, invites] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { developerMode: true } }),
    prisma.membership.count({ where: { orgId } }),
    prisma.orgIntegration.count({ where: { orgId } }),
    prisma.channelConnection.count({ where: { orgId } }),
    prisma.scan.count({ where: { orgId } }),
    prisma.invite.count({ where: { orgId } }),
  ]);
  return Boolean(org && !org.developerMode && members === 1 && integrations + connections + scans + invites === 0);
}

/**
 * Accept an invite (only ever called from an explicit "Join" click). The user joins the business as
 * staff. Their own starter workspace is removed only if it was never used; otherwise it is kept
 * and stays their main workspace.
 */
export async function acceptInvite(code: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: 'Please sign in first.' };
  const invite = await prisma.invite.findUnique({ where: { code }, include: { org: true } });
  if (!invite || invite.expiresAt < new Date()) return { ok: false as const, error: 'This invite link is invalid or expired.' };
  const existing = await prisma.membership.findUnique({ where: { userId_orgId: { userId: user.id, orgId: invite.orgId } } });
  if (existing) return { ok: true as const, orgName: invite.org.name };
  const own = await prisma.membership.findMany({ where: { userId: user.id, role: 'owner' } });
  let kept = false;
  for (const m of own) {
    if (await untouchedStarter(m.orgId)) await prisma.organization.delete({ where: { id: m.orgId } });
    else kept = true;
  }
  await prisma.membership.create({ data: { userId: user.id, orgId: invite.orgId, role: invite.role } });
  return {
    ok: true as const,
    orgName: invite.org.name,
    ...(kept ? { note: `You joined ${invite.org.name}. Your own business workspace is kept and stays your main workspace.` } : {}),
  };
}
