/**
 * @fileoverview Current signed-in user for server components and actions.
 * Returns null for anonymous visitors (the public checker works without an account).
 */

import { headers } from 'next/headers';
import { auth } from './auth';
import { prisma } from './db';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  language: string;
  orgId: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { memberships: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      language: user.language,
      orgId: user.memberships[0]?.orgId ?? null,
    };
  } catch {
    return null;
  }
}
