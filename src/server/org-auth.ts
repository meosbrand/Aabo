/**
 * @fileoverview Organisation roles. Authorisation for organisation settings always uses the
 * membership role (owner/admin/member), never the platform-wide User.role.
 */

import { prisma } from './db';

export type OrgRole = 'owner' | 'admin' | 'member';

export interface OrgActor {
  userId: string;
  orgId: string;
  role: OrgRole;
}

const RANK: Record<OrgRole, number> = { member: 0, admin: 1, owner: 2 };

export function asOrgRole(role: string | null | undefined): OrgRole {
  return role === 'owner' || role === 'admin' ? role : 'member';
}

export function roleAtLeast(role: OrgRole, min: OrgRole): boolean {
  return RANK[role] >= RANK[min];
}

/** The user's role in the organisation, or null if they are not a member. */
export async function orgActor(userId: string, orgId: string | null | undefined): Promise<OrgActor | null> {
  if (!orgId) return null;
  const m = await prisma.membership.findUnique({ where: { userId_orgId: { userId, orgId } } });
  return m ? { userId, orgId, role: asOrgRole(m.role) } : null;
}

/** The actor if their role is at least `min`, else null. */
export async function requireOrgRole(userId: string, orgId: string | null | undefined, min: OrgRole): Promise<OrgActor | null> {
  const actor = await orgActor(userId, orgId);
  return actor && roleAtLeast(actor.role, min) ? actor : null;
}
